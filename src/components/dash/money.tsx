import Link from "next/link";
import type { Dashboard } from "@/lib/dashboard";
import { usd } from "@/lib/rules";

function Bar({
  label,
  note,
  amount,
  unit,
  share,
  tone,
  href,
}: {
  label: string;
  note: string;
  amount: number;
  unit: string;
  share: number;
  tone: string;
  href: string;
}) {
  return (
    <Link href={href} className="group block rounded-xl px-3 py-2.5 transition hover:bg-panel2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="display text-lg font-semibold whitespace-nowrap">
          {usd(amount)}
          <span className="ml-1 text-xs font-medium text-muted">{unit}</span>
        </span>
      </span>
      <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-panel2">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(3, share * 100)}%`, background: tone }} />
      </span>
      <span className="mt-1.5 block text-xs text-muted">{note}</span>
    </Link>
  );
}

/**
 * Dollars tied to open problems. Monthly amounts and the one-time balance are
 * kept apart on purpose: they don't add up to one number.
 */
export function Money({ money }: Pick<Dashboard, "money">) {
  const monthlyMax = Math.max(money.lockIn.monthly, money.rentGap.monthly, money.duplicates.monthly, 1);
  return (
    <div className="flex flex-col gap-1">
      <p className="eyebrow px-3">Every month</p>
      <Bar
        label="Locked into auto-renewals"
        note={`${money.lockIn.count} contracts whose notice window already passed`}
        amount={money.lockIn.monthly}
        unit="/ mo"
        share={money.lockIn.monthly / monthlyMax}
        tone="var(--sev1)"
        href="/inbox?area=vendors&severity=1"
      />
      <Bar
        label="Rent below market or at $0"
        note={`${money.rentGap.count} occupied units, gap to market rent`}
        amount={money.rentGap.monthly}
        unit="/ mo"
        share={money.rentGap.monthly / monthlyMax}
        tone="var(--sev2)"
        href="/inbox?area=rent_roll"
      />
      <Bar
        label="Paying twice for one service"
        note={`${money.duplicates.count} properties with duplicate contracts`}
        amount={money.duplicates.monthly}
        unit="/ mo"
        share={money.duplicates.monthly / monthlyMax}
        tone="var(--sev3)"
        href="/inbox?area=vendors&q=contracts+at+one+property"
      />
      <p className="eyebrow mt-3 px-3">One-time</p>
      <Bar
        label="Owed by residents"
        note={`${money.balances.count} residents across the three rent rolls received. No aging yet.`}
        amount={money.balances.total}
        unit="balance"
        share={1}
        tone="var(--indigo)"
        href="/inbox?area=rent_roll&q=owed"
      />
    </div>
  );
}
