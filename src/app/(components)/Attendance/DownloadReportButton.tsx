"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import type { AttendanceResponse } from "@/state/types/attendance";
export default function DownloadReportButton({
  records,
  month,
  year,
  staffName,
  companyName,
}: {
  records: AttendanceResponse[];
  month: number;
  year: number;
  staffName?: string;
  companyName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (busy || !records.length) return;
    setBusy(true);
    setError(null);
    try {
      await downloadAttendanceReportPdf({ records, month, year, staffName, companyName });
    } catch {
      setError("Could not generate the PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={busy || !records.length}
        aria-label="Download this month's attendance as PDF"
        title={records.length ? "Download PDF" : "No records to export"}
        className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-semibold disabled:opacity-50"
        style={{
          background: "var(--color-surface-card)",
          color: "var(--color-text-secondary)",
        }}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        PDF
      </button>

      {error && (
        <p
          className="absolute top-full right-0 mt-1 text-[11px] whitespace-nowrap"
          style={{ color: "var(--color-error)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function downloadAttendanceReportPdf(arg0: { records: AttendanceResponse[]; month: number; year: number; staffName: string | undefined; companyName: string | undefined; }) {
    throw new Error("Function not implemented.");
}
