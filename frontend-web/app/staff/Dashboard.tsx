import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingCart, Search, Activity,
  ArrowUpRight, ArrowDownRight, Clock, TrendingUp, AlertCircle,
  PackageOpen, DollarSign, Zap, MessageSquare, Calendar
} from "lucide-react";
import { apiFetch } from "./utils";
import { useUser } from "@/context/UserContext";

interface DashboardProps {
  setActiveTab: (tab: any) => void;
  staffName?: string;
  pharmacyName?: string;
  pharmacy?: any;
}

export default function StaffDashboard({ setActiveTab, staffName = "Estifanos Obssi", pharmacyName = "Ethio-Medical Pharmacy", pharmacy }: DashboardProps) {
  const { user } = useUser();
  const [pendingOrders, setPendingOrders] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [receiptCount, setReceiptCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [today] = useState(new Date());

  useEffect(() => {
    // Fetch pending orders count
    apiFetch("/orders?status=pending&limit=50")
      .then((res) => {
        const items = res.data ?? [];
        setPendingOrders(items.length);
        setRecentOrders(items.slice(0, 4));
      })
      .catch(() => {});

    // Fetch notifications/activities
    apiFetch("/notifications?limit=6")
      .then((res) => {
        setActivities(res.data ?? []);
      })
      .catch(() => {});

    // Fetch low stock items + receipt count
    if (pharmacy?._id) {
      apiFetch(`/pharmacies/${pharmacy._id}/inventory?limit=100`)
        .then((res) => {
          const items = res.data ?? [];
          const low = items.filter((i: any) => i.stock_quantity <= 10 && i.is_available);
          setLowStockCount(low.length);
          setLowStockItems(low);
        })
        .catch(() => {});

      // Fetch receipt count for this pharmacy
      apiFetch(`/receipts?pharmacy_id=${pharmacy._id}&limit=1`)
        .then((res) => {
          // Use meta.total if available, otherwise count the returned array
          const total = res.meta?.total ?? res.data?.length ?? 0;
          setReceiptCount(total);
        })
        .catch(() => {});
    }
  }, [pharmacy?._id]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "chat_message":
        return <MessageSquare className="h-2.5 w-2.5 text-blue-500" />;
      case "order_placed":
      case "order_status_changed":
        return <ShoppingCart className="h-2.5 w-2.5 text-amber-500" />;
      case "visit_request":
        return <Calendar className="h-2.5 w-2.5 text-purple-500" />;
      case "low_stock":
        return <AlertCircle className="h-2.5 w-2.5 text-rose-500" />;
      default:
        return <Activity className="h-2.5 w-2.5 text-slate-500" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const formattedTime = today.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit"
  });
  return (
    <div className="bg-[#F1F3F6] text-[#1E293B] p-6 md:p-10 font-sans relative rounded-3xl overflow-hidden shadow-xs selection:bg-emerald-100">
      
      {/* Premium subtle background architectural mesh accent to elevate attraction */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:24px_24px]"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-b from-emerald-200/20 to-transparent rounded-full blur-3xl pointer-events-none"></div>
 
      {/* HEADER SECTION */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-baseline gap-2 relative z-10">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 leading-tight">Welcome back, {staffName}!</h1>
          <p className="text-[20px] font-semibold text-[#0F766E] mt-1">{pharmacyName}</p>
        </div>
        <div className="text-right md:self-start mt-2 md:mt-0">
          <p className="text-xs text-slate-400 font-medium">{formattedDate}</p>
          <p className="text-[18px] font-semibold text-slate-900 mt-0.5">{formattedTime}</p>
        </div>
      </header>

      {/* TOP ROW: THREE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10">
        
        {/* Card 1: Pending Orders Count */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm relative group transition-all cursor-pointer"
          onClick={() => setActiveTab("orders")}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-slate-800">Pending Orders and Booking</span>
            <span className="text-xs font-medium px-3 py-1 bg-[#FEF3C7] text-[#D97706] rounded-full flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" /> Live
            </span>
          </div>
          <div className="text-[40px] font-bold text-[#B45309]">{pendingOrders}</div>
          <div className="mt-4 flex justify-end">
            <span className="text-xs font-semibold text-[#0F766E] flex items-center gap-1">
              View order queue <span className="text-sm">→</span>
            </span>
          </div>
        </motion.div>

        {/* Card 2: Today's Sales Summary */}
        <motion.div 
          whileHover={{ y: -4, shadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)" }}
          className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm relative transition-all"
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-slate-800">Today's Sales Summary</span>
            <span className="text-xs font-medium px-3 py-1 bg-[#D1FAE5] text-[#059669] rounded-full">Green</span>
          </div>
          <div className="flex justify-between items-baseline">
            <div>
              <p className="text-xs text-slate-400 font-medium">Gross revenue</p>
              <div className="text-[32px] font-bold text-slate-900">$2,450.00</div>
            </div>
            {/* Custom SVG Mini Sparkline matching image_d71f44.jpg */}
            <div className="w-28 h-10 overflow-visible">
              <svg viewBox="0 0 100 30" className="w-full h-full">
                <path d="M0,25 Q15,22 30,12 T60,18 T90,5 T100,2" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Low Stock Alerts Count */}
        <motion.div
          whileHover={{ y: -4 }}
          className="bg-[#FEE2E2] rounded-2xl border border-rose-200 p-6 shadow-sm relative transition-all cursor-pointer"
          onClick={() => setActiveTab("inventory")}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-[#991B1B]">Low Stock Alerts</span>
            <span className="text-xs font-medium px-3 py-1 bg-[#EF4444] text-white rounded-full flex items-center gap-1">
              <PackageOpen className="h-3 w-3" /> Live
            </span>
          </div>
          <div className="text-[32px] font-bold text-[#991B1B] mt-2">
            {lowStockCount > 0 ? `${lowStockCount} Items Critical` : "All Stock Healthy"}
          </div>
        </motion.div>

      </div>

      {/* MAIN TWO-COLUMN SPLIT OPERATIONS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* LEFT COMPARTMENT: Operational Lists */}
        <div className="lg:col-span-7 space-y-6">

          {/* 1. Detailed Low Stock Alerts - shows from inventory if available, else placeholder */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Low Stock Alerts</h4>
              <button onClick={() => setActiveTab("inventory")} className="text-xs text-[#0F766E] font-bold hover:underline">Manage →</button>
            </div>
            <div className="p-5">
              {lowStockItems.length === 0 ? (
                <p className="text-xs text-emerald-600 font-medium text-center py-4">✅ All inventory items are well stocked.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-rose-600 mb-2">
                    {lowStockItems.length} item(s) are running low. Go to Inventory to restock.
                  </p>
                  <div className="max-h-[150px] overflow-y-auto space-y-2 pr-1">
                    {lowStockItems.map((item, idx) => (
                      <div 
                        key={item._id || idx} 
                        onClick={() => {
                          localStorage.setItem("highlight_inventory_item", item.medicine_name || item.name || "");
                          setActiveTab("inventory");
                        }}
                        className="flex justify-between items-center p-2.5 rounded-xl bg-rose-50/50 hover:bg-rose-50 border border-rose-100/50 hover:border-rose-200 transition-all cursor-pointer text-xs"
                      >
                        <span className="font-bold text-slate-800">{item.medicine_name || item.name}</span>
                        <span className="font-extrabold text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded-md">
                          Qty: {item.stock_quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. Urgent Pending Orders Queue - real data */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">Recent Pending Orders</h4>
              <button onClick={() => setActiveTab("orders")} className="text-xs text-[#0F766E] font-bold hover:underline">View All →</button>
            </div>
            <div className="overflow-x-auto">
              {recentOrders.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium text-center py-8">No pending orders at the moment.</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-semibold text-slate-500">
                      <th className="p-4 pl-6">Patient</th>
                      <th className="p-4">Type</th>
                      <th className="p-4 pr-6">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {recentOrders.map((order: any, i: number) => {
                      const userName = order.user_id?.full_name ?? "Unknown Patient";
                      const type = order.type === "visit" ? "Visit Request" : "Medicine Order";
                      const time = new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      return (
                        <tr key={order._id ?? i} className="hover:bg-slate-50/40 transition-colors">
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-[#0F766E] to-emerald-400 flex items-center justify-center text-white font-black text-[10px]">
                                {userName.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-800 text-xs">{userName}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              order.type === "visit" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                            }`}>{type}</span>
                          </td>
                          <td className="p-4 pr-6 text-xs text-slate-400 font-medium">{time}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COMPARTMENT: Schedule & History */}
        <div className="lg:col-span-5 space-y-6">

          {/* Pharmacy Profile Details */}
          {pharmacy && (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-50 text-[#0F766E]">🏢</span> My Pharmacy Profile
              </h4>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100/80">
                  <span className="text-slate-400 font-medium">Name:</span>
                  <span className="text-slate-800 font-bold">{pharmacy.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100/80">
                  <span className="text-slate-400 font-medium">Phone:</span>
                  <span className="text-slate-800 font-mono font-semibold">{pharmacy.phone ?? "Not set"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100/80">
                  <span className="text-slate-400 font-medium">Email:</span>
                  <span className="text-slate-800 font-mono">{user?.email ?? pharmacy.email ?? "Not set"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100/80">
                  <span className="text-slate-400 font-medium">Location:</span>
                  <span className="text-slate-800">{pharmacy.address ?? pharmacy.city ?? "Not set"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100/80">
                  <span className="text-slate-400 font-medium">Status:</span>
                  <span className={`font-black uppercase tracking-wider text-[9px] px-2 py-0.5 rounded-md ${
                    pharmacy.status === "approved" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                  }`}>{pharmacy.status}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Rating:</span>
                  <span className="text-amber-500 font-bold">⭐ {pharmacy.rating?.toFixed(1) ?? "0.0"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activities Log Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-5">Recent Activities Log</h4>
            <div className="relative border-l border-slate-200 pl-6 ml-2 space-y-5">
              {activities.length === 0 ? (
                <p className="text-xs text-slate-400 font-medium py-2">No recent activity logs recorded.</p>
              ) : (
                activities.map((log, index) => (
                  <div key={log._id || index} className="relative group">
                    <div className="absolute -left-[32px] top-0.5 h-5 w-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center group-hover:border-[#0F766E] transition-colors shadow-2xs">
                      {getActivityIcon(log.type)}
                    </div>
                    
                    <h5 className="text-xs font-semibold text-slate-800 leading-snug group-hover:text-slate-950 transition-colors">
                      {log.title}
                    </h5>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">{log.body}</p>
                    <p className="text-[9px] font-semibold text-slate-400 mt-1">{formatRelativeTime(log.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}