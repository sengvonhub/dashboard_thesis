"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Archive, ArrowDown, ArrowUp, CreditCard, Receipt, TrendingUp } from "lucide-react";
import { MODULES } from "@/app/config/module";

function sparklinePath(points: number[], width: number, height: number) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  return points
    .map((p, i) => {
      const x = i * step;
      const y = height - ((p - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

type StatCardProps = {
  icon: React.ElementType;
  iconTint: string; // hex, drives icon bg tint + sparkline color
  label: string;
  value: string;
  changeLabel: string; // e.g. "0.0%" or "+0.0%"
  changePositive?: boolean;
  sublabel: string; // e.g. "current units" / "inventory worth"
  allLabel?: string; // e.g. "All: 1,701"
  trend: number[];
  delta?: { up: string; down: string }; // optional arrow row, only first card has it in reference
};

function StatCard({
  icon: Icon,
  iconTint,
  label,
  value,
  changeLabel,
  changePositive = true,
  sublabel,
  allLabel,
  trend,
  delta,
}: StatCardProps) {
  const path = useMemo(() => sparklinePath(trend, 120, 40), [trend]);

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col justify-between"
      style={{ background: "var(--color-surface-card)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center justify-between">
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center"
          style={{ background: `${iconTint}26` }}
        >
          <Icon className="h-4 w-4" style={{ color: iconTint }} />
        </div>
        <span
          className="text-xs font-medium rounded-full px-2 py-0.5"
          style={{
            background: changePositive ? "var(--color-success-tint)" : "var(--color-danger-tint)",
            color: changePositive ? "var(--color-success)" : "var(--color-danger)",
          }}
        >
          {changeLabel}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {label}
        </p>
        <p className="text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {value}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {sublabel}
        </p>
        {allLabel && (
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {allLabel}
          </p>
        )}
        {delta && (
          <div className="flex items-center gap-3 mt-2 text-xs font-medium">
            <span className="flex items-center gap-1" style={{ color: "var(--color-success)" }}>
              <ArrowUp className="h-3 w-3" />
              {delta.up}
            </span>
            <span className="flex items-center gap-1" style={{ color: "var(--color-danger)" }}>
              <ArrowDown className="h-3 w-3" />
              {delta.down}
            </span>
          </div>
        )}
      </div>

      <svg viewBox="0 0 120 40" className="mt-3 w-full h-10" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={iconTint} strokeWidth="2" />
      </svg>
    </div>
  );
}

export default function DashboardHome() {
  const stockTrend = useMemo(() => [1400, 1520, 1480, 1610, 1590, 1650, 1701], []);
  const flatTrend = useMemo(() => [1, 1, 1, 1, 1, 1, 1], []);
  const expensesTrend = useMemo(() => [0, 0, 0, 0, 0, 0, 0], []);
  const revenueTrend = useMemo(() => [50, 50, 50, 3860, 50, 50, 50], []);

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* <div
            className="h-11 w-11 rounded-full flex items-center justify-center text-sm font-medium"
            style={{
              background: "linear-gradient(135deg, #6D28D9 0%, #7C6FF7 50%, #4338CA 100%)",
              color: "#FFFFFF",
            }}
          >
            BC
          </div> */}
          <div>
            <h1 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Welcome to Doucng Chhive Printing
            </h1>
          </div>
        </div>
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          iconTint="#22C55E"
          label="Stock"
          value="1,701"
          changeLabel="0.0%"
          sublabel="current units"
          allLabel="All: 1,701"
          trend={stockTrend}
          delta={{ up: "3635", down: "1934" }}
        />
        <StatCard
          icon={Archive}
          iconTint="#7C6FF7"
          label="Stock value"
          value="$11,559"
          changeLabel="0.0%"
          sublabel="inventory worth"
          trend={flatTrend}
        />
        <StatCard
          icon={Receipt}
          iconTint="#F59E0B"
          label="Expenses"
          value="$0"
          changeLabel="+0.0%"
          sublabel="vs last period"
          allLabel="All: $13,324"
          trend={expensesTrend}
        />
        <StatCard
          icon={CreditCard}
          iconTint="#7C6FF7"
          label="Revenue"
          value="$3,860"
          changeLabel="0.0%"
          sublabel="this period"
          allLabel="All: $3,860"
          trend={revenueTrend}
        />
      </div>

      {/* System Modules */}
      <div>
        <h2 className="text-base font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
          System modules
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group relative overflow-hidden rounded-2xl border p-4 flex flex-col justify-between gap-4 min-h-[128px] transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: "var(--color-border)",
                  boxShadow: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 6px 16px -12px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = mod.tint;
                  e.currentTarget.style.boxShadow = `0 1px 0 0 rgba(255,255,255,0.03) inset, 0 10px 28px -12px ${mod.tint}66`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.boxShadow =
                    "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 6px 16px -12px rgba(0,0,0,0.6)";
                }}
              >
                <span
                  className="absolute top-0 left-0 right-0 h-0.5 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-200"
                  style={{ backgroundColor: mod.tint }}
                />

                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
                  style={{ background: `${mod.tint}26` }}
                >
                  <Icon className="h-5 w-5" style={{ color: mod.tint }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {mod.title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {mod.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}