"use client";
import { HOME_ITEM, MODULES, SYSTEM_ITEMS } from "@/app/config/module";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { Menu, LogOut, LucideIcon } from "lucide-react";
import { useLogout } from "@/state/tageTypes/lib/useLogout";
import CompanyHeader from "./CompanyHeader";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

interface SidebarLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  color: string;
  isCollapsed: boolean;
}

const SidebarLink = ({
  href,
  icon: Icon,
  label,
  color,
  isCollapsed,
}: SidebarLinkProps) => {
  const pathname = usePathname();
  const isActive =
    pathname === href || (pathname === "/" && href === "/dashboard");
  const [isHovered, setIsHovered] = React.useState(false);

  // color-mix() works no matter what format `color` comes in as (hex, rgb,
  // or a CSS variable like var(--color-primary)). The old approach —
  // `${color}33` / `${color}1A` — string-concatenates a hex alpha suffix,
  // which is only valid when `color` is a raw hex string. If a module's
  // tint is a CSS variable (needed for theme/background switching), that
  // concatenation produces invalid CSS, the browser silently drops the
  // background-color declaration, and whatever shows through instead
  // (often a default blurple) looks like "the icon turned blue."
  const rowBg = isActive
    ? `color-mix(in srgb, ${color} 10%, transparent)`
    : isHovered
    ? "var(--color-divider)"
    : "transparent";

  const iconBg = isActive
    ? `color-mix(in srgb, ${color} 20%, transparent)`
    : "var(--color-surface-card)";

  return (
    <Link href={href}>
      <div
        className={`group relative flex items-center ${
          isCollapsed ? "justify-center px-0" : "px-4"
        } mx-3 my-0.5 py-2.5 rounded-xl cursor-pointer transition-[background-color] duration-200 ease-out`}
        style={{ backgroundColor: rowBg }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* active indicator bar */}
        <span
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-200 ease-out ${
            isActive ? "h-5 opacity-100" : "h-0 opacity-0"
          }`}
          style={{ backgroundColor: color }}
        />

        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-[background-color] duration-200 ease-out"
          style={{ backgroundColor: iconBg }}
        >
          <Icon
            className="w-[18px] h-[18px] transition-colors duration-200 ease-out"
            style={{ color: isActive ? color : "var(--color-text-muted)" }}
          />
        </div>

        {/* Animate with opacity + max-width instead of hidden/block so the
           label actually transitions instead of snapping away instantly. */}
        <span
          className={`ml-3 text-sm font-medium tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
            isCollapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[160px] opacity-100"
          }`}
          style={{
            color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          }}
        >
          {label}
        </span>
      </div>
    </Link>
  );
};

// Collapses to zero height (rather than unmounting) so it fades with the same
// timing as the labels beside it instead of snapping away.
const SectionLabel = ({
  isCollapsed,
  children,
}: {
  isCollapsed: boolean;
  children: React.ReactNode;
}) => (
  <div
    className={`px-7 pt-4 pb-2 text-[11px] font-semibold tracking-widest uppercase whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
      isCollapsed ? "max-h-0 opacity-0 pt-2 pb-0" : "max-h-8 opacity-100"
    }`}
    style={{ color: "var(--color-text-muted)" }}
  >
    {children}
  </div>
);

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const { logout, isLoggingOut } = useLogout();

  const isSidebarColleapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed
  );

  const toggleSidebar = () => {
    dispatch(setIsSidebarCollapsed(!isSidebarColleapsed));
  };

  // Widened from md:w-64 (16rem) to md:w-72 (18rem) so longer company names
  // fit on one line in the header. NOTE: the dashboard layout offsets <main>
  // by exactly this width — keep `md:ml-72` there in step with this value.
  const sideBarClassNames = `fixed flex flex-col ${
    isSidebarColleapsed ? "w-0 md:w-20" : "w-72 md:w-72"
  } transition-[width] duration-300 ease-in-out overflow-hidden h-full z-40 border-r`;

  return (
    <div
      className={sideBarClassNames}
      style={{
        backgroundColor: "var(--color-bg, var(--color-surface-card))",
        borderColor: "var(--color-border)",
      }}
    >
      {/* COMPANY HEADER */}
      <div className="relative shrink-0 pb-4">
        <CompanyHeader isCollapsed={isSidebarColleapsed} />

        {/* Overlays the header's right edge rather than sitting beside the
            logo, so the header keeps its full width for the company name. */}
        <button
          className="md:hidden absolute top-7 right-3 w-8 h-8 flex items-center justify-center rounded-lg z-10 transition-colors duration-200"
          style={{ backgroundColor: "var(--color-surface-card)" }}
          onClick={toggleSidebar}
          aria-label="Collapse sidebar"
        >
          <Menu className="w-4 h-4" style={{ color: "var(--color-text-secondary)" }} />
        </button>
      </div>

      {/* LINKS */}
      <div className="flex-grow overflow-y-auto pb-4">
        <SidebarLink
          href={HOME_ITEM.href}
          icon={HOME_ITEM.icon}
          label={HOME_ITEM.title}
          color={HOME_ITEM.tint}
          isCollapsed={isSidebarColleapsed}
        />

        <SectionLabel isCollapsed={isSidebarColleapsed}>
          System modules
        </SectionLabel>
        {MODULES.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.title}
            color={item.tint}
            isCollapsed={isSidebarColleapsed}
          />
        ))}

        <SectionLabel isCollapsed={isSidebarColleapsed}>Workspace</SectionLabel>
        {SYSTEM_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.title}
            color={item.tint}
            isCollapsed={isSidebarColleapsed}
          />
        ))}
      </div>

      {/* FOOTER */}
      <div className="mb-6 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
        {/* The Navbar's user menu lives in a `hidden md:flex` block, so this is
            the only logout reachable on mobile. */}
        <button
          onClick={() => logout()}
          disabled={isLoggingOut}
          className={`group flex items-center ${
            isSidebarColleapsed ? "justify-center px-0" : "px-4"
          } mx-3 mb-3 py-2.5 w-[calc(100%-1.5rem)] rounded-xl cursor-pointer transition-colors duration-200 ease-out disabled:opacity-60 disabled:cursor-not-allowed`}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-error-tint)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          title="Log out"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0">
            <LogOut className="w-[18px] h-[18px]" style={{ color: "var(--color-error)" }} />
          </div>
          <span
            className={`ml-3 text-sm font-medium tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
              isSidebarColleapsed ? "max-w-0 opacity-0 ml-0" : "max-w-[160px] opacity-100"
            }`}
            style={{ color: "var(--color-error)" }}
          >
            {isLoggingOut ? "Signing out..." : "Log out"}
          </span>
        </button>

        <p
          className={`text-center text-xs whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
            isSidebarColleapsed ? "max-h-0 opacity-0" : "max-h-4 opacity-100"
          }`}
          style={{ color: "var(--color-text-muted)" }}
        >
          Sengvon&copy; 2025
        </p>
      </div>
    </div>
  );
};

export default Sidebar;