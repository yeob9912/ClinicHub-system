"use client";

import { useUser } from "@/context/UserContext";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  Shield, 
  Camera, 
  Save, 
  LogOut, 
  Star, 
  Bell, 
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Calendar,
  Clock,
  XCircle,
  Package,
  MapPin,
  ChevronDown,
  Sparkles,
  TrendingUp,
  Banknote,
  Upload,
  ImageIcon,
  Truck,
  Copy,
} from "lucide-react";
import Link from "next/link";

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

interface Order {
  _id: string;
  type: "order" | "visit";
  status: "pending" | "approved" | "awaiting_receipt" | "receipt_submitted" | "rejected" | "completed" | "cancelled" | "payment_rejected" | "resubmission_required";
  pharmacy_id: { name: string; address?: string; phone?: string };
  items: { name: string; quantity: number; price?: number }[];
  visit_date?: string;
  visit_time?: string;
  notes?: string;
  rejection_reason?: string;
  staff_comment?: string;
  payment_bank_account?: string;
  receipt_url?: string;
  receipt_submitted_at?: string;
  delivery_confirmed_at?: string;
  created_at: string;
}

// ── Rich mock data ─────────────────────────────────────────────────────────────
const MOCK_ORDERS: Order[] = [
  {
    _id: "m1",
    type: "order",
    status: "completed",
    pharmacy_id: { name: "Al-Shifaa Pharmacy", address: "Bole Road, Addis Ababa" },
    items: [
      { name: "Amoxicillin 500mg", quantity: 2, price: 85 },
      { name: "Paracetamol 1g", quantity: 3, price: 35 },
      { name: "Vitamin C 1000mg", quantity: 1, price: 120 },
    ],
    notes: "Please include the prescription receipt.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    _id: "m2",
    type: "visit",
    status: "approved",
    pharmacy_id: { name: "Medtech Pharmacy", address: "Kazanchis, Addis Ababa" },
    items: [],
    visit_date: "2026-06-10",
    visit_time: "10:30 AM",
    notes: "Follow-up consultation with pharmacist.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    _id: "m3",
    type: "order",
    status: "pending",
    pharmacy_id: { name: "Hayat Pharmacy", address: "Piazza, Addis Ababa" },
    items: [
      { name: "Metformin 500mg", quantity: 1, price: 60 },
      { name: "Atorvastatin 20mg", quantity: 1, price: 150 },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    _id: "m4",
    type: "visit",
    status: "rejected",
    pharmacy_id: { name: "Care Plus Pharmacy", address: "Megenagna, Addis Ababa" },
    items: [],
    visit_date: "2026-06-05",
    visit_time: "02:00 PM",
    rejection_reason: "Pharmacy is fully booked for that time slot. Please select another time.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
  {
    _id: "m5",
    type: "order",
    status: "approved",
    pharmacy_id: { name: "Al-Shifaa Pharmacy", address: "Bole Road, Addis Ababa" },
    items: [
      { name: "Omeprazole 20mg", quantity: 2, price: 90 },
      { name: "Ibuprofen 400mg", quantity: 2, price: 45 },
    ],
    notes: "Urgent – needed before 5 PM today.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    _id: "m6",
    type: "order",
    status: "cancelled",
    pharmacy_id: { name: "Medtech Pharmacy", address: "Kazanchis, Addis Ababa" },
    items: [
      { name: "Azithromycin 250mg", quantity: 1, price: 200 },
    ],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
  },
];

const STATUS_COLORS: Record<string, string> = {
  pending:               "bg-amber-50 text-amber-600 border-amber-200",
  approved:              "bg-emerald-50 text-emerald-600 border-emerald-200",
  awaiting_receipt:      "bg-orange-50 text-orange-600 border-orange-200",
  receipt_submitted:     "bg-purple-50 text-purple-600 border-purple-200",
  rejected:              "bg-rose-50 text-rose-600 border-rose-200",
  completed:             "bg-blue-50 text-blue-600 border-blue-200",
  cancelled:             "bg-slate-100 text-slate-500 border-slate-200",
  payment_rejected:      "bg-rose-50 text-rose-700 border-rose-300",
  resubmission_required: "bg-amber-50 text-amber-700 border-amber-300",
};

const STATUS_LABELS: Record<string, string> = {
  pending:               "Pending Review",
  approved:              "Approved",
  awaiting_receipt:      "Payment Required",
  receipt_submitted:     "Receipt Submitted",
  rejected:              "Rejected",
  completed:             "Delivered",
  cancelled:             "Cancelled",
  payment_rejected:      "Payment Rejected",
  resubmission_required: "Re-upload Required",
};

const STATUS_DOT: Record<string, string> = {
  pending:               "bg-amber-400",
  approved:              "bg-emerald-400",
  awaiting_receipt:      "bg-orange-400",
  receipt_submitted:     "bg-purple-400",
  rejected:              "bg-rose-400",
  completed:             "bg-blue-400",
  cancelled:             "bg-slate-300",
  payment_rejected:      "bg-rose-500",
  resubmission_required: "bg-amber-500",
};

// ── Animated counter ───────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / 20);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 30);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
}

// ── Stagger container variants ─────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
  exit: { opacity: 0, y: -16, scale: 0.96, transition: { duration: 0.18 } },
};

const statVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 12 },
  show: (i: number) => ({
    opacity: 1, scale: 1, y: 0,
    transition: { delay: i * 0.07, type: "spring", stiffness: 300, damping: 20 },
  }),
};

const tabContentVariants = {
  hidden: { opacity: 0, x: 40, scale: 0.98 },
  show: { opacity: 1, x: 0, scale: 1, transition: { type: "spring", stiffness: 240, damping: 26 } },
  exit: { opacity: 0, x: -40, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } },
};

// ── Expandable order card ──────────────────────────────────────────────────────
function OrderCard({ order, index, onRefresh }: { order: Order; index: number; onRefresh: () => void }) {
  // Auto-expand if the order needs user action
  const [expanded, setExpanded] = useState(
    order.status === "awaiting_receipt" ||
    order.status === "receipt_submitted" ||
    order.status === "payment_rejected" ||
    order.status === "resubmission_required"
  );
  const [receiptFile, setReceiptFile] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const hasDetails =
    (order.items && order.items.length > 0) ||
    order.notes ||
    order.rejection_reason ||
    order.staff_comment ||
    order.payment_bank_account ||
    order.receipt_url ||
    (order.visit_date || order.visit_time);

  const handleReceiptSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setUploadError("Image must be less than 5MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setReceiptFile(reader.result as string);
    reader.readAsDataURL(file);
    setUploadError(null);
  };

  const submitReceipt = async () => {
    if (!receiptFile) return;
    setUploadingReceipt(true);
    setUploadError(null);
    try {
      await apiFetch(`/orders/${order._id}/submit-receipt`, {
        method: "PATCH",
        body: JSON.stringify({ receipt_url: receiptFile }),
      });
      onRefresh();
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const copyBankAccount = () => {
    if (order.payment_bank_account) {
      navigator.clipboard.writeText(order.payment_bank_account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const fetchReceipt = async () => {
    if (receiptData) { setShowReceiptModal(true); return; }
    setReceiptLoading(true);
    try {
      const data = await apiFetch(`/receipts/order/${order._id}`);
      setReceiptData(data.data ?? data);
      setShowReceiptModal(true);
    } catch {
      // Receipt not yet generated — should not happen on completed orders
    } finally {
      setReceiptLoading(false);
    }
  };

  const downloadReceiptText = (r: any) => {
    const name = r.pharmacy_id?.name || (typeof r.pharmacy_id === 'string' ? r.pharmacy_id : null) || order.pharmacy_id?.name || "pharmaLocator Pharmacy";
    const headerName = name.toUpperCase();
    const lines = [
      "============================================================",
      `                      ${headerName}`,
      "============================================================",
      `Receipt No   : ${r.receipt_no}`,
      `Date         : ${new Date(r.date || r.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      `Patient      : ${r.customer_name}`,
      "------------------------------------------------------------",
      "ITEMS:",
      ...(r.items || []).map((i: any) => `  ${i.name} x${i.quantity}    ${(i.price * i.quantity).toFixed(2)} ETB`),
      "------------------------------------------------------------",
      `Subtotal     : ${r.subtotal?.toFixed(2)} ETB`,
      `VAT (15%)    : ${r.tax?.toFixed(2)} ETB`,
      `TOTAL        : ${r.total?.toFixed(2)} ETB`,
      "------------------------------------------------------------",
      `Approved By  : ${r.approved_by}`,
      "============================================================",
      `       Thank you for choosing ${name}!`,
      "============================================================",
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${r.receipt_no}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      variants={cardVariants}
      layout
      className="group relative overflow-hidden rounded-3xl border border-gray-100 bg-white hover:border-[#24D2A6]/30 hover:shadow-xl hover:shadow-[#24D2A6]/5 transition-colors duration-300"
    >
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#24D2A6]/0 to-[#24D2A6]/0 group-hover:from-[#24D2A6]/3 group-hover:to-transparent transition-all duration-500 rounded-3xl pointer-events-none" />

      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl ${
        order.status === "completed"             ? "bg-blue-400" :
        order.status === "approved"              ? "bg-[#24D2A6]" :
        order.status === "awaiting_receipt"      ? "bg-orange-400" :
        order.status === "receipt_submitted"     ? "bg-purple-400" :
        order.status === "payment_rejected"      ? "bg-rose-500" :
        order.status === "resubmission_required" ? "bg-amber-500" :
        order.status === "pending"               ? "bg-amber-400" :
        order.status === "rejected"              ? "bg-rose-400"  : "bg-slate-200"
      }`} />

      <div className="pl-5 pr-6 pt-5 pb-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <motion.div
              whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.4 } }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${
                order.type === "visit"
                  ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white"
                  : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
              }`}
            >
              {order.type === "visit" ? <Calendar size={20} /> : <ShoppingBag size={20} />}
            </motion.div>

            <div>
              <p className="font-black text-slate-900 text-sm leading-tight">
                {order.type === "visit" ? "Visit Request" : "Medicine Order"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin size={10} className="text-slate-300" />
                <p className="text-[11px] text-slate-400 font-semibold">
                  {order.pharmacy_id?.name ?? "Pharmacy"}
                </p>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              STATUS_COLORS[order.status] ?? "bg-gray-50 text-gray-500 border-gray-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] ?? "bg-gray-300"}`} />
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
            <p className="text-[10px] text-slate-300 font-medium">
              {new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Quick summary */}
        {order.type === "order" && order.items.length > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-[11px] text-slate-400 font-medium pl-14"
          >
            {order.items.length} item{order.items.length !== 1 ? "s" : ""} · {order.items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0).toLocaleString()} ETB
          </motion.p>
        )}
        {order.type === "visit" && (order.visit_date || order.visit_time) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 pl-14 flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold"
          >
            <Clock size={12} className="text-[#24D2A6]" />
            {order.visit_date}{order.visit_time ? ` · ${order.visit_time}` : ""}
          </motion.div>
        )}

        {/* Expand toggle */}
        {hasDetails && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 ml-14 inline-flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-[#24D2A6] transition-colors cursor-pointer"
          >
            {expanded ? "Hide details" : "Show details"}
            <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.25, ease: "easeInOut" }}>
              <ChevronDown size={12} />
            </motion.span>
          </button>
        )}
      </div>

      {/* Expandable details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-5 space-y-3 border-t border-gray-50 pt-4">

              {/* Order items */}
              {order.type === "order" && order.items.length > 0 && (
                <div className="bg-slate-50/80 rounded-2xl px-4 py-3 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Items</p>
                  {order.items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, ease: "easeOut" }}
                      className="flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 text-white rounded-lg flex items-center justify-center text-[10px] font-black shadow-sm">
                          {item.quantity}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                      </div>
                      {item.price && (
                        <span className="text-sm font-black text-slate-600 tabular-nums">
                          {(item.price * item.quantity).toLocaleString()} ETB
                        </span>
                      )}
                    </motion.div>
                  ))}
                  {order.items.some(i => i.price) && (() => {
                    const subtotal = order.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
                    const tax = parseFloat((subtotal * 0.15).toFixed(2));
                    const total = parseFloat((subtotal + tax).toFixed(2));
                    return (
                      <div className="border-t border-slate-100 mt-1 pt-2 space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Subtotal</span>
                          <span className="font-mono">{subtotal.toFixed(2)} ETB</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>VAT (15%)</span>
                          <span className="font-mono">{tax.toFixed(2)} ETB</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total to Pay</span>
                          <span className="font-black text-[#24D2A6] text-base font-mono">{total.toFixed(2)} ETB</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Visit date/time detail */}
              {order.type === "visit" && (order.visit_date || order.visit_time) && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 bg-emerald-50 rounded-2xl px-4 py-3"
                >
                  <div className="w-8 h-8 bg-[#24D2A6] rounded-xl flex items-center justify-center">
                    <Clock size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">Scheduled</p>
                    <p className="text-sm font-bold text-slate-700">
                      {order.visit_date}{order.visit_time ? ` at ${order.visit_time}` : ""}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Notes */}
              {order.notes && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className="flex items-start gap-2 bg-slate-50 rounded-2xl px-4 py-3"
                >
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider shrink-0 pt-0.5 mt-0.5">Note:</span>
                  <span className="text-sm text-slate-600 font-medium">{order.notes}</span>
                </motion.div>
              )}

              {/* Rejection reason */}
              {order.status === "rejected" && (order.rejection_reason || order.staff_comment) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-3 bg-rose-50 text-rose-700 rounded-2xl px-4 py-3"
                >
                  <XCircle size={16} className="mt-0.5 shrink-0 text-rose-400" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-400 mb-0.5">Request Rejected</p>
                    {order.rejection_reason && (
                      <p className="text-sm font-medium">{order.rejection_reason}</p>
                    )}
                    {order.staff_comment && (
                      <p className="text-sm font-medium italic opacity-80">{order.staff_comment}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Staff comment (non-rejected) */}
              {order.status !== "rejected" && order.staff_comment && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.06 }}
                  className="flex items-start gap-3 bg-indigo-50 text-indigo-700 rounded-2xl px-4 py-3"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-indigo-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400 mb-0.5">Staff Comment</p>
                    <p className="text-sm font-medium">{order.staff_comment}</p>
                  </div>
                </motion.div>
              )}

              {/* ── PAYMENT FLOW SECTIONS ─────────────────────────── */}

              {/* awaiting_receipt: Show bank details + amount breakdown + upload form */}
              {order.status === "awaiting_receipt" && order.payment_bank_account && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border-2 border-orange-200 bg-orange-50 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-orange-100 flex items-center gap-2">
                    <Banknote size={16} className="text-orange-600" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-orange-600">Action Required — Make Payment</p>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-xs text-orange-800 font-medium">Transfer the exact amount shown below to the bank account, then upload your receipt screenshot.</p>

                    {/* Amount breakdown to pay */}
                    {order.items.length > 0 && order.items.some(i => i.price) && (() => {
                      const subtotal = order.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
                      const tax = parseFloat((subtotal * 0.15).toFixed(2));
                      const total = parseFloat((subtotal + tax).toFixed(2));
                      return (
                        <div className="bg-white rounded-xl border border-orange-200 px-4 py-3 space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-1">Amount to Transfer</p>
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-mono font-semibold">{subtotal.toFixed(2)} ETB</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>VAT (15%)</span>
                            <span className="font-mono font-semibold">{tax.toFixed(2)} ETB</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-orange-100 pt-2">
                            <span className="text-xs font-black text-slate-800">Total to Pay</span>
                            <span className="text-lg font-black text-orange-600 font-mono">{total.toFixed(2)} ETB</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 border border-orange-200">
                      <span className="text-sm font-black text-slate-800 font-mono">{order.payment_bank_account}</span>
                      <button onClick={copyBankAccount} className="ml-2 shrink-0 flex items-center gap-1 text-[10px] font-black text-orange-600 hover:text-orange-700 transition-colors">
                        <Copy size={11} />
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>

                    {/* Receipt upload */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Upload Payment Receipt Screenshot</p>
                      <input
                        ref={receiptInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleReceiptSelect}
                      />
                      {receiptFile ? (
                        <div className="space-y-2">
                          <div className="relative rounded-xl overflow-hidden border-2 border-[#24D2A6]">
                            <img src={receiptFile} alt="Receipt preview" className="w-full h-36 object-cover" />
                            <button
                              onClick={() => setReceiptFile(null)}
                              className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-slate-600 font-black text-xs hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            >✕</button>
                          </div>
                          <button
                            onClick={submitReceipt}
                            disabled={uploadingReceipt}
                            className="w-full py-2.5 bg-[#24D2A6] hover:bg-emerald-500 disabled:opacity-60 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            {uploadingReceipt ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {uploadingReceipt ? "Submitting..." : "Submit Receipt"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => receiptInputRef.current?.click()}
                          className="w-full py-3 border-2 border-dashed border-orange-300 hover:border-orange-400 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                        >
                          <ImageIcon size={14} /> Choose Receipt Image
                        </button>
                      )}
                      {uploadError && <p className="text-[11px] text-rose-500 font-medium">{uploadError}</p>}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* receipt_submitted: Waiting for staff */}
              {order.status === "receipt_submitted" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border-2 border-purple-200 bg-purple-50 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-purple-100 flex items-center gap-2">
                    <ImageIcon size={16} className="text-purple-600" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-purple-600">Receipt Submitted — Awaiting Confirmation</p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-purple-800 font-medium">Your payment receipt has been sent to the pharmacy. They will confirm and approve your delivery shortly.</p>
                    {order.receipt_url && (
                      <div className="rounded-xl overflow-hidden border border-purple-200">
                        <img src={order.receipt_url} alt="Submitted receipt" className="w-full h-28 object-cover" />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Approved (visit only — medicine orders skip straight to awaiting_receipt) */}
              {order.status === "approved" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 bg-emerald-50 text-emerald-700 rounded-2xl px-4 py-3"
                >
                  <CheckCircle2 size={18} className="text-[#24D2A6] shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-500 mb-0.5">Approved</p>
                    <p className="text-sm font-semibold">Your request has been approved by the pharmacy!</p>
                  </div>
                </motion.div>
              )}

              {/* Completed / Delivered */}
              {order.status === "completed" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl overflow-hidden border-2 border-blue-200"
                >
                  <div className="flex items-center gap-3 bg-blue-50 px-4 py-3">
                    <Truck size={18} className="text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-400 mb-0.5">Delivery Approved</p>
                      <p className="text-sm font-semibold text-blue-700">Your payment was confirmed. Medicine is on its way!</p>
                    </div>
                  </div>
                  {order.staff_comment && (
                    <div className="px-4 py-3 bg-white border-t border-blue-100">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Pharmacy Note</p>
                      <p className="text-sm text-slate-700 font-medium">{order.staff_comment}</p>
                    </div>
                  )}
                  <div className="px-4 py-3 bg-white border-t border-blue-100">
                    <button
                      onClick={fetchReceipt}
                      disabled={receiptLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#24D2A6] hover:bg-emerald-500 disabled:opacity-60 text-white font-black text-xs rounded-xl transition-colors"
                    >
                      {receiptLoading
                        ? <Loader2 size={14} className="animate-spin" />
                        : <ImageIcon size={14} />}
                      View & Download Receipt
                    </button>
                  </div>
                </motion.div>
              )}

              {/* payment_rejected: payment was rejected by staff */}
              {order.status === "payment_rejected" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border-2 border-rose-300 bg-rose-50 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-rose-100 flex items-center gap-2">
                    <XCircle size={16} className="text-rose-600" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-rose-700">Payment Rejected by Pharmacy</p>
                  </div>
                  <div className="px-4 py-3 space-y-1">
                    <p className="text-sm font-medium text-rose-800">{order.staff_comment || "Your payment receipt was rejected. Please contact the pharmacy for details."}</p>
                  </div>
                </motion.div>
              )}

              {/* resubmission_required: staff asked for a new receipt screenshot */}
              {order.status === "resubmission_required" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl border-2 border-amber-300 bg-amber-50 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-amber-100 flex items-center gap-2">
                    <Upload size={16} className="text-amber-700" />
                    <p className="text-[11px] font-black uppercase tracking-wider text-amber-700">Action Required — Re-upload Receipt</p>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    <p className="text-xs text-amber-900 font-medium">{order.staff_comment || "Please upload a clearer image of your CBE payment receipt."}</p>

                    {/* Remind customer of the exact amount */}
                    {order.items.length > 0 && order.items.some(i => i.price) && (() => {
                      const subtotal = order.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
                      const tax = parseFloat((subtotal * 0.15).toFixed(2));
                      const total = parseFloat((subtotal + tax).toFixed(2));
                      return (
                        <div className="bg-white rounded-xl border border-amber-200 px-4 py-3 space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 mb-1">Required Amount</p>
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-mono font-semibold">{subtotal.toFixed(2)} ETB</span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-600">
                            <span>VAT (15%)</span>
                            <span className="font-mono font-semibold">{tax.toFixed(2)} ETB</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-amber-100 pt-2">
                            <span className="text-xs font-black text-slate-800">Total to Pay</span>
                            <span className="text-lg font-black text-amber-700 font-mono">{total.toFixed(2)} ETB</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Upload New Payment Receipt Screenshot</p>
                      <input
                        ref={receiptInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleReceiptSelect}
                      />
                      {receiptFile ? (
                        <div className="space-y-2">
                          <div className="relative rounded-xl overflow-hidden border-2 border-amber-400">
                            <img src={receiptFile} alt="Receipt preview" className="w-full h-36 object-cover" />
                            <button
                              onClick={() => setReceiptFile(null)}
                              className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-slate-600 font-black text-xs hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            >✕</button>
                          </div>
                          <button
                            onClick={submitReceipt}
                            disabled={uploadingReceipt}
                            className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                          >
                            {uploadingReceipt ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                            {uploadingReceipt ? "Submitting..." : "Submit New Receipt"}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => receiptInputRef.current?.click()}
                          className="w-full py-3 border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                        >
                          <ImageIcon size={14} /> Choose Receipt Image
                        </button>
                      )}
                      {uploadError && <p className="text-[11px] text-rose-500 font-medium">{uploadError}</p>}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Receipt Download Modal */}
      <AnimatePresence>
        {showReceiptModal && receiptData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setShowReceiptModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Serrated top */}
              <div className="h-2 bg-[linear-gradient(45deg,transparent_33.333%,#f8fafc_33.333%,#f8fafc_66.666%,transparent_66.666%)] bg-size-[8px_16px] bg-[#24D2A6]" />

              <div className="p-6 space-y-4">
                <div className="text-center border-b border-dashed border-slate-200 pb-4">
                  <h3 className="text-base font-black uppercase tracking-wider text-slate-900">
                    {receiptData.pharmacy_id?.name || order.pharmacy_id?.name || "pharmaLocator Pharmacy"}
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Receipt No: <span className="font-mono font-bold text-[#24D2A6]">{receiptData.receipt_no}</span></p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between"><span>Date:</span><span className="font-mono text-slate-900">{new Date(receiptData.date || receiptData.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></div>
                  <div className="flex justify-between"><span>Patient:</span><span className="text-slate-900 font-semibold">{receiptData.customer_name}</span></div>
                  <div className="flex justify-between"><span>Approved By:</span><span className="text-slate-900">{receiptData.approved_by}</span></div>
                </div>

                <div className="bg-slate-50 rounded-2xl px-4 py-3 space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Items</p>
                  {(receiptData.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-slate-700">{item.name} <span className="text-slate-400">x{item.quantity}</span></span>
                      <span className="font-mono font-bold">{(item.price * item.quantity).toFixed(2)} ETB</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 text-xs text-slate-600 border-t border-dashed border-slate-200 pt-3">
                  <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono">{receiptData.subtotal?.toFixed(2)} ETB</span></div>
                  <div className="flex justify-between"><span>VAT (15%):</span><span className="font-mono">{receiptData.tax?.toFixed(2)} ETB</span></div>
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1">
                    <span>Total:</span>
                    <span className="text-[#24D2A6] font-mono">{receiptData.total?.toFixed(2)} ETB</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => downloadReceiptText(receiptData)}
                    className="flex-1 py-2.5 bg-[#24D2A6] hover:bg-emerald-500 text-white font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition-colors"
                  >
                    <ImageIcon size={13} /> Download Receipt
                  </button>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
export default function AccountPage() {
  const { user, authReady, updateProfile, uploadAvatarFile, logout } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"profile" | "history">(
    searchParams.get("tab") === "history" ? "history" : "profile"
  );
  const [orderFilter, setOrderFilter] = useState<"all" | "order" | "visit" | "pending" | "approved" | "rejected" | "completed" | "cancelled">("all");

  const [saveLoading, setSaveLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Order history state — starts with mock, tries to fetch real data
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const refreshOrders = () => {
    setOrdersLoading(true);
    apiFetch("/orders")
      .then((res) => {
        const data = res.data ?? [];
        setOrders(data.length > 0 ? data : MOCK_ORDERS);
      })
      .catch(() => setOrders(MOCK_ORDERS))
      .finally(() => setOrdersLoading(false));
  };

  // Sync activeTab whenever the URL ?tab= param changes (e.g. clicking a notification
  // while already on this page navigates to /account?tab=history)
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "history") setActiveTab("history");
    else if (tabParam === "profile") setActiveTab("profile");
  }, [searchParams]);

  useEffect(() => {
    if (activeTab === "history") {
      setOrdersLoading(true);
      apiFetch("/orders")
        .then((res) => {
          const data = res.data ?? [];
          setOrders(data.length > 0 ? data : MOCK_ORDERS);
        })
        .catch(() => setOrders(MOCK_ORDERS))
        .finally(() => setOrdersLoading(false));
    }
  }, [activeTab]);

  useEffect(() => {
    if (authReady) {
      if (!user) {
        router.push("/login");
      } else {
        setName(user.name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
        setAvatarPreview(user.avatarUrl || null);
      }
    }
  }, [user, authReady, router]);

  if (!authReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-[#24D2A6] border-t-transparent rounded-full"
          />
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
            className="text-sm font-black text-slate-400 uppercase tracking-widest"
          >
            Loading Your Profile...
          </motion.p>
        </div>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError("Profile image must be less than 2MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
    setAvatarLoading(true); setError(null);
    try {
      const url = await uploadAvatarFile(file);
      setAvatarPreview(url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || "Failed to upload image.");
    } finally { setAvatarLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true); setSuccess(false); setError(null);
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), phone: phone.trim().replace(/[\s\-\(\)]/g, "") || undefined });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3500);
    } catch (err: any) {
      setError(err?.message || "Error updating profile.");
    } finally { setSaveLoading(false); }
  };

  const filtered = orders.filter(o => {
    if (orderFilter === "all") return true;
    if (orderFilter === "order" || orderFilter === "visit") return o.type === orderFilter;
    return o.status === orderFilter;
  });

  const stats = [
    { label: "Total",     value: orders.length,                                               color: "from-slate-800 to-slate-900 text-white",                    icon: <Package size={18} /> },
    { label: "Pending",   value: orders.filter(o => o.status === "pending").length,           color: "from-amber-400 to-orange-400 text-white",                   icon: <Clock size={18} /> },
    { label: "Approved",  value: orders.filter(o => ["approved","completed"].includes(o.status)).length, color: "from-[#24D2A6] to-emerald-400 text-white", icon: <CheckCircle2 size={18} /> },
    { label: "Visits",    value: orders.filter(o => o.type === "visit").length,               color: "from-blue-400 to-indigo-500 text-white",                    icon: <Calendar size={18} /> },
  ];

  const FILTERS: { key: typeof orderFilter; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "order",     label: "Orders" },
    { key: "visit",     label: "Visits" },
    { key: "pending",   label: "Pending" },
    { key: "approved",  label: "Approved" },
    { key: "completed", label: "Completed" },
    { key: "rejected",  label: "Rejected" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 pt-28 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Back Link */}
        <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-[#24D2A6] text-sm font-black uppercase tracking-wider mb-8 transition-colors group"
          >
            <motion.span whileHover={{ x: -4 }} transition={{ type: "spring", stiffness: 300 }}>
              <ArrowLeft size={16} />
            </motion.span>
            Back to Home
          </Link>
        </motion.div>

        <div className={`grid grid-cols-1 gap-8 items-start ${activeTab === "profile" ? "lg:grid-cols-3" : ""}`}>

          {/* ── Left Column: Profile Card ─────────────────────────────── */}
          {activeTab === "profile" && (
          <motion.div
            initial={{ opacity: 0, x: -30, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-1 bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Top gradient bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-[#24D2A6] via-emerald-300 to-blue-400" />

            {/* Avatar */}
            <div
              className="relative w-28 h-28 mb-6 mt-4 cursor-pointer group/avatar"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt={name} className="w-full h-full rounded-full object-cover border-4 border-[#24D2A6]/20 group-hover/avatar:border-[#24D2A6] transition-all shadow-xl" />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#24D2A6] to-[#1eb891] text-white flex items-center justify-center font-poppins font-black text-3xl border-4 border-white shadow-lg shadow-[#24D2A6]/20 uppercase">
                  {name ? name[0] : "?"}
                </div>
              )}
              {avatarLoading ? (
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                  <Loader2 className="text-white animate-spin" size={28} />
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300">
                  <Camera className="text-white" size={24} />
                </div>
              )}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg"
              >
                {avatarLoading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={14} />}
              </motion.button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" className="hidden" />
            </div>

            <p className="text-[10px] text-slate-400 font-medium mb-3 -mt-2">
              {avatarLoading ? "Uploading…" : "Click photo to upload · Max 2MB"}
            </p>

            <h2 className="font-poppins font-black text-slate-900 text-xl leading-tight truncate w-full">{name}</h2>
            <p className="text-xs font-bold text-slate-400 mt-1 truncate w-full">{email}</p>
            {phone && <p className="text-xs font-medium text-slate-400 mt-0.5 truncate w-full">{phone}</p>}

            {/* Role Badge */}
            <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full mt-4 border ${
              user.role === "admin"    ? "bg-rose-50 text-rose-500 border-rose-200" :
              user.role === "pharmacy" ? "bg-blue-50 text-blue-500 border-blue-200" :
              "bg-emerald-50 text-emerald-600 border-emerald-200"
            }`}>
              {user.role === "admin" ? "Administrator" : user.role === "pharmacy" ? "Pharmacy Staff" : "Patient Account"}
            </span>

            {/* Sidebar shortcuts */}
            <div className="w-full border-t border-gray-50 mt-8 pt-6 space-y-2.5">

              <motion.div whileHover={{ x: 3 }}>
                <Link href="/favorites" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-[#24D2A6]/5 rounded-2xl transition-all group">
                  <span className="flex items-center gap-3 text-xs font-black text-slate-600 group-hover:text-[#24D2A6]">
                    <Star size={15} className="text-slate-400 group-hover:text-amber-500" />
                    My Favorites
                  </span>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-[#24D2A6]">View</span>
                </Link>
              </motion.div>

              <motion.div whileHover={{ x: 3 }}>
                <Link href="/notifications" className="flex items-center justify-between p-3 bg-slate-50 hover:bg-[#24D2A6]/5 rounded-2xl transition-all group">
                  <span className="flex items-center gap-3 text-xs font-black text-slate-600 group-hover:text-[#24D2A6]">
                    <Bell size={15} className="text-slate-400 group-hover:text-blue-500" />
                    Notifications
                  </span>
                  <span className="text-[10px] font-black text-slate-400 group-hover:text-[#24D2A6]">View</span>
                </Link>
              </motion.div>
            </div>

            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={async () => { await logout(); router.push("/"); }}
              className="w-full mt-6 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 py-3.5 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2 transition-all border border-transparent hover:border-rose-200/50 cursor-pointer"
            >
              <LogOut size={14} /> Log Out
            </motion.button>
          </motion.div>
          )}

          {/* ── Right Column ──────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className={activeTab === "profile" ? "lg:col-span-2 space-y-6" : "col-span-1 space-y-6"}
          >


            {/* Alerts (profile tab only) */}
            <AnimatePresence>
              {activeTab === "profile" && success && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 flex items-center gap-4 text-emerald-800"
                >
                  <CheckCircle2 className="text-[#24D2A6] shrink-0" size={24} />
                  <div>
                    <h4 className="font-bold text-sm leading-tight">Saved to Database!</h4>
                    <p className="text-xs text-emerald-600 mt-0.5">Your profile has been updated.</p>
                  </div>
                </motion.div>
              )}
              {activeTab === "profile" && error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="bg-rose-50 border border-rose-200 rounded-3xl p-5 flex items-center gap-4 text-rose-800"
                >
                  <AlertCircle className="text-rose-500 shrink-0" size={24} />
                  <div>
                    <h4 className="font-bold text-sm leading-tight">Update Failed</h4>
                    <p className="text-xs text-rose-600 mt-0.5">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Tab Content ─────────────────────────────────────────── */}
            <AnimatePresence mode="wait">

              {/* Profile Form */}
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-1">Edit Personal Details</h3>
                    <p className="text-xs text-slate-400 font-medium mb-6">All changes are saved directly to the database.</p>
                    <form onSubmit={handleSave} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                          <div className="relative flex items-center">
                            <UserIcon size={18} className="absolute left-4 text-slate-400" />
                            <input type="text" required value={name} onChange={e => setName(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-[#24D2A6]/50 focus:ring-4 focus:ring-[#24D2A6]/5 text-sm font-bold text-slate-800 transition-all" placeholder="John Doe" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                          <div className="relative flex items-center">
                            <Phone size={18} className="absolute left-4 text-slate-400" />
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 outline-none focus:border-[#24D2A6]/50 focus:ring-4 focus:ring-[#24D2A6]/5 text-sm font-bold text-slate-800 transition-all" placeholder="+251 9X XXX XXXX" />
                          </div>
                          <p className="text-[10px] text-slate-400 ml-1">Format: +CountryCode followed by number</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                        <div className="relative flex items-center">
                          <Mail size={18} className="absolute left-4 text-slate-400" />
                          <input type="email" required disabled readOnly value={email}
                            className="w-full bg-slate-100/60 border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 outline-none text-sm font-bold text-slate-400 cursor-not-allowed" />
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-3">
                        <Shield size={20} className="text-[#24D2A6] shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-black text-xs text-slate-800 uppercase tracking-wider">Backend Integration Active</h4>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-1">Your profile data is stored in MongoDB and synced in real-time.</p>
                        </div>
                      </div>
                      <div className="flex justify-end pt-4 border-t border-gray-50">
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.96 }}
                          type="submit"
                          disabled={saveLoading || avatarLoading}
                          className="bg-[#24D2A6] hover:bg-[#1eb08b] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-[#24D2A6]/20 transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {saveLoading ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
                        </motion.button>
                      </div>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* Orders & Visits */}
              {activeTab === "history" && (
                <motion.div
                  key="history"
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#24D2A6]/10 flex items-center justify-center text-[#24D2A6]">
                          <ShoppingBag size={20} />
                        </div>
                        My Orders &amp; Booking
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-1 ml-[52px]">Track all your medicine orders and pharmacy visit bookings.</p>
                    </div>
                    <Link
                      href="/account"
                      className="inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-[#24D2A6] transition-colors group"
                    >
                      <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                      Back to Profile
                    </Link>
                  </div>

                  {/* Stats grid */}
                  <motion.div
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                  >
                    {stats.map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        custom={i}
                        variants={statVariants}
                        whileHover={{ y: -4, scale: 1.03 }}
                        className={`rounded-2xl p-4 flex items-center gap-3 bg-gradient-to-br ${stat.color} shadow-sm cursor-default`}
                      >
                        <span className="opacity-80">{stat.icon}</span>
                        <div>
                          <p className="text-2xl font-black leading-none">
                            <AnimatedNumber value={stat.value} />
                          </p>
                          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mt-0.5">{stat.label}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Main card */}
                  <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                          Requests &amp; Visit History
                          <motion.span
                            animate={{ rotate: [0, 15, -15, 0] }}
                            transition={{ repeat: Infinity, repeatDelay: 4, duration: 0.6 }}
                          >
                            <Sparkles size={16} className="text-[#24D2A6]" />
                          </motion.span>
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">Track all your medicine orders and pharmacy visit requests.</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 bg-[#24D2A6]/10 text-[#24D2A6] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full">
                        <TrendingUp size={12} />
                        {orders.length} Total
                      </span>
                    </div>

                    {/* Filter chips */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {FILTERS.map((f) => (
                        <motion.button
                          key={f.key}
                          onClick={() => setOrderFilter(f.key)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.93 }}
                          className={`relative px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer overflow-hidden ${
                            orderFilter === f.key
                              ? "bg-slate-900 text-white border-slate-900"
                              : "bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-300"
                          }`}
                        >
                          {orderFilter === f.key && (
                            <motion.span
                              layoutId="filterBg"
                              className="absolute inset-0 bg-slate-900 rounded-full"
                              transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className="relative z-10">{f.label}</span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Content */}
                    {ordersLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-14 h-14 border-4 border-[#24D2A6] border-t-transparent rounded-full"
                        />
                        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6 }}
                          className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          Loading your requests…
                        </motion.p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12"
                      >
                        <Package size={40} className="mx-auto text-slate-200 mb-3" />
                        <p className="font-bold text-slate-400">No results for this filter.</p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setOrderFilter("all")}
                          className="text-xs text-[#24D2A6] font-black mt-2 cursor-pointer hover:underline"
                        >
                          Clear filter
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.div
                        className="space-y-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                      >
                        <AnimatePresence>
                          {filtered.map((order, idx) => (
                            <OrderCard key={order._id} order={order} index={idx} onRefresh={refreshOrders} />
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
