"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { formatApiError } from "@/lib/api";
import GoogleSignInButton, { AuthDivider } from "@/components/GoogleSignInButton";
import { API_BASE_URL } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, CheckCircle2, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password modal states
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Mail Sandbox states
  const [showSandbox, setShowSandbox] = useState(false);
  const [sandboxMails, setSandboxMails] = useState<any[]>([]);
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [showSandboxTrigger, setShowSandboxTrigger] = useState(false);

  useEffect(() => {
    const queryError = searchParams.get("error");
    if (queryError) setError(decodeURIComponent(queryError));
  }, [searchParams]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const defaultRedirect = await login(email.trim(), password);
      // Honour ?redirect= param (e.g. from pharmacy-partner gate)
      const redirectParam = searchParams.get("redirect");
      router.push(redirectParam ?? defaultRedirect);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to process request");
      
      setForgotSuccess(data.message || "A secure password reset link has been sent to your email address.");
      setShowSandboxTrigger(true); // Only show trigger when link is actually generated
      // Trigger update of sandbox mail list
      fetchSandboxMails();
    } catch (err: any) {
      setForgotError(err?.message || "An unexpected error occurred.");
    } finally {
      setForgotLoading(false);
    }
  };

  const fetchSandboxMails = async () => {
    setSandboxLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/mail-sandbox`);
      const json = await res.json();
      if (res.ok && json.success) {
        setSandboxMails(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load sandbox mails:", err);
    } finally {
      setSandboxLoading(false);
    }
  };

  // We only fetch on demand when the drawer is opened or a reset link is created.
  // No initial mount effect is needed anymore.

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#24D2A6_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      <div className="flex flex-col items-center mb-8 relative z-10">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
            <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
            <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-blue-700">pharmaLocator</h1>
        <p className="text-gray-500 text-sm text-center max-w-xs mt-2 leading-relaxed">
          Sign in to find pharmacies, compare medicine prices, and check out prescriptions.
        </p>
      </div>

      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative z-10">
        <form className="space-y-5" onSubmit={onSubmit}>
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1.5 ml-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5 ml-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                Password
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true);
                  setForgotError(null);
                  setForgotSuccess(null);
                }}
                className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3.5 pr-11 bg-slate-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-gray-900 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Login"}
          </button>

          <AuthDivider />

          <GoogleSignInButton
            size="lg"
            disabled={loading}
            onClick={() => {
              window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
            }}
          />
        </form>

        <p className="text-center mt-8 text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-blue-600 font-bold hover:underline">
            Sign Up
          </Link>
        </p>

        <div className="mt-10 flex justify-center gap-6 text-[9px] font-bold text-gray-400 uppercase tracking-tighter border-t border-gray-50 pt-6">
          <span className="flex items-center gap-1">🛡️ pharma COMPLIANT</span>
          <span className="flex items-center gap-1">🔒 256-BIT ENCRYPTION</span>
        </div>
      </div>

      {/* Forgot Password Overlay Modal */}
      <AnimatePresence>
        {showForgot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative border border-gray-100"
            >
              <button
                onClick={() => setShowForgot(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="text-center mb-5">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Mail size={20} />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Reset your password</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your email address and we will generate a password reset link for you.
                </p>
              </div>

              {forgotError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold">
                  {forgotError}
                </div>
              )}

              {forgotSuccess ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <span>{forgotSuccess}</span>
                  </div>

                  <p className="text-slate-500 text-[11px] leading-relaxed text-center">
                    Check the <strong>Mail Sandbox</strong> at the bottom right of the screen to open the mock email and access the reset link.
                  </p>

                  <button
                    onClick={() => setShowForgot(false)}
                    className="w-full py-2.5 bg-[#0F766E] hover:bg-[#0d665f] text-white font-bold text-xs rounded-xl transition-colors"
                  >
                    OK, Got It
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 text-xs text-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading || !forgotEmail}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-blue-100 disabled:opacity-60 transition-colors"
                  >
                    {forgotLoading && <Loader2 size={12} className="animate-spin" />}
                    {forgotLoading ? "Processing..." : "Generate Reset Link"}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Mail Sandbox trigger for testing */}
      {showSandboxTrigger && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              setShowSandbox(true);
              fetchSandboxMails();
            }}
            className="flex items-center gap-2 px-4 py-3 bg-[#0F766E] hover:bg-[#0d665f] text-white text-xs font-black uppercase tracking-wider rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-white/20 animate-pulse"
          >
            <Mail size={14} /> Open Mail Sandbox
          </button>
        </div>
      )}

      {/* Mail Sandbox Drawer */}
      <AnimatePresence>
        {showSandbox && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
            {/* Click outside to close */}
            <div className="absolute inset-0" onClick={() => setShowSandbox(false)} />
            
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-slate-950 text-slate-100 shadow-2xl flex flex-col border-l border-slate-800"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0F766E]/20 flex items-center justify-center text-[#24D2A6]">
                    <Mail size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Mail Sandbox</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Capture & debug reset links securely</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSandbox(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Mails List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {sandboxLoading ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-400">
                    <Loader2 size={24} className="animate-spin text-[#24D2A6]" />
                    <p className="text-xs font-bold uppercase tracking-widest text-[10px]">Loading sandbox...</p>
                  </div>
                ) : sandboxMails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500 px-6 space-y-2">
                    <Mail size={32} className="text-slate-700" />
                    <p className="text-xs font-bold uppercase tracking-wider">No Emails Intercepted Yet</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Submit the password reset form with a registered email address to see the simulated reset email here.
                    </p>
                  </div>
                ) : (
                  sandboxMails.map((mail, idx) => (
                    <motion.div
                      key={mail._id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md"
                    >
                      <div className="flex justify-between items-start border-b border-slate-800/80 pb-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black text-[#24D2A6] uppercase tracking-wider bg-[#24D2A6]/10 px-1.5 py-0.5 rounded">To</span>
                            <span className="text-xs font-bold text-slate-200">{mail.to}</span>
                          </div>
                          <p className="text-xs font-black text-slate-100">{mail.subject}</p>
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {new Date(mail.created_at).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 leading-relaxed font-mono whitespace-pre-line bg-slate-950 p-3 rounded-lg border border-slate-900">
                        {mail.body}
                      </div>

                      {mail.reset_url && (
                        <Link
                          href={mail.reset_url.substring(mail.reset_url.indexOf("/reset-password"))}
                          onClick={() => setShowSandbox(false)}
                          className="w-full py-2 bg-[#24D2A6] hover:bg-[#1fb38d] text-slate-950 text-center font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors mt-2"
                        >
                          Reset Password <ArrowRight size={12} />
                        </Link>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-4 animate-pulse">Loading secure gateway...</p>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
