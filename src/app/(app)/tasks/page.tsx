import { TasksTable } from "@/components/tasks-table";
import { PageHeader } from "@/components/ui";
import { loadDataset, loadExceptions } from "@/lib/data/store";
import { flagsFor } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const db = await createClient();
  const [data, exceptions] = await Promise.all([loadDataset(db), loadExceptions(db)]);
  return (
    <>
      <PageHeader
        title="Transition checklist"
        subtitle={`${data.tasks.length} tasks across ${data.properties.length} properties and 7 functions. Edits save at once and re-run the rules.`}
      />
      <TasksTable tasks={data.tasks} properties={data.properties} flags={flagsFor(exceptions, "tasks")} />
    </>
  );
}
