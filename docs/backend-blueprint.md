# Backend blueprint — from prototype to production

The Route Planner is a **prototype**: one HTML file, no server, with data kept in each person's browser and in files on a shared drive. It exists to show the team what the tool should do. If the team adopts it, the final version needs a backend.

This document explains how to build one so that **every feature behaves the same as in the prototype**. The prototype is the executable specification, and its full-feature test (`tests/demo/walkthrough.js`, run on the demo week) is the acceptance test.

---

## 1. What a backend must fix

| Prototype limit | Why it matters | Backend answer |
|---|---|---|
| Roles are guardrails in the browser | Anyone can edit the file or pick another name | Sign-in (Microsoft Entra ID) and permissions checked **on the server** |
| Each planner has their own copy of the plan (`.json` files with a "Previous" lineage) | Two people can change the same day, and their versions drift apart | **One shared plan per day** in a database, with live updates and conflict checks |
| Reports are loaded by hand from the shared drive | Manual and easy to get wrong | Reports are **ingested automatically** (watch `REPORTS/week_XX`, later a direct DIPS feed) |
| Customer master and users file are copies in each browser | They can be out of date | One master table, versioned; users and roles from Entra groups |
| The change log lives in the plan file | It can be lost or overwritten | An **append-only audit log** in the database |

## 2. Recommended architecture

```
 Browser (React/Vue SPA — reuse the prototype's screens, maps and report)
        │  HTTPS + Entra ID token          ▲ live updates (WebSocket / SignalR)
        ▼                                  │
 API service (Node.js/TypeScript or .NET) ─┤── rules engine: move, defer, split, allocate, undo …
        │                                  │
        ├── PostgreSQL / Azure SQL (days, loads, orders, customers, events, settings)
        ├── Ingestion worker (Microsoft Graph → SharePoint REPORTS/MASTER_DATA, Excel parsing)
        └── Export service (Excel / PDF of the change report)
```

- **Hosting:** Azure App Service or Container Apps in the company tenant, so data stays in Microsoft 365 / Azure.
- **Sign-in:** Entra ID (single sign-on). Roles come from four Entra groups: Route Planner Masters, Managers, Users and Viewers.
- **Why not only Power Apps + SharePoint Lists?** That works for simple forms and lists. But the map, box-select, drag-and-drop and the rules below (deferral folding, undo dependencies) are hard to express there. It's possible as a phase 0 for read-only views, but not as the final tool.

## 3. Data model

The prototype's plan file (see §9) maps directly onto these tables.

| Table | Key fields | Prototype source |
|---|---|---|
| `customer` | ship_to, name, postal_code, address, lat, lng, bay, delivery_days, time_window, master_version | `MASTER_DEL_DETAILS.xlsx` → `customers` |
| `customer_override` | ship_to, fields changed, by, at | `state.cust` |
| `fixed_route` | bay, weekdays | `FIXED_ROUTES_DIPSDATA` → `state.fixed` |
| `planning_day` | date, iso_week, source files, status, version | `uploads[]`, `state.days` |
| `load` (route) | day, load_no, bay, driver, helper, truck, pallets, km, area, created_by_planner | `uploads[].loads`, `state.routes` |
| `order` | order_no, ship_to, weight, source (file / inserted), original day + load, docket_base | `uploads[].orders`, `state.added` |
| `order_placement` | order, current day (or pending date), current load (or none), line_group | `state.cur`, `state.grp` |
| `order_docket` | order, docket (`PW` / `OFF`) | `state.dock` (+ default `OFF`) |
| `change_event` | id, type, day, ship_to, orders, from, to, reason, note, before, after, user, at | `state.log` |
| `day_route_name` | day, load, display name | `state.look.names` |
| `bay_colour` | bay, colour | `state.look.colors` |
| `app_user` | Entra object id, display name, role (from group), folder | `users.json` |

**Pending dates:** an order deferred to a day that has no file yet is stored with `placement.day = NULL, pending_date = 2026-11-11`. When that day's report is ingested, it lands on the day, unassigned (prototype: `@YYYY-MM-DD` keys and `fixDay()`).

## 4. Business rules to keep (feature parity)

Each rule below is in the prototype today. Build each one as an API command that validates, writes the placement change, and appends a `change_event` in one transaction.

