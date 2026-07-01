"use client";

import { useMemo, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  ChevronRight, 
  MessageSquare, 
  Send, 
  Map,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
  Download,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Trash2,
  Pill
} from "lucide-react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

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

type Status = "Pending" | "Approved" | "Rejected";

interface Pharmacy {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  operating_hours: any;
  status: Status;
  image: string;
  approvalComment?: string;
  rawStatus: string;
}

interface PharmacyAccessRequest {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  pharmacyName: string;
  location: string;
  coordinates: { lat: number; lng: number };
  message: string;
  documentName: string;
  documentUrl: string;
  status: Status;
  ackMessage?: string;
  submittedAt: string;
  rawStatus: string;
}

// PharmacyActionState removed since editing is disabled for admins

const formatOperatingHours = (hours: any) => {
  if (!hours || (typeof hours === "object" && Object.keys(hours).length === 0)) return "Open 24 Hours";
  if (typeof hours === "string") return hours;
  try {
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const formatted = days.map(d => {
      const dayData = hours[d];
      if (!dayData) return null;
      const dayName = d.charAt(0).toUpperCase() + d.slice(1);
      if (dayData.closed) return `${dayName}: Closed`;
      return `${dayName}: ${dayData.open} - ${dayData.close}`;
    }).filter(Boolean);
    return formatted.length > 0 ? formatted.join(" | ") : "Open 24 Hours";
  } catch (e) {
    return JSON.stringify(hours);
  }
};

