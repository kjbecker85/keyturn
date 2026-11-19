# Transition Command Center — Spec v0.1

Scenario A, Property Transitions. Asset Living build exercise.
Panel: Monday Nov 23, 2026. Video and repo go to the reviewers before then.

## 1. Goal

Give the Director of Transitions and the regional manager one place that says what needs
attention today across the nine incoming Texas properties, lets them act on it, and
proves the portfolio is ready for the December 1 takeover.

The app sits in the window before the properties exist in Yardi. That window is spread
across prior-manager exports, spreadsheets, and email, and no incumbent system owns it.

## 2. Users

| Role | Needs |
|---|---|
| Director of Transitions | Portfolio-wide exceptions, blockers, escalations, day-one readiness |
| Regional Manager | Their properties, site-level detail, the owner-facing status report |
| Assignee (task owner, e.g. T. Nguyen) | Their own tasks and flags, on a phone |

"Owner" means the property owner. People assigned tasks are "assignees."

## 3. Locked decisions

| Decision | Choice |
|---|---|
| Scenario | A, Property Transitions |
| "Today" in the app | Friday, Oct 16, 2026, the data pack's as-of date. Fixed, shown in the header |
| Data | Only the nine-property data pack (A1, A2, A3). No file upload |
| Stack | Next.js (App Router, TypeScript) on Vercel, Supabase (Postgres, Auth, Realtime, pgvector) |
| UI | Tailwind, shadcn/ui, TanStack Table, cmdk, Recharts |
| Map | MapLibre GL JS with OpenStreetMap tiles, no API key |
| LLM | Claude API. Sonnet 5.5 default, Opus 5.5 for long drafts |
| Mobile | Responsive PWA, installable to home screen. No app store |
| Hosting | Public Vercel URL to share |
| ML forecasting | Shelved. Readiness uses transparent rules, not a model |

## 4. Assumptions (stated in the app and README)

1. Data is synthetic and intentionally messy. Messy values are flagged, never silently fixed.
2. The rent roll covers 3 of 9 properties. The other 6 show "rent roll not received," which is itself a flag.
3. Property coordinates are invented points inside each property's city. The data has no addresses.
4. "Occupied" covers `O`, `Occ`, `Occupied`. `Notice` is occupied with a move-out pending. `VR`/`Vacant-Ready` and `VNR`/`Vacant - Not Ready` normalize to two vacant statuses.
5. An occupied unit with a lease end before Oct 16 is treated as month-to-month.
6. A contract's notice deadline = Current Term End minus Termination Notice days.
7. Emails are drafted and logged as sent. Nothing is actually emailed in the prototype.
8. Demo login uses seeded test accounts, one per role.

## 5. Features

### F1. Data load and normalization
Seed script loads the xlsx into Supabase. Each raw row is kept as-is next to its normalized form.
- Normalize unit numbers (`Apt 1101`, `#1101`, `1101` → `1101`), dates (US, ISO, Excel), money (`$1,325.00` → 1325), status (8 spellings → 4).
- Every row keeps a `source_sheet` and `source_row` so any flag can link back to the exact row.

### F2. Exceptions engine (rules, not ML)
Rules run on load and on every edit, writing to an `exceptions` table with severity, reason, and source rows.

| Area | Rule | Count in data |
|---|---|---|
| Rent roll | Occupied or notice with no resident name | 10 |
| Rent roll | Occupied with $0 lease rent | 5 |
| Rent roll | Lease end before lease start | 4 |
| Rent roll | Duplicate unit number after normalization | 3 |
| Rent roll | 0 square feet | 2 |
| Rent roll | Lease rent more than 20% below market | 6 |
| Rent roll | Occupied with $0 deposit | 5 |
| Rent roll | Expired lease, still occupied (month-to-month) | 129, rolled up per property |
| Rent roll | Rent roll missing for property | 6 |
| Checklist | Blocked task | 4 |
| Checklist | No assignee | 4 |
| Checklist | Not updated in more than 7 days and not complete | 24 |
| Checklist | Critical-path task due within 7 days of a holiday | Thanksgiving, Nov 26 |
| Vendors | Auto-renew and notice deadline already passed | 6 |
| Vendors | Notice deadline before Dec 31 | to compute |
| Vendors | COI expired | 3 |
| Vendors | Term ends before takeover | to compute |
| Vendors | Not assignable to new manager | 24 |
| Vendors | Same service twice at one property | 2 |
| Cross-sheet | Checklist note contradicts vendor sheet (Elm Street Lofts) | 1 |

Counts are from the first profiling pass. The seeded app is the final source.

### F3. Exceptions inbox (home screen)
- List of open exceptions ranked by severity, then due date.
- Filter by property, function, area, severity, assignee. Saved views per user.
- Each item shows the reason and the source row, with a link to the row.
- Actions: assign, change status, add note, resolve, dismiss with a required reason, draft escalation.
- Keyboard: `j`/`k` to move, `e` to resolve, `a` to assign, `⌘K` command palette.

