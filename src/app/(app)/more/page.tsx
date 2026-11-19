import Link from "next/link";
import { NAV } from "@/components/nav";
import { PageHeader } from "@/components/ui";

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <ul className="card mx-4 divide-y divide-line overflow-hidden md:mx-8">
        {NAV.filter((n) => !["/", "/inbox", "/properties", "/ask"].includes(n.href)).map((n) => (
          <li key={n.href}>
            <Link href={n.href} className="block px-5 py-3.5 text-sm font-medium transition hover:bg-panel2">{n.label}</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
