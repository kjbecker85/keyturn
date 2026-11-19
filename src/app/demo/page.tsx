import type { Metadata } from "next";
import Link from "next/link";
import { Key } from "@/components/icons";

export const metadata: Metadata = {
  title: "Demo video",
  description: "A five and a half minute walkthrough of Keyturn, the property transition command center.",
};

// Open to anyone with the link, no sign-in. See the allow-list in src/proxy.ts.
export default function DemoVideoPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10 md:px-8">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-accent-bright">
          <Key weight="duotone" className="size-6" />
        </span>
        <div>
          <h1 className="display text-2xl font-semibold">Keyturn demo</h1>
          <p className="text-sm text-muted">Scenario A, property transitions. Kyle Becker. 5 min 34 sec.</p>
        </div>
      </div>

      <video
        className="card mt-6 aspect-video w-full overflow-hidden bg-black"
        controls
        playsInline
        preload="metadata"
        poster="/keyturn-demo-poster.jpg"
      >
        <source src="/keyturn-demo.mp4" type="video/mp4" />
      </video>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted">
          The screen recording runs against the live site with the synthetic data pack. The narration is an AI copy of
          Kyle&apos;s own voice, and the short scenic clips at the start and end are AI generated.
        </p>
        <Link href="/login" className="btn btn-primary">
          Open the live prototype
        </Link>
      </div>
    </main>
  );
}
