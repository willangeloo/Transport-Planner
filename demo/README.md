# Demo month

A complete **made-up** planning folder for training and for presenting the Route Planner: one whole month (**September 2026**, Monday to Friday) for a company with **1,500 customers**. No company data is used: the company, customers, drivers, orders and load numbers are all invented. It's safe to share.

| | |
|---|---|
| Customers | 1,500 in 28 bays, plus 2 Donegal bays (60 customers) that only show on the Customers tab |
| Orders per day | 189 – 364, about 270 on average (5,908 in the month) |
| Bays (routes) per day | 14 – 17, about 16 on average |
| Reports | Planning, Resources, Products and Uplifts for every working day of September (22 days) |
| Plans | One plan file per week; each week contains the weeks before it, and the plan of the last week holds the whole month |

```
demo/Route_planning/
├── MASTER_DATA/
│   ├── MASTER_DEL_DETAILS.xlsx      1,500 customers in 30 bays (some without a map location)
│   ├── FIXED_ROUTES_DIPSDATA.xlsx   the 28 bays with the days they run (only a reference when deferring orders; no routes are built from it)
│   └── users.json                   Alex (Master), Sam (Manager), Jordan + Casey (User), Warehouse (Viewer)
├── REPORTS/week_36 … week_40/       Tue 01.09 – Wed 30.09.2026 (week 36 starts on Tue 01.09, week 40 ends on Wed 30.09)
│   └── DIPS_Plan_<wd>.xlsx  RES_<wd>.xlsx  PROD_<wd>.xlsx  UPLIFTS_<wd>.xlsx   (+ POD_<wd>.xlsx in week 37)
├── CHECK_SHEETS/JDE/week_37/        two fake check-sheet PDFs (Mon 07.09 and Thu 10.09); the file names don't say the day, the app reads it from the pages
└── PLANS/
    ├── week_36/  plan of week 36 (4 days)
    ├── week_37/  plan of weeks 36 + 37 (9 days) + one snapshot
    ├── week_38/  weeks 36 – 38 (14 days)
    ├── week_39/  weeks 36 – 39 (19 days)
    └── week_40/  the whole month (22 days)
```

Each weekly plan has one planning change (a drop moved to another route) on the first day of that week, so the change report grows from 1 change in week 36 to 5 in week 40.

## What the demo files hold

| File | Content |
|---|---|
| `DIPS_Plan_<wd>`, `RES_<wd>` | The planning and the routes, crews and trucks of each day |
| `PROD_<wd>` | Products: one row per order line, in cases (**CS**) and kegs (**EA**): the Products totals on the Home page |
| `UPLIFTS_<wd>` | Pick-ups of empty kegs or damaged stock; every day has at least one (a simple layout: Ship To, Name, Product, Quantity, Reason — the app also reads the JDE CU report layout, see the [user guide](../docs/user-guide.md#20-uplifts)) |
| `POD_<wd>` (week 37) | Proof of delivery: one row per order with time and receiver; a few are short or refused. POD can't be imported yet |
| `CHECK_SHEETS/JDE/week_37/*.pdf` | One page per order, in the layout of the JDE Offloading Sheet Report: load, customer PO (some empty), order and delivery date, customer number and address, products with weights, empties, totals. Every order's weight adds up to the weight in the planning file. Everything is invented: no real customer, product, brand or logo. Upload one in **Printing** to try it |

The **Delivery Shortages** link isn't set in the demo's `users.json`: a Master pastes it during the demo.

## Use it

1. Copy `demo/Route_planning` somewhere on your computer (or download the repository as a ZIP).
2. Open `Route Planner.html` in **Chrome** or **Edge**.
3. Start window: **Choose folder…** and pick your copy of `Route_planning`. The users file is read from `MASTER_DATA`.
4. Pick **Alex**, then **Continue** on the folder check (✅ Ready). The customers and fixed routes load by themselves, then the **Master data & reports** window shows each file as ✓ loaded / ⚠ changed / not loaded. Click **Continue**.
5. Then either:
   - **Load day:** pick a week (36 – 40) and the DIPS Plan + RES files, then follow the [user guide](../docs/user-guide.md); or
   - **Open plan:** open `PLANS/week_40` to see the whole month planned, or an earlier week's plan to see how the plan grew.

Try the same plan as **Warehouse** (Viewer) or **Casey** (User) to show how roles change what you can do. **Jordan** has no folder in the users file, so use Jordan to show the failed check and how a Master fixes it.

> The demo users file has `"shareComputers": true`, so you can switch between users on one laptop while presenting. The company file leaves it out, so each laptop is registered to one person and nobody else can use it.

## Presenting to the team (suggested order)

1. Start window: the company name is the heading and sits next to the version, top left. It's locked, so link the folder, pick a name and pass the checks. Then try **Jordan**: the check fails because no folder is set. Only a Master or Manager can fix it, from inside the planner.
2. **Master data & reports** window, then the **Customers** map (master and fixed routes loaded automatically). Change a master file in the folder and reopen the window from 👤 to show the ⚠ tag.
3. **Load day:** a whole week in one go, then another week on top of it.
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
9. **Printing** (load week 37 first): choose the Monday PDF from **CHECK_SHEETS › JDE** (the window shows the day it read from each PDF: Mon 07.09) and click **Organise PDFs**: a cover per route in plan order, moved orders on their new route, deferred orders apart. Then import **Thursday's** PDF to show the exceptions: a load that is not in Resources (**UNASSIGNED**), a page nobody can read (**REVIEW**) and a signature-only page that is left out.
10. **Uplifts and Home:** load a day's `UPLIFTS` report; in **Planning › Uplift Control › Planned days** confirm the matches with the deliveries, then see them in red in the **UPLIFT** column, as triangles on the map and on the **Home** balloons.
11. **Save** (into `PLANS/week_XX`, the week of the day you are planning), then **Open plan**, then a snapshot.
12. Switch to **Warehouse**: view-only.

## Rebuild it

```
cd tests
npm install
npm run demo          # the whole month: make-month.js (reports) then make-plans.js (one plan file per week, made with the app itself)
npm run screenshots   # the screenshots in docs/img, from a small one-week data set (make-demo.js)
npm test              # all browser checks, on the same small one-week data set
```

The tests and the user guide's screenshots use a small one-week data set (week 46, 58 customers) so that they stay fast; the demo month is too big for them.
