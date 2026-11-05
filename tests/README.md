# Tests

Browser checks for `Route Planner.html`, run with **fake** data only.

```
cd tests
npm install
npx playwright install chromium   # first time only, on your own PC
npm test
```

- `fixtures.js` writes made-up spreadsheets (customer master, planning, RESOURCES) to a temp folder.
- `e2e.js` opens the app in Chromium, loads them, saves a plan and a snapshot, and reopens both in a fresh browser.
- The CDNs are replaced by the local `leaflet` / `xlsx` packages and map tiles are blocked, so it runs offline.

Never add real files here: `.xlsx` files are git-ignored everywhere.
