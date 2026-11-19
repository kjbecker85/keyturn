# Demo video script

Target length: about 7 minutes, including pauses while screens load. The brief asks for 5 to 10.
Narration is about 890 words, written in Kyle's speaking voice (see the kyles-voice skill). Each scene has what to do on screen and what the voice says.

## Before you record

1. Open https://keyturn-4hfl.onrender.com in Chrome at full width. Sign in as Director of Transitions.
2. Reset the data: Assumptions, then **Reset demo data**. This puts every number back to what the script says.
3. Light theme, comfortable text size (both under the user menu).
4. Do one silent dry run of the click path first. Scene 6 changes data, so reset again before the real take.

Numbers the script relies on after a reset: 46 days, readiness 58, 116 open exceptions, 14 critical, Brazos Landing at 78.

---

## Scene 1 · Sign-in page (0:00 to 0:41)

**On screen:** Start on the sign-in page. Click **Director of Transitions**. The overview loads.

**Narration:**
Okay, let's get started. My name is Kyle Becker, and I picked Scenario A, the property transition. Asset Living takes over nine properties in Texas on December first. Before that date, the team has to check the prior manager's rent rolls, finish a hundred and twenty-six tasks, and decide what to do with forty-nine vendor contracts. Right now that work lives in spreadsheets and email. I built a tool called Keyturn for the Director of Transitions and the regional manager. It answers one question every morning, which is what needs my attention today.

## Scene 2 · Overview, top of page (0:41 to 1:22)

**On screen:** Rest on the countdown ring and the four tiles. Move the cursor around the outer arcs, then across the tiles.

**Narration:**
This is the home screen. We have forty-six days until day one. The number in the middle is portfolio readiness, and right now it's fifty-eight out of a hundred. Each arc around the outside is one property, and three of them are off track. The score is simple. Every property starts at a hundred and loses points for each open problem, so you can check the math by hand. I left machine learning out on purpose, because one snapshot of the data is not enough history to train a model I would trust.

## Scene 3 · The runway (1:22 to 2:20)

**On screen:** Scroll to "The runway to Day One." Hover the hollow diamond next to Willow Bend Flats in the Missed column. Then move to the shaded Thanksgiving band and hover a mark on Nov 28.

**Narration:**
The next thing I want to show you is this chart. I call it the runway. Every property gets its own lane, and time runs left to right, from today to day one. Each mark is a date that matters, like a task that's due or a contract deadline. On the left are the deadlines we already missed. For example, at Willow Bend, the internet contract needed ninety days' notice, and that date was August seventh. So it renews in November at about forty-seven hundred dollars a month.

Now take a look at the shaded band. That's Thanksgiving weekend. The checklist has resident ledgers and key handovers due that Saturday and Sunday, at every property. Nobody is going to be working, so the real deadline is Wednesday the twenty-fifth.

## Scene 4 · Heatmap and money (2:20 to 2:38)

**On screen:** Scroll to the checklist heatmap, then to "Money at stake."

**Narration:**
Below that is checklist progress, where a red outline means a task is blocked. Further down is the money tied to open problems. Six contracts are locked into auto-renewal, which is about ten thousand dollars a month.

## Scene 5 · Inbox and a drafted escalation (2:38 to 3:41)

**On screen:** Click **Inbox**. The first item is the Cedar Crossing elevator contract. Point at "Why this was flagged" and the source row. Click **Draft escalation**. Wait for the draft to open. Scroll through it slowly.

**Narration:**
Okay, this is the inbox, and this is where the work gets done. I wrote twenty-seven rules that run across all three sheets. Right now they raise a hundred and sixteen exceptions, and an exception is just a problem that needs a person. Take a look at the first one. Cedar Crossing's elevator maintenance contract ends on October thirty-first, and it doesn't renew. Every exception tells you why it was flagged, and it links to the exact row in the spreadsheet.

From here I can draft the email to the vendor. Claude writes it, and it only uses the facts in that row. Then I edit it and mark it as sent. The prototype doesn't actually send email.

## Scene 6 · Fix the data, the exception clears (3:41 to 4:23)

**On screen:** Back to **Inbox**. Click "Blocked — Brazos Landing: Bind property & liability insurance." Click its source row. On the checklist, change that task's status from **Blocked** to **In Progress**. Click **Overview**. Point at Open critical (now 13) and the Brazos Landing pass (now 88). Then click **Activity**.

**Narration:**
This tool also reads and writes. For example, Brazos Landing has an insurance task that's blocked, waiting on loss runs from the prior manager. Let's say that came in this morning. I'm going to open the source row and change the status to in progress. The rules run again, and the exception clears on its own. Brazos Landing's readiness goes from seventy-eight to eighty-eight. Every edit also goes into an audit log, so you can see who changed what.

## Scene 7 · Cross-sheet contradictions (4:23 to 5:03)

**On screen:** **Inbox**, set Area to **Cross-sheet**. Click the Elm Street Lofts item. Then click the Trinity Bluffs "Set up property in Yardi" item.

**Narration:**
Okay, now for the findings I think matter most. These only show up when you read the sheets against each other. At Elm Street Lofts, the checklist says the vendor review is blocked, because the prior manager hasn't sent the contracts. But the vendor sheet lists seven contracts for that property. One of those is wrong, and somebody needs to ask. At Trinity Bluffs, the Yardi setup is marked complete, but we never received a rent roll. So I would want to know what was loaded.

## Scene 8 · Rent roll (5:03 to 5:41)

**On screen:** Click **Rent roll**. Willow Bend Flats, flagged rows. Click unit **4203** to expand it. Point at "Prior manager's cell."

**Narration:**
This is the rent roll screen. The three rent rolls came in three different formats. The tool cleans up the formats, but it never changes a value without a person looking at it. For example, unit forty-two oh three rents for six hundred and fifteen dollars, and market rent is thirteen twenty-five. The prior manager left a note that says staff unit, with a question mark. A person reviews it, and the original value stays next to the new one.

## Scene 9 · Ask (5:41 to 6:09)

**On screen:** Click **Ask**. Click "What's blocking Trinity Bluffs?" Wait for the answer. Click one citation chip.

**Narration:**
You can also just ask a question. I'm going to ask what's blocking Trinity Bluffs. The assistant can only do lookups, so it can't change anything and it can't make up data. Every statement has a citation that opens the record.

## Scene 10 · Map and triage (6:09 to 6:25)

**On screen:** Click **Properties**, click one pin. Then click **Triage** and press **S** once to skip a card.

**Narration:**
There's also a map for the regional manager, and a triage screen that shows one exception at a time. It works on a phone.

## Scene 11 · Limits and what's next (6:25 to 7:14)

**On screen:** Click **Assumptions**. Scroll slowly through "Deliberately not built."

**Narration:**
All right, here's what it doesn't do yet. It doesn't send email, and it doesn't connect to Yardi. It only runs on the data pack, so you can't upload a new rent roll. If I had another week, I would build that upload, and I would build the Yardi import with your team.

I spent about eight hours on this. The first part went to understanding the problem. That means the scenario, the terms, and what was wrong in the data. That's where I decided what to build and what to leave out. The build itself went fast, because I used Claude Code, and the assistant inside the tool is Claude. After that I spent my time on the screens. I threw out the first design because it was too dark and too dense. One more thing you should know. This narration is an AI copy of my own voice, made with ElevenLabs. You'll hear the real one on Monday. Thanks for watching.

---

## After recording

- Reset the demo data again so reviewers start clean.
- The video needs a link anyone can open without an account (Loom, or an unlisted upload).
