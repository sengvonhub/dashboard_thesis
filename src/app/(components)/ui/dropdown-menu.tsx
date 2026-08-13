"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Position {
  top: number;
  left: number;
}

export function DropdownMenu({
  trigger,
  children,
  align = "end", // "end" = right-align to trigger (old default), "start" = left-align
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Recompute position whenever the menu opens, and keep it pinned while
  // scrolling/resizing so it doesn't drift away from the trigger.
  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = menuRef.current?.offsetWidth ?? 192; // w-48 fallback
      setPosition({
        top: rect.bottom + 4, // 4px gap, like the old `mt-1`
        left: align === "end" ? rect.right - menuWidth : rect.left,
      });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, align]);

  // Outside-click close — checks both the trigger AND the portaled menu,
  // since the menu no longer lives inside `triggerRef`'s subtree.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed w-48 rounded-md shadow-lg py-1 z-50"
            style={{
              top: position.top,
              left: position.left,
              background: "var(--color-surface-elevated)",
              border: "1px solid var(--color-border)",
            }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function DropdownMenuItem({
  children,
  onClick,
  disabled,
  destructive,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 text-sm transition-colors
        disabled:opacity-40 disabled:pointer-events-none
        outline-none focus-visible:ring-2 focus-visible:ring-inset
        focus-visible:ring-[var(--color-blurple)]`}
      style={{
        color: destructive ? "var(--color-error)" : "var(--color-text-primary)",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "var(--color-surface-card)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}