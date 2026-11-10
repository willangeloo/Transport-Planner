# Changelog

What changed in each version, grouped as **Features**, **Bug fixes** and **Edits** (changes to how existing things work). Each release is a git tag (`vX.Y.Z`). See [CONTRIBUTING.md](../CONTRIBUTING.md) for how versions are numbered.

> Versions before 0.9.1 were built before this repository existed. They contained company data, so they aren't published or documented here.

## v0.11.3 — 2026-11-10

### Features
- **Printing › Import PDF from the company folder.** **📁 Choose from CHECK_SHEETS › JDE** lists the PDFs like Load day does (week chips, newest first, ✓ loaded / ⚠ changed / not loaded). The **day of a PDF is read from its first 3 pages**, not from its file name; only those pages are parsed and the result is remembered per file. Importing a PDF sets the Printing day from it (also for dropped files).
- **Organised PDFs are saved** in `CHECK_SHEETS/Organised` as `date_time_user.pdf` (for example `2026-11-10_14.35_Alex.pdf`); Download all uses the same name.
- **Start window.** The first window always asks for access to the company folder (the remembered one, or "Choose folder…") and has a **↺ Reset** button that clears everything the browser saved for the planner (the folder link, the users file and the theme are kept).

### Edits
- **Check Sheet Print is now called Printing.**
- **Planning map:** opening or closing a route in Routes & orders refits the map to the open routes and replaces earlier "show on map" choices (for example after **All**, opening one bay shows only that bay). "Show on map" alone never changes the fit.
- **Theme:** the default is **Same as the browser**, and Reset no longer resets the theme.
- The demo's check-sheet PDFs moved to `CHECK_SHEETS/JDE/week_46` with names that don't say the day.

## v0.11.2 — 2026-11-10

### Bug fixes
- **Inserted orders are reallocations.** An order inserted in Planning (late call) and then moved to another bay was missing from Check Sheet Print › Reallocations, so the print wasn't updated. Inserted orders now appear there (with "Inserted, then moved in Planning" when moved) and are printed under their current route.
- **Customers map** was blank until a customer was clicked. It now fits all the customers when the tab opens.

### Edits
- **Tab names and header:** Plan the day is now **Planning**. Change report and Check Sheet Print are highlighted in the header.
- **Check Sheet Print:** steps 1–4 are back on the left (in the current order). **Routes** and **Organised PDF** are merged into one section on the right: search and expand / collapse, then a list with Bay, Driver, Helper, Drops, Orders and Shipments attached; selecting a bay opens its orders (tick box, order number, customer, ship to, shipment, note, view) and previews the organised pages on the right. Click to enlarge now shows **every** page of the route, in order (it was limited to 6).
- **New day / fixed routes:** fixed routes are only a reference when deferring orders. No routes are created from them: bays come only from the Resources details, and a day with nothing in Resources has no routes planned yet. An order deferred to a bay that the day doesn't have stays **not assigned**, with a warning in Planning.
- **Planning map:** all routes collapsed or all expanded show every route; some expanded show only those; **Show on map** adds or removes single routes on top of that.

## v0.11.1 — 2026-11-09

### Features
- **Options tab.** Replaces Customize. **Customize** is a section of it, with a new theme choice **Same as the browser**. **Users** (Master only) moved here from the user menu. **Files loaded** moved here from the change report.
- **Check Sheet Print layout.** Top to bottom: the four steps side by side (Import PDF, Resources, Reallocations, Organise), the summary, Checks (if any), then Routes and Organised PDF side by side.
  - Tick the routes and orders to print and click **Print Selected**; **Select all** ticks everything.
  - A search box on the routes (order, customer name, ship to, loading, bay).
  - The ship to code of each customer is listed with the orders and reallocations.
- **P&W balloon** on the change report filters every section to Pink & White orders.
- **Resources:** drag a column edge to resize it; press a column or row heading and drag to move it; **＋ Row** is below the table and **＋ Column** on its right; **＋ Day** button.

### Edits
- **Tab order:** Plan the day (home), Resources, Change report, Check Sheet Print, Options, Customers.
- **Donegal** bays and customers show only on the Customers tab. They are left out of Plan the day, Resources, the change report and Check Sheet Print.
- **Resources:** the ID column is gone. **Drops** and **Kgs** are read-only and follow the plan, so moves and deferrals in Plan the day change them. Resources edits are no longer logged in the change report.
- **Change report** shows only deferred, reallocated, inserted orders, new routes, docket type changes and customer details changes.
- **Managers** no longer manage users (Master only).

### Bug fixes
- A click anywhere in the Options tab acted as a theme click, because the page's own theme attribute matched.

## v0.11.0 — 2026-11-09

