# Demo video script

Target length: about 7 minutes. The brief asks for 5 to 10.
Narration is about 1,100 words. Each scene has what to do on screen and what the voice says.

## Before you record

1. Open https://keyturn-4hfl.onrender.com in Chrome at full width. Sign in as Director of Transitions.
2. Reset the data: Assumptions, then **Reset demo data**. This puts every number back to what the script says.
3. Light theme, comfortable text size (both under the user menu).
4. Do one silent dry run of the click path first. Scene 6 changes data, so reset again before the real take.
5. Fill in the two bracketed blanks in Scene 11 before the narration is generated.

Numbers the script relies on after a reset: 46 days, readiness 58, 116 open exceptions, 14 critical, Brazos Landing at 78.

---

## Scene 1 · Sign-in page (0:00 to 0:35)

**On screen:** Start on the sign-in page. Click **Director of Transitions**. The overview loads.

**Narration:**
Hi, I'm Kyle Becker. I picked Scenario A, the property transition. Asset Living takes over nine Texas properties on December first. Before that day, someone has to check the prior manager's rent rolls, finish a hundred and twenty-six tasks, and decide what to do with forty-nine vendor contracts. Today that lives in spreadsheets and email. I built Keyturn for the Director of Transitions and the regional manager who inherits these properties. It answers one question each morning: what needs my attention today?

## Scene 2 · Overview, top of page (0:35 to 1:15)

**On screen:** Rest on the countdown ring and the four tiles. Move the cursor around the outer arcs, then across the tiles.

**Narration:**
This is the home screen. Forty-six days to day one. Portfolio readiness is fifty-eight out of a hundred, and each outer arc is one property. Three are off track. The score is plain arithmetic. It starts at a hundred and loses points for every open problem, so anyone can check it by hand. I left machine learning out on purpose. One snapshot of a hundred and twenty-six tasks is not enough history to train a model I would trust.

## Scene 3 · The runway (1:15 to 2:10)

**On screen:** Scroll to "The runway to Day One." Hover the hollow diamond next to Willow Bend Flats in the Missed column. Then move to the shaded Thanksgiving band and hover a mark on Nov 28.

**Narration:**
This chart is the one I'd want if I ran this team. Every property is a lane, and time runs from today to day one. Each mark is a task due date, a contract notice deadline, or a contract ending. On the left are deadlines that already passed. At Willow Bend, the internet contract needed ninety days' notice. That date was August seventh. It renews November fifth at forty-seven hundred dollars a month.

Now look at the shaded band. That's Thanksgiving weekend. The checklist has resident ledgers migrating on Saturday the twenty-eighth and keys handing over on Sunday the twenty-ninth, at every property. Nobody will be working. The real deadline is Wednesday the twenty-fifth. The plan was built on a calendar that doesn't exist.

## Scene 4 · Heatmap and money (2:10 to 2:45)

**On screen:** Scroll to the checklist heatmap, then to "Money at stake."

**Narration:**
Below that, checklist progress by property and function. Red outlines are blocked tasks. And here is the money tied to open problems. Six contracts are locked into auto-renewal, about ten thousand dollars a month. Residents owe seventy-three thousand dollars across the three rent rolls we received.

## Scene 5 · Inbox and a drafted escalation (2:45 to 3:45)

**On screen:** Click **Inbox**. The first item is the Cedar Crossing elevator contract. Point at "Why this was flagged" and the source row. Click **Draft escalation**. Wait for the draft to open. Scroll through it slowly.

**Narration:**
The inbox is where the work happens. Twenty-seven rules run across the three sheets and raise a hundred and sixteen exceptions, ranked by severity. The top one: Cedar Crossing's elevator maintenance contract ends October thirty-first and does not renew. Every exception says why it fired and links to the exact spreadsheet row behind it.

I can draft the escalation from here. Claude writes it using only the facts in that row: the contract number, the monthly cost, the end date. It also says what is missing from our file. I edit it and mark it sent. The prototype does not actually send email.

## Scene 6 · Fix the data, the exception clears (3:45 to 4:30)

**On screen:** Back to **Inbox**. Click "Blocked — Brazos Landing: Bind property & liability insurance." Click its source row. On the checklist, change that task's status from **Blocked** to **In Progress**. Click **Overview**. Point at Open critical (now 13) and the Brazos Landing pass (now 88). Then click **Activity**.

**Narration:**
This is not a report. It reads and writes. Brazos Landing's insurance task is blocked, waiting on loss runs from the prior manager. Say that came in this morning. I open the source row and mark it in progress. The rules run again, the exception clears on its own, and Brazos Landing's readiness goes from seventy-eight to eighty-eight. Every edit lands in an audit log written by the database itself, with who changed what, before and after.

## Scene 7 · Cross-sheet contradictions (4:30 to 5:10)

**On screen:** **Inbox**, set Area to **Cross-sheet**. Click the Elm Street Lofts item. Then click the Trinity Bluffs "Set up property in Yardi" item.

**Narration:**
The findings I care most about only show up when the sheets are read against each other. At Elm Street Lofts, the checklist says the vendor review is blocked because the prior manager hasn't sent contracts. The vendor sheet lists seven contracts for that property. One of those is wrong. At Trinity Bluffs, the Yardi setup is marked complete, but we never received a rent roll. So what was loaded?

## Scene 8 · Rent roll (5:10 to 5:40)

**On screen:** Click **Rent roll**. Willow Bend Flats, flagged rows. Click unit **4203** to expand it. Point at "Prior manager's cell."

**Narration:**
The rent rolls came in three different formats, one per property. I normalize them, but I never silently fix anything. Unit forty-two oh three rents for six hundred fifteen dollars against a market rent of thirteen twenty-five, and the prior manager left a note: staff unit, question mark. A person reviews it, corrects it or approves it, and the original cell stays right there next to the new value.

## Scene 9 · Ask (5:40 to 6:10)

**On screen:** Click **Ask**. Click "What's blocking Trinity Bluffs?" Wait for the answer. Click one citation chip.

**Narration:**
You can also just ask. The assistant can only call five read-only lookups, so it cannot invent data or change anything. Every claim carries a citation, and each citation opens the record. When the data can't answer, it says so.

## Scene 10 · Map and triage (6:10 to 6:35)

**On screen:** Click **Properties**, click one pin. Then click **Triage** and press **S** once to skip a card.

**Narration:**
There's a map for the regional manager, and a triage mode that shows one exception at a time. It works on a phone, so an assignee can clear their list from the property.

## Scene 11 · Limits and what's next (6:35 to 7:20)

**On screen:** Click **Assumptions**. Scroll slowly through "Deliberately not built."

**Narration:**
Here is what it doesn't do. It doesn't send email. It doesn't connect to Yardi. It runs on the data pack, so it can't take a new rent roll upload yet. And the demo sign-in has no password, which is only acceptable because the data is synthetic. With another week I would build the upload for the next prior manager's format, and the Yardi import with your team.

I spent about [HOURS] hours on this, most of it on [WHERE THE TIME WENT]. I built it with Claude Code, and the assistant inside it is Claude. One more disclosure: this narration is an AI clone of my own voice, made with ElevenLabs. You'll hear the real one on Monday. Thanks for watching.

---

## After recording

- Reset the demo data again so reviewers start clean.
- The video needs a link anyone can open without an account (Loom, or an unlisted upload).
