import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, ShoppingBag, TrendingUp, Search,
  Receipt, User, ShieldCheck, Printer, Download,
  FileText, Package
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("medpay_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeader() },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Request failed");
  return json;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface ReceiptRecord {
  _id: string;
  receipt_no: string;
  order_id: string;
  pharmacy_id: { _id: string; name: string } | string;
  customer_name: string;
  date: string;
  created_at: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  total: number;
  approved_by: string;
}

interface SalesProps {
  pharmacyId: string | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  pharmacyName?: string;
}

// Determine period bucket from a date string
function getPeriod(dateStr: string): "Daily" | "Weekly" | "Monthly" {
  const diffDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return "Daily";
  if (diffDays <= 7) return "Weekly";
  return "Monthly";
}

// Download receipt as a formatted .txt file
function downloadReceiptTxt(receipt: ReceiptRecord, pharmName: string) {
  const name = pharmName || (typeof receipt.pharmacy_id === "object" ? receipt.pharmacy_id.name : "pharmaLocator Pharmacy");
  const dateStr = new Date(receipt.date || receipt.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const itemLines = (receipt.items || []).map(
    (i) => `  ${i.name.padEnd(30)} x${i.quantity}   ${(i.price * i.quantity).toFixed(2)} ETB`
  );

  const lines = [
    "============================================================",
    `              ${name.toUpperCase()}`,
    "============================================================",
    `Receipt No   : ${receipt.receipt_no}`,
    `Date         : ${dateStr}`,
    `Patient      : ${receipt.customer_name}`,
    `Approved By  : ${receipt.approved_by}`,
    "------------------------------------------------------------",
    "ITEMS:",
    ...itemLines,
    "------------------------------------------------------------",
    `Subtotal     : ${receipt.subtotal.toFixed(2)} ETB`,
    `VAT (15%)    : ${receipt.tax.toFixed(2)} ETB`,
    `TOTAL PAID   : ${receipt.total.toFixed(2)} ETB`,
    "------------------------------------------------------------",
    `       Thank you for choosing ${name}!`,
    "============================================================",
  ].join("\n");

  const blob = new Blob([lines], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${receipt.receipt_no}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SalesPage({ pharmacyId, showToast, pharmacyName }: SalesProps) {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<"Daily" | "Weekly" | "Monthly">("Daily");
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchReceipts = useCallback(() => {
    setLoading(true);
    apiFetch("/receipts?limit=200")
      .then((res) => {
        const data: ReceiptRecord[] = res.data ?? [];
        setReceipts(data);
        if (data.length > 0) setSelectedReceipt(data[0]);
      })
      .catch(() => showToast("Could not load receipts", "error"))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  // Filter by period + search
  const filtered = receipts.filter((r) => {
    const period = getPeriod(r.created_at || r.date);
    const matchPeriod = period === activePeriod;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      r.receipt_no.toLowerCase().includes(q) ||
      r.customer_name.toLowerCase().includes(q) ||
      (r.items || []).some((i) => i.name.toLowerCase().includes(q));
    return matchPeriod && matchSearch;
  });

  const totalRevenue = receipts.reduce((sum, r) => sum + r.total, 0);
  const periodRevenue = receipts
    .filter((r) => getPeriod(r.created_at || r.date) === activePeriod)
    .reduce((sum, r) => sum + r.total, 0);

  const displayPharmacyName =
    pharmacyName ||
    (selectedReceipt && typeof selectedReceipt.pharmacy_id === "object"
      ? selectedReceipt.pharmacy_id.name
      : "") ||
    "pharmaLocator Pharmacy";

  return (
    <div className="bg-[#F1F3F6] text-[#1E293B] p-6 md:p-10 font-sans relative rounded-3xl overflow-hidden shadow-xs">

      {/* Background dot mesh */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* ── HEADER ──────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-[#0F766E]" /> Sales & Receipts Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All completed order payments — exact amounts charged and confirmed.
          </p>
        </div>
        <button
          onClick={fetchReceipts}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0F766E] text-white font-semibold text-sm rounded-xl shadow-sm hover:bg-[#0d665f] transition-all"
        >
          <Receipt className="h-4 w-4" /> Refresh
        </button>
      </header>

      {/* ── REVENUE OVERVIEW CARDS ────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6 relative z-10">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Revenue (all time)</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalRevenue.toFixed(2)} ETB</h3>
          </div>
          <div className="p-3 bg-teal-50 rounded-xl text-[#0F766E]"><TrendingUp className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {activePeriod} Revenue
            </span>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">{periodRevenue.toFixed(2)} ETB</h3>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><ShoppingBag className="h-5 w-5" /></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by receipt no, patient, or medicine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0F766E] focus:bg-white text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN GRID ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">

        {/* COL 1: Period selector */}
        <div className="lg:col-span-2 space-y-2">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2 mb-3">Period</span>
          <div className="flex flex-row lg:flex-col overflow-x-auto gap-1 pb-2 lg:pb-0">
            {(["Daily", "Weekly", "Monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`w-full text-left whitespace-nowrap px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  activePeriod === p
                    ? "bg-white text-[#0F766E] border-l-4 border-[#0F766E] shadow-sm font-extrabold"
                    : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* COL 2: Receipts table */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm font-medium">Loading receipts…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wide">
                    <th className="p-4 pl-6">Receipt No</th>
                    <th className="p-4">Patient</th>
                    <th className="p-4">Total Paid</th>
                    <th className="p-4 pr-6 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-10 text-center text-slate-400 font-medium">
                        No completed payment receipts for this period.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr
                        key={r._id}
                        onClick={() => setSelectedReceipt(r)}
                        className={`cursor-pointer transition-colors ${
                          selectedReceipt?._id === r._id
                            ? "bg-teal-50/60 font-medium"
                            : "hover:bg-slate-50/40"
                        }`}
                      >
                        <td className="p-4 pl-6">
                          <div className="font-mono font-bold text-[#0F766E] text-xs">{r.receipt_no}</div>
                        </td>
                        <td className="p-4">
                          <p className="text-xs text-slate-900 font-semibold">{r.customer_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {r.items.length} item{r.items.length !== 1 ? "s" : ""}
                          </p>
                        </td>
                        <td className="p-4 font-mono font-black text-slate-900 text-sm">
                          {r.total.toFixed(2)} <span className="text-[10px] font-bold text-slate-400">ETB</span>
                        </td>
                        <td className="p-4 pr-6 text-right text-[10px] text-slate-400 font-medium">
                          {new Date(r.date || r.created_at).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* COL 3: Receipt detail panel */}
        <div className="lg:col-span-4 space-y-4">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2">
            Receipt Detail
          </span>

          <AnimatePresence mode="wait">
            {selectedReceipt ? (
              <motion.div
                key={selectedReceipt._id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
              >
                {/* Serrated receipt top */}
                <div className="h-2 bg-[linear-gradient(45deg,transparent_33.333%,#f8fafc_33.333%,#f8fafc_66.666%,transparent_66.666%)] bg-[length:8px_16px] bg-[#0F766E]" />

                <div className="p-5 space-y-4">

                  {/* Pharmacy header */}
                  <div className="text-center border-b border-dashed border-slate-200 pb-4">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center justify-center gap-1.5">
                      <Receipt className="h-4 w-4 text-[#0F766E]" />
                      {typeof selectedReceipt.pharmacy_id === "object"
                        ? selectedReceipt.pharmacy_id.name
                        : displayPharmacyName}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono font-bold text-[#0F766E]">
                      {selectedReceipt.receipt_no}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date</span>
                      <span className="font-mono text-slate-800">
                        {new Date(selectedReceipt.date || selectedReceipt.created_at).toLocaleDateString("en-US", {
                          year: "numeric", month: "long", day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Patient</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-300" /> {selectedReceipt.customer_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Approved By</span>
                      <span className="text-slate-800">{selectedReceipt.approved_by}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                      <Package className="h-3 w-3" /> Items Purchased
                    </p>
                    {(selectedReceipt.items || []).map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-slate-700">
                          {item.name}{" "}
                          <span className="text-slate-400 font-medium">×{item.quantity}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-800">
                          {(item.price * item.quantity).toFixed(2)} ETB
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Totals — exact amounts from the confirmed payment */}
                  <div className="space-y-2 text-xs text-slate-600 border-t border-dashed border-slate-200 pt-3">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedReceipt.subtotal.toFixed(2)} ETB
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (15%)</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedReceipt.tax.toFixed(2)} ETB
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2 text-sm font-black text-slate-900">
                      <span>Total Paid</span>
                      <span className="text-[#0F766E] font-mono text-base">
                        {selectedReceipt.total.toFixed(2)} ETB
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => downloadReceiptTxt(selectedReceipt, displayPharmacyName)}
                      className="flex-1 py-2.5 bg-[#0F766E] hover:bg-[#0d665f] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 rounded-lg py-1.5 border border-emerald-100">
                    <ShieldCheck className="h-3.5 w-3.5" /> Payment Verified & Confirmed
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                <FileText className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-medium text-slate-400">
                  Select a receipt to view the full payment breakdown.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}