### Features
- **Check Sheet Print tab.** The JDE Print Organiser is now part of the planner. Import the check-sheet PDF and it is organised by the day's plan: a cover per route, routes in plan order, pages checked before printing, blank signature pages left out, **Reprint an order**.
  - **Resources** come from the Resources tab; **Reallocations** (the old "Exceptions") are made automatically from the moves and deferrals in Plan the day. Deferred orders print in a **DEFERRED** section.
  - **Organise PDFs** is at the top, above Import PDF.
  - pdf.js and pdf-lib are loaded from the CDN on first use, so the page itself stays small.
- **Resources tab.** The day's routes as an editable sheet (ID, Shipment Number, Route / Bay, Driver, Helper, Truck, Drops, Kgs, Pallets, DIPS Total KM \*, Estimated Time \*, Comments) used by planning and printing.
  - Excel-like: select several cells, copy and paste blocks (also from / to Excel), add and delete rows, add your own columns, hide and show columns.
  - **Upload sheet** into the open day; **Export Excel** in the RESOURCES file layout.
  - Edits are saved with the plan and listed in the change report.
- **Light and dark theme** in Customize, for every user (kept in the browser).

### Edits
- **Customize** is visible to everyone (theme). Bay colours are still Master only.
- **Route names for one day** removed from Customize: rename a route in the Resources tab (Route / Bay column).
- The demo week has fake check-sheet PDFs (`REPORTS/week_46/CheckSheets_*.pdf`). PDFs are git-ignored everywhere else.

## v0.10.6 — 2026-11-09

### Features
- **Company name.** Taken from `users.json` (`company`), or from the users file's name when it has none (`users_Acme.json` → Acme). It's shown top left next to the version, as a heading on the start windows and in the user menu. A Master can change it in **Manage users**; it's saved into `users.json`.
- **Master data & reports window.** After choosing a user it always opens, split in two: the customer master and fixed routes (`MASTER_DATA`) on the left, the newest week's DIPS Plan and RES reports on the right. Each file shows whether the version loaded in the planner matches the one in the folder (**✓ loaded**, **⚠ the folder has a different version**, **not loaded**), the same rule as the reports. **Load master data** loads what is new or changed. It can be reopened from 👤 → **Master data & reports…**.

### Edits
- **Demo rebuilt** and its screenshots regenerated for the new windows; the walkthrough covers the company name, the data window (including a master data file changed in the folder) and the company edit.

## v0.10.5 — 2026-11-06

### Features
- **Who made each change.** Every change in the change report records the user who made it. The **Logged** column of every section shows the time plus a 👤 user tag, in the same style as the Check Sheet tag. The Excel export has a **By** column.

### Edits
- **Fixed plan and snapshot names.** They're always `version_date_time_user`.
  - **Save as** asks only for the **folder**, so the name can't be changed.
  - **"Saved by"** is the user who is in, shown read-only in Save as / share.

## v0.10.4 — 2026-11-06

### Edits
- **"Files loaded" is information, not a planning change.** It no longer counts in the Change report tab's number, the boxes at the top of the report, the Reset window or the plan summary. Its count is shown as a flag in the section heading ("N files · info").

## v0.10.3 — 2026-11-06

### Edits
- **Reset keeps the users.** It clears the plan, days, customer edits, customer master and fixed routes (the last two are read again from `MASTER_DATA`). The company folder link, the users file and the laptop's registration are kept, and the app goes straight back to **Who is planning?**.
- **Who is planning?** lists every user again. On a registered laptop only the owner can be chosen, and the others are greyed out.
- **Who is planning?** has **🔄 Reload users file** (read `users.json` again from `MASTER_DATA`) and **Change users file…**.

## v0.10.2 — 2026-11-06

### Bug fixes
- **Another user's name could be used on your laptop.** The folder check only compared the folder's name, which is the same (`Route_planning`) for everyone, so it passed for any user. Now:
  - **One laptop per person:** each laptop is registered to its owner the first time they get in (stored in `users.json`). After that only the owner is listed on it, and their name fails on any other laptop.
  - **Order of the checks:** computer, then path, then files.
- **A folder could be set for a user before getting in.** The start window no longer lets anyone set a path. A user without one stays blocked until a Master or Manager sets it from inside the planner.
- **Manage users:** what a Manager may change (Users and Viewers only) is now also checked when saving.

### Features
- **Unregister a laptop** in Manage users (Master: anyone else; Manager: Users and Viewers), e.g. for a replacement laptop.
- **`shareComputers: true`** in `users.json`: lets anyone use any computer. For demos only (the demo week uses it).

### Edits
- Wider **Manage users** window.

## v0.10.1 — 2026-11-06

### Bug fixes
- **No way into the tool without a valid user.** The planner opens locked until a user from `MASTER_DATA/users.json` is chosen and passes the folder check.
  - Clicking outside the window, Escape and keyboard navigation are blocked.
  - "Continue without a user" and open mode are gone.
  - A user without a valid folder can't get in until it's fixed.
  - Snapshots are strictly view-only.

