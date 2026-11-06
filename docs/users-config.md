# Users file (`users.json`)

The Route Planner has no names built in. The list of people, their roles and their folder come from **`MASTER_DATA/users.json`** in the company folder. The app reads it fresh every time it opens.

The real file lives only on the shared drive. It's git-ignored and must **never** be committed to this public repository.

Nobody can use the planner without choosing a name from this file and passing the folder check; see the [user guide](user-guide.md#1-start-company-folder-your-name-and-the-folder-check).

## Format

```json
{
  "company": "Demo Transport Ltd",
  "users": [
    { "name": "Alex",      "role": "MASTER",  "path": "C:\\Users\\alex\\OneDrive - Demo Transport\\Transport\\Route_planning" },
    { "name": "Sam",       "role": "MANAGER", "path": "C:\\Users\\sam\\OneDrive - Demo Transport\\Transport\\Route_planning" },
    { "name": "Jordan",    "role": "USER",    "path": "" },
    { "name": "Warehouse", "role": "VIEWER",  "path": "C:\\Users\\warehouse\\OneDrive - Demo Transport\\Transport\\Route_planning" }
  ]
}
```

| Field | Required | Meaning |
|---|---|---|
| `company` | no | Shown on the start window |
| `users[].name` | yes | Shown on the start window, in saved file names and in "saved by". Must be unique |
| `users[].role` | yes | `MASTER`, `MANAGER`, `USER` or `VIEWER`. At least one user must be `MASTER` |
| `users[].path` | for access | The `Route_planning` folder as it appears on that person's computer. A user with no path can't get in until a path is set |

In JSON every `\` in a Windows path is written twice (`\\`). The demo file is [`demo/Route_planning/MASTER_DATA/users.json`](../demo/Route_planning/MASTER_DATA/users.json).

**Several users files:** if `MASTER_DATA` holds more than one (`users*.json`), the start window lists them so you can choose, in the same way as opening a plan. The choice is remembered on that computer.

## Roles

| Role | Can do |
|---|---|
| **MASTER** | Everything: add and remove users, change any role, set **anyone's** folder, Customize, undo, reset |
| **MANAGER** | Everything except adding users and Customize. Can change the role and folder of **Users and Viewers**, and set **their own** folder |
| **USER** | Create and edit (load days, move, defer, split, insert, routes, days, customers, dockets, save), but not remove anything. Can set **their own** folder |
| **VIEWER** | View only, like a snapshot: open plans, look at the maps and the report, print and export. Can set **their own** folder |

## The folder check

When someone picks their name, the app checks:

- **Company folder:** the linked folder is available on this computer.
- **A folder is set:** the user has a `path` in the users file.
- **It's their folder:** the linked folder is that path (the folder names match, e.g. `Route_planning`).
- **Structure:** `MASTER_DATA` and `REPORTS` are in it. A missing `PLANS` is only a warning, because it's created on the first save.
- **Reference files:** the customer master and fixed routes are in `MASTER_DATA` (a warning if not).

**✅ Ready** → **Continue** opens the planner. **⛔ Failed** → the planner stays locked; **Continue — fix it** goes to setting the folder or choosing the right one.

> A web page can't open a folder from a typed path, and it can't read the full path of a folder you pick. So the typed `path` is the reference stored in the users file, and **Browse…** links the folder on that computer and fills in its name.

## Changing users and folders

- **Your own folder (everyone):** 👤 → **My folder…** → paste the path or **Browse…** → **Save**.
- **Other users (Master, or Manager for Users and Viewers):** 👤 → **Manage users…** → edit roles and folders (Master can also add or remove users) → **Save to MASTER_DATA**.

Changes are written straight into `MASTER_DATA/users.json`, so everyone gets them the next time they open the app.

**↺ Reset** (Master or Manager) clears everything the app keeps on that computer, including the folder link. The app goes back to the start window.

## Important

Roles are **guardrails for the prototype**. A file-only app can't stop someone who edits the file. Real permissions need a server; see [backend-blueprint.md](backend-blueprint.md).
