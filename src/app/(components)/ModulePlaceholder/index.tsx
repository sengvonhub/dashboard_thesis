import { ALL_ITEMS } from "@/app/config/module";

/**
 * Renders the "not built yet" state for a module route, styled from that
 * module's own entry in the shared config so the page picks up the same icon,
 * tint and copy the sidebar and dashboard grid already use.
 */
export default function ModulePlaceholder({ href }: { href: string }) {
  const mod = ALL_ITEMS.find((m) => m.href === href);

  if (!mod) return null;

  const Icon = mod.icon;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${mod.tint}26` }}
        >
          <Icon className="h-5 w-5" style={{ color: mod.tint }} />
        </div>
        <div>
          <h1
            className="text-xl font-semibold"
            style={{ color: "var(--color-text-primary)" }}
          >
            {mod.title}
          </h1>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {mod.subtitle}
          </p>
        </div>
      </div>

      <div
        className="rounded-2xl border p-10 flex flex-col items-center justify-center gap-2 text-center"
        style={{
          background: "var(--color-surface-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <p
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Nothing here yet
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          The {mod.title} module has not been built out yet.
        </p>
      </div>
    </div>
  );
}