### Features
- **Start window:** link the company folder (once per computer), then the users file is read from `MASTER_DATA` (several files are listed like plans), then pick your name, then the **folder check** (OK or failed, with **Go back** / **Continue**).
- **Folder paths by role:** Masters set anyone's, Managers their own plus Users' and Viewers', everyone else their own. Paths are pasted or picked with **Browse…** and saved straight into `MASTER_DATA/users.json`.
- **Each file type has its own folder:** `MASTER_DATA` (master, fixed routes, users), `REPORTS/week_XX` (DIPS Plan, RES, PROD, UPLIFTS, POD) and `PLANS/week_XX`. Only files there, with known names, are listed. Manual drop or choose has been removed.
- **File fingerprints:** files show **✓ loaded**, **⚠ changed since loaded** or **not loaded**, compared by content, so changes made in the folder outside the app are visible.
- **Replacing what's loaded** (a day, the customer master, the fixed routes) first shows the differences (orders added or removed, other load, weight, routes, customers, bays) and how many of your changes would be lost.
- **"Files loaded"** section in the change report: every file loaded, with what changed, who and when.
- **Customer master and fixed routes updated in `MASTER_DATA`:** the app shows the differences and asks before loading the new version.

### Edits
- **Docket names:** **P&W** and **Check Sheet** everywhere. The buttons: P&W has a pink outline and is solid pink when chosen; Check Sheet has a grey outline and is solid grey when chosen.
- **Tests:** the old manual-upload test was removed. The walkthrough now covers the start window, file fingerprints and snapshots (68 checks in total).

## v0.10.0 — 2026-11-06

### Features
- **Users file and roles.** The home page loads the company's `users.json` (names, roles and each person's folder). There are four roles: **Master**, **Manager**, **User** and **Viewer**; see the [user guide](user-guide.md#15-roles-who-can-do-what). Master and Manager can manage users and export the file. No names are built into the app any more. Without a users file the app runs in open mode.
- **Docket type** on every order: **Pink & White** or **Offloading** (renamed P&W / Check Sheet in v0.10.1).
  - Orders from the planning file are Offloading.
  - Inserted orders must choose one, and split lines choose one per line.
  - It can be changed from the change report, by order number or by clicking an order's tag. Changes get their own report section, are exported, and can be undone.
- **Customize tab (Master only).** Bay colours, and route names for one day.
- **Save** button: saves the plan straight into `PLANS/week_XX`. **Save as** opens the Save window to choose another place (for both plans and snapshots).
- **Sorting** in the change report: click a column heading to sort that section, and click again to reverse.
- **Demo week** (`demo/`): an invented company with a full week of reports, the customer master, fixed routes, a users file and five plan files. It's for training and for presenting the app without company data.
- Full-feature browser test (`tests/demo/walkthrough.js`). It also produces the demo plans and the screenshots in the user guide.

### Bug fixes
- **Deferred orders allocated later.** A drop deferred without a bay and allocated later, or rescheduled, or moved again on its new day, now stays **one line** in *Deferred orders*. That line shows where the orders ended up and when. It's no longer listed a second time under *Reallocated between bays*. **Undo update** on that line undoes the latest step first.

### Edits
- **Fixed routes** are treated like the customer master. They're kept in the browser and read automatically from `MASTER_DATA` when the shared folder is linked, and read again only when the file changes. Plans carry a copy.
- **Customer master** is also read automatically from `MASTER_DATA` when the folder is linked.
- **Header:** shows only the current file name. Click it for the full history.
- **Header buttons:** compact (icons only) on narrower screens.
- **Reset is a full reset of the application.** It clears the plan and days, the customer master and fixed routes, customer edits, the users file and the folder links. The app then reopens on the home page to load the users file again.

## v0.9.2 — 2026-11-05

### Features
- **Shared folder subfolders.** Load day and Open plan read the File_Arch layout: `MASTER_DATA/`, `REPORTS/week_XX/`, `PLANS/week_XX/`.
  - Files are grouped by report, with week chips.
  - Reports named only by weekday (`RES_Tue.xlsx`) get their date from the week folder.
  - `_ARCHIVE`, `_RESTORED` and `PROMPTS` are skipped.
- **Plans saved** into `PLANS/week_XX` as `version_date_time_user`.

### Bug fixes
- New days are checked against the customer master imported with them (not the old one).

## v0.9.1 — 2026-11-05

### Edits
- **Customer master not built in.** It's loaded from `MASTER_DEL_DETAILS.xlsx` at runtime and kept in the browser. Plans and snapshots carry a copy.
- **Real master layout** is read: `Postal Code`, `BAYS`, and `Monday`–`Friday` columns.
- **Repository set up:** `.gitignore` for business data, and browser tests with fake data.
