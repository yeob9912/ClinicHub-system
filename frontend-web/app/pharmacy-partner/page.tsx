"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Building2, User, Mail, Phone, MapPin, Upload, CheckCircle2,
  Clock, ArrowLeft, ChevronRight, AlertCircle, Loader2,
  BadgeCheck, FileText, Lock, LogIn, UserPlus, UploadCloud
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from "@/context/UserContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("medpay_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Retained strictly for Step 1 personal phone verification
const ETHIOPIAN_PHONE = /^(\+251[79]\d{8}|09\d{8}|07\d{8})$/;

type Step = 1 | 2 | 3;

export default function PharmacyPartnerPage() {
  const { user, refreshProfile } = useUser();

  // Existing registration detection
  const [existingPharmacy, setExistingPharmacy] = useState<any | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Update/response states
  const [newEvidenceFile, setNewEvidenceFile] = useState<File | null>(null);
  const [newEvidenceFileName, setNewEvidenceFileName] = useState<string | null>(null);
  const [newCertifiedInfo, setNewCertifiedInfo] = useState("");
  const [updatingApp, setUpdatingApp] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const newEvidenceInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 — Personal
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  // Step 2 — Pharmacy (Pharmacy Phone has been removed)
  const [pharmacyName, setPharmacyName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [pharmacyEmail, setPharmacyEmail] = useState("");
  const [website, setWebsite] = useState("");

  // Step 3 — Evidence Documents & Certified Info
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceFileName, setEvidenceFileName] = useState<string | null>(null);
  const [certifiedInfo, setCertifiedInfo] = useState("");
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  // Check if user already submitted a pharmacy
  useEffect(() => {
    if (!user) { setCheckingExisting(false); return; }
    fetch(`${API}/pharmacies?owner_id=${user.id || (user as any)._id}&limit=1`, { headers: getAuthHeader() })
      .then((r) => r.json())
      .then((res) => {
        const list = res.data ?? res;
        if (Array.isArray(list) && list.length > 0) {
          setExistingPharmacy(list[0]);
        } else {
          setExistingPharmacy(null);
        }
      })
      .catch(() => setExistingPharmacy(null))
      .finally(() => setCheckingExisting(false));
  }, [user]);

  // Sync user role profile once the pharmacy is approved
  useEffect(() => {
    if (existingPharmacy && existingPharmacy.status === "approved" && user && user.role !== "pharmacy") {
      refreshProfile().catch((err) => console.error("Error upgrading user session role:", err));
    }
  }, [existingPharmacy, user, refreshProfile]);

  // Sync response states with loaded pharmacy data
  useEffect(() => {
    if (existingPharmacy) {
      setNewCertifiedInfo(existingPharmacy.description || "");
      setNewEvidenceFileName(existingPharmacy.evidence_filename || null);
    }
  }, [existingPharmacy]);

  // Handle updated file selection
  const handleNewEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Evidence document must be less than 5MB.");
      return;
    }
    setNewEvidenceFile(file);
    setNewEvidenceFileName(file.name);
  };

  // Submit response updates back to pending status
  const handleUpdateSubmit = async () => {
    setUpdatingApp(true);
    setSubmitError(null);
    try {
      const body = {
        description: newCertifiedInfo.trim(),
        evidence_filename: newEvidenceFileName ?? undefined,
        status: "pending", // Reset status to pending so admin reviews it
      };

      const res = await fetch(`${API}/pharmacies/${existingPharmacy._id ?? existingPharmacy.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? "Update failed");
      }

      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
      
      const updatedPh = json.data ?? json;
      setExistingPharmacy(updatedPh);
      setShowReplyForm(false);
    } catch (e: any) {
      setSubmitError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setUpdatingApp(false);
    }
  };

  // Handle regulatory file selection
  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Evidence document must be less than 5MB.");
      return;
    }
    setEvidenceFile(file);
    setEvidenceFileName(file.name);
  };

  const validatePhone = (val: string, setter: (e: string) => void) => {
    if (!val) { setter(""); return true; }
    const cleanVal = val.replace(/\s+/g, "");
    if (!ETHIOPIAN_PHONE.test(cleanVal)) {
      setter("Use standard structure: +251..., 09..., or 07...");
      return false;
    }
    setter("");
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const body = {
        name: pharmacyName.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        email: pharmacyEmail.trim() || undefined,
        website: website.trim() || undefined,
        country: "ET",
        description: certifiedInfo.trim() || undefined,
        evidence_filename: evidenceFileName ?? undefined,
      };

      const res = await fetch(`${API}/pharmacies`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setExistingPharmacy({ name: pharmacyName, status: "pending" });
          return;
        }
        throw new Error(json.message ?? "Submission failed");
      }

      setSubmitted(true);
    } catch (e: any) {
      setSubmitError(e.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf9] via-white to-[#e8f8ff]">
        <Loader2 size={36} className="animate-spin text-[#24D2A6]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf9] via-white to-[#e8f8ff] px-4 pt-24 sm:pt-28 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="bg-white rounded-[2.5rem] p-12 max-w-md w-full shadow-2xl text-center border border-gray-100"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-[#24D2A6]/10 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock size={44} className="text-[#24D2A6]" />
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-3">Access Required</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            To get access please{" "}
            <Link
              href="/login?redirect=/pharmacy-partner"
              className="text-[#24D2A6] font-bold hover:underline"
            >
              sign in
            </Link>
          </p>

          <div className="space-y-3">
            <Link
              href="/"
              className="flex items-center justify-center w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/10"
            >
              Close
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (existingPharmacy && existingPharmacy.status === "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf9] via-white to-[#e8f8ff] px-4 pt-24 sm:pt-28 pb-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] p-12 max-w-md w-full shadow-2xl text-center border border-gray-100"
        >
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} className="text-emerald-500" />
          </div>
          
          <h1 className="text-2xl font-black text-slate-900 mb-3">Pharmacy Verified ✅</h1>
          <p className="text-slate-500 mb-6">
            Your pharmacy has been approved and is now live on the platform. Patients can find you in the directory.
          </p>

          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5 text-left mb-8 space-y-2">
            <div className="text-emerald-800 font-bold text-sm mb-3 pb-2 border-b border-emerald-100/50 flex items-center gap-1.5">
              <BadgeCheck size={18} /> Verification Status
            </div>
            <p className="text-slate-700 text-sm">
              <strong>Status:</strong> <span className="text-emerald-600 font-extrabold">✅ Approved &amp; Live</span>
            </p>
            <p className="text-slate-700 text-sm">
              <strong>Pharmacy:</strong> {existingPharmacy.name}
            </p>
            {(existingPharmacy.address || existingPharmacy.city) && (
              <p className="text-slate-700 text-sm">
                <strong>Location:</strong> {existingPharmacy.address || existingPharmacy.city}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href="/pharmacies"
              className="block w-full py-4 bg-[#24D2A6] text-white rounded-2xl font-black hover:bg-[#1db891] transition-all text-center text-sm tracking-wider active:scale-95 shadow-md shadow-[#24D2A6]/10"
            >
              Browse Pharmacies
            </Link>
            <Link
              href="/staff"
              className="block w-full py-4 bg-slate-950 text-white rounded-2xl font-black hover:bg-slate-900 transition-all text-center text-sm tracking-wider active:scale-95"
            >
              Go to Staff Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (submitted || existingPharmacy) {
    const phStatus = existingPharmacy?.status ?? "pending";
    const phName = existingPharmacy?.name ?? pharmacyName;
    const phReason = existingPharmacy?.rejection_reason ?? null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0fdf9] via-white to-[#e8f8ff] px-4 pt-24 sm:pt-28 pb-12">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="bg-white rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl text-left border border-gray-100"
        >
          <div className="text-center mb-6">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              phStatus === "rejected" || phStatus === "suspended" ? "bg-rose-50 text-rose-500" : "bg-amber-50 text-amber-500"
            }`}>
              {phStatus === "rejected" || phStatus === "suspended" ? (
                <AlertCircle size={44} />
              ) : (
                <Clock size={44} className="animate-pulse" />
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              {phStatus === "rejected" 
                ? "Application Rejected" 
                : phStatus === "suspended" 
                  ? "Pharmacy Suspended" 
                  : "Waiting for Admin Approval"}
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              {phStatus === "rejected"
                ? "The admin team has requested changes or declined your registration."
                : phStatus === "suspended"
                  ? "Your pharmacy listing has been suspended by the administration."
                  : "Your pharmacy registration has been submitted and is pending review."}
            </p>
          </div>

          <div className={`rounded-2xl p-5 border mb-6 ${
            phStatus === "rejected" || phStatus === "suspended" 
              ? "bg-rose-50/50 border-rose-100" 
              : "bg-amber-50/60 border-amber-100"
          }`}>
            <h3 className={`font-black text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5 ${
              phStatus === "rejected" || phStatus === "suspended" ? "text-rose-800" : "text-amber-800"
            }`}>
              <AlertCircle size={16} /> Status Details
            </h3>
            <div className="space-y-1.5 text-xs text-slate-700">
              <p>
                <strong>Status:</strong>{" "}
                <span className={`font-bold ${
                  phStatus === "rejected" || phStatus === "suspended" ? "text-rose-600" : "text-amber-600"
                }`}>
                  {phStatus.charAt(0).toUpperCase() + phStatus.slice(1)}
                </span>
              </p>
              {phName && (
                <p>
                  <strong>Pharmacy:</strong> {phName}
                </p>
              )}
              {phReason && (
                <div className="mt-3 p-3 bg-white/80 border border-rose-100/50 rounded-xl">
                  <strong className="text-rose-800">Admin Instructions:</strong>
                  <p className="text-slate-600 mt-1 leading-relaxed">{phReason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Collapsible/Toggleable Update form */}
          {!showReplyForm ? (
            <div className="space-y-3">
              <button 
                onClick={() => setShowReplyForm(true)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm tracking-wider transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
              >
                <Upload size={16} /> Update Info / Upload License
              </button>
              <div className="grid grid-cols-2 gap-3">
                <Link href="/" className="block py-3.5 bg-gray-50 text-slate-600 rounded-2xl font-bold hover:bg-gray-100 transition-colors text-center text-xs">
                  Back to Home
                </Link>
                <Link href="/account" className="block py-3.5 bg-gray-50 text-slate-600 rounded-2xl font-bold hover:bg-gray-100 transition-colors text-center text-xs">
                  View Account
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5 border-t border-slate-100 pt-5 text-left">
              <h3 className="font-black text-sm text-slate-800">Submit Verification Response</h3>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Upload Updated License File</label>
                <div
                  onClick={() => newEvidenceInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-[#24D2A6] hover:bg-[#24D2A6]/5 transition-all group"
                >
                  {newEvidenceFileName ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={28} className="text-[#24D2A6]" />
                      <p className="text-xs font-bold text-slate-700 max-w-xs truncate">{newEvidenceFileName}</p>
                      <p className="text-[10px] text-slate-400">Click to change document</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-[#24D2A6]">
                      <UploadCloud size={30} />
                      <p className="font-bold text-xs">Click to upload license</p>
                      <p className="text-[10px]">PDF, PNG, JPG, WebP — max 5MB</p>
                    </div>
                  )}
                  <input ref={newEvidenceInputRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleNewEvidenceChange} />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Reply message / Additional certified info</label>
                <textarea
                  value={newCertifiedInfo}
                  onChange={(e) => setNewCertifiedInfo(e.target.value)}
                  rows={4}
                  placeholder="Type a message or paste updated credential details to answer admin requests..."
                  className="w-full border border-gray-200 rounded-2xl p-4 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] resize-none transition-colors"
                />
              </div>

              {updateSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl p-3 text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> Updates submitted! Application status set back to pending.
                </div>
              )}

              {submitError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3 text-xs flex items-center gap-1.5">
                  <AlertCircle size={16} /> {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowReplyForm(false)}
                  className="flex-1 py-3 border border-gray-150 hover:bg-gray-50 text-slate-500 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={updatingApp || !newCertifiedInfo.trim()}
                  onClick={handleUpdateSubmit}
                  className="flex-1 py-3 bg-[#24D2A6] hover:bg-[#1db891] text-white rounded-xl font-black text-xs transition-colors disabled:opacity-50"
                >
                  {updatingApp ? "Submitting..." : "Submit Response"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  const stepLabels = ["Personal Info", "Pharmacy Details", "Evidence Upload"];

  const canProceedStep1 = fullName.trim() && email.trim() && phone.trim() && !phoneError && ETHIOPIAN_PHONE.test(phone.replace(/\s+/g, ""));
  
  // Step 2 proceed block now only requires the pharmacy name string to unlock
  const canProceedStep2 = pharmacyName.trim();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f0fdf9] via-white to-[#e8f8ff] pt-24 sm:pt-28 pb-20">
      {/* Hero */}
      <div className="bg-gradient-to-r from-[#0d9e75] via-[#24D2A6] to-[#1ab394] text-white py-12 px-6 shadow-xl">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Building2 size={32} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">🏥 Become a Pharmacy Partner</h1>
          <p className="text-white/85 text-base md:text-lg font-medium">
            Register your pharmacy and reach thousands of patients in your area.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 mt-10">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#24D2A6] font-semibold text-sm mb-8 transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Step Progress */}
        <div className="flex items-center gap-2 mb-10">
          {([1, 2, 3] as Step[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 transition-all ${step > s ? "bg-[#24D2A6] text-white" : step === s ? "bg-slate-900 text-white scale-110 shadow-lg" : "bg-gray-100 text-slate-400"}`}>
                {step > s ? <CheckCircle2 size={18} /> : s}
              </div>
              <span className={`text-xs font-black uppercase tracking-wider hidden sm:block ${step === s ? "text-slate-900" : "text-slate-400"}`}>{stepLabels[idx]}</span>
              {idx < 2 && <div className={`flex-1 h-0.5 rounded-full ${step > s ? "bg-[#24D2A6]" : "bg-gray-100"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl border border-gray-100">

            {/* ── Step 1: Personal Info ── */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Personal Information</h2>
                <p className="text-slate-400 text-sm mb-8">Your contact details as the pharmacy owner/manager.</p>
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Full Name *</label>
                    <div className="relative">
                      <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-4 font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] transition-colors" placeholder="Abebe Kebede" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email Address *</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-4 font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] transition-colors" placeholder="you@example.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Phone Number (Ethiopian) *</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); if (phoneError) validatePhone(e.target.value, setPhoneError); }}
                        onBlur={() => validatePhone(phone, setPhoneError)}
                        className={`w-full border rounded-2xl pl-12 pr-4 py-4 font-medium text-slate-900 focus:outline-none transition-colors ${phoneError ? "border-rose-400 focus:border-rose-400" : "border-gray-200 focus:border-[#24D2A6]"}`}
                        placeholder="Enter Your phone number . "
                      />
                    </div>
                    {phoneError ? (
                      <p className="text-rose-500 text-xs mt-1.5 flex items-center gap-1"><AlertCircle size={13} /> {phoneError}</p>
                    ) : (
                      <p className="text-slate-400 text-xs mt-1.5">Format variants: +251XXXXXXXXX, 09XXXXXXXX, or 07XXXXXXXX</p>
                    )}
                  </div>
                </div>
                <button onClick={() => setStep(2)} disabled={!canProceedStep1} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-40">
                  Next: Pharmacy Details <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* ── Step 2: Pharmacy Details ── */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Pharmacy Details</h2>
                <p className="text-slate-400 text-sm mb-8">Provide your pharmacy's information as it should appear in listings.</p>
                <div className="space-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Pharmacy Name *</label>
                    <div className="relative">
                      <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" required value={pharmacyName} onChange={(e) => setPharmacyName(e.target.value)} className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-4 font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] transition-colors" placeholder="Bole Pharmacy" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Address</label>
                      <div className="relative">
                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-gray-200 rounded-2xl pl-12 pr-4 py-4 font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] transition-colors" placeholder="Bole Rd, Addis Ababa" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">City</label>
                      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full border border-gray-200 rounded-2xl px-4 py-4 font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] transition-colors" placeholder="Addis Ababa" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Pharmacy Email</label>
                      <input type="email" value={pharmacyEmail} onChange={(e) => setPharmacyEmail(e.target.value)} className="w-full border border-gray-200 rounded-2xl px-4 py-4 font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] transition-colors" placeholder="pharmacy@example.com" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Website (optional)</label>
                      <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} className="w-full border border-gray-200 rounded-2xl px-4 py-4 font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] transition-colors" placeholder="https://..." />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-gray-50 border border-gray-100 transition-colors">Back</button>
                  <button onClick={() => setStep(3)} disabled={!canProceedStep2} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-40">
                    Next: Evidence Upload <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Evidence Submission & Certified Info ── */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Evidence Documents & Certification</h2>
                <p className="text-slate-400 text-sm mb-8">Please upload structural credentials and license information required to approve your pharmacy listing.</p>

                {/* Evidence Upload Area */}
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Pharmacy License Document *</label>
                  <div
                    onClick={() => evidenceInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center cursor-pointer hover:border-[#24D2A6] hover:bg-[#24D2A6]/5 transition-all group"
                  >
                    {evidenceFileName ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-[#24D2A6]/10 rounded-2xl flex items-center justify-center text-[#24D2A6]">
                          <FileText size={32} />
                        </div>
                        <p className="text-sm font-bold text-[#24D2A6] max-w-xs truncate">{evidenceFileName}</p>
                        <p className="text-xs text-slate-400">Click zone to update document</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-[#24D2A6]">
                        <UploadCloud size={40} />
                        <p className="font-bold text-sm">Click to upload license file</p>
                        <p className="text-xs">PDF, PNG, JPG, WebP — max 5MB</p>
                      </div>
                    )}
                    <input ref={evidenceInputRef} type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleEvidenceChange} />
                  </div>
                </div>

                {/* Certified Additional Information Inputs */}
                <div className="mb-6">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Certified Identifiers / Additional Info *</label>
                  <textarea 
                    value={certifiedInfo} 
                    required
                    onChange={(e) => setCertifiedInfo(e.target.value)} 
                    rows={4} 
                    placeholder="Provide professional registration keys, regional ministry license details, or metadata strings to back verification workflows..." 
                    className="w-full border border-gray-200 rounded-2xl p-4 font-medium text-slate-900 focus:outline-none focus:border-[#24D2A6] resize-none transition-colors" 
                  />
                </div>

                {/* Summary View */}
                <div className="bg-slate-50 rounded-2xl p-5 mb-6 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400 font-bold">Owner Name</span><span className="font-bold text-slate-900">{fullName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-bold">Pharmacy</span><span className="font-bold text-slate-900">{pharmacyName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400 font-bold">Doc Verification</span><span className={`font-bold ${evidenceFileName ? "text-emerald-600" : "text-rose-500"}`}>{evidenceFileName ? "Attached" : "Missing File"}</span></div>
                </div>

                {submitError && (
                  <div className="bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl p-4 flex items-start gap-2 text-sm mb-5">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} disabled={submitting} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-gray-50 border border-gray-100 transition-colors">Back</button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={submitting || !evidenceFile || !certifiedInfo.trim()} 
                    className="flex-1 py-4 bg-[#24D2A6] text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-[#1db891] transition-all disabled:opacity-50 shadow-lg shadow-[#24D2A6]/30"
                  >
                    {submitting ? <><Loader2 size={18} className="animate-spin" /> Submitting…</> : <><BadgeCheck size={20} /> Submit Application</>}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Info note */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-3 text-sm text-blue-700">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">What happens after submission?</p>
            <p className="text-blue-600 text-xs">Our admin team reviews all pharmacy applications within 24–48 hours. Once approved, your account will be upgraded to Pharmacy Staff and your listing will go live.</p>
          </div>
        </div>
      </div>
    </div>
  );
}