"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  LogOut,
  Package,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setDarkMode, setIsSidebarCollapsed } from "@/state";
import { ALL_ITEMS } from "@/app/config/module";
import { useLogout } from "@/state/tageTypes/lib/useLogout";
import { useMe } from "@/state/tageTypes/lib/useMe";
import { useGetAllStaffQuery } from "@/state/tageTypes/services/staffApi";
import { useGetProductsQuery } from "@/state/tageTypes/services/inventoryApi";
import NotificationBell from "./NotificationBell";
import SearchResultDetail, {
  type SearchDetailTarget,
} from "./SearchResultDetail";

/** "Sokha Chan" -> "SC". Kept in step with the detail dialog's avatar. */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold tracking-widest uppercase pt-4 pb-1.5"
      style={{ color: "var(--color-text-muted)" }}
    >
      {children}
    </p>
  );
}

function ResultRow({
  leading,
  title,
  subtitle,
  onClick,
}: {
  leading: React.ReactNode;
  tint: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 py-3 text-left border-b transition-colors"
      style={{ borderColor: "var(--color-border)" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-divider)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--color-text-primary)" }}
        >
          {title}
        </p>
        <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
          {subtitle}
        </p>
      </div>
    </button>
  );
}

function Navbar() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const isSidebarColleapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [detailTarget, setDetailTarget] = useState<SearchDetailTarget | null>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);

  const { logout, isLoggingOut } = useLogout();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  // The signed-in identity. The login payload alone has no name/email/avatar —
  // those live on the staff record, which useMe fetches from GET /staff/my and
  // merges with the session, falling back when there is no staff record.
  const {
    displayName,
    email,
    avatarUrl: staffPhotoUrl,
    roleName: staffRoleName,
    initials,
  } = useMe();

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarColleapsed));
  };
  const toggleDarkMode = () => {
    dispatch(setDarkMode(!isDarkMode));
  };

  // Staff and products are only fetched once the overlay is opened — neither
  // list is needed to render the navbar, and `GET /staff/` and `GET /products/`
  // return everything unpaginated.
  const { data: allStaff, isFetching: staffFetching } = useGetAllStaffQuery(
    undefined,
    { skip: !isSearchOpen }
  );
  const { data: allProducts, isFetching: productsFetching } = useGetProductsQuery(
    undefined,
    { skip: !isSearchOpen }
  );
  const isSearchLoading = staffFetching || productsFetching;

  const q = query.trim().toLowerCase();

  const moduleResults = useMemo(() => {
    if (!q) return ALL_ITEMS;
    return ALL_ITEMS.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.subtitle.toLowerCase().includes(q)
    );
  }, [q]);

  // Neither API takes a search parameter, so matching happens here over the
  // full lists. Capped so one broad query can't render hundreds of rows.
  const staffResults = useMemo(() => {
    if (!q || !allStaff) return [];
    return allStaff
      .filter((s) =>
        [s.name, s.email, s.phone, s.staff_role?.role_name]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [q, allStaff]);

  const productResults = useMemo(() => {
    if (!q || !allProducts) return [];
    return allProducts
      .filter((p) =>
        [p.name, p.descriptions, ...p.variants.map((v) => v.sku)]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [q, allProducts]);

  const totalResults =
    moduleResults.length + staffResults.length + productResults.length;

  const openSearch = () => setIsSearchOpen(true);
  const closeSearch = () => {
    setIsSearchOpen(false);
    setQuery("");
  };

  // focus the overlay input as soon as it mounts, lock page scroll while open
  useEffect(() => {
    if (isSearchOpen) {
      overlayInputRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSearchOpen]);

  // close on Escape
  useEffect(() => {
    if (!isSearchOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSearch();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isSearchOpen]);

  // Dismiss the user menu on outside click or Escape.
  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (!userMenuRef.current?.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
  };

  const handleSelect = (href: string) => {
    closeSearch();
    router.push(href);
  };

  // Staff and product hits open a detail dialog instead of navigating — there
  // is no per-record page to route to yet.
  const openDetail = (target: SearchDetailTarget) => {
    closeSearch();
    setDetailTarget(target);
  };

  return (
    <div className={`flex justify-between items-center w-full mb-7`}>
      {/* LEFT SIDE */}
      <div className={`flex justify-between items-center gap-5`}>
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full border transition-colors"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-border)",
          }}
          onClick={toggleSidebar}
        >
          <Menu className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
        </button>

        {/* SEARCH TRIGGER */}
        <button
          onClick={openSearch}
          className="relative flex items-center pl-10 pr-4 py-2 w-56 md:w-72 rounded-lg border text-sm text-left transition-colors"
          style={{
            background: "var(--color-surface-card)",
            borderColor: "var(--color-card-border)",
            color: "var(--color-text-muted)",
          }}
        >
          <Search
            className="w-4 h-4 absolute left-3"
            style={{ color: "var(--color-text-muted)" }}
          />
          Search modules, settings...
        </button>
      </div>

      {/* RIGHT SIDE */}
      <div className={`flex justify-between items-center gap-5`}>
        <div className={`hidden md:flex justify-between items-center gap-5`}>
          <button onClick={toggleDarkMode}>
            {isDarkMode ? (
              <Sun className="cursor-pointer" size={22} style={{ color: "var(--color-text-secondary)" }} />
            ) : (
              <Moon className="cursor-pointer" size={22} style={{ color: "var(--color-text-secondary)" }} />
            )}
          </button>

          <NotificationBell />

          <div className="w-px h-7" style={{ background: "var(--color-border)" }} />

          {/* USER MENU */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen((open) => !open)}
              className="flex items-center gap-2.5 rounded-full pl-0.5 pr-2 py-0.5 transition-colors"
              aria-haspopup="menu"
              aria-expanded={isUserMenuOpen}
            >
              {staffPhotoUrl && !avatarFailed ? (
                // Plain <img>, not next/image: avatar_url is a remote
                // Cloudinary URL and next/image throws at runtime unless that
                // host is registered in next.config `images.remotePatterns`.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={staffPhotoUrl}
                  alt={displayName}
                  className="rounded-full w-7 h-7 object-cover shrink-0"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                  style={{
                    background: "linear-gradient(135deg, #6D28D9 0%, #7C6FF7 50%, #4338CA 100%)",
                    color: "#FFFFFF",
                  }}
                >
                  {initials}
                </div>
              )}
              <span
                className="font-semibold text-sm max-w-[140px] truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {displayName}
              </span>
            </button>

            {isUserMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 rounded-xl border overflow-hidden z-50"
                style={{
                  background: "var(--color-surface-elevated)",
                  borderColor: "var(--color-border)",
                  boxShadow: "0 12px 32px -12px rgba(0,0,0,0.45)",
                }}
              >
                <div
                  className="px-4 py-3 border-b flex items-center gap-3"
                  style={{ borderColor: "var(--color-divider)" }}
                >
                  {staffPhotoUrl && !avatarFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={staffPhotoUrl}
                      alt={displayName}
                      className="rounded-full w-9 h-9 object-cover shrink-0"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #6D28D9 0%, #7C6FF7 50%, #4338CA 100%)",
                        color: "#FFFFFF",
                      }}
                    >
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {displayName}
                    </p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {email ?? "—"}
                      {staffRoleName ? ` · ${staffRoleName}` : ""}
                    </p>
                  </div>
                </div>

                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
                  style={{ color: "var(--color-text-secondary)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-divider)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <UserCog className="w-4 h-4 shrink-0" />
                  Profile
                </Link>

                <button
                  role="menuitem"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ color: "var(--color-error)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-error-tint)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  {isLoggingOut ? "Signing out..." : "Log out"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULL-SCREEN SEARCH OVERLAY */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: "var(--color-bg, #0B0E17)" }}
        >
          <div className="relative flex flex-col w-full h-full max-w-2xl mx-auto px-4 pt-6 pb-4">
            {/* back + pill search row */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={closeSearch}
                className="w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-colors"
                style={{ background: "var(--color-surface-card)" }}
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
              </button>

              <div
                className="flex-1 flex items-center gap-3 rounded-full border px-4 py-2.5"
                style={{
                  background: "var(--color-surface-card)",
                  borderColor: "var(--color-blurple)",
                  boxShadow: "0 0 0 3px color-mix(in srgb, var(--color-blurple) 20%, transparent)",
                }}
              >
                <Search className="w-4 h-4 shrink-0" style={{ color: "var(--color-text-muted)" }} />
                <input
                  ref={overlayInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search modules, settings..."
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: "var(--color-card-text-primary)" }}
                />
              </div>
            </div>

            {/* heading */}
            <h2
              className="mt-6 mb-3 text-lg font-bold shrink-0"
              style={{ color: "var(--color-text-primary)" }}
            >
              Where do you want to go?
            </h2>

            <div
              className="text-[11px] font-semibold tracking-widest uppercase mb-1 shrink-0 pb-3 border-b"
              style={{ color: "var(--color-blurple)", borderColor: "var(--color-border)" }}
            >
              {query.trim()
                ? `${totalResults} result${totalResults === 1 ? "" : "s"}`
                : "All destinations"}
            </div>

            <div className="relative flex-1 overflow-y-auto">
              {totalResults === 0 ? (
                <p
                  className="px-1 py-10 text-sm text-center"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {isSearchLoading
                    ? "Searching..."
                    : `Nothing found for “${query}”`}
                </p>
              ) : (
                <>
                  {/* MODULES — navigate */}
                  {moduleResults.length > 0 && (
                    <>
                      <SectionHeading>Modules</SectionHeading>
                      {moduleResults.map((mod) => {
                        const Icon = mod.icon;
                        return (
                          <ResultRow
                            key={mod.href}
                            tint={mod.tint}
                            title={mod.title}
                            subtitle={mod.subtitle}
                            onClick={() => handleSelect(mod.href)}
                            leading={
                              <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ background: `${mod.tint}26` }}
                              >
                                <Icon className="h-5 w-5" style={{ color: mod.tint }} />
                              </div>
                            }
                          />
                        );
                      })}
                    </>
                  )}

                  {/* STAFF — open detail */}
                  {staffResults.length > 0 && (
                    <>
                      <SectionHeading>Staff</SectionHeading>
                      {staffResults.map((s) => (
                        <ResultRow
                          key={s.staff_id}
                          tint="#60A5FA"
                          title={s.name}
                          subtitle={
                            [s.staff_role?.role_name, s.email]
                              .filter(Boolean)
                              .join(" · ") || "Staff"
                          }
                          onClick={() => openDetail({ kind: "staff", item: s })}
                          leading={
                            <div
                              className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                              style={{
                                background: s.avatar_url
                                  ? "var(--color-surface-card)"
                                  : "var(--gradient-brand)",
                              }}
                            >
                              {s.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={s.avatar_url}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span
                                  className="text-xs font-bold"
                                  style={{ color: "var(--color-on-accent)" }}
                                >
                                  {initialsOf(s.name)}
                                </span>
                              )}
                            </div>
                          }
                        />
                      ))}
                    </>
                  )}

                  {/* PRODUCTS — open detail */}
                  {productResults.length > 0 && (
                    <>
                      <SectionHeading>Products</SectionHeading>
                      {productResults.map((p) => {
                        const img =
                          p.images.find((i) => i.is_primary) ?? p.images[0];
                        const stock = p.variants.reduce(
                          (n, v) => n + (v.stock_quantity ?? 0),
                          0
                        );
                        return (
                          <ResultRow
                            key={p.product_id}
                            tint="#2DD4BF"
                            title={p.name}
                            subtitle={`${p.variants.length} variant${
                              p.variants.length === 1 ? "" : "s"
                            } · ${stock} in stock`}
                            onClick={() =>
                              openDetail({ kind: "product", item: p })
                            }
                            leading={
                              <div
                                className="h-10 w-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0"
                                style={{ background: "#2DD4BF26" }}
                              >
                                {img ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={img.image_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package
                                    className="h-5 w-5"
                                    style={{ color: "#2DD4BF" }}
                                  />
                                )}
                              </div>
                            }
                          />
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <SearchResultDetail
          target={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}

export default Navbar;