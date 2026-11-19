# Keyturn

A transition command center for a property management takeover. Built for the Asset Living
build exercise, Scenario A: Property Transitions, "Day one without drama."

Asset Living takes over nine Texas properties on December 1, 2026. Keyturn reads the prior
manager's rent roll, the 126-task transition checklist and the 49 vendor contracts, works out
what is wrong or at risk, and puts it in one ranked inbox that the Director of Transitions can
act on. Every flag links back to the spreadsheet row that caused it.

**Live demo:** https://keyturn-4hfl.onrender.com (pick any demo role to sign in)

**Demo video:** https://keyturn-4hfl.onrender.com/demo (5 min 34 sec, no sign-in needed)

It covers the window before the properties exist in Yardi. That window runs on exports,
spreadsheets and email today, and no system owns it.

## Who it is for

| Role | What they get |
|---|---|
| Director of Transitions | The exceptions inbox across all nine properties, escalation drafts, readiness by property |
| Regional manager | Property pages, the map, and the owner's status report |
| Assignee | Their own tasks and flags, and a morning brief, on a phone |

## What it does

- **Overview dashboard.** The home screen: a countdown ring with portfolio readiness, a runway timeline of every deadline from today to Day One by property, a checklist heatmap by property and function, open exceptions by area and severity, dollars at stake, and a Day One pass for each property.
- **Exceptions inbox.** 27 rules run over the three sheets and raise 116 exceptions, ranked by severity and due date. Each one says why it fired and links to its source rows. Assign, add a note, resolve, or dismiss with a reason.
- **Triage mode.** One exception at a time, most urgent first. Resolve, take, escalate or skip with a key or a swipe.
- **Read and write.** Edit task status, assignee, due date and notes. Record keep, terminate or renegotiate on each contract. Review and correct rent roll rows with the prior manager's original cell shown next to each field. Every edit re-runs the rules, so fixing the data clears the exception.
- **Audit trail.** A database trigger logs every change with who made it and the before and after values. The app can't skip it.
- **Live updates.** A change in one session shows up in every other open session.
- **Map and readiness.** Nine pins colored by a readiness score. The score is arithmetic: 100 minus points for each open exception, capped per area, with every component shown.
- **Assistant.** Ask in plain language. Claude answers by calling five fixed, read-only query tools, cites the records it used, and each citation is a link.
- **Drafts.** Escalation emails, vendor termination notices and owner status reports, written from the facts in the source rows. Edit, then mark as sent.
- **Morning brief.** Each assignee's blocked tasks, upcoming deadlines and shifted dates.
- **Phone.** Every screen works at 375px and the app installs to the home screen.
- **Display.** Light by default with a dark theme, and a comfortable or compact text size, both under the user menu.

## What it found in the data

| Area | Rule | Count |
|---|---|---|
| Rent roll | Occupied or on notice with no resident name | 10 |
| Rent roll | Occupied or on notice at $0 rent | 5 |
| Rent roll | Lease ends before it starts | 4 |
| Rent roll | Same unit listed twice once "Apt 3203", "#3203" and "3203" are normalized | 3 |
| Rent roll | 0 square feet | 2 |
| Rent roll | Rent more than 20% below market (one noted "Staff unit?") | 6 |
| Rent roll | No rent roll received | 6 properties |
| Rent roll | Occupied units past lease end | 129 units, one roll-up per property |
| Rent roll | Resident balances | $73,207 owed by 61 residents, one roll-up per property |
| Checklist | Blocked tasks | 4 |
| Checklist | Tasks with no assignee | 4 |
| Checklist | Open tasks with no update in over 7 days | 20, plus the 4 blocked |
| Checklist | Due dates on a weekend or holiday | 7 task types |
| Vendors | Auto-renewing contracts whose notice window already passed | 6 |
| Vendors | Notice deadlines before Dec 31 | 3 |
| Vendors | Contracts that end before takeover with no auto-renew | 6, two of them elevator and fire safety |
| Vendors | Expired certificates of insurance | 3 |
| Vendors | Contracts that can't transfer to a new manager | 24, one roll-up per property |
| Vendors | Two contracts for the same service at one property | 2 |
| Cross-sheet | Contradictions between sheets | 11 |

