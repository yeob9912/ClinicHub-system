"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { Heart, X, Sparkles } from "lucide-react";

interface AuthPromptProps {
  /** Show/hide the prompt */
  open: boolean;
  /** Called when the user dismisses */
  onClose: () => void;
  /** Where to return after auth (e.g. current page path) */
  redirect?: string;
  /** Optional short label of what needs auth, e.g. "save favourites" */
  action?: string;
}

/**
 * Slim floating auth prompt.
 * Drop this anywhere a user hits a protected action.
 * It renders a centred backdrop + small attractive card.
 */
export default function AuthPrompt({
  open,
  onClose,
  redirect = "",
  action = "save favourites",
}: AuthPromptProps) {
  const qs = redirect ? `?redirect=${encodeURIComponent(redirect)}` : "";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ── */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/20 backdrop-blur-[2px]"
          />

          {/* ── Card ── */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 12 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="fixed inset-0 z-[201] flex items-center justify-center pointer-events-none px-4"
          >
            <div className="pointer-events-auto w-full max-w-[320px] bg-white rounded-[1.75rem] shadow-[0_24px_60px_rgba(0,0,0,0.14)] border border-gray-100 overflow-hidden">

              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-[#24D2A6] via-emerald-400 to-teal-500" />

              {/* Body */}
              <div className="px-6 pt-5 pb-6">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                      <Heart size={17} className="text-rose-500 fill-rose-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                        Access required
                      </p>
                      <p className="text-sm font-black text-slate-900 leading-tight">
                        To {action}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-slate-400 hover:bg-gray-200 hover:text-slate-600 transition-all active:scale-90 shrink-0 mt-0.5"
                    aria-label="Dismiss"
                  >
                    <X size={13} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-50 mb-4" />

                {/* Label */}
                <p className="text-[12px] text-slate-500 font-medium mb-4 leading-relaxed">
                  Create a free account or sign in to unlock this feature.
                </p>

                {/* CTA buttons */}
                <div className="flex gap-2">
                  <Link
                    href={`/signup${qs}`}
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#24D2A6] text-white text-[11px] font-black tracking-wide hover:bg-[#1db891] active:scale-95 transition-all shadow-md shadow-[#24D2A6]/25"
                  >
                    <Sparkles size={12} />
                    Sign Up Free
                  </Link>
                  <Link
                    href={`/login${qs}`}
                    onClick={onClose}
                    className="flex-1 flex items-center justify-center py-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-black tracking-wide hover:bg-slate-800 active:scale-95 transition-all shadow-md shadow-slate-900/10"
                  >
                    Log In
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
