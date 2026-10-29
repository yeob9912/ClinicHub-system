"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  X,
  Send,
  Loader2,
  Sparkles,
  User as UserIcon,
  MessageSquare,
  Plus,
  History,
  Trash2,
  ChevronLeft,
  Clock,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { getApiBaseUrl } from "@/lib/api";

interface ChatMessage {
  role: "user" | "model";
  parts: string;
  id: string;
  isStreaming?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const HISTORY_KEY = "clinichub_ai_history";
const MAX_SESSIONS = 20;

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ChatSession[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  } catch {
    // storage full — ignore
  }
}

function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  return first.parts.length > 52 ? first.parts.slice(0, 52) + "…" : first.parts;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
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
  const pathname = usePathname();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up typing animation on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  // Load sessions from localStorage on mount
  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  // Auto-save session whenever messages change (only if there is an AI reply and typing is complete)
  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.some((m) => m.isStreaming)) return;
    const hasAiReply = messages.some((m) => m.role === "model");
    if (!hasAiReply) return;

    setSessions((prev) => {
      let updated: ChatSession[];
      if (currentSessionId) {
        updated = prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages, title: deriveTitle(messages) }
            : s
        );
        if (!updated.find((s) => s.id === currentSessionId)) {
          const newSession: ChatSession = {
            id: currentSessionId,
            title: deriveTitle(messages),
            messages,
            createdAt: Date.now(),
          };
          updated = [newSession, ...prev];
        }
      } else {
        const id = `session-${Date.now()}`;
        setCurrentSessionId(id);
        const newSession: ChatSession = {
          id,
          title: deriveTitle(messages),
          messages,
          createdAt: Date.now(),
        };
        updated = [newSession, ...prev];
      }
      saveSessions(updated);
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startNewChat = useCallback(() => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setMessages([]);
    setError(null);
    setCurrentSessionId(null);
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const loadSession = useCallback((session: ChatSession) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    setMessages(session.messages.map((m) => ({ ...m, isStreaming: false })));
    setCurrentSessionId(session.id);
    setError(null);
    setShowHistory(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  const deleteSession = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        saveSessions(updated);
        return updated;
      });
      if (currentSessionId === id) {
        setMessages([]);
        setCurrentSessionId(null);
        setError(null);
      }
    },
    [currentSessionId]
  );

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

        // Send only recent context for fast prompt processing
        const history = messages.slice(-6).map(({ role, parts }) => ({ role, parts }));

        const res = await fetch(`${getApiBaseUrl()}/api/v1/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: trimmed, history }),
          signal: AbortSignal.timeout(30000),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message ?? "AI service is temporarily unavailable.");
        }

        const fullReply = (data.data?.reply as string) || "";
        const modelMsgId = (Date.now() + 1).toString();

        // Turn off Thinking spinner so typing begins immediately
        setLoading(false);

        // Add empty model message in streaming state
        setMessages((prev) => [
          ...prev,
          { role: "model", parts: "", id: modelMsgId, isStreaming: true },
        ]);

        // Clear any previous typing interval
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }

        // ChatGPT-style dynamic typewriter pacing:
        // Short responses type smoothly character-by-character; longer responses stream in small chunks
        const tickMs = 18;
        const targetDurationMs = Math.min(2200, Math.max(600, fullReply.length * 3));
        const totalTicks = Math.max(1, Math.floor(targetDurationMs / tickMs));
        const charsPerTick = Math.max(1, Math.ceil(fullReply.length / totalTicks));

        let charIndex = 0;
        typingIntervalRef.current = setInterval(() => {
          charIndex += charsPerTick;
          if (charIndex >= fullReply.length) {
            if (typingIntervalRef.current) {
              clearInterval(typingIntervalRef.current);
              typingIntervalRef.current = null;
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === modelMsgId
                  ? { ...m, parts: fullReply, isStreaming: false }
                  : m
              )
            );
          } else {
            const currentSlice = fullReply.slice(0, charIndex);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === modelMsgId ? { ...m, parts: currentSlice } : m
              )
            );
          }
        }, tickMs);
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



  // Do not render on login/signup/auth pages
  const isAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/registration" ||
    pathname === "/reset-password" ||
    pathname?.startsWith("/auth");

  if (isAuthPage) return null;

  // If unauthenticated or authenticated, hooks must have run above
  const userRole = user?.role ?? "guest";
  const suggestions = getDefaultSuggestions(userRole);

  // Helper to format model messages with basic markdown (bold, lists) and ChatGPT-style streaming cursor
  const renderMessageContent = (text: string, isStreaming = false) => {
    if (!text && isStreaming) {
      return (
        <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse rounded-xs" />
      );
    }

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

      const isLastLine = lineIdx === lines.length - 1;

      if (isBullet) {
        return (
          <div key={lineIdx} className="flex items-start gap-1.5 my-0.5">
            <span className="text-indigo-400 mt-1 text-xs shrink-0">•</span>
            <span className="flex-1">
              {formatted}
              {isStreaming && isLastLine && (
                <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 translate-y-0.5 animate-pulse rounded-xs" />
              )}
            </span>
          </div>
        );
      }

      if (line.trim() === "") {
        return <div key={lineIdx} className="h-1.5" />;
      }

      return (
        <div key={lineIdx} className="my-0.5">
          {formatted}
          {isStreaming && isLastLine && (
            <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 translate-y-0.5 animate-pulse rounded-xs" />
          )}
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

                {/* New Chat button */}
                {user && (
                  <button
                    id="ai-new-chat-btn"
                    onClick={startNewChat}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg font-medium text-indigo-300 hover:text-white hover:bg-indigo-500/30 border border-indigo-500/30 hover:border-indigo-400/50 transition-all active:scale-95 cursor-pointer"
                    title="Start a new conversation"
                    aria-label="New chat"
                  >
                    <Plus size={12} />
                    <span>New</span>
                  </button>
                )}

                {/* History button */}
                {user && (
                  <button
                    id="ai-history-btn"
                    onClick={() => setShowHistory((v) => !v)}
                    className={`p-1.5 rounded-lg transition-all active:scale-95 cursor-pointer relative ${
                      showHistory
                        ? "bg-indigo-500/30 text-indigo-300"
                        : "text-slate-400 hover:text-white hover:bg-white/10"
                    }`}
                    title="Chat history"
                    aria-label="Show chat history"
                  >
                    <History size={15} />
                    {sessions.length > 0 && !showHistory && (
                      <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 text-white text-[8px] font-bold flex items-center justify-center">
                        {sessions.length > 9 ? "9+" : sessions.length}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 active:scale-95 cursor-pointer"
                  aria-label="Close AI chat"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* ── History Panel (slide-in overlay) ── */}
            <AnimatePresence>
              {showHistory && user && (
                <motion.div
                  key="history-panel"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  className="absolute inset-0 flex flex-col overflow-hidden rounded-3xl"
                  style={{
                    zIndex: 10,
                    background: "rgba(13, 15, 28, 0.98)",
                    backdropFilter: "blur(24px)",
                  }}
                >
                  {/* History header */}
                  <div
                    className="flex items-center gap-2.5 px-4 py-3.5 shrink-0"
                    style={{ borderBottom: "1px solid rgba(99,102,241,0.2)" }}
                  >
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 active:scale-95 cursor-pointer shrink-0"
                      aria-label="Back to chat"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                      <History size={15} className="text-indigo-400" />
                      <span className="text-white font-semibold text-sm">Chat History</span>
                    </div>
                    {sessions.length > 0 && (
                      <span className="ml-auto text-[11px] text-slate-400">
                        {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* History list */}
                  <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
                    {sessions.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-12">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <History size={22} className="text-indigo-400/60" />
                        </div>
                        <div>
                          <p className="text-slate-300 text-sm font-medium">No history yet</p>
                          <p className="text-slate-500 text-xs mt-1">Your conversations will appear here</p>
                        </div>
                        <button
                          onClick={startNewChat}
                          className="mt-2 flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl font-medium text-white transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                          style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
                        >
                          <Plus size={13} />
                          Start a new chat
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* New Chat shortcut at top of list */}
                        <button
                          onClick={startNewChat}
                          id="ai-history-new-chat"
                          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl w-full text-left transition-all cursor-pointer active:scale-[0.98]"
                          style={{
                            background: "rgba(99,102,241,0.15)",
                            border: "1px dashed rgba(99,102,241,0.4)",
                          }}
                        >
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/25 flex items-center justify-center shrink-0">
                            <Plus size={14} className="text-indigo-400" />
                          </div>
                          <span className="text-indigo-300 text-xs font-medium">New conversation</span>
                        </button>

                        {sessions.map((session) => (
                          <button
                            key={session.id}
                            onClick={() => loadSession(session)}
                            className={`group flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl w-full text-left transition-all cursor-pointer active:scale-[0.98] ${
                              currentSessionId === session.id ? "ring-1 ring-indigo-500/60" : ""
                            }`}
                            style={{
                              background:
                                currentSessionId === session.id
                                  ? "rgba(99,102,241,0.2)"
                                  : "rgba(255,255,255,0.04)",
                              border:
                                currentSessionId === session.id
                                  ? "1px solid rgba(99,102,241,0.4)"
                                  : "1px solid rgba(255,255,255,0.07)",
                            }}
                            onMouseEnter={(e) => {
                              if (currentSessionId !== session.id)
                                (e.currentTarget as HTMLElement).style.background =
                                  "rgba(255,255,255,0.07)";
                            }}
                            onMouseLeave={(e) => {
                              if (currentSessionId !== session.id)
                                (e.currentTarget as HTMLElement).style.background =
                                  "rgba(255,255,255,0.04)";
                            }}
                          >
                            <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center shrink-0 mt-0.5">
                              <MessageSquare size={13} className="text-slate-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-200 text-xs font-medium leading-snug truncate">
                                {session.title}
                              </p>
                              <p className="flex items-center gap-1 text-slate-500 text-[10px] mt-0.5">
                                <Clock size={9} />
                                {formatRelativeTime(session.createdAt)}
                                <span className="mx-0.5">·</span>
                                {session.messages.length} msg{session.messages.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                            <button
                              onClick={(e) => deleteSession(session.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0 cursor-pointer"
                              aria-label="Delete session"
                            >
                              <Trash2 size={12} />
                            </button>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
                          ? renderMessageContent(msg.parts, !!msg.isStreaming)
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
