import Link from "next/link";
import { NAV } from "@/components/nav";
import { PageHeader } from "@/components/ui";

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <ul className="mx-4 divide-y divide-line rounded-lg border border-line bg-panel">
        {NAV.filter((n) => !n.primary).map((n) => (
          <li key={n.href}>
            <Link href={n.href} className="block px-4 py-3 text-sm">{n.label}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
