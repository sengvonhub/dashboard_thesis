"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/state/tageTypes/lib/hook";

/**
 * Client-side auth detection for the dashboard layout.
 *
 * This is a UX guard, not a security boundary — it stops an unauthenticated
 * visitor from staring at an empty shell while every request 401s. The actual
 * protection is that the API rejects the requests. There is deliberately no
 * middleware equivalent: the access token lives in Redux (memory + localStorage
 * via redux-persist), so the server cannot see it during a Next middleware run.
 *
 * Renders nothing while unauthenticated so no dashboard chrome flashes before
 * the redirect lands.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      // Preserve where they were headed so login can send them back.
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) return null;

  return <>{children}</>;
}
