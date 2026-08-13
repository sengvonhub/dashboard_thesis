"use client";

import React, { useState } from "react";
import { Download, QrCode } from "lucide-react";
import { useGetOfficeQrQuery } from "@/state/tageTypes/services/attendanceApi";
import { useAppSelector } from "@/app/redux";

/**
 * The printable office QR, for managers.
 *
 * `qr_image` comes back as base64 PNG which may or may not already carry a
 * `data:` prefix (the download route strips one if present), so it is
 * normalised here before being used as an <img> source.
 *
 * The PNG download hits `/attendance/office-qr/image`, which is manager-gated
 * and therefore needs the Authorization header — a plain <a href> would be sent
 * unauthenticated, so the file is fetched and saved from a blob instead.
 */
export default function OfficeQrCard() {
  const { data, isLoading, error } = useGetOfficeQrQuery();
  const accessToken = useAppSelector((s) => s.auth.accessToken);
  const [downloading, setDownloading] = useState(false);

  const src = data?.qr_image
    ? data.qr_image.startsWith("data:")
      ? data.qr_image
      : `data:image/png;base64,${data.qr_image}`
    : null;

  const download = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/attendance/office-qr/image`,
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "office_qr.png";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fall back to the inline base64 we already have.
      if (src) {
        const a = document.createElement("a");
        a.href = src;
        a.download = "office_qr.png";
        a.click();
      }
    } finally {
      setDownloading(false);
    }
  };

  if (error) return null;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: "var(--color-surface-card)",
        borderColor: "var(--color-border)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="h-4 w-4" style={{ color: "var(--color-warning)" }} />
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Office QR
        </p>
      </div>

      <div className="flex gap-5 items-start flex-wrap">
        <div
          className="w-40 h-40 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
          style={{ background: "#FFFFFF" }}
        >
          {isLoading ? (
            <span className="text-xs" style={{ color: "#64748B" }}>
              Loading...
            </span>
          ) : src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Office QR code" className="w-full h-full object-contain" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {data?.note}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <dt
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Office
              </dt>
              <dd className="text-xs mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                {data?.office_id ?? "—"}
              </dd>
            </div>
            <div>
              <dt
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-text-muted)" }}
              >
                Expires in
              </dt>
              <dd className="text-xs mt-0.5" style={{ color: "var(--color-text-primary)" }}>
                {data?.expires_in ?? "—"}
              </dd>
            </div>
          </dl>

          <button
            onClick={download}
            disabled={downloading || !data}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{
              background: "var(--color-blurple)",
              color: "var(--color-on-accent)",
            }}
          >
            <Download className="h-4 w-4" />
            {downloading ? "Preparing..." : "Download PNG"}
          </button>
        </div>
      </div>
    </div>
  );
}
