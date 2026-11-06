# Users file (`users.json`)

The Route Planner has no names built in. The list of people, their roles and their shared folder come from a small JSON file that each computer loads once on the home page (**📄 Load users file…**). Keep the real file in `MASTER_DATA/users.json` on the shared drive. It is git-ignored and must **never** be committed to this public repository.

## Format

```json
{
  "company": "Demo Transport Ltd",
  "users": [
    { "name": "Alex",      "role": "MASTER",  "path": "C:\\Users\\alex\\OneDrive - Demo Transport\\Transport\\Route_planning" },
    { "name": "Sam",       "role": "MANAGER", "path": "" },
    { "name": "Jordan",    "role": "USER",    "path": "" },
    { "name": "Warehouse", "role": "VIEWER",  "path": "" }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `company` | no | Shown on the home page |
| `users[].name` | yes | Shown on the home page, in saved file names and in "saved by". Must be unique |
| `users[].role` | yes | `MASTER`, `MANAGER`, `USER` or `VIEWER`. At least one user must be `MASTER` |
| `users[].path` | no | The `Route_planning` folder as it appears on that person's computer. It's shown when they link the folder, and the app warns if they pick a different one |

In JSON every `\` in a Windows path is written twice (`\\`).

The demo file is [`demo/Route_planning/MASTER_DATA/users.json`](../demo/Route_planning/MASTER_DATA/users.json).

## Roles

| Role | Can do |
|---|---|
| **MASTER** | Everything, including adding and removing users, changing any role, and the **Customize** tab |
| **MANAGER** | Everything a Master can do, except adding users, changing Master users, and Customize |
| **USER** | Create and edit (load days, move, defer, split, insert, routes, days, customers, dockets, save), but not remove anything (no undo, removing days or reset) |
| **VIEWER** | View only, like a snapshot: open plans, look at the maps and the report, print and export |

Opening the app **without a user** while a users file is loaded gives view-only access. Without any users file the app runs in **open mode**, with full access and local names.

## Changing users

1. Master or Manager: click the 👤 button, then **Manage users…**.
2. Edit names, roles and folders, or add and remove users (Master only), then click **Save**. This changes the list in this browser.
3. Click **⤓ Export users file…** and replace `MASTER_DATA/users.json` with the exported file, so everyone gets the same list.
4. On other computers: home page → **Load another users file…**.

**↺ Reset** (Master or Manager) also removes the users file from that computer, along with everything else. The app goes back to the home page to load it again.

## Folder paths

The linked folder is the **root** of the shared planning folder (`…\Route_planning`), not a week folder. The app finds `MASTER_DATA`, `REPORTS\week_XX` and `PLANS\week_XX` itself.

## Important

Roles are **guardrails for the prototype**. A file-only app can't stop someone who edits the file or picks another name. Real permissions need a server; see [backend-blueprint.md](backend-blueprint.md).
