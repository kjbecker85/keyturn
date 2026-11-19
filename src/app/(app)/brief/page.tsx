import Link from "next/link";
import { SaveBriefButton } from "@/components/save-brief-button";
import { PageHeader } from "@/components/ui";
import { getUser } from "@/lib/auth";
import { buildBrief, briefText } from "@/lib/brief";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { createClient } from "@/lib/supabase/server";

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ for?: string }>;
}) {
  const user = await getUser();
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  const assignees = [...new Set(data.tasks.map((t) => t.assignee).filter(Boolean))].sort() as string[];
  const requested = (await searchParams).for;
  const who = requested && assignees.includes(requested) ? requested : assignees.includes(user.full_name) ? user.full_name : assignees[0];
  const brief = buildBrief(who, data.tasks, exceptions);
  const { subject, body } = briefText(brief, data.properties);

  return (
    <>
      <PageHeader
        title="Morning brief"
        subtitle="What each assignee on the Asset team would get at the start of the day. Built by rules from the checklist, so it is the same every time for the same data."
      />
      <div className="px-4 pb-10">
        <div className="mb-4 flex flex-wrap gap-1.5">
          {assignees.map((a) => (
            <Link key={a} href={`/brief?for=${encodeURIComponent(a)}`} className={`btn ${a === who ? "border-accent text-accent" : ""}`}>
              {a}
            </Link>
          ))}
        </div>
        <article className="card max-w-3xl p-4">
          <p className="text-xs text-muted">To: {who}</p>
          <h2 className="mt-1 font-medium">{subject}</h2>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed">{body}</pre>
          <div className="mt-4">
            <SaveBriefButton recipient={who} subject={subject} body={body} />
          </div>
        </article>
      </div>
    </>
  );
}
