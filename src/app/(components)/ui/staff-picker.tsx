"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StaffResponse } from "@/state/types/user";
import { StaffAvatar } from "./staff-avatar";

interface StaffPickerProps {
  staff: StaffResponse[] | undefined;
  value: string; // staff_id as string, "" = none selected
  onChange: (staffId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

interface Position {
  top: number;
  left: number;
  width: number;
}

/**
 * Staff picker that shows each option's avatar + name, not just a text
 * label. A native <select> can't render an <img> inside <option>, so this
 * is a small custom listbox instead.
 *
 * Two things this fixes vs. the first version:
 *  1. Uses this app's actual CSS variables (--color-surface-elevated,
 *     --color-border, etc.) instead of shadcn tokens like `bg-popover` /
 *     `bg-muted`, which aren't defined here and rendered transparent —
 *     that's what let the form fields underneath show through the list.
 *  2. Portals the list to document.body (same fix as DropdownMenu) so it
 *     can't get clipped or mis-stacked by the Modal it's opened inside.
 */
export function StaffPicker({ staff, value, onChange, disabled, loading }: StaffPickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = staff?.find((s) => String(s.staff_id) === value);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-md px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: "var(--color-surface-card)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <StaffAvatar name={selected.name} avatarUrl={selected.avatar_url} />
            <span className="truncate">
              {selected.name}
              {selected.staff_role ? (
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {" "}
                  — {selected.staff_role.role_name}
                </span>
              ) : null}
            </span>
          </span>
        ) : (
          <span style={{ color: "var(--color-text-secondary)" }}>
            {loading ? "Loading staff…" : "Select staff"}
          </span>
        )}
        <svg
          className="h-4 w-4 shrink-0 transition-transform"
          style={{
            color: "var(--color-text-secondary)",
            transform: open ? "rotate(180deg)" : undefined,
          }}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open &&
        !disabled &&
        position &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            className="fixed z-50 max-h-64 overflow-auto rounded-md p-1 shadow-lg"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
            }}
          >
            {!staff || staff.length === 0 ? (
              <li className="px-3 py-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {loading ? "Loading staff…" : "No staff found"}
              </li>
            ) : (
              staff.map((s) => {
                const isSelected = String(s.staff_id) === value;
                return (
                  <li key={s.staff_id} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(String(s.staff_id));
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm"
                      style={{
                        background: isSelected ? "var(--color-surface-card)" : "transparent",
                        color: "var(--color-text-primary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--color-surface-card)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isSelected
                          ? "var(--color-surface-card)"
                          : "transparent";
                      }}
                    >
                      <StaffAvatar name={s.name} avatarUrl={s.avatar_url} />
                      <span className="min-w-0 flex-1 truncate">{s.name}</span>
                      {s.staff_role && (
                        <span
                          className="shrink-0 text-xs"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {s.staff_role.role_name}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body,
        )}
    </div>
  );
}