"use client";

import { FormEvent, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { formatApiError } from "@/lib/api";
import { validatePassword } from "@/lib/auth";
import GoogleSignInButton, { AuthDivider } from "@/components/GoogleSignInButton";
import { API_BASE_URL } from "@/lib/api";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useUser();

  // Detect Google-signup redirect (user not yet in DB)
  const isGoogleSignup = searchParams.get("google_signup") === "1";
  const googleId = searchParams.get("google_id") ?? "";

  const [fullName, setFullName] = useState(searchParams.get("name") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    isGoogleSignup
      ? "Your Google account isn't registered yet. Please complete your profile to create an account."
      : null
  );
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!isGoogleSignup) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please re-enter them.");
        return;
      }
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        email: email.trim(),
        password: isGoogleSignup ? undefined : password,
        full_name: fullName.trim(),
        ...(googleId ? { google_id: googleId } : {}),
      });

      if (result.needsEmailConfirmation) {
        setInfo("Check your email to confirm your account, then sign in.");
        return;
      }

      // Honour ?redirect= param (e.g. from pharmacy-partner gate)
      const redirectParam = searchParams.get("redirect");
      router.push(redirectParam ?? result.redirectTo);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div 
        className="absolute top-0 left-0 w-full h-full -z-10" 
        style={{ backgroundImage: 'var(--backgroundImage-gradient-hero)' }}
      />
      <motion.div 
        animate={{ y: [0, 30, 0], x: [0, -20, 0] }} 
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl -z-10"
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 font-poppins">
          Create an account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Start finding medicines at the best prices today.
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-blue-900/5 border border-gray-100 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={onSubmit}>
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
                {info}
              </p>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-slate-900 sm:text-sm transition-colors"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-slate-900 sm:text-sm transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {!isGoogleSignup && (
              <>
                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-slate-900 sm:text-sm transition-colors"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`block w-full pl-10 pr-10 py-3 border rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-slate-900 sm:text-sm transition-colors ${
                        confirmPassword.length > 0
                          ? passwordsMatch
                            ? "border-emerald-400 focus:border-emerald-500"
                            : "border-rose-400 focus:border-rose-500"
                          : "border-gray-300"
                      }`}
                      placeholder="Re-enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${
                      passwordsMatch ? "text-emerald-600" : "text-rose-500"
                    }`}>
                      {passwordsMatch
                        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Passwords match</>  
                        : <><XCircle className="h-3.5 w-3.5" /> Passwords do not match</>}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-slate-700">
                I agree to the <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Terms</a> and <a href="#" className="font-medium text-blue-600 hover:text-blue-500">Privacy Policy</a>.
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Sign up"}
              </button>
            </div>

            <AuthDivider />

            <GoogleSignInButton
              disabled={loading}
              onClick={() => {
                window.location.href = `${API_BASE_URL}/api/v1/auth/google`;
              }}
            />
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  Already have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/login" className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-gray-50 focus:outline-none transition-colors">
                Sign in to your account
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-[#24D2A6] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
