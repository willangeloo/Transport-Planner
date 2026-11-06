# Demo week

A complete **made-up** planning folder for training and for presenting the Route Planner. No company data is used: the company, customers, drivers, orders and load numbers are all invented. It's safe to share.

```
demo/Route_planning/
├── MASTER_DATA/
│   ├── MASTER_DEL_DETAILS.xlsx      58 customers in 7 bays (a few without a map location)
│   ├── FIXED_ROUTES_DIPSDATA.xlsx   BAY 07 Mon/Wed/Fri, BAY 06 Tue/Thu, BAY 01 every day
│   └── users.json                   Alex (Master), Sam (Manager), Jordan + Casey (User), Warehouse (Viewer)
├── REPORTS/week_46/                 Mon 09.11 – Fri 13.11.2026
│   ├── DIPS_Plan_<wd>.xlsx  RES_<wd>.xlsx  PROD_<wd>.xlsx  UPLIFTS_<wd>.xlsx
└── PLANS/week_46/                   five plans (one per day, each based on the previous one) + one snapshot
```

## Use it

1. Copy `demo/Route_planning` somewhere on your computer (or download the repository as a ZIP).
2. Open `Route Planner.html` in **Chrome** or **Edge**.
3. Home page: click **Load users file…**, choose `Route_planning/MASTER_DATA/users.json`, then pick **Alex**.
4. Link the folder: choose your copy of `Route_planning`. The customers and fixed routes load by themselves.
5. Then either:
   - **Load day:** pick week 46 and the DIPS Plan + RES files, then follow the [user guide](../docs/user-guide.md); or
   - **Open plan:** open one of the plans in `PLANS/week_46` to see a week already planned, with moves, deferrals, a split, an inserted order, a new route, a new day, customer edits, docket changes and customization.

Try the same plan as **Warehouse** (Viewer) or **Jordan** (User) to show how roles change what you can do.

## Presenting to the team (suggested order)

1. Home page and roles → link the folder.
2. **Customers** map (master and fixed routes loaded automatically).
3. **Load day:** the whole week in one go.
4. **Plan the day:**
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
7. **Customize:** bay colour and a route name.
8. **Save** (into `PLANS/week_46`), then **Open plan**, then a snapshot.
9. Switch to **Warehouse**: view-only.

## Rebuild it

```
cd tests
npm install
npm run demo   # regenerates the reports, then runs the walkthrough that saves the plans and the screenshots in docs/img
```

`npm test` runs the same walkthrough on a temporary copy, so the demo folder isn't changed.
