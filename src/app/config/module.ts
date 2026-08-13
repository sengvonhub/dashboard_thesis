import {
  QrCode,
  Users,
  Archive,
  Shapes,
  ReceiptText,
  FileText,
  UsersRound,
  Truck,
  Wallet,
  CalendarX2,
  MessageSquare,
  Settings,
  UserCog,
  LayoutDashboard,
  LucideIcon,
} from "lucide-react";

export interface ModuleItem {
  href: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tint: string;
}

// Dashboard entry point — shown in the sidebar, not in the module grid.
export const HOME_ITEM: ModuleItem = {
  href: "/dashboard",
  icon: LayoutDashboard,
  title: "Dashboard",
  subtitle: "Overview",
  tint: "#7C6FF7",
};

// Single source of truth for module color, icon, and copy.
// The Sidebar and the dashboard's module grid both render this list, so the
// two surfaces can never drift out of sync. Order and tints mirror the
// "System Modules" grid in the mobile app.
export const MODULES: ModuleItem[] = [
  { href: "/attendance", icon: QrCode, title: "Attendance", subtitle: "QR & Scan", tint: "#34D399" },
  { href: "/hr", icon: Users, title: "HR / Staff", subtitle: "Employees", tint: "#60A5FA" },
  { href: "/inventory", icon: Archive, title: "Inventory", subtitle: "Products & Stock", tint: "#2DD4BF" },
  { href: "/categories", icon: Shapes, title: "Categories", subtitle: "Product Groups", tint: "#22D3EE" },
  { href: "/invoices", icon: ReceiptText, title: "Invoices", subtitle: "Billing System", tint: "#FBBF24" },
  { href: "/quotations", icon: FileText, title: "Quotations", subtitle: "Quotes & Estimates", tint: "#EC4899" },
  { href: "/customers", icon: UsersRound, title: "Customers", subtitle: "CRM", tint: "#F87171" },
  { href: "/suppliers", icon: Truck, title: "Suppliers", subtitle: "Vendors", tint: "#FB923C" },
  { href: "/payroll", icon: Wallet, title: "Payroll", subtitle: "Salary & Bonus", tint: "#EAB308" },
  { href: "/leave", icon: CalendarX2, title: "Leave", subtitle: "Time Off Requests", tint: "#A78BFA" },
];

// Workspace-level destinations. These sit below the modules in the sidebar and
// are deliberately kept out of MODULES so the dashboard grid keeps showing
// exactly the ten system modules.
export const SYSTEM_ITEMS: ModuleItem[] = [
  { href: "/communication", icon: MessageSquare, title: "Communication", subtitle: "DM & groups", tint: "#818CF8" },
  { href: "/profile", icon: UserCog, title: "Profile", subtitle: "Account & company", tint: "#60A5FA" },
  { href: "/settings", icon: Settings, title: "Settings", subtitle: "Workspace config", tint: "#94A3B8" },
];

// Every navigable module, for lookups (search, placeholder pages, breadcrumbs).
export const ALL_ITEMS: ModuleItem[] = [HOME_ITEM, ...MODULES, ...SYSTEM_ITEMS];
