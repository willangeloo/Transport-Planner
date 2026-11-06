# Tests

Browser checks for `Route Planner.html`, run with **fake** data only.

```
cd tests
npm install
npx playwright install chromium   # first time only, on your own PC
npm test
```

- `folder.js` builds a fake shared folder (`MASTER_DATA`, `REPORTS/week_XX`, `PLANS/week_XX`) with the File System Access API mocked, and checks listing, week dates, import, saving to `PLANS/week_XX` and opening from there.
- `demo/make-demo.js` builds the demo week in `demo/Route_planning`; `demo/walkthrough.js` goes through the start window and uses **every feature** on it, then opens a snapshot on a fresh browser (it is also the acceptance test for a future backend). `npm run demo` regenerates the demo plans and the screenshots in `docs/img`.
- The CDNs are replaced by the local `leaflet` / `xlsx` packages and map tiles are blocked, so it runs offline.

Never add real files here: `.xlsx` files are git-ignored everywhere except the invented demo week in `demo/`.
