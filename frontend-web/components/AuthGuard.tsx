"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

type AuthGuardProps = {
  children: React.ReactNode;
  roles?: Array<"user" | "pharmacy" | "admin">;
  loginPath?: string;
};

export default function AuthGuard({
  children,
  roles,
  loginPath = "/login",
}: AuthGuardProps) {
  const router = useRouter();
  const { user, authReady, isAuthenticated } = useUser();

  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated || !user) {
      router.replace(loginPath);
      return;
    }

    if (roles && !roles.includes(user.role)) {
      if (user.role === "admin") router.replace("/admin");
      else if (user.role === "pharmacy") router.replace("/staff");
      else router.replace("/");
    }
  }, [authReady, isAuthenticated, user, roles, loginPath, router]);

  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm font-medium text-slate-500">
        Loading session…
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;
  if (roles && !roles.includes(user.role)) return null;

  return <>{children}</>;
}
