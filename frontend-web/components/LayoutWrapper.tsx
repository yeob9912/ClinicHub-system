"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/context/UserContext";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CallOverlay from "./CallOverlay";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authReady } = useUser();

  const isSpecialPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/registration" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/staff");

  useEffect(() => {
    if (!authReady || !user) return;

    const isAuthRoute =
      pathname.startsWith("/auth") ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/registration" ||
      pathname === "/reset-password";

    if (user.role === "pharmacy") {
      // Staff: can only access /staff, /auth, /login, /signup, /registration
      if (!pathname.startsWith("/staff") && !isAuthRoute) {
        router.replace("/staff");
      }
    } else if (user.role === "admin") {
      // Admin: can only access /admin, /auth, /login, /signup, /registration
      if (!pathname.startsWith("/admin") && !isAuthRoute) {
        router.replace("/admin");
      }
    } else if (user.role === "user") {
      // Patient/User: cannot access /admin or /staff
      if (pathname.startsWith("/admin") || pathname.startsWith("/staff")) {
        router.replace("/");
      }
    }
  }, [user, authReady, pathname, router]);

  return (
    <>
      {!isSpecialPage && <Navbar />}
      <main>
        {children}
      </main>
      {!isSpecialPage && <Footer />}
      {/* Global call overlay — renders for all logged-in users */}
      <CallOverlay />
    </>
  );
}