| Feature | Rule (prototype behaviour) | Prototype code |
|---|---|---|
| Import planning | The day comes from **Date Promised Shipment**, otherwise the dd.mm in the sheet or file name, otherwise the week folder + weekday. Bays are normalised (`BAY001` → `BAY 01`). Re-importing a day replaces it and clears changes made to its file orders. | `parseDays`, `nameDate`, `normBay`, `uploadAct` |
| Import RESOURCES alone | Creates the day with its routes (no orders), or updates route details and logs `resupd` per changed field. | `resDiff` |
| Fixed routes | Bays listed for a weekday appear on every day as placeholders (`FX-BAY`). When RESOURCES give that bay a load number, orders on the placeholder move to the real load. | `fixedBaysFor`, `fixLoad` |
| Move | All orders of a line move together. Logs `move` (or `allocate` when the line came from Unassigned). Shows the destination bay's new totals before confirming. | `applyMove`, `bayImpactHtml` |
| Defer | Target date after the planned day. Optional bay if the target day is loaded (or a fixed bay creates the day). Logs `defer`. Default target is the next working day. | `applyDefer`, `nextWorkday` |
| Deferral folding | Allocate, reschedule or move steps that follow a deferral of the **same orders** are folded into that deferral's report line. The line shows where the orders ended up, and they aren't listed as reallocations. | `deferChains`, `finOf` |
| Allocate | Deferred drops without a bay are allocated from the report: choose day + bay, or reschedule without a bay. | `applyAllocate` |
| Split / merge | Chosen orders form a new line (`line_group`), and both lines choose their docket. Merge removes the group. | `openSplit`, `mergeDrop` |
| Insert order | Order no., Ship To, bay and docket are required. Blocked if the order is already on that day; warns if it's on another day. | `openInsert`, `applyInsert` |
| New route | Bay, load no., driver, helper and truck are required. Load no. must be unique for the day. | `applyNewRoute` |
| New day | Creates a day from the fixed routes for that weekday. Files loaded later fill the same day. | `openNewDay` |
| Customer edit | Changes are stored as an override over the master and logged field by field (old → new). The master file itself is not changed. | `saveCustEdit` |
| Docket | Default `OFF` for file orders. Inserts choose. Changes are logged as `dock` with before/after. | `setDock` |
| Undo | Allowed only if nothing later changed the same orders (current state = the event's "after"). RESOURCES updates can't be undone. In the backend, undo is a **compensating event**: the audit trail is never deleted. | `canUndo`, `undo` |
| Change report | A query over `change_event` grouped into sections, with search (incl. driver, helper, truck), per-section filter, sort, export, and "Deferred — not on a bay yet" computed from placements. | `sectionData`, `exportRow` |
| Roles | Master / Manager / User / Viewer, as in [users-config.md](users-config.md). **Enforced in the API**, and the UI only hides buttons. | `ROLES`, `guard` |
| Access | Nothing is visible until a known user passes the checks: their registered laptop, their folder, then the files. In the backend this becomes Entra sign-in plus a check that the user belongs to a role group, so no laptop registration is needed. | `gateHome`, `validateUser`, `deviceId` |
| Folder paths | Masters set anyone's path, Managers their own plus Users' and Viewers', others only their own. With a backend, paths are replaced by server-side ingestion, so no path per user is needed. | `canSetPath`, `openPathEdit` |
| File fingerprints | Each file loaded keeps its SHA-256. The same file shows as loaded, and a changed file is flagged. Replacing a day, the master or the fixed routes shows the differences first. Every load is logged (`load` events). | `fileHash`, `fileStatus`, `dayDiff`, `custDiff`, `fixedDiff` |

## 5. Working together (concurrency)

- **Shared plan:** one shared plan per day replaces the plan files. Each `planning_day` has a `version`. Every command sends the version it was based on, and the server rejects stale commands with "someone changed this day — refresh" (optimistic locking).
- **Live updates:** changes are pushed live to everyone viewing that day (WebSocket / SignalR). This replaces the prototype's file lineage ("based on …").
- **Snapshots:** a snapshot becomes a read-only link or a PDF/Excel export of a day at a moment in time.

## 6. Security and data

- **Access:** sign-in with Entra ID only. No local accounts.
- **Permissions:** checked on every API call. Viewers get read-only endpoints.
- **Customer data** stays in the company tenant. Nothing is stored in the browser beyond the session. This repository stays free of company data, and the demo data is used for development and tests.
- **Audit log:** append-only, keeping who, what and when, before and after, plus the reason.
- **Backups and retention:** agree with IT (e.g. keep plans and events for 2 years).

## 7. Integrations

1. **Phase 1:** ingestion worker reads `REPORTS/week_XX/*.xlsx` and `MASTER_DATA/*` from SharePoint through Microsoft Graph, using the same parsing rules as the prototype.
2. **Phase 2:** read DIPS / resources data directly (API or database view) instead of exported spreadsheets.
3. **Products / uplifts / POD:** these are already planned in the prototype as "not used yet" (File_Arch). Model them as `order_line` (product, qty, unit) and `uplift` tables linked to orders and customers.
4. **Write-back:** the change report could later push changes to DIPS instead of staff copying them by hand.

## 8. Phased plan

| Phase | Scope | Done when |
|---|---|---|
| 0 | Database + ingestion + read-only web view (days, routes, map) | The team can see the week without loading files |
| 1 | All planning commands + change report + roles | `walkthrough.js` passes against the new app |
| 2 | Live multi-user, conflict handling, exports | Two planners can work on the same day safely |
| 3 | Products, uplifts, POD, write-back | Agreed with the team |

## 9. Prototype plan file (migration reference)

A saved plan (`.json`) has: `app`, `fmt`, `version`, `fileName`, `history[]`, `savedAt`, `savedBy`, `day`, `uploads[]` (days with `loads` and `orders`), `customers` (master copy), and `state`:

| `state` key | Meaning |
|---|---|
| `cur` | order uid → current `{day, load}` (only orders that changed) |
| `grp` | order uid → split line id |
| `added[]` | inserted orders `{uid, o, s, n, a, w, day, load, dk, note, ts}` |
| `cust` | Ship To → customer field overrides |
| `routes[]` | planner-added routes |
| `days[]` | manual days (`YYYY-MM-DD`) |
| `fixed` | fixed routes `{file, at, bays:[{bay, days:[0-6]}]}` |
| `dock` | order uid → `PW` / `OFF` (only when different from the default) |
| `look` | `{colors:{bay:#hex}, names:{"dayKey|load": name}}` |
| `log[]` | change events: `move`, `allocate`, `defer`, `add`, `route`, `resupd`, `cust`, `dock`, `load` (files loaded, with a summary of what changed), with `prev` / `next` placements for undo |

An order uid is `D<date>#<row>` for file orders and `A<n>` for inserted ones. A one-off import script can load the demo plans (`demo/Route_planning/PLANS/week_46`) into the new database to check that the migration is lossless.
