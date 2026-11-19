import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Sonnet for interactive answers, Opus for longer drafts.
export const FAST_MODEL = "claude-sonnet-5-5";
export const DEEP_MODEL = "claude-opus-5-5";
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export const aiEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);

let cached: Anthropic | undefined;
export const anthropic = () => (cached ??= new Anthropic());

export class AiUnavailable extends Error {}

/** One prompt in, text out. Throws AiUnavailable when no key is configured. */
export async function complete(opts: {
  model: string;
  system: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
}): Promise<string> {
  if (!aiEnabled()) throw new AiUnavailable("No Claude API key is configured.");
  const response = await anthropic().beta.messages.create({
    model: opts.model,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default",
    system: opts.system,
    output_config: { effort: opts.effort ?? "medium" },
    messages: [{ role: "user", content: opts.prompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("The model declined this request.");
  return response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
