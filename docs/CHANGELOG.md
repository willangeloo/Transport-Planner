# Changelog

What changed in each version, grouped as **Features**, **Bug fixes** and **Edits** (changes to how existing things work). Each release is a git tag (`vX.Y.Z`). See [CONTRIBUTING.md](../CONTRIBUTING.md) for how versions are numbered.

> Versions before 0.9.1 were built before this repository existed. They contained company data, so they aren't published or documented here.

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
