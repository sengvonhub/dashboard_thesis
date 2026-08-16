"use client";

import React from "react";
import Image from "next/image";

/**
 */
export function AuthLogo({ size = 56 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-2xl shrink-0"
      style={{
        width: size,
        height: size,
        background: "var(--color-surface-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <Image
        src="/assets/duong_chhiv_logo.png"  
        alt="Duong Chhiv logo"                
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        priority
        style={{ objectFit: "contain" }}
      />
    </span>
  );
}

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6"
      style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}
    >
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-sm"}`}>
        {/* brand */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <AuthLogo />
          <div className="text-center">
            <p
              className="text-lg font-semibold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              System
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Inventory · HR · Attendance
            </p>
          </div>
        </div>

        <div
          className="relative overflow-hidden rounded-2xl border p-6 sm:p-8"
          style={{
            background: "var(--color-surface-elevated)",
            borderColor: "var(--color-border)",
            boxShadow: "0 24px 64px -32px rgba(0,0,0,0.45)",
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: "var(--gradient-brand)" }}
          />

          <span
            className="inline-block text-[11px] font-mono tracking-widest uppercase mb-4"
            style={{ color: "var(--color-blurple)" }}
          >
            {eyebrow}
          </span>
          <h1
            className="text-2xl font-semibold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            {title}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {subtitle}
          </p>

          {children}

          {footer && (
            <p
              className="mt-6 text-center text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {footer}
            </p>
          )}
        </div>

        <p
          className="mt-6 text-center text-xs"
          style={{ color: "var(--color-text-muted)" }}
        >
          Sengvon © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

// ── shared form controls ─────────────────────────────────

export function AuthField({
  icon: Icon,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: React.ElementType;
  error?: string;
}) {
  return (
    <div className={className}>
      <div className="relative">
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-text-muted)" }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <input
          {...props}
          className="w-full rounded-xl border pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-1"
          style={{
            background: "var(--color-surface-card)",
            borderColor: error ? "var(--color-error)" : "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--color-error)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthSubmit({
  loading,
  label,
  loadingLabel,
}: {
  loading?: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-opacity focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        background: "var(--gradient-brand)",
        color: "var(--color-on-accent)",
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl border p-3 text-xs"
      style={{
        background: "var(--color-error-tint)",
        borderColor: "var(--color-error)",
        color: "var(--color-error)",
      }}
    >
      {message}
    </div>
  );
}
