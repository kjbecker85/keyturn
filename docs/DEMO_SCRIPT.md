# Demo video script

Target length: about 9 minutes, including pauses while screens load. The brief asks for 5 to 10.
Narration is about 1160 words, written in Kyle's speaking voice (see the kyles-voice skill). Each scene has what to do on screen and what the voice says.

## Before you record

1. Open https://keyturn-4hfl.onrender.com in Chrome at full width. Sign in as Director of Transitions.
2. Reset the data: Assumptions, then **Reset demo data**. This puts every number back to what the script says.
3. Light theme, comfortable text size (both under the user menu).
4. Do one silent dry run of the click path first. Scene 6 changes data, so reset again before the real take.
5. Fill in the two bracketed blanks in Scene 11 before the narration is generated.

Numbers the script relies on after a reset: 46 days, readiness 58, 116 open exceptions, 14 critical, Brazos Landing at 78.

---

## Scene 1 · Sign-in page (0:00 to 0:47)

**On screen:** Start on the sign-in page. Click **Director of Transitions**. The overview loads.

**Narration:**
Okay, let's get started. My name is Kyle Becker, and I picked Scenario A, the property transition. Here's the background. Asset Living takes over nine properties in Texas on December first. Before that date, the team has to check the prior manager's rent rolls, finish a hundred and twenty-six tasks, and decide what to do with forty-nine vendor contracts. Right now that work lives in spreadsheets and email. I built a tool called Keyturn for two people. The first is the Director of Transitions. The second is the regional manager who takes over these properties. It answers one question every morning, which is what needs my attention today.

## Scene 2 · Overview, top of page (0:47 to 1:33)

**On screen:** Rest on the countdown ring and the four tiles. Move the cursor around the outer arcs, then across the tiles.

**Narration:**
This is the home screen. We have forty-six days until day one. The number in the middle is portfolio readiness, and right now it's fifty-eight out of a hundred. Each arc around the outside is one property, and three of them are off track. I want to explain how that score works, because it's simple. Every property starts at a hundred, and it loses points for each open problem. You can check the math by hand. I left machine learning out on purpose. We have one snapshot of a hundred and twenty-six tasks, and that's not enough history to train a model I would trust.

## Scene 3 · The runway (1:33 to 2:43)

**On screen:** Scroll to "The runway to Day One." Hover the hollow diamond next to Willow Bend Flats in the Missed column. Then move to the shaded Thanksgiving band and hover a mark on Nov 28.

**Narration:**
The next thing I want to show you is this chart. I call it the runway. Every property gets its own lane, and time runs left to right, from today to day one. Each mark is a date that matters. It could be a task that's due, a notice deadline on a contract, or a contract that's ending. On the left side are the deadlines we already missed. For example, at Willow Bend, the internet contract needed ninety days' notice. That date was August seventh. So it renews on November fifth, at about forty-seven hundred dollars a month.

Now take a look at the shaded band. That's Thanksgiving weekend. The checklist has resident ledgers moving over on Saturday the twenty-eighth, and the keys handing over on Sunday the twenty-ninth. That's at every property. Nobody is going to be working that weekend, so the real deadline is Wednesday the twenty-fifth. I think that's the most useful thing this chart caught.

## Scene 4 · Heatmap and money (2:43 to 3:14)

**On screen:** Scroll to the checklist heatmap, then to "Money at stake."

**Narration:**
Below that is checklist progress, by property and by function. A darker square means more of those tasks are done, and a red outline means a task is blocked. Further down is the money that's tied to open problems. Six contracts are locked into auto-renewal, and that's about ten thousand dollars a month. Residents also owe about seventy-three thousand dollars across the three rent rolls we received.

## Scene 5 · Inbox and a drafted escalation (3:14 to 4:32)

**On screen:** Click **Inbox**. The first item is the Cedar Crossing elevator contract. Point at "Why this was flagged" and the source row. Click **Draft escalation**. Wait for the draft to open. Scroll through it slowly.

**Narration:**
Okay, this is the inbox, and this is where the work gets done. I wrote twenty-seven rules that run across all three sheets. Right now they raise a hundred and sixteen exceptions, and an exception is just a problem that needs a person. They're ranked by how serious they are. Take a look at the first one. Cedar Crossing's elevator maintenance contract ends on October thirty-first, and it doesn't renew. Every exception tells you why it was flagged, and it links to the exact row in the spreadsheet.

