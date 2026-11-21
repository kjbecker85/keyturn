"use client";

import { useState } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import { fileName, toCsv, toXlsx, type Sheet } from "@/lib/table-export";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** CSV and Excel downloads of exactly what the list is showing. */
export function ExportButtons({ sheet, count, className = "" }: { sheet: () => Sheet; count: number; className?: string }) {
  const [busy, setBusy] = useState(false);
  const title = `Export the ${count} row${count === 1 ? "" : "s"} shown`;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        className="btn"
        title={title}
        onClick={() => {
          const s = sheet();
          save(new Blob(["﻿", toCsv(s)], { type: "text/csv;charset=utf-8" }), fileName(s.name, "csv"));
        }}
      >
        <DownloadSimple weight="bold" className="size-4" />
        CSV
      </button>
      <button
        type="button"
        className="btn"
        title={title}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const s = sheet();
            const buf = await toXlsx([s]);
            save(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), fileName(s.name, "xlsx"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <DownloadSimple weight="bold" className="size-4" />
        {busy ? "Building…" : "Excel"}
      </button>
    </span>
  );
}
