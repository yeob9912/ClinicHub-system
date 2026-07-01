"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, AlertCircle, CheckCircle, ChevronDown, Loader2,
  Send, RefreshCw, CheckCheck, MessageSquare, Radio, Users, ChevronUp,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("medpay_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...getAuthHeader(), ...(opts.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Request failed");
  return json;
}

interface Complaint {
  _id: string;
  user_id: { _id: string; full_name: string; email: string; avatar_url?: string } | string;
  pharmacy_name: string;
  issue: string;
  description: string;
  category: string;
  status: "New" | "Under Review" | "Resolved" | "Closed";
  priority: "High" | "Medium" | "Low" | null;
  admin_response?: string | null;
  created_at: string;
}

function ComplaintsManagement() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | "New" | "Under Review" | "Resolved" | "Closed">("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const highlightId = searchParams.get("id");

  useEffect(() => {
    if (highlightId) {
      setSelectedId(highlightId);
      setActiveTab("All");
    }
  }, [highlightId]);

  // Action panel
  const [inlineAction, setInlineAction] = useState<"reply" | "approve" | null>(null);
  const [messageText, setMessageText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"Resolved" | "Under Review" | "Closed">("Resolved");
  const [selectedPriority, setSelectedPriority] = useState<"High" | "Medium" | "Low" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState(false);

  // Broadcast state
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState<"users" | "staff" | "both">("both");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/complaints?limit=50");
      setComplaints(res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchComplaints(); }, [fetchComplaints]);

  const selectedComplaint = useMemo(() => complaints.find(c => c._id === selectedId) ?? null, [complaints, selectedId]);

  const filteredComplaints = useMemo(() => {
    if (activeTab === "All") return complaints;
    return complaints.filter(c => c.status === activeTab);
  }, [complaints, activeTab]);

  const metrics = useMemo(() => ({
    newCount: complaints.filter(c => c.status === "New").length,
    underReviewCount: complaints.filter(c => c.status === "Under Review").length,
    resolvedCount: complaints.filter(c => c.status === "Resolved").length,
    highPriorityCount: complaints.filter(c => c.priority === "High").length,
  }), [complaints]);

  const handleReply = async () => {
    if (!selectedId || !messageText.trim()) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/admin/complaints/${selectedId}/respond`, {
        method: "POST",
        body: JSON.stringify({
          response: messageText.trim(),
          status: selectedStatus,
          priority: selectedPriority,
        }),
      });
      setComplaints(prev => prev.map(c => c._id === selectedId ? { ...c, ...res.data } : c));
      setActionSuccess("Response sent to user ✓");
      setInlineAction(null);
      setMessageText("");
    } catch (err: any) {
      setActionSuccess("Error: " + (err.message ?? "Failed"));
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleQuickApprove = async (status: "Resolved" | "Closed" | "Under Review") => {
    if (!selectedId) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`/admin/complaints/${selectedId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, priority: selectedPriority }),
      });
      setComplaints(prev => prev.map(c => c._id === selectedId ? { ...c, ...res.data } : c));
      setActionSuccess(`Marked as ${status} ✓`);
      setInlineAction(null);
    } catch (err: any) {
      setActionSuccess("Error: " + (err.message ?? "Failed"));
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const fetchBroadcastHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await apiFetch("/admin/broadcasts");
      setBroadcastHistory(res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showBroadcast) {
      fetchBroadcastHistory();
    }
  }, [showBroadcast, fetchBroadcastHistory]);

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setBroadcastLoading(true);
    setBroadcastResult(null);
    try {
      const res = await apiFetch("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          audience: broadcastAudience,
        }),
      });
      const sent = res.data?.sent ?? 0;
      setBroadcastResult(`✅ Broadcast sent to ${sent} recipient${sent !== 1 ? "s" : ""}`);
      setBroadcastTitle("");
      setBroadcastBody("");
      fetchBroadcastHistory();
      setTimeout(() => { setBroadcastResult(null); setShowBroadcast(false); }, 4000);
    } catch (err: any) {
      setBroadcastResult("❌ " + (err.message ?? "Failed to send broadcast"));
    } finally {
      setBroadcastLoading(false);
    }
  };

  const getUserName = (user: Complaint["user_id"]): string => {
    if (typeof user === "object" && user !== null) return user.full_name ?? "Unknown";
    return "Unknown";
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return iso; }
  };

  const categoryStyles: Record<string, string> = {
    "Location Issue": "bg-blue-50/80 text-blue-600 border border-blue-100/50",
    "Service Issue": "bg-green-50/80 text-green-600 border border-green-100/50",
    "Medicine Availability": "bg-purple-50/80 text-purple-600 border border-purple-100/50",
    "General Feedback": "bg-fuchsia-50/80 text-fuchsia-600 border border-fuchsia-100/50",
    Other: "bg-slate-50/80 text-slate-600 border border-slate-100/50",
  };

  const statusStyles: Record<string, { bg: string; text: string; dot: string }> = {
    New: { bg: "bg-red-50/80", text: "text-red-600", dot: "bg-red-500" },
    "Under Review": { bg: "bg-amber-50/80", text: "text-amber-600", dot: "bg-amber-500" },
    Resolved: { bg: "bg-emerald-50/80", text: "text-emerald-600", dot: "bg-emerald-500" },
    Closed: { bg: "bg-gray-50/80", text: "text-gray-600", dot: "bg-gray-500" },
  };

  const priorityStyles: Record<string, string> = {
    High: "text-red-600 font-medium",
    Medium: "text-amber-600 font-medium",
    Low: "text-emerald-600 font-medium",
    Unassigned: "text-gray-400 italic",
  };

  const priorityBadgeStyles: Record<string, string> = {
    High: "bg-red-50 text-red-700 border border-red-100/60",
    Medium: "bg-amber-50 text-amber-700 border border-amber-100/60",
    Low: "bg-emerald-50 text-emerald-700 border border-emerald-100/60",
    Unassigned: "bg-gray-50 text-gray-500 border border-gray-200/60",
  };

  return (
    <div className="flex-1 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] p-4 sm:p-6 pt-20 sm:pt-20 lg:pt-6 space-y-6 overflow-y-auto min-h-screen relative isolate">

      {/* BG */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 mix-blend-multiply" />
        <div className="absolute -top-40 -left-40 w-[60rem] h-[60rem] rounded-full bg-gradient-to-tr from-blue-400/20 to-teal-300/10 blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDuration: "8s" }} />
      </div>

      {/* HEADER */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Complaints Management</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review, manage and respond to user complaints</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchComplaints} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-xs disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button
            onClick={() => setShowBroadcast(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Broadcast
            {showBroadcast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* BROADCAST PANEL */}
      <AnimatePresence>
        {showBroadcast && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10 overflow-hidden"
          >
            <div className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
                  <Radio size={16} className="text-indigo-500 animate-pulse" /> Broadcast Center
                </h3>
                <button onClick={() => setShowBroadcast(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT: Send Broadcast Form */}
                <div className="lg:col-span-7 space-y-4 border-r border-slate-100 pr-0 lg:pr-6">
                  <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider">Send New Broadcast</h4>
                  {/* Audience selector */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Send To</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["users", "staff", "both"] as const).map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setBroadcastAudience(a)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            broadcastAudience === a
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                          }`}
                        >
                          <Users size={11} />
                          {a === "users" ? "All Users" : a === "staff" ? "All Staff" : "Users & Staff"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notification Title</label>
                    <input
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. System Maintenance Notice"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                    />
                  </div>

                  {/* Body */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Message</label>
                    <textarea
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="e.g. Our system will be under maintenance on Friday from 10PM–12AM. All services will be temporarily unavailable."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 bg-slate-50 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors resize-none"
                    />
                  </div>

                  {broadcastResult && (
                    <p className={`text-xs font-bold px-3 py-2 rounded-xl ${
                      broadcastResult.startsWith("✅") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
                    }`}>{broadcastResult}</p>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      disabled={broadcastLoading || !broadcastTitle.trim() || !broadcastBody.trim()}
                      onClick={handleBroadcast}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wide transition-all disabled:opacity-50 shadow-sm"
                    >
                      {broadcastLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                      {broadcastLoading ? "Sending..." : "Send Broadcast"}
                    </button>
                  </div>
                </div>

                {/* RIGHT: Broadcast History List */}
                <div className="lg:col-span-5 flex flex-col h-full min-h-[250px]">
                  <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-3">Broadcast History</h4>
                  
                  {historyLoading ? (
                    <div className="flex-grow flex flex-col items-center justify-center text-slate-400 text-[11px] gap-2 py-8">
                      <Loader2 size={16} className="animate-spin text-indigo-500" />
                      <span>Loading broadcast archive...</span>
                    </div>
                  ) : broadcastHistory.length === 0 ? (
                    <div className="flex-grow flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 p-6 text-center text-slate-450 font-bold text-[11px]">
                      No previous broadcasts on record.
                    </div>
                  ) : (
                    <div className="flex-grow overflow-y-auto max-h-[300px] space-y-2.5 pr-1">
                      {broadcastHistory.map((h, i) => (
                        <div key={i} className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-[11px] truncate max-w-[70%]">{h.title}</span>
                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-1.5 py-0.5 uppercase tracking-wide shrink-0">
                              {h.audience === "users" ? "Users" : h.audience === "staff" ? "Staff" : "Both"} ({h.sent_count})
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-normal line-clamp-2">{h.body}</p>
                          <p className="text-[8px] font-bold text-slate-400 tracking-wider uppercase pt-1">
                            Sent: {new Date(h.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* METRICS */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-5 relative z-10"
        initial="hidden" animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
      >
        {[
          { label: "New Complaints", count: metrics.newCount, color: "text-red-600", bg: "bg-red-500/10", icon: <AlertCircle className="w-6 h-6" /> },
          { label: "Under Review", count: metrics.underReviewCount, color: "text-amber-600", bg: "bg-amber-500/10", icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> },
          { label: "Resolved", count: metrics.resolvedCount, color: "text-emerald-600", bg: "bg-emerald-500/10", icon: <CheckCircle className="w-6 h-6" /> },
          { label: "High Priority", count: metrics.highPriorityCount, color: "text-indigo-600", bg: "bg-indigo-500/10", icon: <AlertCircle className="w-6 h-6" /> },
        ].map((m, idx) => (
          <motion.div key={idx}
            variants={{ hidden: { y: 15, opacity: 0 }, show: { y: 0, opacity: 1 } }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="bg-white/70 backdrop-blur-xl p-5 rounded-2xl border border-white/60 shadow-xs flex items-center space-x-4 cursor-default"
          >
            <div className={`p-3 ${m.bg} ${m.color} rounded-xl`}>{m.icon}</div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}</p>
              <p className="text-3xl font-black text-slate-800 mt-0.5 tracking-tight">{m.count}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Action success toast */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed top-6 right-6 z-[999] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <CheckCheck size={14} className="text-emerald-400" />
            {actionSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      {/* WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">

        {/* LEFT: FEED */}
        <div className="lg:col-span-7 space-y-4">
          {/* Tab Bar */}
          <div className="bg-white/60 backdrop-blur-xl p-2 rounded-xl border border-white/60 flex items-center justify-between shadow-xs">
            <div className="flex space-x-1 overflow-x-auto w-full">
              {(["All", "New", "Under Review", "Resolved", "Closed"] as const).map((tab) => {
                const isSelected = activeTab === tab;
                const countMap: Record<string, number> = {
                  All: complaints.length, New: metrics.newCount,
                  "Under Review": metrics.underReviewCount, Resolved: metrics.resolvedCount,
                  Closed: complaints.filter(c => c.status === "Closed").length,
                };
                return (
                  <motion.button key={tab} onClick={() => setActiveTab(tab)} whileTap={{ scale: 0.96 }}
                    className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors relative cursor-pointer ${isSelected ? "text-white" : "text-slate-600 hover:bg-white/60"}`}
                  >
                    {isSelected && <motion.div layoutId="activeTabIndicator" className="absolute inset-0 bg-blue-600 rounded-lg shadow-md shadow-blue-500/20 -z-10" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                    {tab} <span className={`ml-0.5 text-[10px] opacity-75 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>({countMap[tab]})</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="bg-white/60 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-400 font-bold">
              No complaints in this category.
            </div>
          ) : (
            <motion.div className="space-y-3" layout="position">
              <AnimatePresence mode="popLayout">
                {filteredComplaints.map((complaint) => {
                  const isSelected = selectedId === complaint._id;
                  const userName = getUserName(complaint.user_id);
                  const initials = getInitials(userName);
                  return (
                    <motion.div key={complaint._id} layout
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      whileHover={{ scale: 1.005 }}
                      onClick={() => { setSelectedId(complaint._id); setInlineAction(null); setMessageText(""); }}
                      className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer relative group ${isSelected ? "bg-white border-blue-400 shadow-md ring-1 ring-blue-400/30" : "bg-white/80 hover:bg-white border-white/80 hover:border-slate-300 shadow-xs"}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 inline-block group-hover:text-blue-600 transition-colors">{userName}</h4>
                              <span className="text-xs text-slate-400 font-medium ml-2">{formatDate(complaint.created_at)}</span>
                            </div>
                            <h3 className="text-sm font-bold text-blue-600 truncate max-w-[180px] md:max-w-xs">{complaint.pharmacy_name}</h3>
                          </div>
                          <p className="text-xs font-medium text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{complaint.issue}</p>
                          <div className="flex items-center justify-between mt-4 pt-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-md ${categoryStyles[complaint.category] ?? categoryStyles.Other}`}>
                              {complaint.category}
                            </span>
                            <div className="flex items-center space-x-4 text-xs">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusStyles[complaint.status].bg} ${statusStyles[complaint.status].text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[complaint.status].dot}`} />
                                {complaint.status}
                              </span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${priorityStyles[complaint.priority || "Unassigned"]}`}>
                                {complaint.priority || "Unassigned"}
                              </span>
                            </div>
                          </div>
                          {complaint.admin_response && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700 font-semibold">
                              <MessageSquare size={11} className="text-emerald-500" />
                              <span className="line-clamp-1">Admin replied: {complaint.admin_response}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center self-center text-slate-400 pl-2 group-hover:translate-x-1.5 transition-transform duration-200">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* RIGHT: DETAIL */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {selectedComplaint ? (
              <motion.div
                key={selectedComplaint._id}
                initial={{ opacity: 0, scale: 0.97, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -15 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="bg-white rounded-2xl border border-white/80 shadow-lg overflow-hidden"
              >
                {/* Panel Header */}
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Complaint Details</h3>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}
                    onClick={() => { setSelectedId(null); setInlineAction(null); }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Meta grid */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-3 border-b border-slate-100/80 pb-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">{getUserName(selectedComplaint.user_id)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date Filed</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">{formatDate(selectedComplaint.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pharmacy</p>
                      <p className="text-xs font-bold text-blue-600 mt-1">{selectedComplaint.pharmacy_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${categoryStyles[selectedComplaint.category] ?? categoryStyles.Other}`}>
                        {selectedComplaint.category}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                      <span className={`inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${statusStyles[selectedComplaint.status].bg} ${statusStyles[selectedComplaint.status].text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusStyles[selectedComplaint.status].dot}`} />
                        {selectedComplaint.status}
                      </span>
                    </div>

                    {/* Priority dropdown */}
                    <div className="relative">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Priority</p>
                      <div className="mt-1">
                        <motion.button
                          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                          onClick={() => setIsPriorityDropdownOpen(!isPriorityDropdownOpen)}
                          className={`flex items-center justify-between gap-2 px-3 py-1 text-xs font-bold rounded-md border cursor-pointer w-32 bg-white shadow-xs ${priorityBadgeStyles[selectedComplaint.priority || "Unassigned"]}`}
                        >
                          <span className="uppercase tracking-wider text-[10px]">{selectedComplaint.priority || "Unassigned"}</span>
                          <motion.div animate={{ rotate: isPriorityDropdownOpen ? 180 : 0 }}>
                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                          </motion.div>
                        </motion.button>
                        <AnimatePresence>
                          {isPriorityDropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              className="absolute left-0 mt-1 w-32 bg-white border border-slate-100 rounded-xl shadow-xl py-1.5 z-50"
                            >
                              {(["High", "Medium", "Low"] as const).map((lvl) => (
                                <button key={lvl} onClick={() => { setSelectedPriority(lvl); setIsPriorityDropdownOpen(false); }}
                                  className={`w-full text-left px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-50 cursor-pointer ${priorityStyles[lvl]}`}>
                                  {lvl}
                                </button>
                              ))}
                              <button onClick={() => { setSelectedPriority(null); setIsPriorityDropdownOpen(false); }}
                                className="w-full text-left px-3 py-1.5 text-[11px] font-medium text-slate-400 italic hover:bg-slate-50 cursor-pointer border-t border-slate-100 mt-1 pt-1.5">
                                Clear
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Issue + Description */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Summary</p>
                    <p className="text-xs font-bold text-slate-800 mt-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedComplaint.issue}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Description</p>
                    <div className="mt-1.5 bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs font-medium text-slate-600 leading-relaxed shadow-inner max-h-28 overflow-y-auto whitespace-pre-line">
                      {selectedComplaint.description}
                    </div>
                  </div>

                  {/* Existing admin response */}
                  {selectedComplaint.admin_response && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-xs">
                      <div className="flex items-center gap-1 text-emerald-800 font-bold mb-1">
                        <MessageSquare size={12} /> Previous Admin Response
                      </div>
                      <p className="text-emerald-700 text-[11px] leading-relaxed">{selectedComplaint.admin_response}</p>
                    </div>
                  )}

                  {/* Action toolkit */}
                  <div className="pt-2 border-t border-slate-100 space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</p>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Reply to User */}
                      <motion.button
                        whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                        onClick={() => { setInlineAction(inlineAction === "reply" ? null : "reply"); setMessageText(""); setSelectedStatus("Resolved"); }}
                        className={`flex flex-col items-center justify-center p-3 border rounded-xl text-center cursor-pointer transition-colors ${inlineAction === "reply" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                      >
                        <Send className="w-4 h-4 mb-1.5 text-emerald-600" />
                        <span className="text-[11px] font-bold">Reply to User</span>
                      </motion.button>

                      {/* Quick Resolve */}
                      <motion.button
                        whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickApprove("Resolved")}
                        disabled={actionLoading || selectedComplaint.status === "Resolved"}
                        className="flex flex-col items-center justify-center p-3 border border-slate-200 bg-white text-slate-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 rounded-xl text-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? <Loader2 className="w-4 h-4 mb-1.5 animate-spin" /> : <CheckCircle className="w-4 h-4 mb-1.5 text-emerald-500" />}
                        <span className="text-[11px] font-bold">Approve</span>
                      </motion.button>

                      {/* Close */}
                      <motion.button
                        whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickApprove("Closed")}
                        disabled={actionLoading || selectedComplaint.status === "Closed"}
                        className="flex flex-col items-center justify-center p-3 border border-slate-200 bg-white text-slate-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 rounded-xl text-center cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <svg className="w-4 h-4 mb-1.5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        <span className="text-[11px] font-bold">Close</span>
                      </motion.button>
                    </div>

                    {/* Reply expand form */}
                    <AnimatePresence initial={false}>
                      {inlineAction === "reply" && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-3.5 border border-slate-100 bg-slate-50 rounded-xl space-y-3 shadow-inner mt-1">
                            <div>
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Your Response to User</label>
                              <textarea
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                rows={3}
                                placeholder="Type your response to the user..."
                                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 resize-none"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Update Status</label>
                                <select
                                  value={selectedStatus}
                                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                                  className="w-full px-2 py-1.5 border border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
                                >
                                  <option value="Under Review">Under Review</option>
                                  <option value="Resolved">Resolved</option>
                                  <option value="Closed">Closed</option>
                                </select>
                              </div>
                              <motion.button
                                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                                onClick={handleReply}
                                disabled={!messageText.trim() || actionLoading}
                                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors shadow-sm cursor-pointer disabled:opacity-40 flex items-center gap-1.5 mt-5"
                              >
                                {actionLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                Send
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white/40 border border-dashed border-slate-300 backdrop-blur-xl rounded-2xl p-12 text-center text-xs text-slate-400 font-bold">
                Select a complaint from the list to view details and take action.
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function ComplaintsManagementPage() {
  return (
    <Suspense fallback={
      <div className="flex-grow pt-24 pb-20 flex flex-col items-center justify-center min-h-screen bg-slate-50/50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-4">Loading complaints workspace...</p>
      </div>
    }>
      <ComplaintsManagement />
    </Suspense>
  );
}