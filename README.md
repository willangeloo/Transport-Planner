# Transport Planner

**Route Planner** is a single-file HTML app for route planners. It has no backend, and everything runs in the browser. Planners use it to:

- load each day's planning and RESOURCES Excel files;
- see drops on a map by bay;
- move, defer, insert or split orders, add routes, and edit or add customers;
- produce a change report used to update other systems;
- share plans as `.json` files or view-only `.html` snapshots;
- tag every order's docket (P&W / Check Sheet);
- keep each day's routes, crews and trucks in an Excel-like **Resources** sheet;
- organise the JDE check-sheet PDF by route, in the order of the day's plan (**Printing**);
- plan the **uplifts** (pick-ups of empty kegs or damaged stock) from the outstanding report: with the customer's delivery or by hand, on the map as triangles, followed in **Uplift Control** and printed apart;
- see the week at a glance on the **Home** page (one balloon per day with its totals);
- give each person a role (Master, Manager, User, Viewer) from a users file.

Open `Route Planner.html` in Chrome or Edge.

| Read this | For |
|---|---|
| [docs/user-guide.md](docs/user-guide.md) | How to do each task, with screenshots |
| [demo/README.md](demo/README.md) | The demo week: made-up data to try or present the app |
| [docs/users-config.md](docs/users-config.md) | The users file (`users.json`) and roles |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | What changed in each version |
| [docs/backend-blueprint.md](docs/backend-blueprint.md) | How to build the production version with a backend |

## No data in this repository

The app reads everything at runtime from files the planner chooses. The only spreadsheets in the repository are the invented [demo week](demo/README.md).

| File | How it gets into the app |
|---|---|
| `users.json` (people, roles, folders) | Read from `MASTER_DATA` on the start window. Nobody can use the planner without picking a name from it and passing the folder check. See [users-config.md](docs/users-config.md) |
| `MASTER_DEL_DETAILS.xlsx` (customer master) | Read from `MASTER_DATA` when the shared folder is linked (or **Load day** → drop the file). It's kept in the browser and copied into saved plans and snapshots |
| `FIXED_ROUTES_DIPSDATA.xls` | Same as the customer master |
| Planning + RESOURCES (`DIPS_Plan_<wd>.xlsx`, `RES_<wd>.xlsx`) | **Load day**, or **Resources → Upload sheet** for RESOURCES |
| Uplifts outstanding (`UPLIFTS_<wd>_AM.xlsx`, `UPLIFTS_<wd>_PM.xlsx`) and Products (`PROD_<wd>.xlsx`) | **Load day** / **📁 Reports**. The uplifts report is exported at least twice a day: the newest one says what is outstanding. Products give the CS / EA / KEG totals on the Home page |
| Check-sheet PDF (JDE Offloading Sheet / Delivery Docket) | `CHECK_SHEETS/JDE/week_XX`, imported from **Printing → Import PDF**. The day is read from the first 3 pages of the PDF, not from its name. Read in the browser only, never saved with the plan. Organised PDFs are saved in `CHECK_SHEETS/Organised` as `date_time_user.pdf`. PDFs are git-ignored (except the demo week's fake ones) |

## Shared folder

Each user links the shared **Route_planning** folder once (👤 button). After that, the app reads its subfolders:

- **Load day** lists the files by section (DIPS Plan, Resources, Products, Uplifts, POD, Customer master, Fixed routes), with one chip per `week_XX` folder. It opens on the week with the newest files.
- **Dates:** a report named only with its weekday (`RES_Tue.xlsx`) gets its date from the week folder plus the weekday. For example, `REPORTS/week_45/RES_Tue.xlsx` is Tue 03.11. Planning files still take the date from the *Date Promised Shipment* column.
- **Old names:** `Tue - 03.11.xlsx`, `Tue - 03.11 RESOURCES.xlsx` and `… - PRODUCTS.xlsx` are recognised too, and folder names are matched without case (`REPORT` / `REPORTS`, `Week_45` / `week_45`).
- **Skipped:** `_ARCHIVE`, `_RESTORED` and `PROMPTS` are ignored. POD is listed but can't be imported yet.
- **MASTER_DATA:** the customer master and fixed routes are read automatically, and read again only when those files change.
- **💾 Save** saves into `PLANS/week_XX` (the ISO week of the day being planned) as `v<version>_<date>_<time>_<user>.json`, for example `v0.10.0_2026-11-06_16.05_Alex.json`. **Save as / share** lets you choose the place, or make a snapshot.
- **Open plan** lists `PLANS/week_XX` the same way.

## Folder layout

The repo mirrors the shared "Planning app" folder. Data folders exist only on your PC / Drive and are git-ignored:

| Path | In git | Contents |
|---|---|---|
| `Route Planner.html` | yes | The app (current version) |
| `docs/` | yes | User guide, changelog, users file, backend blueprint |
| `demo/` | yes | The demo week (made-up data, safe to share) |
| `tests/` | yes | Browser tests and the demo generator |
| `MASTER_DATA/` | no | Customer master, fixed routes, manifest, `users.json` |
| `REPORTS/week_XX/` | no | Daily reports |
| `PLANS/week_XX/` | no | Saved plans and snapshots |
| `_ARCHIVE/` | no | Old app versions and samples |

## Contributing

Branch names, the PR flow and versioning are described in [CONTRIBUTING.md](CONTRIBUTING.md).

## Versions

There is one file name, `Route Planner.html`. The current version is **v0.12.0** (BETA). What changed in each version is in [docs/CHANGELOG.md](docs/CHANGELOG.md). The version shown in the app header comes from `APP_VERSION` in the file. Releases are tagged on `main` after merging (see [CONTRIBUTING.md](CONTRIBUTING.md)).

## Customer master columns

Column names are matched loosely. The first sheet that has a Ship To column plus Latitude or Eircode is used:

| Field | Accepted headers |
|---|---|
| Ship To | Ship To, Ship To Number, Account, Customer Number… |
| Name | Ship To Name, Customer Name, Name… |
| Address | Address, or Address Line 1–4 / Town / County joined |
| Eircode | Eircode, Postcode, Postal Code |
| Coordinates | Latitude / Longitude (or Lat / Lng) |
| Bay | Bay, BAYS, Delivery Bay, Trip Tag |
| Delivery days | Delivery Days (`Mon, Wed`, `MON/THU` or `.M.W...`), or one column per day (Monday … Friday, or Mon … Sat) |
| Time window | Time Window, or Open / Close (From / To) |
