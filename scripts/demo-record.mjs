// Records the demo walkthrough: drives a real browser through the 11 scenes in
// docs/DEMO_SCRIPT.md and saves the screen recording plus a timeline of when
// each scene started. The narration is laid over it by scripts/demo-compose.mjs.
//
// Run: node scripts/demo-record.mjs            (records against the live site)
//      DEMO_URL=http://localhost:3000 node scripts/demo-record.mjs
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.DEMO_URL ?? "https://keyturn-4hfl.onrender.com";
const OUT = path.resolve("video");
// Recorded at native 1080p. The page text is enlarged a little so it reads well in a video player.
const VIEW = { width: 1920, height: 1080 };
const ROOT_FONT = "19.5px";

// Length of each scene's narration clip, in seconds.
const AUDIO = fs
  .readdirSync(path.join(OUT, "audio"))
  .filter((f) => f.endsWith(".mp3"))
  .sort()
  .map((f) =>
    Number(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${path.join(OUT, "audio", f)}"`).toString()),
  );

// Start from clean data so every number matches the narration.
execSync("npm run seed", { stdio: "inherit" });

// The Mac's GPU keeps the cursor and animations smooth at 1080p. Software rendering
// (RENDER=software) works anywhere but runs each scene several seconds behind.
const GPU = process.env.RENDER !== "software";
const browser = await chromium.launch({
  args: GPU ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: VIEW,
  recordVideo: { dir: OUT, size: VIEW },
});

// A visible cursor, since a scripted browser has none.
await context.addInitScript((rootFont) => {
  const ensure = () => {
    if (document.documentElement.style.fontSize !== rootFont) document.documentElement.style.fontSize = rootFont;
    if (!document.body || document.getElementById("kt-cursor")) return;
    const c = document.createElement("div");
    c.id = "kt-cursor";
    c.style.cssText =
      "position:fixed;z-index:2147483647;left:-40px;top:-40px;width:28px;height:28px;margin:-14px 0 0 -14px;" +
      "border-radius:50%;background:rgba(14,26,43,.25);border:2px solid #fff;box-shadow:0 0 0 1.5px rgba(14,26,43,.55);" +
      "pointer-events:none;transition:transform .12s ease,background .12s ease;";
    document.body.appendChild(c);
    const last = JSON.parse(sessionStorage.getItem("kt-cursor") || "null");
    if (last) Object.assign(c.style, { left: `${last.x}px`, top: `${last.y}px` });
  };
  const cursor = () => document.getElementById("kt-cursor");
  setInterval(ensure, 300);
  addEventListener(
    "mousemove",
    (e) => {
      const c = cursor();
      if (c) Object.assign(c.style, { left: `${e.clientX}px`, top: `${e.clientY}px` });
      sessionStorage.setItem("kt-cursor", JSON.stringify({ x: e.clientX, y: e.clientY }));
    },
    true,
  );
  addEventListener("mousedown", () => cursor() && Object.assign(cursor().style, { transform: "scale(.65)", background: "rgba(10,143,134,.65)" }), true);
  addEventListener("mouseup", () => cursor() && Object.assign(cursor().style, { transform: "scale(1)", background: "rgba(14,26,43,.25)" }), true);
  ensure();
}, ROOT_FONT);

const page = await context.newPage();
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const timeline = [];
// Stretches of the recording to drop when composing, such as the wait for Claude's answer.
const cuts = [];
const wait = (s) => page.waitForTimeout(s * 1000);

const log = (msg) => console.log(`  ${now().toFixed(1)}s ${msg}`);
async function moveTo(target, dx = 0, dy = 0) {
  const locator = (typeof target === "string" ? page.locator(target) : target).first();
  const visible = await locator.waitFor({ state: "visible", timeout: 4000 }).then(() => true, () => false);
  if (!visible) {
    log(`SKIPPED, not on screen: ${locator}`);
    return null;
  }
  // Bring it into view vertically only. Sideways scrolling would push tables off screen.
  await locator
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < 90 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    })
    .catch(() => {});
  await wait(0.25);
  const box = await locator.boundingBox({ timeout: 3000 }).catch(() => null);
  if (!box) return null;
  const x = box.x + box.width / 2 + dx;
  const y = box.y + box.height / 2 + dy;
  await page.mouse.move(x, y, { steps: 12 });
  return { x, y };
}
async function click(target) {
  const locator = (typeof target === "string" ? page.locator(target) : target).first();
  await locator.waitFor({ state: "visible", timeout: 20000 });
  const at = await moveTo(locator);
  log(`click ${locator}`);
  await wait(0.3);
  if (at) {
    await page.mouse.down();
    await wait(0.1);
    await page.mouse.up();
  } else {
    await locator.click();
  }
}
/** Smooth-scrolls so the element sits just below the sticky header. */
async function scrollTo(target, offset = 98) {
  const locator = typeof target === "string" ? page.locator(target).first() : target;
  await locator.waitFor({ state: "attached", timeout: 20000 });
  await locator.evaluate((el, off) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - off, behavior: "smooth" }), offset);
  await wait(1.1);
}
const nav = (href) => `aside nav a[href="${href}"]`;
const heading = (text) => page.getByRole("heading", { name: text }).first();

