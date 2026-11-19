# Build log

How Keyturn was built, in order, including the mistakes. Built with Claude Code
(Claude Opus 5.5 and Claude Fable 5.2) directed by Kyle Becker.

## Nov 18, evening: framing

- Read the brief and profiled all three Scenario A sheets in Python before choosing what to build. The profile found the planted problems: mixed unit, date and money formats per property, occupied units with no resident, reversed lease dates, missed notice windows, expired COIs.
- Picked the command center over the narrower rent roll tool or vendor triage, because it can use all three sheets and the cross-sheet contradictions only show up when they are read together.
- Kyle asked for ML forecasting. Pushed back: one snapshot of 126 tasks has no history to train on. ML was shelved in favor of a readiness score that can be checked by hand.
- Researched Yardi, RealPage and Entrata. Their AI work is on leasing and resident operations inside the system of record. Nothing public covers the takeover window before a property is loaded, which became the positioning.
- Locked decisions: "today" is Oct 16 (the data's as-of date), data pack only, Next.js and Supabase.
- "Day One" was the working name. It is a registered software trademark, so the app became Keyturn.

## Nov 18, night: build

| Phase | What was built | What went wrong |
|---|---|---|
| P0 | Next.js app, Supabase project, demo sign-in by role | Planned to host on Vercel. Kyle's other projects are on Render, so hosting moved there. |
| P1 | Schema, normalization, data load | Supabase's tools gave no admin key, so the load signs in as the demo director and row level security allows only that role to load data. |
| P2 | 27 rules and the sync that opens and clears exceptions | A test assumed Nov 27 was a business day. Treating the day after Thanksgiving as closed is now a stated assumption. |
| P3 | Inbox, edits, audit trigger, live updates | The sync compared JSON by text. Postgres reorders JSON keys, so every edit rewrote all 115 exceptions and took 9 seconds. Comparing by content brought it to about 0.2 seconds. |
| P3 | Live updates | The socket subscribed before it had the user's token, so row level security dropped every event. Fixed by setting the token first, then verified by changing a row from outside the app. |
| P4 | Map, readiness, property pages | The map rendered at zero height because the map library overrides the container's positioning. Its worker file also had to be served from the app. |
| P4 | Rent roll review | Property roll-ups ("60 units past lease end") marked their example rows as flagged, which made 17 clean-looking rows show a flag. Roll-ups no longer flag rows. |
| P5 | Assistant and drafting | No Claude key was available during the build, so the assistant and Claude-written drafts were not run end to end. The query tools are unit tested and drafts fall back to a labeled template. |
| P6 | Holiday rule, morning brief | Weather, Census and flood overlays were cut. Dec 1 was outside any forecast window on Oct 16. |

## What was checked, and how

- 56 unit tests: every messy format in the rent roll, rule counts against the independent Python profile, rules reacting to edits, and the assistant's query tools.
- In a browser: sign-in, the inbox, drafting an escalation, the map and its panel, editing a task and seeing its exception clear, the audit log, and phone width with no sideways scroll.
- Live updates: changed a row directly in the database and watched an open inbox update.

## Not checked

- The assistant and Claude-written drafts against the live API.
- Installing to a phone home screen on a real device.
- The hosted deployment on Render.
