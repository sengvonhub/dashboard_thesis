"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, Info } from "lucide-react";

/**
 * In-app replacement for window.confirm / window.alert.
 *
 * The native dialogs cannot be themed, block the whole browser tab, and on
 * Chrome show a "localhost:3000 says" chrome line. This keeps the same
 * one-line call shape at the call site:
 *
 *   if (!(await confirm({ title: "Delete user", ... }))) return;
 */

export type ConfirmTone = "danger" | "default";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  /** Renders a single acknowledge button — the alert() equivalent. */
  acknowledgeOnly?: boolean;
}

type Resolver = (ok: boolean) => void;

const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      // A second request while one is open resolves the first as cancelled,
      // so no caller is left awaiting a promise that never settles.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setOptions(next);
    });
  }, []);

  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") settle(false);
      if (e.key === "Enter") settle(true);
    };
    document.addEventListener("keydown", onKey);
    // Focus the confirm button so Enter/Escape work without clicking first.
    confirmButtonRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [options, settle]);

  const danger = options?.tone !== "default";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {options && (
        <div
          // Above every other dialog in the app (the tallest is z-145), since
          // a confirmation is always raised from one of them.
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "var(--color-scrim)" }}
          onClick={() => settle(false)}
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={options.title}
            className="w-full max-w-sm rounded-2xl border overflow-hidden"
            style={{
              background: "var(--color-surface-elevated)",
              borderColor: "var(--color-border)",
              boxShadow: "0 32px 80px -32px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-5 pb-4 flex gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: danger
                    ? "var(--color-error-tint)"
                    : "var(--color-info-tint)",
                }}
              >
                {danger ? (
                  <AlertTriangle
                    className="h-5 w-5"
                    style={{ color: "var(--color-error)" }}
                  />
                ) : (
                  <Info className="h-5 w-5" style={{ color: "var(--color-info)" }} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  className="text-base font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {options.title}
                </h2>
                {options.message && (
                  <div
                    className="text-sm mt-1.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {options.message}
                  </div>
                )}
              </div>
            </div>

            <div
              className="px-5 py-3.5 flex justify-end gap-2 border-t"
              style={{ borderColor: "var(--color-divider)" }}
            >
              {!options.acknowledgeOnly && (
                <button
                  type="button"
                  onClick={() => settle(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-semibold border"
                  style={{
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {options.cancelLabel ?? "Cancel"}
                </button>
              )}
              <button
                ref={confirmButtonRef}
                type="button"
                onClick={() => settle(true)}
                className="rounded-lg px-4 py-2.5 text-sm font-semibold"
                style={{
                  background: danger
                    ? "var(--color-error)"
                    : "var(--color-blurple)",
                  color: "var(--color-on-accent)",
                }}
              >
                {options.confirmLabel ??
                  (options.acknowledgeOnly ? "OK" : danger ? "Delete" : "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
