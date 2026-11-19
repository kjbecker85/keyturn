import { Triage } from "@/components/triage";
import { getUser } from "@/lib/auth";
import { loadExceptions } from "@/lib/data/store";
import { createClient } from "@/lib/supabase/server";

export default async function TriagePage() {
  const user = await getUser();
  const db = await createClient();
  const [exceptions, properties] = await Promise.all([
    loadExceptions(db),
    db.from("properties").select("id, name").order("id"),
  ]);
  return (
    <Triage
      exceptions={exceptions.filter((e) => e.status === "open")}
      properties={properties.data ?? []}
      me={user.full_name}
    />
  );
}
