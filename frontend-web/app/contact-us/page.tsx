"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Mail, MessageSquare, AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { apiRequest } from "@/lib/api";
import AuthPrompt from "@/components/AuthPrompt";

export default function ContactUsPage() {
  const { isAuthenticated } = useUser();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  // Form states
  const [contactReason, setContactReason] = useState<"feedback" | "report" | "other">("feedback");
  const [pharmacyName, setPharmacyName] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    if (!subject || !message) return;
    if (contactReason === "report" && !pharmacyName.trim()) {
      setError("Please specify the pharmacy name.");
      return;
    }

    setSubmitting(true);
    setError(null);

    // Map fields to complaint schema
    const targetPharmacy = contactReason === "report" ? pharmacyName.trim() : "MedPay Platform";
    const categoryMap: Record<string, "General Feedback" | "Service Issue" | "Other"> = {
      feedback: "General Feedback",
      report: "Service Issue",
      other: "Other"
    };

    try {
      await apiRequest("/api/v1/complaints", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          pharmacy_name: targetPharmacy,
          issue: subject.trim(),
          description: message.trim(),
          category: categoryMap[contactReason],
        }),
      });

      setSuccess(true);
      setSubject("");
      setMessage("");
      setPharmacyName("");
    } catch (err: any) {
      setError(err.message || "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pt-24 pb-20 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#24D2A6] font-semibold text-sm mb-8 transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-[2.5rem] p-10 md:p-12 mb-12 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <span className="bg-[#24D2A6]/10 text-[#24D2A6] border border-[#24D2A6]/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 mb-6">
              <Mail size={13} /> Support &amp; Complaints
            </span>
            <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">Contact System Admin</h1>
            <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed">
              Send a direct message or report a compliance/service concern. Our administrative staff will review your submission and respond within 24 hours.
            </p>
          </div>
          <MessageSquare size={150} className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none" />
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Form */}
          <div className="md:col-span-8">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
            >
              <AnimatePresence>
                {success && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-2xl p-5 mb-6 flex items-start gap-3.5"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="text-xs font-medium space-y-1">
                      <p className="font-black text-emerald-950">Message Sent Successfully!</p>
                      <p className="text-emerald-700">Your inquiry has been logged in our system. You can track all active support tickets and administrator responses in your client dashboard.</p>
                      <div className="pt-2">
                        <Link 
                          href="/favorites/complaint" 
                          className="inline-flex items-center gap-1 font-black text-[#24D2A6] hover:text-[#1eb891] uppercase tracking-wider"
                        >
                          View Ticket History &rarr;
                        </Link>
                      </div>
                      <button onClick={() => setSuccess(false)} className="block pt-2 text-[10px] text-slate-400 font-bold underline hover:text-slate-600">Send another message</button>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl p-4 mb-6 flex items-start gap-3"
                  >
                    <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-xs font-semibold">
                      <p className="font-black text-rose-900">Submission Error</p>
                      <p className="mt-0.5 text-rose-700">{error}</p>
                      <button onClick={() => setError(null)} className="mt-2 text-xs font-black text-rose-800 underline">Dismiss</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Contact Reason selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Reason for Contact</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "feedback", label: "General Feedback" },
                      { id: "report", label: "Report Pharmacy" },
                      { id: "other", label: "Technical Support" }
                    ].map((reason) => (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => {
                          setContactReason(reason.id as any);
                          setError(null);
                        }}
                        className={`py-3 px-4 rounded-2xl border text-xs font-bold text-center transition-all ${
                          contactReason === reason.id
                            ? "bg-[#24D2A6]/10 border-[#24D2A6] text-[#24D2A6] shadow-sm"
                            : "bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional Pharmacy Name input */}
                <AnimatePresence>
                  {contactReason === "report" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pharmacy Name</label>
                      <input
                        type="text"
                        required
                        value={pharmacyName}
                        onChange={(e) => setPharmacyName(e.target.value)}
                        placeholder="e.g. Bole Med Pharmacy"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/30 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#24D2A6] focus:bg-white transition-all shadow-inner"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Subject */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Subject / Topic</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Short summary of your message (minimum 3 characters)"
                    minLength={3}
                    maxLength={300}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/30 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#24D2A6] focus:bg-white transition-all shadow-inner"
                  />
                </div>

                {/* Message body */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Detailed Description</label>
                  <textarea
                    required
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your message here... Please be detailed and clear so administrators can investigate or assist you (minimum 10 characters)."
                    minLength={10}
                    maxLength={3000}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/30 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#24D2A6] focus:bg-white transition-all shadow-inner resize-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center justify-center gap-2 bg-[#24D2A6] hover:bg-[#1eb891] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#24D2A6]/15 disabled:opacity-50 active:scale-95 cursor-pointer"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                    <Send size={13} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="md:col-span-4 space-y-6">
            
            {/* Quick Info Box */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900">Direct Support Info</h3>
              <p className="text-slate-500 text-xs leading-relaxed font-medium">
                Our support desk processes general feedback and pharmacy compliance complaints. System administrators review each ticket individually.
              </p>
              <div className="pt-2 border-t border-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#24D2A6]/10 flex items-center justify-center text-[#24D2A6] shrink-0">
                    <Mail size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-none">Response Time</p>
                    <p className="text-xs font-bold text-slate-700 mt-1">Within 24 Hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#24D2A6]/10 flex items-center justify-center text-[#24D2A6] shrink-0">
                    <AlertCircle size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide leading-none">Complaint Tracking</p>
                    <p className="text-xs font-bold text-[#24D2A6] mt-1 hover:underline">
                      <Link href="/favorites/complaint">Go to My Tickets &rarr;</Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note on Login */}
            {!isAuthenticated && (
              <div className="bg-amber-50/50 border border-amber-100 rounded-3xl p-6 space-y-3">
                <h4 className="text-xs font-black text-amber-900">Authorization Required</h4>
                <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                  You must be signed in to submit messages or complaints to system administrators. This prevents spam and links messages securely to your account.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAuthPrompt(true)}
                  className="w-full text-center py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-[10px] uppercase tracking-wider transition-all"
                >
                  Log In or Register
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Auth Prompt Modal */}
      <AuthPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        redirect="/contact-us"
        action="send messages to admin"
      />
    </div>
  );
}