function PharmacyManagementPage() {
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [queryMessage, setQueryMessage] = useState("");
  const [showQueryField, setShowQueryField] = useState(false);

  useEffect(() => {
    apiFetch("/admin/stats")
      .then((res) => {
        if (res && res.data) {
          setStats(res.data);
        }
      })
      .catch((err) => console.error("Error fetching stats:", err));
  }, []);

  const searchParams = useSearchParams();

  // Tab state: "partners" for existing partners list, "requests" for candidate access requests list
  const [activeTab, setActiveTab] = useState<"partners" | "requests">(
    searchParams.get("tab") === "requests" ? "requests" : "partners"
  );

  // Sync tab with URL param changes (e.g. notification deep-link)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "requests" || tabParam === "partners") {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit pharmacy states removed: admins cannot edit pharmacy info.
  const [showRegister, setShowRegister] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Pharmacy | null>(null);
  const [pharmacyMedicines, setPharmacyMedicines] = useState<any[]>([]);
  const [medicinesLoading, setMedicinesLoading] = useState(false);
  
  // Register Form
  const [newPharmacyName, setNewPharmacyName] = useState("");
  const [newPharmacyCity, setNewPharmacyCity] = useState("");
  const [newPharmacyPhone, setNewPharmacyPhone] = useState("");
  const [newPharmacyAddress, setNewPharmacyAddress] = useState("");
  const [newPharmacyEmail, setNewPharmacyEmail] = useState("");

  const fetchPharmacies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/admin/pharmacies?limit=100");
      setPharmacies(res.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacies();
  }, [fetchPharmacies]);

  // Fetch medicines stocked by the selected pharmacy
  const fetchPharmacyMedicines = useCallback(async (pharmacyId: string) => {
    setMedicinesLoading(true);
    setPharmacyMedicines([]);
    try {
      const res = await apiFetch(`/admin/pharmacies/${pharmacyId}/inventory`);
      setPharmacyMedicines(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error("Failed to fetch pharmacy medicines:", e);
      setPharmacyMedicines([]);
    } finally {
      setMedicinesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      fetchPharmacyMedicines(selectedPartner.id);
    } else {
      setPharmacyMedicines([]);
    }
  }, [selectedPartner, fetchPharmacyMedicines]);

  // Map backend pharmacies to UI-compatible models — Active Partners = approved only
  const items = useMemo<Pharmacy[]>(() => {
    return pharmacies
      .filter((ph) => ph.status === "approved")
      .map((ph) => ({
        id: ph._id,
        name: ph.name,
        city: ph.city ?? "Addis Ababa",
        address: ph.address || "",
        phone: ph.phone || "",
        email: ph.email || "",
        description: ph.description || "",
        operating_hours: ph.operating_hours || "",
        status: "Approved" as Status,
        image: ph.logo_url || ph.image_url || "",
        approvalComment: ph.rejection_reason || undefined,
        rawStatus: ph.status
      }));
  }, [pharmacies]);

  const requests = useMemo<PharmacyAccessRequest[]>(() => {
    return pharmacies
      .filter((ph) => ph.status === "pending")
      .map((ph) => ({
        id: ph._id,
        userName: ph.owner_id?.full_name ?? "Unknown Owner",
        userEmail: ph.owner_id?.email ?? "N/A",
        userPhone: ph.owner_id?.phone ?? "N/A",
        pharmacyName: ph.name,
        location: ph.address ?? ph.city ?? "Addis Ababa",
        coordinates: { lat: ph.latitude ?? 9.03, lng: ph.longitude ?? 38.74 },
        message: ph.description ?? "No additional information provided.",
        documentName: ph.evidence_filename ?? "business_permit.pdf",
        documentUrl: ph.logo_url ?? "#",
        status: "Pending",
        ackMessage: ph.rejection_reason || undefined,
        submittedAt: ph.created_at,
        rawStatus: ph.status
      }));
  }, [pharmacies]);

  // Set default selected request or highlighted from query params
  useEffect(() => {
    const rIdParam = searchParams.get("request_id");
    if (rIdParam) {
      setSelectedRequestId(rIdParam);
    } else if (requests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(requests[0].id);
    } else if (requests.length === 0) {
      setSelectedRequestId(null);
    }
  }, [requests, selectedRequestId, searchParams]);

  useEffect(() => {
    const pIdParam = searchParams.get("partner_id");
    if (pIdParam && items.length > 0) {
      const match = items.find(item => item.id === pIdParam);
      if (match) {
        setSelectedPartner(match);
      }
    }
  }, [items, searchParams]);

  // Filter lists & counts
  const pendingRequestsCount = requests.length;
  const pendingPartnersCount = items.filter((i) => i.rawStatus === "pending").length;
  const totalPending = pendingRequestsCount + pendingPartnersCount;

  // Selected Request detail reference
  const selectedRequest = useMemo(() => requests.find((r) => r.id === selectedRequestId), [requests, selectedRequestId]);

  // Toggle active / deactivated pharmacy status
  const togglePharmacyStatus = async (id: string, currentStatus: Status) => {
    setActionLoading(true);
    const target = items.find((i) => i.id === id);
    const nextStatus = target?.rawStatus === "approved" ? "suspended" : "approved";
    try {
      if (nextStatus === "approved") {
        await apiFetch(`/admin/pharmacies/${id}/approve`, { method: "PATCH" });
      } else {
        await apiFetch(`/admin/pharmacies/${id}/suspend`, {
          method: "PATCH",
          body: JSON.stringify({ reason: "Suspended by admin: compliance re-verification required." }),
        });
      }
      setSuccessToast(`"${target?.name}" is now ${nextStatus === "approved" ? "Active" : "Deactivated"}.`);
      setTimeout(() => setSuccessToast(null), 3000);
      await fetchPharmacies();
    } catch (err: any) {
      alert(err.message ?? "Failed to toggle status");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestAction = async (requestId: string, newStatus: Status) => {
    setActionLoading(true);
    const targetRequest = requests.find((r) => r.id === requestId);
    try {
      if (newStatus === "Approved") {
        await apiFetch(`/admin/pharmacies/${requestId}/approve`, { method: "PATCH" });
        setSuccessToast(`Access request for "${targetRequest?.pharmacyName}" approved! Upgraded owner to staff.`);
      } else {
        const rejectionReason = ackMessageInput.length >= 10 ? ackMessageInput : "Registration rejected: invalid business documents provided.";
        await apiFetch(`/admin/pharmacies/${requestId}/reject`, {
          method: "PATCH",
          body: JSON.stringify({ reason: rejectionReason }),
        });
        setSuccessToast(`Access request for "${targetRequest?.pharmacyName}" has been rejected.`);
      }
      setTimeout(() => setSuccessToast(null), 4000);
      setAckMessageInput("");
      setShowAckField(false);
      await fetchPharmacies();
    } catch (err: any) {
      alert(err.message ?? "Failed to process request");
    } finally {
      setActionLoading(false);
    }
  };

  // Send a question/query to the applicant WITHOUT changing status
  const handleSendQuery = async (requestId: string) => {
    if (!queryMessage.trim() || queryMessage.trim().length < 5) {
      alert("Please enter a message (at least 5 characters) before sending.");
      return;
    }
    setActionLoading(true);
    const targetRequest = requests.find((r) => r.id === requestId);
    try {
      await apiFetch(`/admin/pharmacies/${requestId}/query`, {
        method: "POST",
        body: JSON.stringify({ message: queryMessage.trim() }),
      });
      setSuccessToast(`Question sent to ${targetRequest?.userName || "applicant"} via notification.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setQueryMessage("");
      setShowQueryField(false);
    } catch (err: any) {
      alert(err.message ?? "Failed to send query");
    } finally {
      setActionLoading(false);
    }
  };

  const openRegister = () => {
    setNewPharmacyName("");
    setNewPharmacyCity("Addis Ababa");
    setNewPharmacyAddress("");
    setNewPharmacyEmail("");
    setNewPharmacyPhone("");
    setShowRegister(true);
  };

  const registerPharmacy = async () => {
    const name = newPharmacyName.trim();
    const city = newPharmacyCity.trim();
    const address = newPharmacyAddress.trim();
    const email = newPharmacyEmail.trim();
    const phone = newPharmacyPhone.trim();
    if (!name || !phone) return;

    setActionLoading(true);
    let formattedPhone = phone.replace(/\s+/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+251" + formattedPhone.slice(1);
    }

    try {
      await apiFetch("/pharmacies", {
        method: "POST",
        body: JSON.stringify({
          name,
          city: city || "Addis Ababa",
          address: address || undefined,
          email: email || undefined,
          phone: formattedPhone,
          logo_url: "/medical-assets.png",
        }),
      });
      setSuccessToast(`Pharmacy registered successfully.`);
      setTimeout(() => setSuccessToast(null), 3000);
      setShowRegister(false);
      await fetchPharmacies();
    } catch (err: any) {
      alert(err.message ?? "Failed to register pharmacy");
    } finally {
      setActionLoading(false);
    }
  };

  const removePharmacy = async (id: string) => {
    // There is no delete endpoint in backend, so filter out locally with success message
    setPharmacies((prev) => prev.filter((p) => p._id !== id));
    setSuccessToast("Removed pharmacy list entry locally.");
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // startEdit and saveEdit functions removed: admins cannot edit pharmacy info.

  return (
    <div className="space-y-6 font-sans">
      {/* Dynamic Toast Success Alert */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-24 left-1/2 z-[100] w-full max-w-md -translate-x-1/2 px-4"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-xl text-emerald-800">
              <CheckCircle2 className="text-[#24D2A6] shrink-0" size={20} />
              <p className="text-xs font-black tracking-wide">{successToast}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 sm:text-4xl font-poppins">Pharmacy Partners</h1>
          <p className="mt-1 text-sm text-slate-500 font-medium">Manage relationships, compliance status, and onboarding applications.</p>
        </div>
        <button onClick={openRegister} className="w-full rounded-xl bg-[#24D2A6] px-5 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-[#1eb08b] sm:w-auto shadow-md shadow-[#24D2A6]/10 active:scale-95 transition-transform cursor-pointer">
          Register Pharmacy
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Network", value: String(pharmacies.length) },
          { label: "Pending Approvals", value: String(pendingRequestsCount), highlight: pendingRequestsCount > 0 },
          { label: "Active Status", value: pharmacies.length > 0 ? `${((pharmacies.filter((p) => p.status === 'approved').length / pharmacies.length) * 100).toFixed(1)}%` : "100%" },
          { label: "Flagged Risks", value: String(pharmacies.filter((p) => p.status === 'suspended' || p.status === 'rejected').length) },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:shadow-md ${
            kpi.highlight ? "ring-2 ring-amber-500/20 bg-amber-50/5" : ""
          }`}>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</p>
            <p className={`text-3xl font-black mt-2 leading-none ${kpi.highlight ? "text-amber-600" : "text-slate-900"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Main Tab Select Navigation Bar */}
      <div className="flex justify-between items-center border-b border-slate-200">
        <button
          onClick={() => setActiveTab("partners")}
          className={`px-6 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === "partners"
              ? "border-[#24D2A6] text-[#24D2A6]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Active Partners ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-6 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "requests"
              ? "border-[#24D2A6] text-[#24D2A6]"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Access Requests
          {pendingRequestsCount > 0 && (
            <span className="bg-amber-500 text-white rounded-full text-[9px] px-2 py-0.5 font-bold animate-pulse">
              {pendingRequestsCount} new
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={36} className="animate-spin text-[#24D2A6]" />
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading network registry...</p>
        </div>
      ) : (
        /* Tab Contents */
        <AnimatePresence mode="wait">
          {activeTab === "partners" ? (
            <motion.div
              key="partners-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Partners Table */}
              <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <div className="hidden grid-cols-5 border-b border-slate-100 bg-slate-50/50 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 md:grid">
                  <span>Pharmacy Name</span>
                  <span>Location</span>
                  <span>Status</span>
                  <span>Contact</span>
                  <span>Actions</span>
                </div>
                {items.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 font-bold py-12">No active pharmacy partners found.</p>
                ) : (
                  items.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedPartner(item)}
                      className="grid grid-cols-1 gap-3 border-b border-slate-100 px-6 py-5 last:border-b-0 md:grid-cols-5 md:items-center md:gap-2 md:py-4 transition-colors hover:bg-slate-50/50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {item.image && item.image !== "/medical-assets.png" ? (
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="h-11 w-11 rounded-2xl object-cover border border-slate-100 shrink-0"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 border border-slate-100 flex items-center justify-center text-[#24D2A6] font-black font-mono text-base shrink-0">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-tight">{item.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.id.slice(-8).toUpperCase()}</p>
                          <p className="text-[9px] font-black text-teal-600 uppercase tracking-widest mt-1">
                            🕒 {item.operating_hours && typeof item.operating_hours === "object" && Object.keys(item.operating_hours).length > 0 ? "Custom Hours" : "24 Hour Service"}
                          </p>
                          {(() => {
                            const rawPh = pharmacies.find((p) => p._id === item.id);
                            const activeAnn = rawPh?.announcements?.find(
                              (a: any) => a.is_pinned || a.type === "emergency" || a.type === "holiday" || a.type === "service_interruption"
                            );
                            return activeAnn ? (
                              <div className="mt-1 text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-1.5 py-0.5 uppercase tracking-wider w-fit animate-pulse">
                                ⚠️ Alert: {activeAnn.title}
                              </div>
                            ) : null;
                          })()}
                          {item.approvalComment && <p className="mt-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 w-fit">Note: {item.approvalComment}</p>}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400 md:hidden mr-1">Location:</span>
                        <MapPin size={13} className="text-slate-400" />
                        {item.city}
                      </span>
                      <span className={`w-fit rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider border ${
                        item.rawStatus === "approved"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : item.rawStatus === "suspended"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {item.rawStatus === "approved" ? "Active" : item.rawStatus === "suspended" ? "Suspended" : "Rejected"}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold break-all md:break-normal flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400 md:hidden mr-1">Contact: </span>
                        {item.email ? <span className="flex items-center gap-1"><Mail size={12} className="text-slate-400" /> {item.email}</span> : null}
                        {item.phone ? <span className="flex items-center gap-1 mt-0.5"><Phone size={12} className="text-slate-400" /> {item.phone}</span> : null}
                        {!item.email && !item.phone ? <span className="text-slate-400">N/A</span> : null}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          disabled={actionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePharmacyStatus(item.id, item.status);
                          }}
                          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wide transition-all duration-200 border cursor-pointer ${
                            item.rawStatus === "approved"
                              ? "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100/60"
                              : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/80"
                          }`}
                        >
                          {item.rawStatus === "approved" ? (
                            <>
                              <ToggleRight size={16} className="text-emerald-500" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={16} className="text-slate-400" />
                              <span>Suspended</span>
                            </>
                          )}
                        </button>
                        
                        {/* Edit Partner action removed: admins cannot edit pharmacy info */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePharmacy(item.id);
                          }}
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer flex items-center justify-center"
                          title="Remove Partner"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Growth & Compliance widgets */}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 font-poppins">Network Growth Trend</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Visualizing weekly pharmacy registrations from database.</p>
                  <div className="mt-8 flex h-44 items-end gap-3 px-2 relative">
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                      <div className="border-b border-dashed border-slate-400 w-full h-0" />
                      <div className="border-b border-dashed border-slate-400 w-full h-0" />
                      <div className="border-b border-dashed border-slate-400 w-full h-0" />
                    </div>
                    {(() => {
                      const data = stats?.analytics?.weekly_pharmacy_registrations ?? [];
                      if (data.length === 0) {
                        return <div className="text-xs text-slate-450 w-full text-center pb-8">No registration data available</div>;
                      }
                      const maxVal = Math.max(...data.map((d: any) => d.count), 1);
                      return data.map((d: any, idx: number) => {
                        const barHeightPercent = Math.max((d.count / maxVal) * 100, 8);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group/bar relative">
                            <span className="text-[10px] font-black text-slate-700 mb-1 opacity-0 group-hover/bar:opacity-100 transition-opacity absolute -top-5">
                              {d.count}
                            </span>
                            <div
                              style={{ height: `${barHeightPercent}%` }}
                              className="w-full bg-[#24D2A6] rounded-t-xl opacity-80 hover:opacity-100 hover:scale-x-105 transition-all shadow-md shadow-[#24D2A6]/10 cursor-pointer"
                            />
                            <span className="text-[8px] font-bold text-slate-450 uppercase mt-2">{d.day}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
                <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white mb-4">
                      <FileText size={18} />
                    </div>
                    <h3 className="text-lg font-black font-poppins text-white leading-tight">Compliance Alerts</h3>
                    <p className="mt-2 text-xs text-slate-400 leading-normal">Expired commercial credentials flagged on network providers. Audit documentation is pending review.</p>
                  </div>
                  <button className="mt-8 w-full rounded-2xl bg-[#24D2A6] hover:bg-[#1eb08b] py-3.5 text-xs font-black uppercase tracking-widest text-white transition-all shadow-md shadow-[#24D2A6]/15 active:scale-95 cursor-pointer">
                    Review Documents
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="requests-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* LEFT COLUMN: Request lists */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm text-left">
                  <h3 className="text-base font-black text-slate-900 mb-5 font-poppins flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" /> Pharmacy Access Requests
                  </h3>

                  <div className="space-y-6">
                    {/* Category: Pending */}
                    <div>
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500" /> Pending Approval
                        </span>
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          {requests.length}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {requests.map((req) => (
                          <div
                            key={req.id}
                            onClick={() => setSelectedRequestId(req.id)}
                            className={`rounded-2xl border p-4 text-left cursor-pointer transition-all relative ${
                              selectedRequestId === req.id
                                ? "border-[#24D2A6] bg-[#24D2A6]/5 shadow-sm"
                                : "border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-black text-slate-800 text-[10px] uppercase tracking-wider">{req.userName}</p>
                                <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{req.pharmacyName}</h4>
                                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-2">
                                  <MapPin size={10} /> {req.location}
                                </p>
                              </div>
                              <ChevronRight size={16} className={`text-slate-400 self-center transition-transform ${
                                selectedRequestId === req.id ? "translate-x-0.5 text-[#24D2A6]" : ""
                              }`} />
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100/60 flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRequestId(req.id);
                                }}
                                className="rounded-xl bg-slate-200/50 hover:bg-slate-200 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors cursor-pointer"
                              >
                                View
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestAction(req.id, "Approved");
                                }}
                                className="rounded-xl bg-[#24D2A6] hover:bg-[#1eb08b] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestAction(req.id, "Rejected");
                                }}
                                className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100/50 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-500 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}

                        {requests.length === 0 && (
                          <p className="text-[11px] text-slate-350 font-black text-center uppercase tracking-wider py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">No pending requests in ledger.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Selected Request Details inspector */}
              <div className="lg:col-span-7">
                <AnimatePresence mode="wait">
                  {selectedRequest ? (
                    <motion.div
                      key={selectedRequest.id}
                      initial={{ opacity: 0, scale: 0.99 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.99 }}
                      className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm space-y-6 text-left relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#24D2A6] bg-[#24D2A6]/10 px-3 py-1 rounded-full">
                            Request Details
                          </span>
                          <h3 className="font-black text-slate-900 text-xl font-poppins mt-2">
                            {selectedRequest.pharmacyName}
                          </h3>
                        </div>
                        <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
                          {selectedRequest.status}
                        </span>
                      </div>

                      {/* Section 1: User Profile Info */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" /> Applicant User Info
                        </h4>
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Full Name</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">{selectedRequest.userName}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                            <p className="text-sm font-bold text-slate-800 mt-1 truncate">{selectedRequest.userEmail}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                            <p className="text-sm font-bold text-slate-800 mt-1">{selectedRequest.userPhone}</p>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Geospatial & Metadata */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Map size={12} className="text-slate-400" /> Location Profile Metadata
                        </h4>
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Physical Address</p>
                            <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                              <MapPin size={14} className="text-[#24D2A6]" /> {selectedRequest.location}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Geospatial Coordinates</p>
                            <p className="text-xs font-mono font-bold text-slate-700 mt-1">
                              Lat: {selectedRequest.coordinates.lat} / Lng: {selectedRequest.coordinates.lng}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Message Pitch */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <MessageSquare size={12} className="text-slate-400" /> Custom Covers / Application Note
                        </h4>
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60">
                          <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            &ldquo;{selectedRequest.message}&rdquo;
                          </p>
                        </div>
                      </div>

                      {/* Section 4: Document Verification */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                          <FileText size={12} className="text-slate-400" /> Business License & Permits Verification
                        </h4>
                        <div className="flex items-center justify-between border border-slate-100 rounded-2xl p-4 bg-white shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                              <FileText size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800 truncate max-w-[180px] sm:max-w-[280px]">
                                {selectedRequest.documentName}
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Commercial Verification File</p>
                            </div>
                          </div>
                          <a
                            href={selectedRequest.documentUrl}
                            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-[11px] uppercase tracking-wider px-3.5 py-2 transition-colors"
                          >
                            <Download size={12} /> Download
                          </a>
                        </div>
                      </div>

                      {selectedRequest.ackMessage && (
                        <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 text-blue-900 space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-blue-500 flex items-center gap-1">
                            <Send size={10} /> Active Admin Note Shared:
                          </p>
                          <p className="text-xs font-semibold leading-normal text-slate-700">{selectedRequest.ackMessage}</p>
                        </div>
                      )}

                      {/* Operational Action Controls Footer */}
                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                        {selectedRequest.rawStatus === "pending" ? (
                          <>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleRequestAction(selectedRequest.id, "Approved")}
                              className="flex-1 rounded-xl bg-[#24D2A6] hover:bg-[#1eb08b] text-white text-xs font-black uppercase tracking-widest py-3.5 transition-colors shadow-sm active:scale-[0.99] cursor-pointer disabled:opacity-40"
                            >
                              Approve Access & Push Live
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleRequestAction(selectedRequest.id, "Rejected")}
                              className="rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-black uppercase tracking-widest px-6 py-3.5 transition-colors active:scale-[0.99] cursor-pointer disabled:opacity-40"
                            >
                              Reject Application
                            </button>
                          </>
                        ) : (
                          <div className="w-full space-y-4">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium bg-slate-50 rounded-xl p-3 border border-slate-100">
                              <Lock size={14} />
                              <span>This request workflow loop is completed. No status adjustments permitted.</span>
                            </div>
                          </div>
                        )}

                        {selectedRequest.rawStatus === "pending" && (
                          <div className="w-full">
                            {!showQueryField ? (
                              <button
                                onClick={() => {
                                  setQueryMessage("");
                                  setShowQueryField(true);
                                }}
                                className="w-full rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-black uppercase tracking-widest px-5 py-3 transition-colors cursor-pointer flex items-center justify-center gap-2"
                              >
                                <MessageSquare size={13} /> Ask Applicant a Question
                              </button>
                            ) : (
                              <div className="w-full space-y-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                                <label className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                                  <MessageSquare size={11} /> Question / Info Request to Applicant
                                </label>
                                <p className="text-[10px] text-amber-600/80 font-medium">The applicant will receive this as a notification. The pharmacy status stays <strong>Pending</strong>.</p>
                                <textarea
                                  value={queryMessage}
                                  onChange={(e) => setQueryMessage(e.target.value)}
                                  placeholder="e.g. Please provide a valid pharmacy license. The one submitted appears expired."
                                  className="w-full rounded-xl border border-amber-200 p-3 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                                  rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setShowQueryField(false)}
                                    className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    disabled={actionLoading || queryMessage.trim().length < 5}
                                    onClick={() => handleSendQuery(selectedRequest.id)}
                                    className="flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-black uppercase text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors cursor-pointer disabled:opacity-40"
                                  >
                                    <Send size={11} /> Send Question
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                      </div>
                    </motion.div>
                  ) : (
                    <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center text-slate-400 font-medium">
                      Select a request submission from the registry feed to view details.
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Edit Partner Modal is removed as admins cannot edit pharmacy details */}

      {/* Selected Active Partner Inspector Modal */}
      <AnimatePresence>
        {selectedPartner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-lg p-6 shadow-2xl text-left relative overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#24D2A6] bg-[#24D2A6]/10 px-3 py-1 rounded-full">
                    Partner Details
                  </span>
                  <h3 className="font-black text-slate-900 text-xl font-poppins mt-2">
                    {selectedPartner.name}
                  </h3>
                </div>
                <span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider border ${
                  selectedPartner.rawStatus === "approved"
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-amber-50 text-amber-600 border-amber-100"
                }`}>
                  {selectedPartner.rawStatus === "approved" ? "Active" : "Suspended"}
                </span>
              </div>

              {/* Scrollable Body Content */}
              <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-1">
                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User size={12} className="text-slate-400" /> Contact Info
                  </h4>
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Phone Number</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1"><Phone size={12} className="text-[#24D2A6]" /> {selectedPartner.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Email Address</p>
                      <p className="text-sm font-bold text-slate-800 mt-1 truncate flex items-center gap-1"><Mail size={12} className="text-[#24D2A6]" /> {selectedPartner.email || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Physical Location */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin size={12} className="text-slate-400" /> Physical Location
                  </h4>
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">City</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{selectedPartner.city}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Address</p>
                      <p className="text-sm font-bold text-slate-800 mt-1">{selectedPartner.address || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Operating Hours */}
                {selectedPartner.operating_hours && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} className="text-slate-400" /> Operating Hours
                    </h4>
                    <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60">
                      <p className="text-xs font-semibold leading-relaxed text-slate-700">
                        {formatOperatingHours(selectedPartner.operating_hours)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedPartner.description && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <FileText size={12} className="text-slate-400" /> Description / Bio
                    </h4>
                    <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100/60">
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">
                        {selectedPartner.description}
                      </p>
                    </div>
                  </div>
                )}

                {selectedPartner.approvalComment && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 text-amber-900 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                      <AlertCircle size={10} /> Compliance Note / Comment:
                    </p>
                    <p className="text-xs font-semibold leading-normal text-slate-700">{selectedPartner.approvalComment}</p>
                  </div>
                )}

                {/* Medicine Inventory Section */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Pill size={12} className="text-[#24D2A6]" /> Medicines In Stock
                  </h4>
                  {medicinesLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                      <Loader2 size={16} className="animate-spin text-[#24D2A6]" />
                      <span className="text-xs font-medium">Loading inventory...</span>
                    </div>
                  ) : pharmacyMedicines.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center">
                      <p className="text-xs text-slate-400 font-semibold">No medicines recorded in this pharmacy's inventory.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pharmacyMedicines.map((med: any, idx: number) => (
                        <div key={med.medicine_id ?? idx} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 hover:border-[#24D2A6]/40 hover:bg-[#24D2A6]/5 transition-colors">
                          {med.image_url ? (
                            <img src={med.image_url} alt={med.medicine_name} className="w-10 h-10 rounded-xl object-cover border border-slate-100 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-lg shrink-0 select-none">💊</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{med.medicine_name}</p>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              {med.category ?? "Uncategorized"}
                              {med.dosage_form ? ` · ${med.dosage_form}` : ""}
                              {med.strength ? ` · ${med.strength}` : ""}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full block ${
                              med.in_stock ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                            }`}>
                              {med.in_stock ? "In Stock" : "Out"}
                            </span>
                            {med.stock_quantity != null && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{med.stock_quantity} units</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Controls (fixed) */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button 
                  onClick={() => setSelectedPartner(null)}
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider px-5 py-2.5 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Register Pharmacy Modal */}
      <AnimatePresence>
        {showRegister && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-black text-slate-900 font-poppins">Register New Pharmacy</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Pharmacy Name *</label>
                  <input type="text" required value={newPharmacyName} onChange={(e) => setNewPharmacyName(e.target.value)} placeholder="e.g. HealthCare Central" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Phone Number (Ethiopian) *</label>
                  <input type="text" required value={newPharmacyPhone} onChange={(e) => setNewPharmacyPhone(e.target.value)} placeholder="e.g. 0911223344" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">City</label>
                    <input type="text" value={newPharmacyCity} onChange={(e) => setNewPharmacyCity(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Address</label>
                    <input type="text" value={newPharmacyAddress} onChange={(e) => setNewPharmacyAddress(e.target.value)} placeholder="e.g. Bole Road" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Email Address (optional)</label>
                  <input type="email" value={newPharmacyEmail} onChange={(e) => setNewPharmacyEmail(e.target.value)} placeholder="e.g. admin@pharmacy.com" className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold" />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button onClick={() => setShowRegister(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">Cancel</button>
                <button
                  disabled={actionLoading || !newPharmacyName.trim() || !newPharmacyPhone.trim()}
                  onClick={registerPharmacy}
                  className="px-5 py-2.5 bg-[#24D2A6] text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#1eb08b] transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  Register
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PharmacyManagementPageWrapper() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-3 min-h-screen">
        <Loader2 size={36} className="animate-spin text-[#24D2A6]" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading partners workspace...</p>
      </div>
    }>
      <PharmacyManagementPage />
    </Suspense>
  );
}