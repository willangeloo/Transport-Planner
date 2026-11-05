# Transport Planner

**Route Planner** is a single-file HTML app for route planners. It has no backend, and everything runs in the browser. Planners use it to:

- load each day's planning and RESOURCES Excel files;
- see drops on a map by bay;
- move, defer, insert or split orders, add routes, and edit or add customers;
- produce a change report used to update other systems;
- share plans as `.json` files or view-only `.html` snapshots.

Open `Route Planner.html` in Chrome or Edge.

## No data in this repository

This repository is public, so no customer or operational data is committed. The app reads everything at runtime from files the planner chooses:

| File | How it gets into the app |
|---|---|
| `MASTER_DEL_DETAILS.xlsx` (customer master) | **Load day** → drop the file once. It is kept in the browser and copied into saved plans / snapshots. |
| Planning + RESOURCES (`DIPS_Plan_<wd>.xlsx`, `RES_<wd>.xlsx`) | **Load day** |
| `FIXED_ROUTES_DIPSDATA.xls` | **Load day** |

## Shared folder

Each user links the shared **Planning app** folder once (👤 button). After that, the app reads its subfolders:

- **Load day** lists the files by section (DIPS Plan, Resources, Products, Uplifts, POD, Customer master, Fixed routes), with one chip per `week_XX` folder. It opens on the week with the newest files.
- **Dates:** a report named only with its weekday (`RES_Tue.xlsx`) gets its date from the week folder plus the weekday. For example, `REPORTS/week_45/RES_Tue.xlsx` is Tue 03.11. Planning files still take the date from the *Date Promised Shipment* column.
- **Old names:** `Tue - 03.11.xlsx`, `Tue - 03.11 RESOURCES.xlsx` and `… - PRODUCTS.xlsx` are recognised too, and folder names are matched without case (`REPORT` / `REPORTS`, `Week_45` / `week_45`).
- **Skipped:** `_ARCHIVE`, `_RESTORED` and `PROMPTS` are ignored. Products, Uplifts and POD are listed but can't be imported yet.
- **Save / share** saves into `PLANS/week_XX` (the ISO week of the day being planned) as `v<version>_<date>_<time>_<user>.json` / `.html`, for example `v0.9.2_2026-11-05_15.58_Willian.json`.
- **Open plan** lists `PLANS/week_XX` the same way.

## Folder layout

The repo mirrors the shared "Planning app" folder. Data folders exist only on your PC / Drive and are git-ignored:

| Path | In git | Contents |
|---|---|---|
| `Route Planner.html` | yes | The app (current version) |
| `tests/` | yes | Browser tests with fake data |
| `MASTER_DATA/` | no | Customer master, fixed routes, manifest |
| `REPORTS/week_XX/` | no | Daily reports |
| `PLANS/week_XX/` | no | Saved plans and snapshots |
| `PROMPTS/` | no | Requirement notes |
| `_ARCHIVE/` | no | Old app versions and samples |

## Contributing

Branch names, the PR flow and versioning are described in [CONTRIBUTING.md](CONTRIBUTING.md).

## Versions

There is one file name. Each release is a git tag (`v0.9.1`, …), and older versions can be downloaded from the tags page. The version shown in the app header comes from `APP_VERSION` in the file.

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
