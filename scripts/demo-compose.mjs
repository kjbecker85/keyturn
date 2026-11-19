// Builds the final demo video: the screen recording from demo-record.mjs, the
// narration clips laid over the moment each scene starts, and the generated
// cut scenes over the intro and the sign-off.
//
// Run: node scripts/demo-compose.mjs
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("video");
const { scenes, cuts = [] } = JSON.parse(fs.readFileSync(path.join(OUT, "timeline.json"), "utf8"));
const audio = fs.readdirSync(path.join(OUT, "audio")).filter((f) => f.endsWith(".mp3")).sort();
const clips = [1, 2, 3, 4].map((n) => path.join(OUT, "cuts", `cut-${n}.mp4`)).filter((f) => fs.existsSync(f));

const LEAD = 0.3; // narration starts this long after a scene begins
const CUT_LEN = 8;
const FADE = 0.45;

// Everything is shifted so the video opens just before scene 1.
// Waiting time the recorder marked (Claude writing an answer) is dropped.
const origin = Math.max(0, scenes[0].start - 0.2);
const cutBefore = (t) => cuts.filter((c) => c.end <= t).reduce((sum, c) => sum + (c.end - c.start), 0);
const at = (s) => s.start - origin - cutBefore(s.start);
const dropWaits = cuts.length
  ? `select='not(${cuts.map((c) => `between(t,${(c.start - origin).toFixed(3)},${(c.end - origin).toFixed(3)})`).join("+")})',setpts=N/(30*TB),`
  : "";
const last = scenes.at(-1);
const narrationEnd = at(last) + LEAD + last.audio;

// Intro cut scenes run back to back under the first 24 seconds of narration.
// The sign-off cut scene covers the last lines.
const placements = [];
const intro = clips.slice(0, 3);
intro.forEach((file, i) => placements.push({ file, start: at(scenes[0]) + i * (CUT_LEN - FADE), fadeIn: i > 0, skip: 0, len: CUT_LEN }));
// The sign-off clip rises from the walkway to a wide view of the whole community.
const OUTRO = { skip: 0.4, len: 7.6 };
if (clips[3]) placements.push({ file: clips[3], start: narrationEnd - (OUTRO.len - 1.6), fadeIn: true, outro: true, ...OUTRO });
const total = clips[3] ? placements.at(-1).start + OUTRO.len : narrationEnd + 1.5;

const inputs = ["-i", path.join(OUT, "raw.webm")];
for (const f of audio) inputs.push("-i", path.join(OUT, "audio", f));
for (const p of placements) inputs.push("-i", p.file);

const filters = [];
filters.push(`[0:v]trim=start=${origin.toFixed(3)},setpts=PTS-STARTPTS,fps=30,${dropWaits}scale=1920:1080:flags=lanczos,setsar=1[v0]`);
let prev = "v0";
placements.forEach((p, i) => {
  const input = 1 + audio.length + i;
  const end = p.start + p.len;
  const fadeIn = p.fadeIn ? `fade=t=in:st=0:d=${FADE}:alpha=1,` : "";
  // The intro's last clip and the outro fade away to reveal what is underneath.
  const isLastIntro = !p.outro && i === intro.length - 1;
  const fadeOut = isLastIntro ? `fade=t=out:st=${p.len - FADE}:d=${FADE}:alpha=1,` : "";
  filters.push(
    `[${input}:v]trim=start=${p.skip}:duration=${p.len},setpts=PTS-STARTPTS,fps=30,scale=1920:1080:flags=lanczos,setsar=1,format=yuva420p,` +
      `${fadeIn}${fadeOut}setpts=PTS+${p.start.toFixed(3)}/TB[c${i}]`,
  );
  filters.push(`[${prev}][c${i}]overlay=eof_action=pass:enable='between(t,${p.start.toFixed(3)},${end.toFixed(3)})'[v${i + 1}]`);
  prev = `v${i + 1}`;
});
filters.push(`[${prev}]trim=duration=${total.toFixed(3)},fade=t=in:st=0:d=0.4,fade=t=out:st=${(total - 0.7).toFixed(3)}:d=0.7,format=yuv420p[vout]`);

scenes.forEach((s, i) => {
  const ms = Math.round((at(s) + LEAD) * 1000);
  filters.push(`[${i + 1}:a]aresample=48000,adelay=${ms}|${ms}[a${i}]`);
});
filters.push(
  `${scenes.map((_, i) => `[a${i}]`).join("")}amix=inputs=${scenes.length}:normalize=0:duration=longest,` +
    `loudnorm=I=-16:TP=-1.5:LRA=11,apad,atrim=duration=${total.toFixed(3)},afade=t=out:st=${(total - 0.7).toFixed(3)}:d=0.7[aout]`,
);

const target = path.join(OUT, "keyturn-demo.mp4");
execFileSync(
  "ffmpeg",
  [
    "-y", "-hide_banner", "-loglevel", "error", ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", target,
  ],
  { stdio: "inherit" },
);
const minutes = Math.floor(total / 60);
const dropped = cuts.reduce((sum, c) => sum + (c.end - c.start), 0);
console.log(`${target}: ${minutes}:${String(Math.floor(total % 60)).padStart(2, "0")}, ${clips.length} cut scenes, ${dropped.toFixed(1)}s of waiting dropped`);