From here I can draft the email to the vendor. Claude writes it, and it only uses the facts in that row, like the contract number, the monthly cost and the end date. It also tells you what's missing from our file. Then I edit it and mark it as sent. I want to be clear that the prototype doesn't actually send email.

## Scene 6 · Fix the data, the exception clears (4:32 to 5:24)

**On screen:** Back to **Inbox**. Click "Blocked — Brazos Landing: Bind property & liability insurance." Click its source row. On the checklist, change that task's status from **Blocked** to **In Progress**. Click **Overview**. Point at Open critical (now 13) and the Brazos Landing pass (now 88). Then click **Activity**.

**Narration:**
The next thing I want to show you is that this tool reads and writes. For example, Brazos Landing has an insurance task that's blocked. They're waiting on loss runs from the prior manager. Let's say that came in this morning. I'm going to open the source row and change the status to in progress. When I do that, the rules run again and the exception clears on its own. Brazos Landing's readiness goes from seventy-eight to eighty-eight. Every edit also goes into an audit log. The database writes that log itself, so you can see who changed what, and what it was before.

## Scene 7 · Cross-sheet contradictions (5:24 to 6:10)

**On screen:** **Inbox**, set Area to **Cross-sheet**. Click the Elm Street Lofts item. Then click the Trinity Bluffs "Set up property in Yardi" item.

**Narration:**
Okay, now for the findings I think matter most. These only show up when you read the sheets against each other. Here's the first example. At Elm Street Lofts, the checklist says the vendor review is blocked, because the prior manager hasn't sent the contracts. But the vendor sheet lists seven contracts for that property. One of those two things is wrong, and somebody needs to ask. Here's the second example. At Trinity Bluffs, the Yardi setup is marked complete, but we never received a rent roll for that property. So I would want to know what was loaded.

## Scene 8 · Rent roll (6:10 to 6:55)

**On screen:** Click **Rent roll**. Willow Bend Flats, flagged rows. Click unit **4203** to expand it. Point at "Prior manager's cell."

**Narration:**
This is the rent roll screen. The three rent rolls came in three different formats, one for each property. The tool cleans up the formats, but it never changes a value without a person looking at it. For example, take a look at unit forty-two oh three. The rent is six hundred and fifteen dollars, and market rent is thirteen twenty-five. The prior manager left a note that says staff unit, with a question mark. So a person reviews it, and they can correct it or approve it. The original value stays right next to the new one.

## Scene 9 · Ask (6:55 to 7:34)

**On screen:** Click **Ask**. Click "What's blocking Trinity Bluffs?" Wait for the answer. Click one citation chip.

**Narration:**
You can also just ask a question. I'm going to ask what's blocking Trinity Bluffs. The assistant can only do five things, and all five are lookups. It can't change anything, and it can't make up data. Every statement has a citation, and when I click one it opens the record. If the data can't answer the question, it tells you that.

## Scene 10 · Map and triage (7:34 to 8:05)

**On screen:** Click **Properties**, click one pin. Then click **Triage** and press **S** once to skip a card.

**Narration:**
There are two more screens I want to show you quickly. The first is a map for the regional manager, with a readiness score on each pin. The second is triage. Triage shows you one exception at a time, and you resolve it or skip it. It works on a phone, so an assignee can work through their list at the property.

## Scene 11 · Limits and what's next (8:05 to 9:09)

**On screen:** Click **Assumptions**. Scroll slowly through "Deliberately not built."

**Narration:**
All right, here's what it doesn't do yet. It doesn't send email, and it doesn't connect to Yardi. It only runs on the data pack, so you can't upload a new rent roll. The demo sign-in also has no password. That's okay for now because the data is synthetic. If I had another week, I would build two things. The first is the upload, so it can take the next prior manager's format. The second is the Yardi import, and I would build that with your team.

I spent about [HOURS] hours on this, and most of that went to [WHERE THE TIME WENT]. I built it with Claude Code, and the assistant inside the tool is Claude. One more thing you should know. This narration is an AI copy of my own voice, and I made it with ElevenLabs. You'll hear the real one on Monday. Thanks for watching.

---

## After recording

- Reset the demo data again so reviewers start clean.
- The video needs a link anyone can open without an account (Loom, or an unlisted upload).
