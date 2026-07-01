"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  ArrowRight,
  FileText,
  Clock,
  MessageSquare,
  HelpCircle,
  FileImage,
  X,
  Eye,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("medpay_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...(opts.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Request failed");
  return json;
}

interface Complaint {
  _id: string;
  pharmacy_name: string;
  status: "New" | "Under Review" | "Resolved" | "Closed";
  issue: string;
  description: string;
  category: string;
  attachments_count: number;
  admin_response?: string | null;
  created_at: string;
}

export default function UserComplaintSubmission() {
  const { user } = useUser();
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Complaint | null>(null);

  // Form states
  const [pharmacyName, setPharmacyName] = useState("");
  const [complaintSummary, setComplaintSummary] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // File upload
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchComplaints = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const res = await apiFetch("/complaints/me");
      setComplaints(res.data ?? []);
    } catch {
      // silently fail — just show empty
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }
    fetchComplaints();
  }, [user, fetchComplaints, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedFiles.length + filesArray.length > 3) {
        alert("You can only upload a maximum of 3 screenshots.");
        return;
      }
      setSelectedFiles([...selectedFiles, ...filesArray]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyName || !complaintSummary || !detailedDescription) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await apiFetch("/complaints", {
        method: "POST",
        body: JSON.stringify({
          pharmacy_name: pharmacyName.trim(),
          issue: complaintSummary.trim(),
          description: detailedDescription.trim(),
          category,
          attachments_count: selectedFiles.length,
        }),
      });

      setSubmitSuccess(true);
      setPharmacyName("");
      setComplaintSummary("");
      setDetailedDescription("");
      setSelectedFiles([]);
      setCategory("Other");
      // Refresh the list
      await fetchComplaints();
    } catch (err: any) {
      setSubmitError(err.message ?? "Failed to submit complaint. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusStyles: Record<string, { bg: string; dot: string }> = {
    New: { bg: "bg-red-50 text-red-600 border-red-100", dot: "bg-red-500" },
    "Under Review": { bg: "bg-amber-50 text-amber-600 border-amber-100", dot: "bg-amber-500" },
    Resolved: { bg: "bg-emerald-50 text-emerald-600 border-emerald-100", dot: "bg-emerald-500" },
    Closed: { bg: "bg-gray-50 text-gray-600 border-gray-200", dot: "bg-gray-500" },
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric", month: "short", day: "numeric",
      });
    } catch { return iso; }
  };

  const generateTicketId = (id: string) =>
    `CMP-${id.slice(-8).toUpperCase()}`;

  return (
    <div className="flex-1 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] p-4 sm:p-6 pt-24 sm:pt-28 space-y-6 overflow-y-auto min-h-screen relative isolate font-sans">

      {/* BACKGROUND */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none select-none">
        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 mix-blend-multiply" />
      </div>

      {/* HEADER */}
      <div className="relative z-10 max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Report an Issue</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Encountered an issue with a pharmacy listing? Tell our administrators immediately.</p>
      </div>

      {/* MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-5xl mx-auto relative z-10">

        {/* FORM */}
        <div className="lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-white shadow-md p-5 sm:p-6 space-y-6"
          >
            <AnimatePresence>
              {submitSuccess && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 20 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-start gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-medium">
                    <p className="font-bold text-emerald-900">Complaint Submitted Successfully!</p>
                    <p className="mt-0.5 text-emerald-700/90">Your ticket has been sent to admins. You can track it in the ledger on the right.</p>
                    <button onClick={() => setSubmitSuccess(false)} className="mt-2 text-xs font-bold text-emerald-800 underline hover:text-emerald-950">Dismiss</button>
                  </div>
                </motion.div>
              )}
              {submitError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start gap-3"
                >
                  <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div className="text-xs font-medium">
                    <p className="font-bold text-rose-900">Submission Failed</p>
                    <p className="mt-0.5">{submitError}</p>
                    <button onClick={() => setSubmitError(null)} className="mt-2 text-xs font-bold text-rose-800 underline">Dismiss</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">1. Target Pharmacy Name</label>
                  <input
                    type="text" required value={pharmacyName}
                    onChange={(e) => setPharmacyName(e.target.value)}
                    placeholder="e.g., ABC Pharmacy Branch II"
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/30 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">2. Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/30 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                  >
                    {["Location Issue", "Service Issue", "Medicine Availability", "General Feedback", "Other"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">3. Quick Summary</label>
                <input
                  type="text" required value={complaintSummary}
                  onChange={(e) => setComplaintSummary(e.target.value)}
                  placeholder="Brief headline of the main issue"
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/30 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">4. Detailed Description</label>
                <textarea
                  required rows={4} value={detailedDescription}
                  onChange={(e) => setDetailedDescription(e.target.value)}
                  placeholder="Please clarify exactly what happened. Include specific details like exact timings or wrong pricing..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/30 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner leading-relaxed resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">5. Evidence Snapshots ({selectedFiles.length}/3)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
                  <button
                    type="button" onClick={() => fileInputRef.current?.click()} disabled={selectedFiles.length >= 3}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center text-center group cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50/20"
                  >
                    <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-blue-500 mb-1" />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600">Choose from device</span>
                  </button>
                  <div className="space-y-1.5 w-full">
                    {selectedFiles.length === 0 ? (
                      <p className="text-[11px] italic font-medium text-slate-400 p-3 border border-slate-100 bg-slate-50/50 rounded-lg text-center">No images attached yet.</p>
                    ) : (
                      selectedFiles.map((file, i) => (
                        <div key={i} className="flex items-center justify-between border border-slate-100 bg-slate-50 px-3 py-2 rounded-lg text-[11px] text-slate-600">
                          <span className="truncate font-medium">{file.name}</span>
                          <button type="button" onClick={() => handleRemoveFile(i)} className="text-slate-400 hover:text-rose-500 p-0.5"><X size={14} /></button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  disabled={isSubmitting} type="submit"
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:bg-blue-400"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    <>Submit Complaint Ticket <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>

        {/* HISTORY */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white/60 backdrop-blur-xl p-4 rounded-2xl border border-white/60 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0f2d4a]">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-wider">Live Ticket Tracking</h3>
              </div>
              <button onClick={fetchComplaints} className="text-slate-400 hover:text-blue-500 transition-colors" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Click on any ticket to view details and admin responses.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-white shadow-md p-4 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <FileText className="w-4 h-4 text-slate-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">Your Dispatched Tickets</h2>
            </div>

            {loadingHistory ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            ) : complaints.length === 0 ? (
              <p className="text-center text-[11px] text-slate-400 font-medium py-8 italic">No complaints submitted yet.</p>
            ) : (
              <div className="divide-y divide-slate-100/80">
                {complaints.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="py-3.5 first:pt-1 last:pb-1 space-y-2 group cursor-pointer hover:bg-slate-50/50 px-2 rounded-xl transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1">
                          {ticket.pharmacy_name}
                          <Eye size={12} className="opacity-0 group-hover:opacity-100 text-blue-400 ml-1 transition-opacity" />
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-medium mt-0.5">
                          <span>{generateTicketId(ticket._id)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> {formatDate(ticket.created_at)}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md border ${statusStyles[ticket.status]?.bg}`}>
                        <span className={`w-1 h-1 rounded-full ${statusStyles[ticket.status]?.dot}`} />
                        {ticket.status}
                      </span>
                    </div>

                    <p className="text-[11px] font-medium text-slate-500 truncate">{ticket.issue}</p>

                    {ticket.admin_response && (
                      <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100/60 flex items-start gap-1.5 text-[10px] font-medium text-emerald-800 mt-1">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <p className="line-clamp-2">
                          <span className="font-bold">Admin:</span> {ticket.admin_response}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TICKET DETAIL MODAL */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto pt-20 pb-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 relative z-10 border border-slate-100 space-y-4 my-auto"
            >
              <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{generateTicketId(selectedTicket._id)}</span>
                  <h3 className="text-sm font-black text-slate-900 mt-0.5">{selectedTicket.pharmacy_name}</h3>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full p-1 transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between bg-slate-50 rounded-xl p-2.5 text-[11px] font-semibold">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock size={12} /> Filed: <span className="text-slate-700">{formatDate(selectedTicket.created_at)}</span>
                </div>
                <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-md border ${statusStyles[selectedTicket.status]?.bg}`}>
                  <span className={`w-1 h-1 rounded-full ${statusStyles[selectedTicket.status]?.dot}`} />
                  {selectedTicket.status}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Category</span>
                <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2 rounded-lg border border-slate-100">{selectedTicket.category}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Issue Summary</span>
                <p className="text-xs font-bold text-slate-800 bg-slate-50/50 p-2 rounded-lg border border-slate-100">{selectedTicket.issue}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Full Description</span>
                <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 max-h-32 overflow-y-auto whitespace-pre-line">
                  {selectedTicket.description || "No additional details provided."}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                <FileImage size={12} className="text-slate-400" />
                <span>Uploaded Snapshots: <strong>{selectedTicket.attachments_count ?? 0}</strong> files</span>
              </div>

              {selectedTicket.admin_response ? (
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-emerald-800 font-bold">
                    <MessageSquare size={12} /> Admin Resolution Notes
                  </div>
                  <p className="text-emerald-700 font-medium text-[11px] leading-relaxed">
                    {selectedTicket.admin_response}
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50/50 border border-blue-100/60 p-3 rounded-xl flex items-start gap-2 text-xs">
                  <ShieldAlert size={12} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-blue-700/90 font-medium text-[11px] leading-relaxed">
                    Your ticket is in queue. Admin response will appear here once reviewed.
                  </p>
                </div>
              )}

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full py-2 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Close Ticket View
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}