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

  // Don't render if not authenticated — all hooks have already been called above
  if (!user) return null;

  const userRole = user.role;
  const suggestions = getDefaultSuggestions(userRole);

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        id="ai-chat-trigger"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl text-white font-semibold text-sm"
        style={{
          background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)",
          boxShadow: "0 8px 32px rgba(99,102,241,0.45)",
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        aria-label="Open ClinicHub AI Assistant"
      >
        <Bot size={18} />
        <span className="hidden sm:inline">ClinicHub AI</span>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-1.5rem)] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: "rgba(15,15,25,0.97)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(99,102,241,0.3)",
              boxShadow:
                "0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1)",
              height: "540px",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)",
                borderBottom: "1px solid rgba(99,102,241,0.2)",
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-500/20">
                  <Sparkles size={15} className="text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-none">
                    ClinicHub AI
                  </p>
                  <p className="text-slate-400 text-xs mt-0.5">Powered by Gemini</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    rolePill[userRole] ?? rolePill.user
                  }`}
                >
                  {roleLabel[userRole] ?? "User"}
                </span>
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-white/5"
                    title="Clear conversation"
                    aria-label="Clear chat"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-white/5"
                  aria-label="Close AI chat"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
                    <Bot size={26} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      Hi {user?.name?.split(" ")[0] ?? "there"}! 👋
                    </p>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      I&apos;m your ClinicHub AI assistant. I can help you
                      {getRoleDescription(userRole)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-xs text-left px-3 py-2 rounded-xl transition-all"
                        style={{
                          background: "rgba(99,102,241,0.1)",
                          border: "1px solid rgba(99,102,241,0.2)",
                          color: "#a5b4fc",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "rgba(99,102,241,0.2)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "rgba(99,102,241,0.1)";
                        }}
                      >
                        {s}
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
                    <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot size={13} className="text-indigo-400" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "text-white rounded-br-sm"
                        : "text-slate-200 rounded-bl-sm"
                    }`}
                    style={
                      msg.role === "user"
                        ? { background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }
                        : {
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }
                    }
                  >
                    {msg.parts}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <UserIcon size={13} className="text-slate-300" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                    <Bot size={13} className="text-indigo-400" />
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl rounded-bl-sm"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex gap-1 items-center">
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
                </div>
              )}

              {error && (
                <div
                  className="text-xs px-3 py-2 rounded-xl"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#fca5a5",
                  }}
                >
                  ⚠️ {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div
              className="px-3 py-3 shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div
                className="flex items-end gap-2 rounded-xl px-3 py-2"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                <MessageSquare
                  size={15}
                  className="text-slate-500 shrink-0 mb-1.5"
                />
                <textarea
                  ref={inputRef}
                  id="ai-chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about ClinicHub…"
                  rows={1}
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none leading-relaxed disabled:opacity-50"
                  style={{ maxHeight: "100px" }}
                  aria-label="AI chat input"
                />
                <button
                  id="ai-chat-send"
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mb-0.5 transition-all disabled:opacity-40"
                  style={{
                    background: input.trim()
                      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                      : "rgba(99,102,241,0.2)",
                  }}
                  aria-label="Send message"
                >
                  {loading ? (
                    <Loader2 size={13} className="text-white animate-spin" />
                  ) : (
                    <Send size={13} className="text-white" />
                  )}
                </button>
              </div>
              <p className="text-center text-slate-600 text-[10px] mt-1.5">
                ClinicHub AI · Role: {roleLabel[userRole] ?? "User"} · Live database data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
