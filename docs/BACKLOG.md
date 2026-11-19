# Backlog for Kyle

Questions and steps parked during the overnight build. Newest at the bottom.

## 1. Render service (blocks the public link)
`keyturn.onrender.com` returns "no-server", and the Render dashboard in my browser pane needs your sign-in.
- Open the `keyturn` service in Render and tell me its address and deploy status, or
- sign in to Render in the browser pane, or give me a Render API key, and I'll finish it.
The repo has `render.yaml` on `main` (Starter plan, Virginia). It needs `DEMO_PASSWORD` (value is in `.env.local`).

## 2. Claude API key (blocks live AI answers and drafts)
You said to use your existing key. It isn't set in this shell, and I was blocked from searching your other projects for it.
- Add `ANTHROPIC_API_KEY=...` to `.env.local` in this repo, and to the Render service's environment.
Until then the AI features run in a clearly labeled fallback mode.
