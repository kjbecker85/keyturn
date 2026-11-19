import { AskPanel } from "@/components/ask-panel";
import { PageHeader } from "@/components/ui";
import { aiEnabled } from "@/lib/ai/client";

export default function AskPage() {
  return (
    <>
      <PageHeader
        title="Ask"
        subtitle="Questions in plain language, answered from the same records as every other screen. Each answer links to the rows behind it."
      />
      <AskPanel enabled={aiEnabled()} />
    </>
  );
}
