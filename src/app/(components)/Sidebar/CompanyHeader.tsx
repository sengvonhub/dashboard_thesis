"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { useProfile } from "@/state/tageTypes/lib/useProfile";

/**
 * Company identity block at the top of the sidebar, modelled on the mobile
 * Company screen: gradient banner, ringed logo overlapping it, name + code,
 * and a status pill.
 *
 * Collapses to just the ringed logo so it still reads as the company at 70px.
 */

const STATUS_STYLE: Record<string, { fg: string; bg: string; label: string }> = {
  active: { fg: "var(--color-success)", bg: "var(--color-success-tint)", label: "Active" },
  suspended: { fg: "var(--color-warning)", bg: "var(--color-warning-tint)", label: "Suspended" },
  cancelled: { fg: "var(--color-error)", bg: "var(--color-error-tint)", label: "Cancelled" },
};

/** "Doung Chhiv Printin" -> "DC" */
function initialsOf(name?: string | null) {
  if (!name) return "";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CompanyHeader({ isCollapsed }: { isCollapsed: boolean }) {
  const { company, isLoading } = useProfile();

  const name = company?.company_name ?? (isLoading ? "" : "TypeMS");
  const code = company?.company_code ?? "";
  const status = (company?.status ?? "").toLowerCase();
  const badge = STATUS_STYLE[status];
  const initials = initialsOf(company?.company_name);

  return (
    <Link
      href="/profile"
      className="block relative shrink-0"
      title={company?.company_name ?? "Company profile"}
    >
      <div
        className={`flex items-center transition-all duration-300 ease-in-out ${
          isCollapsed
            ? "flex-col justify-center px-0 pt-6"
            : "gap-3 px-5 pt-7"
        }`}
      >
        {/* The avatar is the only coloured surface here now — the gradient
            banner it used to overlap has been removed, so it no longer needs
            a ring to separate it from the background. */}
        <div className="rounded-full shrink-0">
          <div
            className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center"
            style={{
              background: company?.logo_url
                ? "var(--color-surface-elevated)"
                : "var(--gradient-brand)",
            }}
          >
            {company?.logo_url ? (
              // Plain <img>: the logo is a remote upload (Cloudinary), and
              // next/image would need that host registered in next.config
              // remotePatterns first.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : initials ? (
              <span
                className="text-sm font-bold tracking-tight"
                style={{ color: "var(--color-on-accent)" }}
              >
                {initials}
              </span>
            ) : (
              <Building2
                className="w-5 h-5"
                style={{ color: "var(--color-on-accent)" }}
              />
            )}
          </div>
        </div>

        {/* Name + code + status */}
        <div
          className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
            isCollapsed ? "max-w-0 opacity-0" : "max-w-[180px] opacity-100"
          }`}
        >
          <p
            className="font-bold text-sm tracking-tight truncate"
            style={{ color: "var(--color-text-primary)" }}
          >
            {name || " "}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {code && (
              <span
                className="text-[11px] font-medium truncate"
                style={{ color: "var(--color-text-muted)" }}
              >
                {code}
              </span>
            )}
            {badge && (
              <span
                className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full shrink-0"
                style={{ color: badge.fg, background: badge.bg }}
              >
                {badge.label}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
