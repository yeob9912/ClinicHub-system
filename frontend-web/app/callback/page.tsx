"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@/context/UserContext";

function AuthCallbackContent() {
  console.log("AuthCallbackContent (fallback): Rendering...");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { establishSession } = useUser();
  const [message, setMessage] = useState("Loading…");

  useEffect(() => {
    const access = searchParams.get("access_token");
    const refresh = searchParams.get("refresh_token");

    if (!access || !refresh) {
      setMessage("Sign-in failed. Redirecting…");
      router.replace("/login?error=Missing+tokens+from+Google");
      return;
    }

    const complete = async () => {
      try {
        const path = await establishSession(access, refresh);
        router.replace(path);
      } catch {
        setMessage("Sign-in failed. Redirecting…");
        router.replace("/login?error=Could+not+load+your+profile");
      }
    };

    void complete();
  }, [router, searchParams, establishSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
          <p className="text-sm font-medium text-slate-600">Completing sign in…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
