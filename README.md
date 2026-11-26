# Mock CI tool

A small Next.js app that acts like Jenkins or GitLab, for testing **Use another CI tool** in Test Management.

When Test Management starts a job, this app:

1. Checks the `Authorization` access detail, and answers 401 if it's wrong.
2. Pretends to run tests for 15 seconds.
3. Sends a JUnit report back to Test Management with an API key.

The page at http://localhost:4000 shows each request it received. It never shows header values.

## Set up

```bash
cd ~/Desktop/mock-ci-app
cp .env.example .env.local
npm run dev
```

In `.env.local`, set `XISUITE_TM_KEY` to a key from **Test Management → API keys**. Restart the app after changing it.

## Give it a public address

Test Management only calls public `https` addresses, so `localhost` is refused. In a second terminal:

```bash
ngrok http 4000
```

Copy the `https://….ngrok-free.app` address it shows.

## Create the setting

In **Test Management → Automation → New automation**:

| Field | Enter |
|---|---|
| Name | `Mock CI` |
| Use another CI tool | Ticked |
| Address that starts the job | `https://YOUR-ADDRESS.ngrok-free.app/api/ci/start` |
| Access detail | Name `Authorization`, value `Bearer test123` |
| Request text (Advanced options) | The JSON shown on the app's page |

## Run it

Your execution needs Generic test cases with these automation keys, or nothing will match:

- `auth.login.valid`
- `auth.login.wrong-password`
- `payments.card.success`

The list is in `lib/jobs.ts` if you want other names.

1. Open the execution and click **Run automation**, then pick `Mock CI`.
2. Test Management should show **Sent to CI**.
3. This app's page should show the job as **running**.
4. After 15 seconds, the execution should show two passed tests and one failed test.

## Try these too

| Change | Expected |
|---|---|
| Access detail value `Bearer wrong` | Run shows **Failed** with status 401 |
| Method PUT | Works the same |
| `XISUITE_TM_KEY` empty | Job finishes, but no results are sent |

## My tasks

Logged-in users also get a small task list at http://localhost:4000/tasks (link "My tasks →" on the home page).

- Add a task with a title (1–120 characters) and optional notes (up to 1000).
- Move it through **To do**, **In progress** and **Done**, edit it, or delete it.
- Search by title or notes and filter by status.
- Each user sees only their own tasks. They are kept in `data/tasks.json`, next to `data/users.json`.

| API | What |
|---|---|
| `GET /api/tasks?q=&status=` | your tasks, newest first (`status` is `todo`, `doing` or `done`) |
| `POST /api/tasks` | create: `{ "title": "...", "notes": "..." }` |
| `PATCH /api/tasks/:id` | change any of `title`, `notes`, `status` |
| `DELETE /api/tasks/:id` | remove |

Not logged in gives 401, bad input 400, and a task that is missing or someone else's 404.