// SCENES=2,6 records only those scenes, for checking timing without a full take.
const ONLY = process.env.SCENES ? process.env.SCENES.split(",").map(Number) : null;

async function scene(n, body) {
  if (ONLY && !ONLY.includes(n)) return;
  const start = now();
  timeline.push({ scene: n, start: Number(start.toFixed(2)), audio: AUDIO[n - 1] });
  console.log(`scene ${n} at ${start.toFixed(1)}s`);
  let cutTime = 0;
  const cut = (from, to) => {
    if (to - from < 1) return;
    cuts.push({ scene: n, start: Number(from.toFixed(2)), end: Number(to.toFixed(2)) });
    cutTime += to - from;
    log(`cut ${(to - from).toFixed(1)}s of waiting`);
  };
  const at = async (sec) => {
    const remaining = start + cutTime + sec - now();
    if (remaining > 0) await wait(remaining);
    else if (remaining < -0.7) log(`late: reached the ${sec}s mark ${(-remaining).toFixed(1)}s behind`);
  };
  await body(at, cut);
  const over = now() - start - cutTime - AUDIO[n - 1];
  await at(AUDIO[n - 1] + 0.9);
  timeline.at(-1).end = Number(now().toFixed(2));
  console.log(`  scene ${n} actions finished ${over > 0 ? `${over.toFixed(1)}s AFTER` : `${(-over).toFixed(1)}s before`} its narration ends`);
}

