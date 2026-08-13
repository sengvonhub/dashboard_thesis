"use client";
import React, { useEffect } from "react";
import Navbar from "@/app/(components)/Navbar";
import Sidebar from "@/app/(components)/Sidebar";
import AuthGuard from "@/app/(components)/AuthGuard";
import { useAppSelector } from "@/app/redux";
import { useNotificationSocket } from "@/state/tageTypes/lib/useNotificationSocket";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isSidebarCollapsed = useAppSelector((state) => state.global.isSidebarCollapsed);
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);

  // Mounted here and nowhere else: the server keeps a SET of sockets per user
  // rather than replacing them, so a second mount would leave two open
  // connections and every notification would arrive twice. The hook no-ops
  // until there is a token, so it is safe to call above AuthGuard.
  useNotificationSocket();

  useEffect(() => {
    const theme = isDarkMode ? "dark" : "light";
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    // Keep the attribute in step with the class: globals.css matches on both,
    // and a stale attribute from SSR would otherwise fight the class.
    root.dataset.theme = theme;
    // Persist so the server can render the right theme on the next request
    // instead of always starting dark and correcting after hydration.
    document.cookie = `theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  }, [isDarkMode]);

  return (
    <AuthGuard>
      <div
        className="flex w-full min-h-screen"
        style={{ background: "var(--color-bg)", color: "var(--color-text-primary)" }}
      >
        <Sidebar />
        {/* The Sidebar is `fixed`, so the content is offset by a margin equal
            to its exact width (md:w-20 collapsed, md:w-72 expanded) and the
            gutter comes from px-9. These two must match the Sidebar's own
            width classes exactly — the old `md:pl-24` / `md:pl-72` padding
            mixed the two together and drifted out of sync, giving a 1rem
            gutter when collapsed and a 2rem one when expanded. */}
        <main
          className={`flex-1 min-w-0 flex flex-col py-7 px-9 transition-[margin] duration-300 ease-in-out ${
            isSidebarCollapsed ? "md:ml-20" : "md:ml-72"
          }`}
          style={{ background: "var(--color-bg)" }}
        >
          <Navbar />
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}