### F4. Read and write on core records
- Edit checklist tasks: status, assignee, due date, notes.
- Vendor decision per contract: keep, terminate, renegotiate, with a reason.
- Rent roll flag review: approve, correct the value, or reject. The corrected value is stored next to the original.
- Every write goes to an `audit_log`: who, what, before, after, when.
- Supabase Realtime pushes changes to other open sessions.

### F5. Property map
- Nine pins colored by readiness (green, amber, red).
- Click a pin to open a side panel (bottom sheet on phone) with readiness, open exceptions, blocked tasks, contracts at risk, and rent roll status.
- The map and list stay in sync. Selecting one highlights the other.

### F6. Day-one readiness (rules)
Per property: share of critical-path tasks complete, minus penalties for blocked tasks, missing rent roll, missed vendor notice, and expired COIs. Shows the score and every component that moved it. No hidden math.

### F7. AI assistant
- Ask in plain language ("what's blocking Trinity Bluffs?", "which contracts lock us in next month?").
- Claude calls fixed, read-only query tools over Supabase. It never writes its own SQL.
- Every answer cites the records it used, and says so when the data can't answer.

### F8. AI drafting
- Escalation email from any exception: the prior manager, the property owner, a vendor, or an internal assignee. Grounded in the exception and its source rows.
- Vendor termination notice letter from a "terminate" decision, with the notice deadline.
- Owner day-one status report per property, or for the portfolio.
- The user edits, then marks the draft sent. The sent draft is logged.

### F9. Cross-sheet contradiction detector
A set of checks across A1, A2, A3. Example: a checklist note says contracts weren't received while the vendor sheet holds seven for that property. Each contradiction becomes an exception.

### F10. Morning brief
A per-assignee digest of their open tasks and new flags, shown in-app and drafted as an email. It goes to Asset staff, not the property owner.

### F11. Integrations
| Integration | Use |
|---|---|
| Nager.Date | US holidays for business-day math and the Thanksgiving flag |
| NWS api.weather.gov | Dec 1 forecast per property for day-one field work |
| Census ACS | Market context per city in the property panel |
| OpenFEMA | Flood context next to the insurance task |
| Yardi-shaped export | Clean rent roll CSV, ready for import. Format to confirm with Yardi |

### F12. PWA and mobile
Manifest, icons, service worker for install. Every screen works at 375px. The map panel becomes a bottom sheet.

## 6. Out of scope (stated in the demo)

- ML forecasting (readiness and slip models). Shelved for now.
- Rent roll file upload. The app uses only the data pack.
- Actual email sending.
- Real Yardi integration. The prototype produces a Yardi-shaped file and a link-out.
- Native app store builds.
- Multi-tenant or production auth hardening.

## 7. Build phases

Each phase ends deployed and demoable. If time runs out, everything shipped so far still works.

| Phase | Scope | Done when |
|---|---|---|
| P0 Scaffold | Next.js, Supabase project, Vercel deploy, auth with 3 seeded accounts | Public URL loads and login works |
| P1 Data | Schema, seed script, normalization (F1) | All 255 / 126 / 49 rows load with source links. Normalization tests pass |
| P2 Exceptions | Rules engine (F2), cross-sheet checks (F9) | Rule counts match the profiling pass or the difference is explained |
| P3 Inbox | F3 and the write actions of F4, with audit log and realtime | Resolve an exception on one device and see it update on another |
| P4 Map and readiness | F5, F6 | Click a pin and the panel shows the right numbers for that property |
| P5 AI | F7, F8 | 10 scripted questions answered with correct citations. Drafts cite their sources |
| P6 Integrations and brief | F10, F11 | Holiday flag fires. Weather and Census show in the panel |
| P7 PWA and polish | F12, empty and error states | Installs on iPhone and Android. Passes at 375px |
| P8 Deliverables | README, build log, 5–10 min video | Sent to the five reviewers |

Order of cuts if time is short: P6, then F10, then F9.

## 8. Evaluation criteria

Mapped to the brief's rubric.

| Brief dimension | How this build meets it | Check |
|---|---|---|
| Business relevance | Built around the director's morning: what's wrong, who owns it, what to send | Demo opens on the inbox and acts on 3 real exceptions |
| It works | Runs on the full data pack, hosted, with read and write | Public URL. Every number traces to a source row |
| Judgment about scope | Rules over ML, data pack only, drafts not sends | Out-of-scope list in the demo and README |
| Analytical rigor | Every planted problem found and counted, nothing silently fixed | Rule counts table in the README |
| Ambition and creativity | Contradiction detector, Thanksgiving risk, owner report, map | At least one "huh" moment in the video |
| Candor | Assumptions shown in the app, AI cites sources and admits gaps | Assumptions page. The assistant says "I can't tell" when the data can't answer |

Technical checks:
- Normalization unit tests pass on every messy format in A1.
- No write happens without an audit log row.
- The AI never answers without citations. Tested with 10 scripted questions.
- Lighthouse PWA installable, mobile layout at 375px with no horizontal scroll.

## 9. Open questions

1. Supabase: a new project under your existing org, or a new org?
2. Claude API key: use your existing key, or create one for this project?
3. GitHub: private repo shared with the five reviewers, or public?
4. App name: working title "Day One."
