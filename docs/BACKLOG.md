# Backlog for Kyle

Parked during the overnight build of Nov 18. Items 1 to 3 block the deliverables.

## Needs you

### 1. Render service (blocks the public link)
`keyturn.onrender.com` answered "no-server" when I checked, and the Render dashboard needs your sign-in.
- Open the `keyturn` service in Render and send me its address and deploy status, or paste the deploy log if it failed.
- Or give me a Render API key and I will create and check it myself.
- `main` has everything. The service needs two secret values: `DEMO_PASSWORD` (in `.env.local`) and `ANTHROPIC_API_KEY`.

### 2. Claude API key (blocks the assistant and Claude-written drafts)
You said to use your existing key. It is not set in this shell, and I was blocked from searching your other projects for it.
- Add `ANTHROPIC_API_KEY=...` to `.env.local` here, and to the Render service.
- Until then the Ask screen is off and drafts use a plain template that says so.
- These two features have never run against the live API. I need about 15 minutes with a key to test and tune them.

### 3. Reviewer access to the GitHub repo
Hannah listed five reviewers by email. GitHub needs usernames, or I can invite by email.
- Should I invite those five addresses to `kjbecker85/keyturn` as read-only collaborators? That sends each of them an email from GitHub.

### 4. The video
The brief wants a 5 to 10 minute narrated video. That one is yours. I can write a demo script with a click path if you want it.

### 5. Time spent
The brief asks roughly how long you spent and where the time went. The commit history runs from 8:54 PM to about 11:00 PM on Nov 18 for the build. Add your own planning and review time.

## Decisions I made without you. Say so if you want any changed.

- **Merged the overnight work into `main`**, so Render deploys the full app as soon as the service exists.
- **Left out shadcn/ui, TanStack Table and Recharts** from the spec's stack. Plain Tailwind components were faster and there are no charts. cmdk and MapLibre are in.
- **Cut the weather, Census and flood overlays.** On Oct 16 a Dec 1 forecast does not exist, so the weather panel would have shown nothing real. The holiday calendar is in and drives a rule.
- **Treated the Friday after Thanksgiving as a closed day.** It moves two critical deadlines to Wed Nov 25.
- **Demo roles have no password.** Anyone with the link can sign in as any role and edit data. The director can reset the data from the Assumptions screen.
- **All three roles can see and edit everything.** The assignee role only changes the default inbox filter.
- **Readiness weights are my judgment:** Critical 10, High 5, Medium 2, Low 0.5, capped per area at 35 checklist, 25 vendors, 25 rent roll, 15 cross-sheet.
- **No service worker.** The app installs from its manifest. It does not work offline.
- **Supabase flagged one low-risk item:** signed-in users can call the `is_director()` function. It only tells a caller whether they are the director. I left it.
