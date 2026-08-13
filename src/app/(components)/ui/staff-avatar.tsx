"use client";

/**
 * Shared avatar-with-fallback used anywhere a staff member's name is shown
 * — the payroll table's Staff column, StaffPicker's trigger/options, etc.
 * Keeping this in one place means the fallback (initials on a circle) stays
 * consistent everywhere instead of being redefined per-component.
 */
export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function StaffAvatar({
  name,
  avatarUrl,
  sizePx = 28, // plain px value via inline style — Tailwind JIT can't see
               // a template-literal class like `h-${size}`, so this avoids
               // that pitfall instead of needing a static class lookup map
}: {
  name: string;
  avatarUrl?: string | null;
  sizePx?: number;
}) {
  const dim = { width: sizePx, height: sizePx };
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={dim}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={dim}
      className="flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
    >
      {initials(name) || "?"}
    </span>
  );
}

/** Avatar + name, side by side — the common pairing used in table cells. */
export function StaffIdentity({
  name,
  avatarUrl,
  subtitle,
}: {
  name: string;
  avatarUrl?: string | null;
  subtitle?: string | null;
}) {
  return (
    <span className="flex items-center gap-2">
      <StaffAvatar name={name} avatarUrl={avatarUrl} />
      <span className="flex flex-col leading-tight">
        <span>{name}</span>
        {subtitle && (
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}