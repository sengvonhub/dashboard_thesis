export default function Pages() {
  return (
    <div
      className="row-span-3 xl:row-span-6 rounded-2xl border p-5 flex flex-col justify-between"
      style={{ background: "var(--color-surface-card)", borderColor: "var(--color-border)" }}
    >
      <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
        Popular products
      </h3>
      <div className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Card content here...
      </div>
    </div>
  );
}