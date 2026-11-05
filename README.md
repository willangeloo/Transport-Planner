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

## Versions

There is one file name. Each release is a git tag (`v0.9.1`, …), and older versions can be downloaded from the tags page. The version shown in the app header comes from `APP_VERSION` in the file.

## Customer master columns

Column names are matched loosely. The first sheet that has a Ship To column plus Latitude or Eircode is used:

| Field | Accepted headers |
|---|---|
| Ship To | Ship To, Ship To Number, Account, Customer Number… |
| Name | Ship To Name, Customer Name, Name… |
| Address | Address, or Address Line 1–4 / Town / County joined |
| Eircode | Eircode, Postcode |
| Coordinates | Latitude / Longitude (or Lat / Lng) |
| Bay | Bay, Delivery Bay, Trip Tag |
| Delivery days | Delivery Days (`Mon, Wed`, `MON/THU` or `.M.W...`), or one column per day (Mon … Sat) |
| Time window | Time Window, or Open / Close (From / To) |