The cross-sheet checks are the ones a single spreadsheet can't show:

- Elm Street Lofts' vendor review is blocked because the prior manager "hasn't sent contracts," yet seven of its contracts are in the vendor sheet.
- Six system tasks (Yardi setup, ledger migration) are in progress or complete at properties with no rent roll in the data.
- Lakeline Vista's "collect COIs" task is complete while a certificate on file expired in June.
- Trinity Bluffs' vendor review is complete with a contract problem still open.
- Two properties have gate contracts that won't carry over to the keys and access handover.

The checklist also plans around a calendar that doesn't exist. "Migrate resident ledgers" is due
Saturday November 28 and "Keys and access handover" is due Sunday November 29, both in
Thanksgiving weekend. The real deadline for each is Wednesday November 25.

## Assumptions

- "Today" is Friday, October 16, 2026, the data pack's as-of date.
- Messy values are flagged, never silently fixed. Each row keeps its raw cells.
- O, Occ and Occupied mean occupied. Notice means occupied with a move-out pending.
- An occupied unit past its lease end is treated as month-to-month.
- Notice deadline = current term end minus termination notice days.
- The Friday after Thanksgiving is treated as a closed day.
- Map pins are invented points inside each city. The data has no addresses.
- Dana Whitfield and Luis Ortega are invented demo users. Assignees come from the checklist.

The same list is in the app under Assumptions.

## What it does not do

- **No machine learning.** One snapshot of 126 tasks is not enough to train on, so readiness is a score you can check by hand.
- **No file upload.** It runs on the data pack. A real intake tool would accept the next prior manager's export.
- **No email sending and no Yardi connection.** Drafts are logged as sent. The rent roll export is a clean CSV in a placeholder layout, because Yardi's import template has to come from Asset's Yardi team.
- **No real sign-in.** Demo roles need no password. That is only acceptable because the data is synthetic.
- **No weather, Census or flood overlays.** December 1 was outside any forecast window on October 16.
- **Roles don't restrict data.** All three roles can see and edit everything. The assignee role only changes the default view.

## How it is put together

| Layer | Choice |
|---|---|
| App | Next.js 16 (App Router, TypeScript), Tailwind 4 |
| Data | Supabase Postgres with row level security, audit triggers and Realtime |
| Rules | Plain TypeScript in `src/lib/rules`, unit tested |
| Map | MapLibre GL with OpenFreeMap tiles, no API key |
| Charts | Hand-built SVG for the countdown ring, runway and heatmap. Nivo for the exceptions sunburst |
| Icons | Phosphor, duotone weight |
| AI | Claude API. Sonnet 5.5 for the assistant and escalations, Opus 5.5 for notices and reports |
| Holidays | Nager.Date public holiday list, saved in `data/` |
| Hosting | Render (`render.yaml`) |

```
data/datapack.json        The three Scenario A sheets, exported as-is from the workbook
src/lib/data/normalize.ts Unit numbers, money, dates and statuses into one format
src/lib/rules/index.ts    The 27 rules
src/lib/data/store.ts     Load, reset, and sync exceptions with the data
src/lib/readiness.ts      The readiness score
src/lib/dashboard.ts      Everything the overview charts draw, computed from the same rows
src/lib/ai/ask.ts         The assistant and its five query tools
src/lib/ai/draft.ts       Drafting, with a labeled template when no key is set
supabase/migrations/      Schema, RLS policies, audit trigger
```

### Run it

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL, key and demo password
npm run seed                 # load the data pack
npm run dev
npm test                     # 56 tests: normalization, rules, assistant tools
```

## Handing it to the technology team

- The rules are pure functions over typed rows, with tests. They can move into a service or a Yardi-side job without the UI.
- The assistant can only call five read-only functions. Adding a capability means adding a function, which keeps what it can reach reviewable.
- Usage is measurable from the audit log: who resolved what, how long exceptions stay open, which rules get dismissed as noise.
- Before production it needs real sign-in with role-based access, the Yardi import layout, an upload path for new rent rolls, and outbound email.

## Tools used

Built with Claude Code. See `docs/BUILD_LOG.md` for how the work went, including what broke.
