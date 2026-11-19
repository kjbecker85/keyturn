import { redirect } from "next/navigation";
import { Inbox } from "@/components/inbox";
import { getUser } from "@/lib/auth";
import { loadExceptions } from "@/lib/data/store";
import type { AuditRow } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const user = await getUser();
  // An assignee lands on their own items first.
  if (user.role === "assignee" && Object.keys(params).length === 0) {
    redirect(`/inbox?assignee=${encodeURIComponent(user.full_name)}`);
  }

  const db = await createClient();
  const [exceptions, properties, tasks, views, audit, profiles] = await Promise.all([
    loadExceptions(db),
    db.from("properties").select("id, name").order("id"),
    db.from("tasks").select("assignee"),
    db.from("saved_views").select("id, name, filters").order("id"),
    db
      .from("audit_log")
      .select("*")
      .eq("entity", "exceptions")
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("profiles").select("id, full_name"),
  ]);

  const assignees = [
    ...new Set([
      ...(tasks.data ?? []).map((t) => t.assignee).filter(Boolean),
      ...(profiles.data ?? []).map((p) => p.full_name),
    ]),
  ].sort() as string[];
  const actors = Object.fromEntries((profiles.data ?? []).map((p) => [p.id, p.full_name]));

  return (
    <Inbox
      exceptions={exceptions}
      properties={properties.data ?? []}
      assignees={assignees}
      views={(views.data ?? []).map((v) => ({ id: v.id, name: v.name, query: v.filters?.query ?? "" }))}
      audit={(audit.data ?? []) as AuditRow[]}
      actors={actors}
      me={user.full_name}
    />
  );
}
