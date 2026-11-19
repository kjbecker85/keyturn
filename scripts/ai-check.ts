// One small Claude call to confirm the API key works. Run: npx tsx --env-file=.env.local scripts/ai-check.ts
import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const client = new Anthropic();
  const r = await client.beta.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 200,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low" },
    messages: [{ role: "user", content: "Reply with the word ready." }],
  });
  console.log(r.stop_reason, r.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}

main().catch((e) => {
  console.error(e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
  process.exit(1);
});
