"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  User as UserIcon,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { getApiBaseUrl } from "@/lib/api";

interface ChatMessage {
  role: "user" | "model";
  parts: string;
  id: string;
}

// Frontend uses "user" / "pharmacy" / "admin" from mapBackendRole
const roleLabel: Record<string, string> = {
  user: "Customer",
  patient: "Customer",
  pharmacy: "Pharmacy Staff",
  pharmacy_staff: "Pharmacy Staff",
  admin: "Administrator",
};

const rolePill: Record<string, string> = {
  user: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  patient: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  pharmacy: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  pharmacy_staff: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  admin: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

const SUGGESTIONS: Record<string, string[]> = {
  user: [
    "Find a pharmacy near me",
    "Is Paracetamol available?",
    "Show pharmacies in Addis Ababa",
  ],
  patient: [
    "Find a pharmacy near me",
    "Is Paracetamol available?",
    "Show pharmacies in Addis Ababa",
  ],
  pharmacy: [
    "Show my low-stock medicines",
    "Give me an inventory summary",
    "Which medicines need restocking?",
  ],
  pharmacy_staff: [
    "Show my low-stock medicines",
    "Give me an inventory summary",
    "Which medicines need restocking?",
  ],
  admin: [
    "Show system statistics",
    "Which pharmacies have low stock?",
    "Give me a system-wide inventory report",
  ],
};

function getDefaultSuggestions(role: string): string[] {
  return SUGGESTIONS[role] ?? SUGGESTIONS.user;
}

function getRoleDescription(role: string): string {
  if (role === "admin") return " with system analytics, pharmacy activity, and inventory reports.";
  if (role === "pharmacy" || role === "pharmacy_staff") return " check your inventory, identify low-stock medicines, and get restocking suggestions.";
  return " find pharmacies, check medicine availability, and more.";
}

export default function AiChatWidget() {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // All hooks must come before any conditional returns
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!user) return;
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const userMsg: ChatMessage = {
        role: "user",
        parts: trimmed,
        id: Date.now().toString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setError(null);

      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("medpay_access_token")
            : null;

        const history = messages.map(({ role, parts }) => ({ role, parts }));

        const res = await fetch(`${getApiBaseUrl()}/api/v1/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: trimmed, history }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message ?? "AI service is temporarily unavailable.");
        }

        setMessages((prev) => [
          ...prev,
          { role: "model", parts: data.data.reply, id: (Date.now() + 1).toString() },
        ]);
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || "Something went wrong. Please try again.");
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, user]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // If unauthenticated or authenticated, hooks must have run above
  const userRole = user?.role ?? "guest";
  const suggestions = getDefaultSuggestions(userRole);

  // Helper to format model messages with basic markdown (bold, lists)
  const renderMessageContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      // Check for bullet point
      const isBullet = /^\s*[\*\-]\s+(.*)$/.exec(line);
      const isNumbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);

      const content = isBullet ? isBullet[1] : isNumbered ? `${isNumbered[1]}. ${isNumbered[2]}` : line;

      // Parse bold **text**
      const parts = content.split(/(\*\*[^*]+\*\*)/g);
      const formatted = parts.map((part, partIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={partIdx} className="font-semibold text-indigo-200">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={lineIdx} className="flex items-start gap-1.5 my-0.5">
            <span className="text-indigo-400 mt-1 text-xs shrink-0">•</span>
            <span className="flex-1">{formatted}</span>
          </div>
        );
      }

      if (line.trim() === "") {
        return <div key={lineIdx} className="h-1.5" />;
      }

      return (
        <div key={lineIdx} className="my-0.5">
          {formatted}
        </div>
      );
    });
  };

  return (
    <>
      {/* Mobile Backdrop when open */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs sm:hidden"
            style={{ zIndex: 940 }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Floating trigger button — positioned above mobile bottom navs (bottom-20) and clean in corner on desktop (lg:bottom-7) */}
      <motion.button
        id="ai-chat-trigger"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-20 right-4 lg:bottom-7 lg:right-7 flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-2xl text-white font-semibold text-sm cursor-pointer select-none transition-all duration-300 group"
        style={{
          zIndex: 950,
          background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #9333ea 100%)",
          boxShadow: "0 10px 30px -5px rgba(99,102,241,0.5), 0 0 0 1px rgba(255,255,255,0.25) inset",
        }}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Open ClinicHub AI Assistant"
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
        </span>
        <Bot size={19} className="text-white group-hover:rotate-12 transition-transform duration-300 shrink-0" />
        <span className="font-medium tracking-wide">ClinicHub AI</span>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
            className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-24 w-auto sm:w-[410px] max-w-full flex flex-col rounded-3xl overflow-hidden shadow-2xl"
            style={{
              zIndex: 950,
              background: "rgba(15, 17, 30, 0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              boxShadow: "0 25px 70px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.15)",
              height: "min(580px, calc(100dvh - 6.5rem))",
            }}
            role="dialog"
            aria-label="ClinicHub AI Chat Assistant"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3.5 shrink-0 select-none"
              style={{
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.2) 100%)",
                borderBottom: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-500/25 border border-indigo-400/30 shadow-sm">
                  <Sparkles size={16} className="text-indigo-300" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none flex items-center gap-1.5">
                    ClinicHub AI
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Powered by Gemini</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {user && (
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${
                      rolePill[userRole] ?? rolePill.user
                    }`}
                  >
                    {roleLabel[userRole] ?? "User"}
                  </span>
                )}
                {user && messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 active:scale-95"
                    title="Clear conversation"
                    aria-label="Clear chat"
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 active:scale-95"
                  aria-label="Close AI chat"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* If Guest (not signed in) */}
            {!user ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-5 overflow-y-auto">
                <div className="w-16 h-16 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                  <Bot size={34} className="text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold text-base">Welcome to ClinicHub AI</h3>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-xs">
                    Your intelligent healthcare companion. Sign in to find nearby pharmacies, check real-time medicine availability, and get role-based insights.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5 w-full max-w-xs mt-2">
                  <a
                    href="/login"
                    className="w-full py-3 px-4 rounded-xl text-center font-semibold text-sm text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                    }}
                  >
                    Sign In to Start Chatting
                  </a>
                  <a
                    href="/signup"
                    className="w-full py-2.5 px-4 rounded-xl text-center font-medium text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors border border-white/10"
                  >
                    Create a Free Account
                  </a>
                </div>
              </div>
            ) : (
              <>
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 scroll-smooth">
                  {messages.length === 0 && !loading && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-2 py-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center">
                        <Bot size={24} className="text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">
                          Hi {user?.name?.split(" ")[0] ?? "there"}! 👋
                        </p>
                        <p className="text-slate-300 text-xs mt-1 leading-relaxed max-w-xs">
                          I&apos;m your ClinicHub AI assistant. I can help you
                          {getRoleDescription(userRole)}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 w-full mt-2">
                        <p className="text-[11px] text-slate-400 font-medium text-left px-1">
                          Try asking:
                        </p>
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            onClick={() => sendMessage(s)}
                            className="text-xs text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer font-medium"
                            style={{
                              background: "rgba(99,102,241,0.12)",
                              border: "1px solid rgba(99,102,241,0.25)",
                              color: "#c7d2fe",
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                "rgba(99,102,241,0.22)";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background =
                                "rgba(99,102,241,0.12)";
                            }}
                          >
                            💡 {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "model" && (
                        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot size={13} className="text-indigo-400" />
                        </div>
                      )}
                      <div
                        className={`max-w-[84%] px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "text-white rounded-br-sm shadow-md"
                            : "text-slate-100 rounded-bl-sm"
                        }`}
                        style={
                          msg.role === "user"
                            ? {
                                background:
                                  "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                              }
                            : {
                                background: "rgba(255,255,255,0.08)",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }
                        }
                      >
                        {msg.role === "model"
                          ? renderMessageContent(msg.parts)
                          : msg.parts}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <UserIcon size={13} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex gap-2 justify-start items-center">
                      <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-400/20 flex items-center justify-center shrink-0">
                        <Bot size={13} className="text-indigo-400" />
                      </div>
                      <div
                        className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }}
                      >
                        <span className="text-xs text-indigo-300 font-medium mr-1">
                          Thinking
                        </span>
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div
                      className="text-xs px-3 py-2.5 rounded-xl flex items-start gap-2"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.35)",
                        color: "#fca5a5",
                      }}
                    >
                      <span className="shrink-0">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  <div ref={bottomRef} />
                </div>

                {/* Input Area */}
                <div
                  className="px-3.5 py-3 shrink-0"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="flex items-end gap-2 rounded-2xl px-3 py-2"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(99,102,241,0.3)",
                    }}
                  >
                    <MessageSquare
                      size={15}
                      className="text-slate-400 shrink-0 mb-2"
                    />
                    <textarea
                      ref={inputRef}
                      id="ai-chat-input"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything about medicines, pharmacies, stock…"
                      rows={1}
                      disabled={loading}
                      className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-slate-400 resize-none outline-none leading-relaxed disabled:opacity-50"
                      style={{ maxHeight: "96px" }}
                      aria-label="AI chat input"
                    />
                    <button
                      id="ai-chat-send"
                      onClick={() => sendMessage(input)}
                      disabled={loading || !input.trim()}
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mb-0.5 transition-all disabled:opacity-40 cursor-pointer shadow-md"
                      style={{
                        background: input.trim()
                          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                          : "rgba(99,102,241,0.25)",
                      }}
                      aria-label="Send message"
                    >
                      {loading ? (
                        <Loader2 size={14} className="text-white animate-spin" />
                      ) : (
                        <Send size={14} className="text-white" />
                      )}
                    </button>
                  </div>
                  <p className="text-center text-slate-400 text-[10px] mt-2">
                    ClinicHub AI · Role: <strong className="text-indigo-300 font-semibold">{roleLabel[userRole] ?? "User"}</strong> · Live database
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
