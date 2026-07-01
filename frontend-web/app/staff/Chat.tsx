"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, ArrowLeft, Loader2, Search,
  User as UserIcon, Circle
} from "lucide-react";
import { apiFetch } from "./utils";

interface StaffChatProps {
  pharmacyId: string | null;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
  initialUserId?: string | null;
  initialUserName?: string;
}

interface Conversation {
  pharmacy: { _id: string; name: string };
  last_message: {
    _id: string;
    message: string;
    sender_id: { _id: string; full_name: string; avatar_url?: string };
    created_at: string;
  } | null;
  unread_count: number;
  other_user?: { _id: string; full_name: string; avatar_url?: string };
}

interface ChatMessage {
  _id: string;
  sender_id: { _id: string; full_name: string; avatar_url?: string };
  recipient_id: { _id: string; full_name: string } | string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function StaffChat({ pharmacyId, showToast, initialUserId, initialUserName }: StaffChatProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch all conversations for this pharmacy
  const fetchConversations = useCallback(async () => {
    if (!pharmacyId) return;
    try {
      const res = await apiFetch(`/chats/pharmacy/${pharmacyId}/conversations`);
      setConversations(res.data ?? []);
    } catch {
      // silently ignore
    } finally {
      setLoadingConvs(false);
    }
  }, [pharmacyId]);

  useEffect(() => {
    fetchConversations();
    const iv = setInterval(fetchConversations, 8000);
    return () => clearInterval(iv);
  }, [fetchConversations]);

  // Auto-select a conversation when opened from a notification
  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(initialUserId);
      setSelectedUserName(initialUserName || "Patient");
    }
  }, [initialUserId, initialUserName]);

  // Fetch message history when a user is selected
  const fetchMessages = useCallback(async (silent = false) => {
    if (!pharmacyId || !selectedUserId) return;
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await apiFetch(`/chats/${pharmacyId}?user_id=${selectedUserId}`);
      setMessages(res.data ?? []);
    } catch {
      // ignore
    } finally {
      if (!silent) setLoadingMsgs(false);
    }
  }, [pharmacyId, selectedUserId]);

  useEffect(() => {
    if (!selectedUserId) return;
    fetchMessages(false);
    const iv = setInterval(() => fetchMessages(true), 4000);
    return () => clearInterval(iv);
  }, [selectedUserId, fetchMessages]);

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !pharmacyId || !selectedUserId) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await apiFetch("/chats", {
        method: "POST",
        body: JSON.stringify({
          pharmacy_id: pharmacyId,
          recipient_id: selectedUserId,
          message: text,
        }),
      });
      fetchMessages(true);
    } catch (e: any) {
      setInput(text);
      showToast("Failed to send message: " + e.message, "error");
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter((c) => {
    const name = c.other_user?.full_name ?? c.last_message?.sender_id?.full_name ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="bg-[#F1F3F6] text-[#1E293B] p-6 md:p-10 font-sans relative rounded-3xl shadow-xs">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:24px_24px]" />

      <header className="mb-6 relative z-10">
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-[#0F766E]" /> Patient Messages
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          View and reply to messages from patients who contacted your pharmacy.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 h-[calc(100vh-260px)] min-h-[500px]">
        {/* Left: Conversation list */}
        <div className={`lg:col-span-4 flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden h-full ${selectedUserId ? "hidden lg:flex" : "flex"}`}>
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0F766E]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loadingConvs ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="animate-spin h-5 w-5 text-[#0F766E]" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-xs font-medium p-6 text-center">
                <MessageSquare className="h-8 w-8 mb-2 text-slate-200" />
                No patient messages yet. When a patient chats with your pharmacy, it will appear here.
              </div>
            ) : (
              filteredConvs.map((conv, idx) => {
                const name =
                  conv.other_user?.full_name ??
                  conv.last_message?.sender_id?.full_name ??
                  "Unknown Patient";
                const uid =
                  conv.other_user?._id ??
                  conv.last_message?.sender_id?._id;
                const isSelected = selectedUserId === uid;
                return (
                  <button
                    key={uid ?? idx}
                    onClick={() => {
                      setSelectedUserId(uid);
                      setSelectedUserName(name);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-all hover:bg-slate-50 ${
                      isSelected ? "bg-teal-50/60 border-l-2 border-[#0F766E]" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0F766E] to-emerald-400 text-white flex items-center justify-center font-black text-sm shrink-0">
                      {name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-900 truncate">{name}</span>
                        {conv.unread_count > 0 && (
                          <span className="ml-1 shrink-0 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
                        {conv.last_message?.message ?? "No messages yet"}
                      </p>
                      {conv.last_message?.created_at && (
                        <p className="text-[10px] text-slate-300 mt-0.5">
                          {new Date(conv.last_message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Chat window */}
        <div className={`lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden h-full ${!selectedUserId ? "hidden lg:flex" : "flex"}`}>
          {!selectedUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-slate-200" />
              </div>
              <h3 className="font-bold text-slate-700 mb-1 text-base">Select a conversation</h3>
              <p className="text-xs max-w-[240px] leading-relaxed">
                Choose a patient from the left panel to view and reply to their messages.
              </p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                <button
                  onClick={() => { setSelectedUserId(null); setMessages([]); }}
                  className="lg:hidden w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0F766E] to-emerald-400 text-white flex items-center justify-center font-black text-sm shrink-0">
                  {selectedUserName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">{selectedUserName}</p>
                  <p className="text-[10px] font-bold text-[#0F766E] uppercase tracking-wider flex items-center gap-1">
                    <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" /> Patient · Active
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/20">
                {loadingMsgs ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Loader2 className="animate-spin h-6 w-6 text-[#0F766E]" />
                    <span className="text-xs text-slate-400 font-bold">Loading messages...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-4">
                    <MessageSquare className="h-8 w-8 mb-2 text-slate-200" />
                    <p className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-1">No messages yet</p>
                    <p className="text-[11px] max-w-[200px]">Start the conversation by sending a message below.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const senderName = msg.sender_id?.full_name ?? "";
                    const isMe = senderName !== selectedUserName;
                    return (
                      <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white flex items-center justify-center font-black text-xs mr-2 shrink-0 self-end">
                            {senderName.charAt(0)}
                          </div>
                        )}
                        <div
                          className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                            isMe
                              ? "bg-[#0F766E] text-white rounded-br-sm"
                              : "bg-white text-slate-800 border border-slate-100 rounded-bl-sm shadow-sm"
                          }`}
                        >
                          {msg.message}
                          <div className={`text-[9px] mt-1 text-right ${isMe ? "text-white/60" : "text-slate-300"}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        {isMe && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0F766E] to-emerald-400 text-white flex items-center justify-center font-black text-xs ml-2 shrink-0 self-end">
                            Me
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-slate-100 bg-white flex gap-2 shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={`Reply to ${selectedUserName}...`}
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-[#0F766E] bg-slate-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-10 h-10 bg-[#0F766E] text-white rounded-xl flex items-center justify-center hover:bg-[#0c5a52] transition-colors disabled:opacity-40 shrink-0"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
