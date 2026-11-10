# Demo week

A complete **made-up** planning folder for training and for presenting the Route Planner. No company data is used: the company, customers, drivers, orders and load numbers are all invented. It's safe to share.

```
demo/Route_planning/
├── MASTER_DATA/
│   ├── MASTER_DEL_DETAILS.xlsx      58 customers in 7 bays (a few without a map location)
│   ├── FIXED_ROUTES_DIPSDATA.xlsx   BAY 07 Mon/Wed/Fri, BAY 06 Tue/Thu, BAY 01 every day (only a reference when deferring orders; no routes are built from it)
│   └── users.json                   Alex (Master), Sam (Manager), Jordan + Casey (User), Warehouse (Viewer)
├── REPORTS/week_46/                 Mon 09.11 – Fri 13.11.2026
│   └── DIPS_Plan_<wd>.xlsx  RES_<wd>.xlsx  PROD_<wd>.xlsx  UPLIFTS_<wd>.xlsx
├── CHECK_SHEETS/JDE/week_46/        five fake check-sheet PDFs (Offloading Sheet layout); the file names don't say the day, the app reads it from the pages
└── PLANS/week_46/                   five plans (one per day, each based on the previous one) + one snapshot
```

## Use it

1. Copy `demo/Route_planning` somewhere on your computer (or download the repository as a ZIP).
2. Open `Route Planner.html` in **Chrome** or **Edge**.
3. Start window: **Choose folder…** and pick your copy of `Route_planning`. The users file is read from `MASTER_DATA`.
4. Pick **Alex**, then **Continue** on the folder check (✅ Ready). The customers and fixed routes load by themselves, then the **Master data & reports** window shows each file as ✓ loaded / ⚠ changed / not loaded. Click **Continue**.
5. Then either:
   - **Load day:** pick week 46 and the DIPS Plan + RES files, then follow the [user guide](../docs/user-guide.md); or
   - **Open plan:** open one of the plans in `PLANS/week_46` to see a week already planned, with moves, deferrals, a split, an inserted order, a new route, a new day, customer edits, docket changes and customization.

Try the same plan as **Warehouse** (Viewer) or **Casey** (User) to show how roles change what you can do. **Jordan** has no folder in the users file, so use Jordan to show the failed check and how a Master fixes it.

> The demo users file has `"shareComputers": true`, so you can switch between users on one laptop while presenting. The company file leaves it out, so each laptop is registered to one person and nobody else can use it.

## Presenting to the team (suggested order)

1. Start window: the company name is the heading and sits next to the version, top left. It's locked, so link the folder, pick a name and pass the checks. Then try **Jordan**: the check fails because no folder is set. Only a Master or Manager can fix it, from inside the planner.
2. **Master data & reports** window, then the **Customers** map (master and fixed routes loaded automatically). Change a master file in the folder and reopen the window from 👤 to show the ⚠ tag.
3. **Load day:** the whole week in one go.
4. **Planning:**
   - move one drop, then a group (box-select on the map);
   - defer one drop onto a bay, then a group without a bay;
   - split with dockets;
   - insert an order (P&W);
   - new route and new day.
5. **Customers:** fix a missing location and add a customer.
6. **Change report:**
   - allocate the deferred group (it stays one line);
   - change a docket;
   - sort, filter, export and print.
7. **Customize:** dark / light theme and a bay colour.
8. **Resources:** rename a route (Route / Bay), add a comment, copy and paste a block, export to Excel.
9. **Printing:** choose the Monday PDF from **CHECK_SHEETS › JDE** (the window shows the day it read from each PDF) and click **Organise PDFs**: a cover per route in plan order, moved orders on their new route, deferred orders apart.
10. **Save** (into `PLANS/week_46`), then **Open plan**, then a snapshot.
11. Switch to **Warehouse**: view-only.

## Rebuild it

```
cd tests
npm install
npm run demo   # regenerates the reports, then runs the walkthrough that saves the plans and the screenshots in docs/img
```

`npm test` runs the same walkthrough on a temporary copy, so the demo folder isn't changed.
