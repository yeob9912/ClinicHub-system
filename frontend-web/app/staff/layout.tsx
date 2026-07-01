"use client";

import AuthGuard from "@/components/AuthGuard";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard roles={["pharmacy"]}>{children}</AuthGuard>;
}