// ---------- Scene 1: sign-in. The first 24 seconds are covered by cut scenes. ----------
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
if (ONLY && !ONLY.includes(1)) {
  await page.getByRole("button", { name: /Director of Transitions/ }).click();
  await page.getByText("portfolio readiness").waitFor({ timeout: 30000 });
}
try {
await scene(1, async (at) => {
  await page.mouse.move(960, 900);
  await at(25.5);
  await click(page.getByRole("button", { name: /Director of Transitions/ }));
  await page.getByText("portfolio readiness").waitFor({ timeout: 30000 });
  await page.mouse.move(1300, 200, { steps: 20 });
});

// ---------- Scene 2: the overview ----------
await scene(2, async (at) => {
  await at(2.5);
  await moveTo(page.getByText("days to Day One").last(), 0, -60);
  await at(5.5);
  const ring = page.locator('svg[role="img"]').first();
  await moveTo(ring);
  await at(10);
  await moveTo(ring, 95, -70);
  await at(11.5);
  await moveTo(ring, 110, 40);
  await at(13);
  await moveTo(ring, -100, 60);
  await at(18);
  await moveTo(page.getByText("Open critical"));
  await at(24);
  await moveTo(page.getByText("Critical-path tasks done"));
});

// ---------- Scene 3: the runway ----------
await scene(3, async (at) => {
  await scrollTo(heading("The runway to Day One"));
  await at(6);
  await moveTo('svg[aria-label^="Timeline"] text >> nth=0', 260, 40);
  await at(17.5);
  await moveTo('svg a[aria-label^="Notice window missed: MetroFiber"]');
  await at(31.5);
  await moveTo('svg a[aria-label^="Migrate resident ledgers"]');
  await at(38);
  await moveTo('svg a[aria-label^="Keys, access control"]');
});

// ---------- Scene 4: heatmap and money ----------
await scene(4, async (at) => {
  await scrollTo(heading("Checklist progress"));
  await moveTo('a[title*="blocked"]');
  await at(5.5);
  await scrollTo(heading("Money at stake"));
  await moveTo(page.getByText("Locked into auto-renewals"));
});

// ---------- Scene 5: inbox and a drafted escalation ----------
await scene(5, async (at, cut) => {
  await click(nav("/inbox"));
  await page.locator("[data-exception]").first().waitFor({ timeout: 30000 });
  await at(13.5);
  await click(page.locator("[data-exception] button").first());
  await at(20.5);
  await moveTo(page.getByText("Why this was flagged"), 80, 30);
  await at(23.5);
  await moveTo('section a[href^="/vendors?focus="]');
  await at(26);
  await click(page.getByRole("button", { name: "Draft escalation" }));
  // Claude takes 10 to 15 seconds to write the draft. Show a few seconds of it.
  await wait(3);
  const from = now();
  await page.waitForURL(/\/drafts/, { timeout: 60000 });
  await page.locator("textarea").first().waitFor({ timeout: 30000 });
  cut(from, now() - 0.2);
  await moveTo(page.locator("textarea").first(), 0, -40);
  await at(34.5);
  await moveTo(page.getByRole("button", { name: "Mark as sent" }));
});

// ---------- Scene 6: fix the data and the exception clears ----------
await scene(6, async (at) => {
  await click(nav("/inbox"));
  await at(2.2);
  await click(page.locator("[data-exception] button", { hasText: "Blocked — Brazos Landing" }));
  await at(7.5);
  await click('section a[href^="/tasks?focus="]');
  const status = page.locator('tr.bg-accent-soft select[aria-label="Status"]');
  await status.waitFor({ timeout: 30000 });
  log("checklist row ready");
  await at(10.5);
  await moveTo(status);
  await wait(0.5);
  await status.selectOption("In Progress");
  log("status changed");
  await wait(2.2);
  await at(14);
  await click(nav("/"));
  await page.getByText("portfolio readiness").waitFor({ timeout: 30000 });
  log("overview ready");
  await moveTo(page.getByText("Open critical"));
  await at(17);
  const pass = page.locator('a[href^="/properties/"]', { has: page.locator("h3", { hasText: "Brazos Landing" }) });
  await scrollTo(pass, 260);
  await moveTo(pass);
  await at(22);
  await click(nav("/activity"));
  await wait(1);
  await moveTo(page.getByText("changed Task").first());
});

// ---------- Scene 7: cross-sheet contradictions ----------
await scene(7, async (at) => {
  await click(nav("/inbox"));
  const area = page.locator('select[aria-label="Area"]');
  await area.waitFor({ timeout: 30000 });
  await at(3);
  await moveTo(area);
  await area.selectOption("cross_sheet");
  await at(6.5);
  await click(page.locator("[data-exception] button", { hasText: "Elm Street Lofts: checklist says no contracts received" }));
  await at(12);
  await moveTo(page.getByText("Why this was flagged"), 80, 30);
  await at(19.5);
  await click(page.locator("[data-exception] button", { hasText: "Trinity Bluffs" }).filter({ hasText: "Yardi" }));
  await at(24);
  await moveTo(page.getByText("Why this was flagged"), 80, 30);
});

// ---------- Scene 8: rent roll ----------
await scene(8, async (at) => {
  await click(nav("/rent-roll"));
  const unit = page.getByRole("button", { name: "4203", exact: true });
  await unit.waitFor({ timeout: 30000 });
  await at(5);
  await moveTo(page.getByRole("button", { name: "Cedar Crossing" }));
  await at(9.5);
  await click(unit);
  await at(14);
  await moveTo(page.getByText(/cell: 615/));
  await at(19.5);
  await moveTo(page.getByText("Staff unit?").first());
  await at(23);
  await moveTo(page.getByRole("button", { name: /Approve as is|Save correction/ }));
});

// ---------- Scene 9: ask ----------
await scene(9, async (at, cut) => {
  await click(nav("/ask"));
  await at(2.8);
  await click(page.getByRole("button", { name: "What's blocking Trinity Bluffs?" }));
  const chip = page.locator('main a[href*="focus="]').first();
  // Show the question being worked on for a moment, then drop the rest of the wait.
  await wait(2.5);
  const from = now();
  await chip.waitFor({ timeout: 60000 });
  cut(from, now() - 0.2);
  await wait(1.5);
  await moveTo(chip);
  await at(11.3);
  await click(chip);
  await wait(2.6);
});

// ---------- Scene 10: map and triage ----------
await scene(10, async () => {
  await click(nav("/properties"));
  await page.locator(".keyturn-pin").first().waitFor({ timeout: 30000 });
  await wait(1.5);
  await click(page.getByRole("button", { name: /Trinity Bluffs/ }).last());
  await wait(2.2);
  await click(nav("/inbox/triage"));
  await page.getByRole("button", { name: /Skip/ }).waitFor({ timeout: 30000 });
  await wait(1.2);
  await click(page.getByRole("button", { name: /Skip/ }));
  await wait(1.5);
});

// ---------- Scene 11: limits and what's next ----------
await scene(11, async (at) => {
  await click(nav("/about"));
  await heading("Deliberately not built").waitFor({ timeout: 30000 });
  await at(2);
  await moveTo(heading("Deliberately not built"), 120, 60);
  await at(15);
  await scrollTo(heading("Rules and what they caught"));
  await at(27);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
  await at(36);
  await click(nav("/"));
  await page.getByText("portfolio readiness").waitFor({ timeout: 30000 });
  // Rest on empty space so no tooltip is showing under the sign-off.
  await page.mouse.move(1150, 157, { steps: 30 });
});
await wait(1.5);
} catch (error) {
  console.error(`FAILED at ${now().toFixed(1)}s: ${error.message.split("\n")[0]}`);
  process.exitCode = 1;
}

const video = page.video();
await context.close();
await browser.close();
const raw = path.join(OUT, "raw.webm");
fs.renameSync(await video.path(), raw);
fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ base: BASE, scenes: timeline, cuts }, null, 2));
console.log(`recorded ${raw}, ${now().toFixed(1)}s`);

// Leave the shared demo data clean for reviewers.
execSync("npm run seed", { stdio: "inherit" });
