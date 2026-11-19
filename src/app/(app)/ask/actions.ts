"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getUser } from "@/lib/auth";
import { ask, type Citations, type Turn } from "@/lib/ai/ask";
import { aiEnabled } from "@/lib/ai/client";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { createClient } from "@/lib/supabase/server";

export type AskResult =
  | { ok: true; answer: string; citations: Citations; lookups: string[] }
  | { ok: false; error: string };

export async function askQuestion(history: Turn[]): Promise<AskResult> {
  await getUser();
  if (!aiEnabled()) return { ok: false, error: "The assistant needs a Claude API key, and none is configured." };
  if (history.length === 0 || history.at(-1)?.role !== "user") return { ok: false, error: "Ask a question." };

  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  try {
    return { ok: true, ...(await ask(history.slice(-10), data, exceptions)) };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { ok: false, error: "The Claude API key was rejected." };
    if (error instanceof Anthropic.RateLimitError) return { ok: false, error: "Claude is rate limited right now. Try again in a minute." };
    if (error instanceof Anthropic.APIError) return { ok: false, error: `Claude API error ${error.status ?? ""}.`.trim() };
    return { ok: false, error: "The assistant failed. Try again." };
  }
}
