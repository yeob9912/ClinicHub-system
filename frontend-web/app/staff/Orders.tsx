import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShoppingCart, Clock, CheckCircle2, XCircle, FileText, 
  ChevronRight, MessageSquare, CornerDownRight, History, 
  Stethoscope, Calendar, Video, MapPin, Send, Banknote,
  ImageIcon, Truck, Eye, Receipt, RefreshCw, AlertTriangle,
  ExternalLink, Download
} from "lucide-react";
import { apiFetch, normaliseOrder } from "./utils";

interface OrdersProps {
  pharmacyId: string | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  highlightOrderId?: string | null;
  onClearHighlight?: () => void;
}

type TabType = "New" | "Pending" | "Approved" | "Receipt" | "Rejected" | "Receipts";

export default function OrdersPage({ pharmacyId, showToast, highlightOrderId, onClearHighlight }: OrdersProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("New");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Action state
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"Approved" | "Rejected" | null>(null);
  const [inlineComment, setInlineComment] = useState("");
  const [visitDateInput, setVisitDateInput] = useState("");
  const [visitTimeInput, setVisitTimeInput] = useState("");
  const [bankAccountInput, setBankAccountInput] = useState("");

  // Delivery confirmation state
  const [confirmingDeliveryId, setConfirmingDeliveryId] = useState<string | null>(null);
  const [deliveryComment, setDeliveryComment] = useState("");
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  // Payment rejection / resubmission state
  const [paymentActionId, setPaymentActionId] = useState<string | null>(null);
  const [paymentActionType, setPaymentActionType] = useState<"reject_payment" | "request_resubmission" | null>(null);
  const [paymentActionComment, setPaymentActionComment] = useState("");

  // Receipts library state
  const [receipts, setReceipts] = useState<any[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [receiptHighlightOrderId, setReceiptHighlightOrderId] = useState<string | null>(null);
  const [receiptsCount, setReceiptsCount] = useState(0);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    apiFetch("/orders")
      .then((res) => {
        const items = res.data ?? [];
        const normalized = items.map((item: any) => {
          const norm = normaliseOrder(item);
          let displayStatus: "New" | "Pending" | "Approved" | "Receipt" | "Rejected" = "New";
          if (item.status === "pending") {
            displayStatus = item.type === "visit" ? "Pending" : "New";
          } else if (item.status === "approved" || item.status === "awaiting_receipt") {
            displayStatus = "Approved";
          } else if (item.status === "receipt_submitted") {
            displayStatus = "Receipt";
          } else if (item.status === "rejected") {
            displayStatus = "Rejected";
          } else if (item.status === "completed" || item.status === "cancelled") {
            displayStatus = "Approved";
          } else if (item.status === "payment_rejected" || item.status === "resubmission_required") {
            displayStatus = "Receipt"; // show in Receipt tab so staff can still act
          }

          return {
            _id: item._id,
            id: norm.id,
            patient: norm.patient,
            type: item.type === "visit" ? "Doctor Consultation" : "Prescription Scan",
            items: norm.items,
            status: displayStatus,
            rawStatus: item.status,
            date: norm.date,
            comment: norm.comment || item.rejection_reason || "",
            payment_bank_account: item.payment_bank_account || "",
            receipt_url: item.receipt_url || null,
            isAppointment: item.type === "visit",
            appointmentMeta: item.type === "visit" ? {
              preferredMode: item.notes?.includes("Telehealth") ? "Telehealth" : "In-Person",
              timeline: item.visit_date ? `${item.visit_date} ${item.visit_time || ""}` : "Morning Slot Preferred",
            } : null,
          };
        });
        setOrders(normalized);
        if (normalized.length > 0) {
          setSelectedOrder((prev: any) => {
            const found = normalized.find((o: any) => o.id === prev?.id);
            return found || normalized[0];
          });
        } else {
          setSelectedOrder(null);
        }
      })
      .catch((err) => {
        showToast("Failed to load orders: " + err.message, "error");
      })
      .finally(() => setLoading(false));
  }, []);

  const fetchReceipts = useCallback(() => {
    setReceiptsLoading(true);
    apiFetch("/receipts")
      .then((res) => {
        const data = res.data ?? [];
        setReceipts(data);
        setReceiptsCount(data.length);
        if (data.length > 0 && !selectedReceipt) {
          setSelectedReceipt(data[0]);
        }
      })
      .catch(() => setReceipts([]))
      .finally(() => setReceiptsLoading(false));
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Eagerly fetch receipt count on mount so the badge shows the real number immediately
  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  useEffect(() => {
    if (activeTab === "Receipts") fetchReceipts();
  }, [activeTab, fetchReceipts]);

  useEffect(() => {
    if (highlightOrderId && orders.length > 0) {
      const found = orders.find(o => o._id === highlightOrderId || o.id === highlightOrderId);
      if (found) {
        setActiveTab(found.status as TabType);
        setSelectedOrder(found);
        if (onClearHighlight) onClearHighlight();
      }
    }
  }, [highlightOrderId, orders, onClearHighlight]);

  // When a receipt highlight is requested, switch to Receipts tab and select it
  useEffect(() => {
    if (receiptHighlightOrderId && receipts.length > 0) {
      const found = receipts.find(r => r.order_id === receiptHighlightOrderId || r.order_id?.toString() === receiptHighlightOrderId);
      if (found) {
        setSelectedReceipt(found);
        setReceiptHighlightOrderId(null);
      }
    }
  }, [receiptHighlightOrderId, receipts]);

  const presets = {
    Order: {
      Approved: ["Thank you for choosing us!", "Ready after payment confirmation.", "Prescription validated successfully."],
      Rejected: ["Medicine is out of stock.", "Prescription signature missing or invalid.", "Insurance pre-authorization denied."]
    },
    Appointment: {
      Approved: ["Schedule confirmed for tomorrow morning at 09:30 AM.", "Next open morning slot allocated.", "Doctor confirmed for In-Pharmacy Consultation at Counter 4."],
      Rejected: ["Requested practitioner unavailable.", "Please resubmit with alternative day preferences.", "In-pharmacy slot limit reached. Please opt for Telehealth."]
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case "New":     return "bg-blue-50 text-blue-600 border-blue-100";
      case "Pending": return "bg-amber-50 text-amber-600 border-amber-100";
      case "Approved":return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "Receipt": return "bg-purple-50 text-purple-600 border-purple-100";
      case "Rejected":return "bg-rose-50 text-rose-600 border-rose-100";
      default:        return "bg-slate-50 text-slate-600";
    }
  };

  const getRawStatusLabel = (rawStatus: string) => {
    switch (rawStatus) {
      case "pending":               return "Pending";
      case "approved":              return "Approved";
      case "awaiting_receipt":      return "Waiting for Payment";
      case "receipt_submitted":     return "Payment Submitted";
      case "completed":             return "Delivered";
      case "rejected":              return "Rejected";
      case "cancelled":             return "Cancelled";
      case "payment_rejected":      return "Payment Rejected";
      case "resubmission_required": return "Re-upload Required";
      default:                      return rawStatus;
    }
  };

  const initiateStatusChange = (id: string, targetStatus: "Approved" | "Rejected") => {
    setActioningId(id);
    setActionType(targetStatus);
    setInlineComment("");
    setBankAccountInput("");
  };

  const submitStatusUpdate = (id: string) => {
    if (!actionType) return;
    const matchedOrder = orders.find(o => o.id === id);
    if (!matchedOrder || !matchedOrder._id) return;

    const action = actionType === "Approved" ? "approve" : "reject";

    if (action === "approve" && !matchedOrder.isAppointment && !bankAccountInput.trim()) {
      showToast("Please enter bank account details before approving.", "error");
      return;
    }

    apiFetch(`/orders/${matchedOrder._id}/respond`, {
      method: "PATCH",
      body: JSON.stringify({
        action,
        rejection_reason: action === "reject" ? inlineComment : undefined,
        staff_comment: inlineComment || undefined,
        payment_bank_account: action === "approve" && !matchedOrder.isAppointment ? bankAccountInput.trim() : undefined,
        visit_date: action === "approve" && matchedOrder.isAppointment ? (visitDateInput || "Tomorrow") : undefined,
        visit_time: action === "approve" && matchedOrder.isAppointment ? (visitTimeInput || "10:30 AM") : undefined,
      }),
    })
      .then(() => {
        showToast(
          action === "approve"
            ? matchedOrder.isAppointment
              ? "Visit approved and scheduled!"
              : "Order approved — bank details sent to patient!"
            : "Order rejected.",
          "success"
        );
        setActioningId(null);
        setActionType(null);
        setInlineComment("");
        setBankAccountInput("");
        setVisitDateInput("");
        setVisitTimeInput("");
        fetchOrders();
      })
      .catch((err) => showToast("Submission failed: " + err.message, "error"));
  };

  const submitConfirmDelivery = (id: string) => {
    const matchedOrder = orders.find(o => o.id === id);
    if (!matchedOrder || !matchedOrder._id) return;

    apiFetch(`/orders/${matchedOrder._id}/respond`, {
      method: "PATCH",
      body: JSON.stringify({
        action: "confirm_delivery",
        staff_comment: deliveryComment || undefined,
      }),
    })
      .then(() => {
        showToast("Delivery confirmed! Receipt generated and patient notified.", "success");
        setConfirmingDeliveryId(null);
        setDeliveryComment("");
        fetchOrders();
      })
      .catch((err) => showToast("Confirmation failed: " + err.message, "error"));
  };

  const submitPaymentAction = (id: string) => {
    const matchedOrder = orders.find(o => o.id === id);
    if (!matchedOrder || !matchedOrder._id || !paymentActionType) return;

    apiFetch(`/orders/${matchedOrder._id}/respond`, {
      method: "PATCH",
      body: JSON.stringify({
        action: paymentActionType,
        staff_comment: paymentActionComment || undefined,
      }),
    })
      .then(() => {
        showToast(
          paymentActionType === "reject_payment"
            ? "Payment rejected. Patient notified."
            : "Resubmission requested. Patient notified.",
          "success"
        );
        setPaymentActionId(null);
        setPaymentActionType(null);
        setPaymentActionComment("");
        fetchOrders();
      })
      .catch((err) => showToast("Action failed: " + err.message, "error"));
  };

  // Download receipt as a text file
  const downloadReceiptText = (receipt: any) => {
    const lines = [
      "============================================================",
      "                      ABC PHARMACY",
      "============================================================",
      `Receipt No   : ${receipt.receipt_no}`,
      `Date         : ${new Date(receipt.date || receipt.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      `Patient      : ${receipt.customer_name}`,
      "------------------------------------------------------------",
      "ITEMS:",
      ...(receipt.items || []).map((item: any) =>
        `  ${item.name} x${item.quantity}    ${(item.price * item.quantity).toFixed(2)} ETB`
      ),
      "------------------------------------------------------------",
      `Subtotal     : ${receipt.subtotal?.toFixed(2)} ETB`,
      `VAT (15%)    : ${receipt.tax?.toFixed(2)} ETB`,
      `TOTAL        : ${receipt.total?.toFixed(2)} ETB`,
      "------------------------------------------------------------",
      `Approved By  : ${receipt.approved_by}`,
      "============================================================",
      "       Thank you for choosing ABC Pharmacy!",
      "============================================================",
    ].join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${receipt.receipt_no}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredOrders = orders.filter(order => order.status === activeTab);
  const ORDER_TABS: TabType[] = ["New", "Pending", "Approved", "Receipt", "Rejected"];
  const ALL_TABS: TabType[] = ["New", "Pending", "Approved", "Receipt", "Rejected", "Receipts"];

  return (
    <div className="bg-[#F1F3F6] text-[#1E293B] p-6 md:p-10 font-sans relative rounded-3xl overflow-hidden shadow-xs">
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:24px_24px]" />

      <header className="mb-8 relative z-10">
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-[#0F766E]" /> Operational Hub
        </h1>
        <p className="text-sm text-slate-500 mt-1">Review order queues, process payment receipts, and confirm medicine deliveries.</p>
      </header>

      {/* Receipt lightbox overlay */}
      <AnimatePresence>
        {viewingReceiptUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6"
            onClick={() => setViewingReceiptUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-2xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <p className="text-white text-xs font-bold uppercase tracking-widest mb-3 text-center">Payment Receipt Screenshot</p>
              <img
                src={viewingReceiptUrl}
                alt="Payment receipt"
                className="w-full rounded-2xl object-contain max-h-[80vh] shadow-2xl"
              />
              <button
                onClick={() => setViewingReceiptUrl(null)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-slate-700 font-black shadow-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"
              >✕</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABS */}
      <div className="flex bg-white p-1.5 rounded-xl border border-slate-200/60 shadow-sm gap-1 mb-6 relative z-10 flex-wrap">
        {ALL_TABS.map((tab) => {
          // For the Receipts archive tab use the eagerly-fetched count so it
          // shows the real number even before the user clicks the tab.
          const count = tab === "Receipts"
            ? receiptsCount
            : orders.filter(o => o.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setActioningId(null); }}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all text-center relative ${
                activeTab === tab
                  ? tab === "Receipt"
                    ? "bg-purple-600 text-white shadow"
                    : tab === "Receipts"
                    ? "bg-teal-600 text-white shadow"
                    : "bg-[#0F766E] text-white shadow"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {tab === "Receipt" && count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{count}</span>
              )}
              {tab === "Receipts" ? <Receipt className="inline w-3 h-3 mr-1" /> : null}
              {tab} ({count})
            </button>
          );
        })}
      </div>

      {/* ── RECEIPTS LIBRARY TAB ── */}
      {activeTab === "Receipts" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">
          {/* Receipt list */}
          <div className="lg:col-span-7 space-y-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2">Generated Receipt Archive</span>
            {receiptsLoading ? (
              <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center text-slate-400 animate-pulse">Loading receipts...</div>
            ) : receipts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center text-slate-400">
                No receipts generated yet. Receipts appear automatically when you confirm a payment.
              </div>
            ) : (
              receipts.map((receipt: any) => (
                <motion.div
                  key={receipt._id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedReceipt?._id === receipt._id ? "border-teal-500 shadow-sm" : "border-slate-200/60 hover:border-slate-300"
                  }`}
                  onClick={() => setSelectedReceipt(receipt)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-mono font-bold text-teal-600">{receipt.receipt_no}</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{receipt.customer_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(receipt.items || []).map((i: any) => `${i.name} x${i.quantity}`).join(", ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">{receipt.total?.toFixed(2)} ETB</span>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(receipt.date || receipt.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Switch to Approved tab and find the related order
                        setActiveTab("Approved");
                        const relatedOrder = orders.find(o => o._id === receipt.order_id?.toString() || o._id === receipt.order_id);
                        if (relatedOrder) setSelectedOrder(relatedOrder);
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> View Order
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); downloadReceiptText(receipt); }}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3 h-3" /> Download
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Receipt detail / POS panel */}
          <div className="lg:col-span-5 space-y-4">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2">Receipt Preview</span>
            <AnimatePresence mode="wait">
              {selectedReceipt ? (
                <motion.div
                  key={selectedReceipt._id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative overflow-hidden"
                >
                  {/* Receipt serrated top */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-[linear-gradient(45deg,transparent_33.333%,#f1f3f6_33.333%,#f1f3f6_66.666%,transparent_66.666%)] bg-size-[6px_12px]" />

                  <div className="text-center border-b border-dashed border-slate-200 pb-4 mt-2">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-900">ABC Pharmacy</h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Receipt No: <span className="font-mono font-bold text-teal-600">{selectedReceipt.receipt_no}</span>
                    </p>
                  </div>

                  <div className="py-4 space-y-2.5 border-b border-dashed border-slate-200 text-xs text-slate-600 font-medium">
                    <div className="flex justify-between"><span>Date:</span><span className="text-slate-900 font-mono">{new Date(selectedReceipt.date || selectedReceipt.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span></div>
                    <div className="flex justify-between"><span>Patient:</span><span className="text-slate-900">{selectedReceipt.customer_name}</span></div>
                    <div className="flex justify-between"><span>Approved By:</span><span className="text-slate-900">{selectedReceipt.approved_by}</span></div>
                  </div>

                  <div className="py-4 space-y-2">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Items</span>
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-1.5">
                      {(selectedReceipt.items || []).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-slate-700 font-medium">{item.name} <span className="text-slate-400">x{item.quantity}</span></span>
                          <span className="font-mono text-slate-900">{(item.price * item.quantity).toFixed(2)} ETB</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 space-y-1.5 text-xs font-medium text-slate-600">
                    <div className="flex justify-between"><span>Subtotal:</span><span className="font-mono text-slate-900">{selectedReceipt.subtotal?.toFixed(2)} ETB</span></div>
                    <div className="flex justify-between"><span>VAT (15%):</span><span className="font-mono text-slate-900">{selectedReceipt.tax?.toFixed(2)} ETB</span></div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-black text-slate-900">
                      <span>Total:</span>
                      <span className="text-teal-600 font-mono">{selectedReceipt.total?.toFixed(2)} ETB</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-dashed border-slate-200 flex gap-2">
                    <button
                      onClick={() => downloadReceiptText(selectedReceipt)}
                      className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Receipt
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-medium text-slate-400">
                  Select a receipt to preview.
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── ORDER TABS CONTENT ── */}
      {activeTab !== "Receipts" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">
          {/* ORDER LIST */}
          <div className="lg:col-span-7 space-y-3">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2">Incoming Order & Consultation Matrix</span>

            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center text-slate-400 font-medium animate-pulse">Loading order manifests...</div>
              ) : filteredOrders.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center text-slate-400 font-medium">
                  No tickets match the "{activeTab}" filter.
                </motion.div>
              ) : (
                filteredOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    layoutId={order.id}
                    className={`bg-white rounded-xl border transition-all p-4 relative overflow-hidden ${
                      selectedOrder?.id === order.id ? "border-[#0F766E] shadow-sm" : "border-slate-200/60 shadow-xs hover:border-slate-300"
                    } ${order.status === "Receipt" ? "border-l-4 border-l-purple-400" : ""}`}
                  >
                    {order.isAppointment && (
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 to-purple-500" />
                    )}

                    <div className="flex justify-between items-start gap-4 cursor-pointer" onClick={() => setSelectedOrder(order)}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-[#0F766E]">{order.id}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getStatusStyles(order.status)}`}>
                            {order.status === "Receipt" ? getRawStatusLabel(order.rawStatus) : order.status}
                          </span>
                          {order.isAppointment && (
                            <span className="text-[9px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded border border-indigo-100 uppercase tracking-wide flex items-center gap-1">
                              <Stethoscope className="w-2.5 h-2.5" /> Doctor Request
                            </span>
                          )}
                          {order.rawStatus === "payment_rejected" && (
                            <span className="text-[9px] bg-rose-50 text-rose-700 font-extrabold px-1.5 py-0.5 rounded border border-rose-100 uppercase tracking-wide flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Payment Rejected
                            </span>
                          )}
                          {order.rawStatus === "resubmission_required" && (
                            <span className="text-[9px] bg-amber-50 text-amber-700 font-extrabold px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-wide flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5" /> Resubmission Requested
                            </span>
                          )}
                          {order.status === "Receipt" && order.rawStatus === "receipt_submitted" && (
                            <span className="text-[9px] bg-purple-50 text-purple-700 font-extrabold px-1.5 py-0.5 rounded border border-purple-100 uppercase tracking-wide flex items-center gap-1">
                              <ImageIcon className="w-2.5 h-2.5" /> Receipt Submitted
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 pt-0.5">{order.patient}</h3>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{order.items}</p>

                        {order.isAppointment && order.appointmentMeta && (
                          <div className="flex items-center gap-3 pt-1.5 text-[11px] text-slate-500 font-semibold">
                            <span className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border">
                              {order.appointmentMeta.preferredMode === "In-Person" ? <MapPin className="w-3 h-3 text-emerald-600" /> : <Video className="w-3 h-3 text-indigo-600" />}
                              Mode: {order.appointmentMeta.preferredMode}
                            </span>
                            <span className="text-slate-400 font-normal">| Window: {order.appointmentMeta.timeline}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex flex-col items-end justify-between min-h-[65px] shrink-0">
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> {order.date}</span>
                        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${selectedOrder?.id === order.id ? "rotate-90 text-[#0F766E]" : ""}`} />
                      </div>
                    </div>

                    {/* ── ACTION BUTTONS ── */}
                    {(order.status === "New" || order.status === "Pending") && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-3">
                        {actioningId !== order.id ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => initiateStatusChange(order.id, "Approved")}
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {order.isAppointment ? "Arrange & Approve" : "Approve"}
                            </button>
                            <button onClick={() => initiateStatusChange(order.id, "Rejected")}
                              className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-lg border border-rose-100 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                                <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
                                {order.isAppointment ? "Schedule & Respond" : actionType === "Approved" ? "Approve & Send Payment Details" : "Reject Order"} ({actionType})
                              </span>
                              <button onClick={() => setActioningId(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Cancel</button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {(order.isAppointment ? presets.Appointment[actionType!] : presets.Order[actionType!]).map((preset, idx) => (
                                <button key={idx} type="button" onClick={() => setInlineComment(preset)}
                                  className="text-[10px] font-medium bg-white text-slate-600 border border-slate-200 hover:border-slate-400 px-2 py-1 rounded transition-colors text-left">
                                  "{preset}"
                                </button>
                              ))}
                            </div>

                            {order.isAppointment && actionType === "Approved" && (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Scheduled Date *</label>
                                  <input type="date" value={visitDateInput} onChange={e => setVisitDateInput(e.target.value)}
                                    className="w-full bg-white border border-slate-200 focus:border-[#0F766E] focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium" />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Scheduled Time *</label>
                                  <input type="time" value={visitTimeInput} onChange={e => setVisitTimeInput(e.target.value)}
                                    className="w-full bg-white border border-slate-200 focus:border-[#0F766E] focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium" />
                                </div>
                              </div>
                            )}

                            {!order.isAppointment && actionType === "Approved" && (
                              <div>
                                <label className="block text-[9px] font-bold text-amber-600 uppercase mb-0.5 flex items-center gap-1">
                                  <Banknote className="w-3 h-3" /> Bank Account Details *
                                </label>
                                <input
                                  type="text"
                                  value={bankAccountInput}
                                  onChange={e => setBankAccountInput(e.target.value)}
                                  placeholder="e.g. CBE: 1000123456789 — Al-Shifaa Pharmacy"
                                  className="w-full bg-white border border-amber-200 focus:border-amber-400 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium"
                                />
                                <p className="text-[9px] text-slate-400 mt-1">This will be sent to the patient to make the payment transfer.</p>
                              </div>
                            )}

                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={inlineComment}
                                onChange={e => setInlineComment(e.target.value)}
                                placeholder={actionType === "Approved" ? "Optional message to patient..." : "Reason for rejection..."}
                                className="w-full bg-white border border-slate-200 focus:border-[#0F766E] focus:outline-none rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium"
                              />
                              <button onClick={() => submitStatusUpdate(order.id)}
                                className={`px-4 py-1.5 text-xs font-bold text-white rounded-lg transition-all shrink-0 flex items-center gap-1 ${
                                  actionType === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                                }`}>
                                {order.isAppointment ? <Send className="w-3 h-3" /> : null}
                                Confirm
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}

                    {/* ── RECEIPT SUBMITTED: confirm delivery or reject/resubmit ── */}
                    {order.status === "Receipt" && order.rawStatus === "receipt_submitted" && (
                      <div className="mt-4 pt-3 border-t border-purple-100 space-y-2">
                        {order.receipt_url && (
                          <button
                            onClick={() => setViewingReceiptUrl(order.receipt_url)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-50 border border-purple-200 text-purple-700 font-bold text-xs rounded-xl hover:bg-purple-100 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Payment Receipt Screenshot
                          </button>
                        )}

                        {paymentActionId === order.id ? (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold text-slate-700">
                                {paymentActionType === "reject_payment" ? "❌ Reject Payment" : "🔄 Request Resubmission"}
                              </span>
                              <button onClick={() => { setPaymentActionId(null); setPaymentActionType(null); }} className="text-slate-400 text-xs font-bold hover:text-slate-600">Cancel</button>
                            </div>
                            <input
                              type="text"
                              value={paymentActionComment}
                              onChange={e => setPaymentActionComment(e.target.value)}
                              placeholder={paymentActionType === "reject_payment" ? "Reason for rejection..." : "Instructions for the patient..."}
                              className="w-full bg-white border border-slate-200 focus:border-slate-400 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-slate-800 font-medium"
                            />
                            <button onClick={() => submitPaymentAction(order.id)}
                              className={`w-full py-2 text-xs font-bold text-white rounded-lg transition-colors ${
                                paymentActionType === "reject_payment" ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600"
                              }`}>
                              Confirm
                            </button>
                          </motion.div>
                        ) : (
                          <div className="flex gap-2">
                            {confirmingDeliveryId !== order.id ? (
                              <>
                                <button
                                  onClick={() => { setConfirmingDeliveryId(order.id); setDeliveryComment(""); }}
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition-all shadow"
                                >
                                  <Truck className="w-3.5 h-3.5" /> Confirm Payment
                                </button>
                                <button
                                  onClick={() => { setPaymentActionId(order.id); setPaymentActionType("request_resubmission"); setPaymentActionComment(""); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-amber-50 text-amber-700 font-bold text-xs rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" /> Request Re-upload
                                </button>
                                <button
                                  onClick={() => { setPaymentActionId(order.id); setPaymentActionType("reject_payment"); setPaymentActionComment(""); }}
                                  className="px-3 py-2.5 bg-rose-50 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 hover:bg-rose-100 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-2">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Acknowledgment / Delivery Note (optional)</label>
                                <input
                                  type="text"
                                  value={deliveryComment}
                                  onChange={e => setDeliveryComment(e.target.value)}
                                  placeholder="e.g. Payment confirmed. Medicine will be delivered within 2 hours."
                                  className="w-full bg-white border border-slate-200 focus:border-emerald-400 focus:outline-none rounded-lg px-3 py-2 text-xs text-slate-800 font-medium"
                                />
                                <div className="flex gap-2">
                                  <button onClick={() => setConfirmingDeliveryId(null)} className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                                  <button onClick={() => submitConfirmDelivery(order.id)}
                                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Generate Receipt
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── COMPLETED ORDER: link to receipt ── */}
                    {order.rawStatus === "completed" && (
                      <div className="mt-3 pt-3 border-t border-emerald-100">
                        <button
                          onClick={() => {
                            setActiveTab("Receipts");
                            setReceiptHighlightOrderId(order._id);
                            fetchReceipts();
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-teal-50 text-teal-700 font-bold text-xs rounded-xl border border-teal-200 hover:bg-teal-100 transition-colors"
                        >
                          <Receipt className="w-3.5 h-3.5" /> View Generated Receipt
                        </button>
                      </div>
                    )}

                    {/* Saved staff comment */}
                    {order.comment && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-start gap-1.5 text-xs text-slate-600 font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                        <CornerDownRight className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">Dispatched Response:</span>
                          <p className="italic text-slate-700">"{order.comment}"</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* DETAIL SIDEBAR */}
          <div className="lg:col-span-5 space-y-4">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2">Fulfillment Tracking & Live Stream Logs</span>

            <AnimatePresence mode="wait">
              {selectedOrder ? (
                <motion.div
                  key={selectedOrder.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-[11px] font-mono font-bold text-slate-400">Selected Manifest</span>
                      <h4 className="text-base font-black text-slate-900 font-mono tracking-tight">{selectedOrder.id}</h4>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusStyles(selectedOrder.status)}`}>
                      {getRawStatusLabel(selectedOrder.rawStatus)}
                    </span>
                  </div>

                  <div className="space-y-3.5 text-sm">
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Patient</span>
                      <p className="font-bold text-slate-800 mt-0.5">{selectedOrder.patient}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Type</span>
                      <p className="font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                        {selectedOrder.isAppointment ? <Calendar className="h-4 w-4 text-indigo-500" /> : <FileText className="h-4 w-4 text-emerald-500" />}
                        {selectedOrder.type}
                      </p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {selectedOrder.isAppointment ? "Clinical Objectives" : "Items"}
                      </span>
                      <p className="font-mono text-xs font-bold text-slate-900 bg-slate-50 border border-slate-100 rounded-lg p-3 mt-1 leading-relaxed">
                        {selectedOrder.items}
                      </p>
                    </div>

                    {selectedOrder.payment_bank_account && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-amber-500 flex items-center gap-1"><Banknote className="w-3 h-3" /> Bank Account Sent to Patient</span>
                        <p className="font-mono text-xs font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3 mt-1">{selectedOrder.payment_bank_account}</p>
                      </div>
                    )}

                    {selectedOrder.receipt_url && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-purple-500 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Payment Receipt</span>
                        <div
                          className="mt-1 relative cursor-pointer rounded-xl overflow-hidden border-2 border-purple-200 hover:border-purple-400 transition-colors"
                          onClick={() => setViewingReceiptUrl(selectedOrder.receipt_url)}
                        >
                          <img src={selectedOrder.receipt_url} alt="Receipt" className="w-full h-32 object-cover" />
                          <div className="absolute inset-0 bg-purple-900/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-white font-bold text-xs flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> View Full</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedOrder.comment && (
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Staff Message</span>
                        <div className="bg-indigo-50/40 border border-indigo-100 text-slate-800 text-xs p-3 rounded-lg mt-1 italic font-semibold">
                          "{selectedOrder.comment}"
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="pt-4 border-t border-slate-100">
                    <h5 className="text-xs font-bold text-slate-800 mb-4 flex items-center gap-1.5"><History className="h-3.5 w-3.5 text-slate-400" /> Action Lifecycle</h5>
                    <div className="relative border-l border-slate-100 pl-4 ml-1 space-y-4 py-0.5">
                      <div className="relative">
                        <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-[#0F766E]" />
                        <p className="text-xs font-bold text-slate-800">Status: [{getRawStatusLabel(selectedOrder.rawStatus)}]</p>
                        <p className="text-[10px] font-medium text-slate-400 mt-0.5">{selectedOrder.date}</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-slate-300" />
                        <p className="text-xs font-semibold text-slate-600">
                          {selectedOrder.isAppointment ? "Consultation ticket created by patient" : "Prescription submitted via app"}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-medium text-slate-400">
                  Select an order to see details.
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}