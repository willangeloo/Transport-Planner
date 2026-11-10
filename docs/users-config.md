# Users file (`users.json`)

The Route Planner has no names built in. The list of people, their roles and their folder come from **`MASTER_DATA/users.json`** in the company folder. The app reads it fresh every time it opens.

The real file lives only on the shared drive. It's git-ignored and must **never** be committed to this public repository.

Nobody can use the planner without choosing a name from this file and passing the computer, path and files checks; see the [user guide](user-guide.md#1-start-company-folder-your-name-computer--path--files-check).

## Format

```json
{
  "company": "Demo Transport Ltd",
  "users": [
    { "name": "Alex",      "role": "MASTER",  "path": "C:\\Users\\alex\\OneDrive - Demo Transport\\Transport\\Route_planning" },
    { "name": "Sam",       "role": "MANAGER", "path": "C:\\Users\\sam\\OneDrive - Demo Transport\\Transport\\Route_planning" },
    { "name": "Jordan",    "role": "USER",    "path": "" },
    { "name": "Casey",     "role": "USER",    "path": "C:\\Users\\casey\\…\\Route_planning", "device": { "id": "3f9a1c0e7b2d4a65", "since": "2026-11-06T09:12:00Z" } },
    { "name": "Warehouse", "role": "VIEWER",  "path": "C:\\Users\\warehouse\\OneDrive - Demo Transport\\Transport\\Route_planning" }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `company` | no | The company name: shown top left next to the version, on the start windows and in Manage users (a Master can change it there). If left out, it is taken from the file's name (`users_Acme.json` → Acme) |
| `users[].name` | yes | Shown on the start window, in saved file names and in "saved by". Must be unique |
| `users[].role` | yes | `MASTER`, `MANAGER`, `USER` or `VIEWER`. At least one user must be `MASTER` |
| `users[].path` | for access | The `Route_planning` folder as it appears on that person's laptop. A user with no path can't get in until a Master or Manager sets it |
| `users[].device` | written by the app | The laptop registered to that person (a random id plus the date). Added the first time they get in on their laptop. Remove it with **Unregister** in Manage users |
| `deliveryShortagesUrl` | no | The Power BI report shown in the **Delivery Shortages** tab (a `https://app.powerbi.com/…` link). A Master sets it in the app (**Options › Users**); only powerbi.com is accepted |
| `shareComputers` | no | `true` lets anyone use any computer. It's **for demos only** (one presenter switching users). Leave it out in the company file |

In JSON every `\` in a Windows path is written twice (`\\`). The demo file is [`demo/Route_planning/MASTER_DATA/users.json`](../demo/Route_planning/MASTER_DATA/users.json).

**Several users files:** if `MASTER_DATA` holds more than one (`users*.json`), the start window lists them so you can choose, in the same way as opening a plan. The choice is remembered on that computer.

## Roles

| Role | Can do |
|---|---|
| **MASTER** | Everything: add and remove users, change any role, set **anyone's** folder, unregister anyone's laptop, Customize, undo, reset |
| **MANAGER** | Everything except user control and bay colours. Can set **their own** folder |
| **USER** | Create and edit (load days, move, defer, split, insert, routes, days, customers, dockets, save), but not remove anything. Can set **their own** folder |
| **VIEWER** | View only, like a snapshot: open plans, look at the maps and the report, print and export. Can set **their own** folder |

## The checks

When someone picks their name, the app checks, in this order:

1. **Computer:** each laptop belongs to one person, and staff can't use another person's laptop.
   - **First time:** the laptop is registered to them in `users.json`.
   - **Afterwards:** only the owner is listed on that laptop. Their name fails on any other laptop until a Master (or a Manager, for Users and Viewers) clicks **Unregister**.
2. **Path:**
   - the user has a `path` (only a Master or Manager can set a missing one);
   - the linked folder is that folder (the folder names match, e.g. `Route_planning`);
   - the company folder is available.
3. **Files:**
   - `MASTER_DATA` and `REPORTS` are there (a missing `PLANS` is only a warning, because it's created on the first save);
   - the customer master and fixed routes are there (a warning if not).

**✅ Ready** → **Continue** opens the planner. **⛔ Check failed** → the planner stays locked. A wrong linked folder can be fixed there and then (**Continue — choose the folder**). Someone else's laptop, or no path, can only be fixed by a Master or Manager.

> A browser can't read a folder's full path or the Windows user, so the typed `path` alone can't tell two laptops apart. The laptop registration is what ties a laptop to a person. A different browser on the same laptop counts as a different computer, and so does clearing the browser's site data. If that happens, a Master unregisters the laptop and the owner registers it again.

## Changing users and folders

Only from **inside the planner**, after passing the checks on your own laptop:

- **Your own folder (everyone):** 👤 → **My folder…** → paste the path or **Browse…** → **Save**.
- **Other users (Master only):** **Options › Users** → **Manage users…** → edit roles and folders, or **Unregister** a laptop (a Master can also add or remove users) → **Save to MASTER_DATA**.

Changes are written straight into `MASTER_DATA/users.json`, so everyone gets them the next time they open the app.

**↺ Reset** (Master or Manager) clears the planner but keeps the folder link, the users file and the laptop's registration. The app goes back to **Who is planning?**. To read an updated users file, use **🔄 Reload users file** on that window.

## Important

Roles are **guardrails for the prototype**. A file-only app can't stop someone who edits the file. Real permissions need a server; see [backend-blueprint.md](backend-blueprint.md).
