# Tests

Browser checks for `Route Planner.html`, run with **fake** data only.

```
cd tests
npm install
npx playwright install chromium   # first time only, on your own PC
npm test
```

- `folder.js` builds a fake shared folder (`MASTER_DATA`, `REPORTS/week_XX`, `PLANS/week_XX`) with the File System Access API mocked, and checks listing, week dates, import, saving to `PLANS/week_XX` and opening from there.
- `features.js` checks the **uplifts** (report times, outstanding / completed, automatic and manual plan, UPLIFT column, map triangles and the Uplifts button, Uplift Control, Printing › Uplift, the UPLIFT tag in Delivery, the Change report section), the **Home** page and the **Resources** sheet (select, copy / paste blocks, rows and columns, export and upload, view-only) and **Printing** (a fake check-sheet PDF made with `lib/checksheet.js`, in the layout of a real JDE Offloading Sheet Report with invented data: reallocations, blank pages, UNASSIGNED, integrity checks, reprint).
- `demo/make-demo.js` builds the demo week in `demo/Route_planning` (reports, products, uplifts, POD and the check-sheet PDFs; Thursday's PDF holds the UNASSIGNED and REVIEW cases); `demo/walkthrough.js` goes through the start window, the Options tab, the P&W filter, the company name, the master data & reports window and uses **every feature** on it, then opens a snapshot on a fresh browser (it is also the acceptance test for a future backend). `npm run demo` regenerates the demo plans and the screenshots in `docs/img`.
- The CDNs are replaced by the local `leaflet` / `xlsx` / `pdfjs-dist` / `pdf-lib` packages and map tiles are blocked, so it runs offline.

Never add real files here: `.xlsx` files are git-ignored everywhere except the invented demo week in `demo/`.
