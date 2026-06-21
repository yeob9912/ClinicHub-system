"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Package, ShoppingCart, Bell, Activity,
  Clock, AlertCircle, PackageOpen, ChevronRight, X, BellRing, Mail, Shield, BarChart2, Calendar,
  UserCircle2, MessageSquare, HelpCircle, BookOpen, ShieldCheck, FileKey
} from "lucide-react";
import { apiFetch } from "./utils";
import { useUser } from "@/context/UserContext";
import Dashboard from "./Dashboard";
import Inventory from "./Inventory";
import Orders from "./Orders";
import Sales from "./Sales";
import Schedule from "./Schedule";
import Account from "./Account";
import Notifications from "./Notifications";
import Chat from "./Chat";

export default function StaffPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "inventory" | "orders" | "account" | "profile" | "schedule" | "sales" | "chat" | "help-center" | "documentation" | "privacy" | "terms"
  >("dashboard");
  const [mounted, setMounted] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  const [chatInitialUserId, setChatInitialUserId] = useState<string | null>(null);
  const [chatInitialUserName, setChatInitialUserName] = useState<string>("");

  // ── Shared profile state ─────────────────────────────────────
  const [profileImage, setProfileImage] = useState("");
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [pharmacyName, setPharmacyName] = useState<string>("Ethio-Medical Pharmacy");
  const [pharmacy, setPharmacy] = useState<any | null>(null);

  const handlePharmacyUpdate = (updatedPharmacy: any) => {
    if (updatedPharmacy) {
      setPharmacy(updatedPharmacy);
      setPharmacyName(updatedPharmacy.name);
    }
  };

  // Real database notifications
  const [realNotifications, setRealNotifications] = useState<any[]>([]);

  const fetchNotifications = useCallback(() => {
    apiFetch("/notifications?limit=20")
      .then((res) => {
        if (res.data) setRealNotifications(res.data);
      })
      .catch(() => {});
  }, []);

  const handleNotificationClick = useCallback((notification: any) => {
    setShowNotifications(false);
    if (notification.type === "system") return;

    // Mark notification as read
    apiFetch(`/notifications/${notification.id}/read`, { method: "PATCH" })
      .then(() => fetchNotifications())
      .catch(() => {});

    // Redirect based on type
    if (notification.type === "chat_message") {
      // Auto-open the specific patient conversation
      const senderId   = notification.data?.sender_id;
      const senderName = notification.data?.sender_name ||
                         notification.data?.user_name ||
                         notification.title?.replace(/^New message from /i, "") ||
                         "Patient";
      setChatInitialUserId(senderId ?? null);
      setChatInitialUserName(senderName);
      setActiveTab("chat");
    } else if (
      notification.type === "visit_request" ||
      notification.type === "order_placed" ||
      notification.type === "call" ||
      notification.type === "call_request"
    ) {
      setActiveTab("orders");
      if (notification.data?.order_id) {
        setHighlightOrderId(notification.data.order_id);
      }
    }
  }, [fetchNotifications]);

  const handleNotificationDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    apiFetch(`/notifications/${id}`, { method: "DELETE" })
      .then(() => fetchNotifications())
      .catch(() => {});
  }, [fetchNotifications]);

  const handleMarkAllAsRead = useCallback(() => {
    apiFetch("/notifications/read-all", { method: "PATCH" })
      .then(() => fetchNotifications())
      .catch(() => {});
  }, [fetchNotifications]);

  useEffect(() => {
    if (mounted && user?.id) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 8000);
      return () => clearInterval(interval);
    }
  }, [mounted, user, fetchNotifications]);

  // ── Toast notifier ──────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  }, []);
  
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load pharmacy & staff image on mount
  useEffect(() => {
    setMounted(true);
    
    if (user?.id) {
      // Find pharmacy owned by the logged-in user
      apiFetch(`/pharmacies?owner_id=${user.id}&limit=1`)
        .then((res) => {
          const ph = res.data?.[0] ?? null;
          if (ph) {
            setPharmacyId(ph._id);
            setPharmacyName(ph.name);
            setPharmacy(ph);
          } else {
            // Fallback: If no pharmacy owned by this user is returned, search by name "Ethio-Medical Pharmacy"
            apiFetch("/pharmacies")
              .then((allRes) => {
                const ethioPh = allRes.data?.find((p: any) => p.name === "Ethio-Medical Pharmacy");
                if (ethioPh) {
                  setPharmacyId(ethioPh._id);
                  setPharmacyName(ethioPh.name);
                  setPharmacy(ethioPh);
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      // Direct fallback if user is not fully loaded yet or context not ready
      apiFetch("/pharmacies")
        .then((allRes) => {
          const ethioPh = allRes.data?.find((p: any) => p.name === "Ethio-Medical Pharmacy");
          if (ethioPh) {
            setPharmacyId(ethioPh._id);
            setPharmacyName(ethioPh.name);
            setPharmacy(ethioPh);
          }
        })
        .catch(() => {});
    }

    const savedStaffImage = localStorage.getItem("staff_image");
    if (savedStaffImage) setProfileImage(savedStaffImage);
    else if (user?.avatarUrl) setProfileImage(user.avatarUrl);
  }, [user]);

  // ── Nav items ────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory" as const, label: "Inventory", icon: Package },
    { id: "orders" as const, label: "Orders", icon: ShoppingCart },
    { id: "chat" as const, label: "Messages", icon: MessageSquare },
    { id: "sales" as const, label: "Sales", icon: BarChart2 },
    { id: "schedule" as const, label: "Schedule", icon: Calendar }
  ];

  const recentActivity = realNotifications.length > 0 
    ? realNotifications.map((n: any) => {
        let icon = Clock;
        let color = "text-slate-500";
        let bg = "bg-slate-50";

        if (n.type === "chat_message") {
          icon = MessageSquare;
          color = "text-blue-500";
          bg = "bg-blue-50";
        } else if (n.type === "visit_request") {
          icon = Calendar;
          color = "text-emerald-500";
          bg = "bg-emerald-50";
        } else if (n.type === "order_placed") {
          icon = ShoppingCart;
          color = "text-amber-500";
          bg = "bg-amber-50";
        }

        return {
          id: n._id,
          type: n.type,
          title: n.title,
          desc: n.body,
          time: new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          icon,
          color,
          bg,
          isRead: n.is_read,
          data: n.data
        };
      })
    : [
        { id: "1", type: "system", title: "No new alerts", desc: "You are all caught up!", time: "Now", icon: Clock, color: "text-slate-400", bg: "bg-slate-50", isRead: true }
      ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans antialiased">

      {/* ── TOP HEADER ─────────────────────────────────────────── */}
      <header className="h-[72px] bg-white border-b border-gray-100 px-4 md:px-8 flex items-center justify-between fixed top-0 left-0 right-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl bg-[#24D2A6] flex items-center justify-center shadow-lg shadow-[#24D2A6]/20 cursor-pointer"
            onClick={() => setActiveTab("dashboard")}
          >
            <Activity className="text-white" size={20} />
          </div>
          <div className="cursor-pointer" onClick={() => setActiveTab("dashboard")}>
            <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">
              pharma<span className="text-[#24D2A6]">Locator</span>
            </h1>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest hidden sm:block">Pharmacy Staff</p>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 relative ${
                  isActive ? "text-[#24D2A6] bg-[#24D2A6]/10" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={16} className={isActive ? "text-[#24D2A6]" : "text-slate-400"} />
                <span>{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="staffNavUnderline"
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#24D2A6] rounded-t-full shadow-[0_-2px_10px_rgba(36,210,166,0.5)]"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowNotifications(true)}
            className="p-2.5 rounded-full border border-gray-100 text-slate-400 hover:text-[#24D2A6] hover:bg-gray-50 active:scale-95 relative group transition-all"
          >
            <Bell size={18} className="group-hover:rotate-12 transition-transform" />
            {realNotifications.filter((n: any) => !n.is_read).length > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                {realNotifications.filter((n: any) => !n.is_read).length}
              </span>
            )}
          </button>
          <div
            onClick={() => setActiveTab("account")}
            className={`w-10 h-10 rounded-full border-2 shadow-md overflow-hidden transition-all cursor-pointer flex items-center justify-center bg-slate-100 ${
              activeTab === "account" ? "border-[#24D2A6] scale-110 shadow-[#24D2A6]/30" : "border-white hover:scale-105"
            }`}
          >
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="w-7 h-7 text-slate-400" />
            )}
          </div>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ─────────────────────────────────────── */}
      <div className="pt-[72px]">
        <main className="p-4 md:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto space-y-8 w-full">

          {/* Render Active Tab View */}
          {activeTab === "dashboard" && (
            <Dashboard 
              setActiveTab={setActiveTab} 
              staffName={user?.name || "Estifanos Obssi"} 
              pharmacyName={pharmacyName} 
              pharmacy={pharmacy}
            />
          )}

          {activeTab === "inventory" && (
            <Inventory pharmacyId={pharmacyId} showToast={showToast} />
          )}

          {activeTab === "orders" && (
            <Orders 
              pharmacyId={pharmacyId} 
              showToast={showToast} 
              highlightOrderId={highlightOrderId}
              onClearHighlight={() => setHighlightOrderId(null)}
            />
          )}

          {activeTab === "sales" && (
            <Sales pharmacyId={pharmacyId} pharmacyName={pharmacyName} showToast={showToast} />
          )}

          {activeTab === "chat" && (
            <Chat
              pharmacyId={pharmacyId}
              showToast={showToast}
              initialUserId={chatInitialUserId}
              initialUserName={chatInitialUserName}
            />
          )}

          {activeTab === "schedule" && (
            <Schedule pharmacyId={pharmacyId} pharmacyName={pharmacyName} showToast={showToast} />
          )}

          {activeTab === "account" && (
            <Account
              pharmacyId={pharmacyId}
              pharmacy={pharmacy}
              profileImage={profileImage}
              setProfileImage={setProfileImage}
              showToast={showToast}
              onPharmacyUpdate={handlePharmacyUpdate}
            />
          )}

          {(activeTab === "help-center" || activeTab === "documentation" || activeTab === "privacy" || activeTab === "terms") && (
            <StaffSupportDocs activeTab={activeTab} setActiveTab={setActiveTab} />
          )}

        </main>

        {/* ── FOOTER ────────────────────────────────────────────── */}
        <footer className="w-full bg-slate-950 text-slate-400 pt-16 pb-24 lg:pb-12 px-6 md:px-12 border-t border-slate-800 m-0">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#24D2A6] flex items-center justify-center"><Activity className="text-white" size={20} /></div>
                <div><span className="font-extrabold text-lg text-white tracking-tight block">PharmaManage</span><span className="text-[10px] font-black uppercase text-[#24D2A6] tracking-widest">Staff Portal</span></div>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">Empowering healthcare professionals with intelligent inventory and patient order management.</p>
            </div>
            <div>
              <h4 className="text-white font-extrabold mb-6 uppercase tracking-wider text-sm">Quick Links</h4>
              <ul className="space-y-4 text-sm font-semibold">
                {["dashboard", "inventory", "orders", "sales", "schedule"].map(tab => (
                  <li key={tab}><button onClick={() => setActiveTab(tab as typeof activeTab)} className="hover:text-[#24D2A6] transition-colors flex items-center gap-2 capitalize"><ChevronRight size={14} className="text-slate-600" />{tab}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-extrabold mb-6 uppercase tracking-wider text-sm">Support</h4>
              <ul className="space-y-4 text-sm font-semibold">
                {[
                  { label: "Help Center", tab: "help-center" },
                  { label: "Documentation", tab: "documentation" },
                  { label: "Privacy Policy", tab: "privacy" },
                  { label: "Terms of Service", tab: "terms" }
                ].map(l => (
                  <li key={l.label}>
                    <button
                      onClick={() => setActiveTab(l.tab as any)}
                      className="hover:text-[#24D2A6] transition-colors flex items-center gap-2 text-left"
                    >
                      <ChevronRight size={14} className="text-slate-600" />
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-extrabold mb-6 uppercase tracking-wider text-sm">Contact Admin</h4>
              <ul className="space-y-4 text-sm font-semibold text-slate-400">
                <li className="flex items-start gap-3"><Mail className="mt-0.5 text-[#24D2A6] shrink-0" size={16} /><span>support@pharmalocator.com</span></li>
                <li className="flex items-start gap-3"><BellRing className="mt-0.5 text-[#24D2A6] shrink-0" size={16} /><span>1-800-MED-HELP (Ext. 4)</span></li>
                <li className="flex items-start gap-3"><Shield className="mt-0.5 text-[#24D2A6] shrink-0" size={16} /><span>Status: <span className="text-emerald-400">All Systems Operational</span></span></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold uppercase tracking-widest">
            <span className="text-slate-500">&copy; {new Date().getFullYear()} pharmaLocator Operations. All rights reserved.</span>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Secure 256-bit Connection
            </div>
          </div>
        </footer>
      </div>

      {/* ── MOBILE BOTTOM NAV ─────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 lg:hidden px-1 pb-6 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link href="#" key={item.id} onClick={(e) => { e.preventDefault(); setActiveTab(item.id); }}
                className={`flex flex-col items-center gap-0.5 transition-all duration-300 relative px-1.5 ${isActive ? "text-[#24D2A6]" : "text-slate-400"}`}>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-[#24D2A6]/10" : ""}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? "opacity-100" : "opacity-60"}`}>{item.label}</span>
                {isActive && <motion.div layoutId="mobileStaffDot" className="absolute -top-1 w-1.5 h-1.5 bg-[#24D2A6] rounded-full shadow-[0_0_10px_#24D2A6]" />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Overlays / Modals */}
      {/* 1. Notifications Panel */}
      <Notifications
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        recentActivity={recentActivity}
        onNotificationClick={handleNotificationClick}
        onNotificationDelete={handleNotificationDelete}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      {/* 2. Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-24 right-6 z-[150] px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-100 text-emerald-800"
                : toast.type === "error"
                ? "bg-rose-50 border-rose-100 text-rose-800"
                : "bg-blue-50 border-blue-100 text-blue-800"
            }`}
          >
            {toast.type === "success" && <Activity className="text-emerald-500 shrink-0" size={18} />}
            {toast.type === "error" && <AlertCircle className="text-rose-500 shrink-0" size={18} />}
            <span className="text-sm font-extrabold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function StaffSupportDocs({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: any) => void }) {
  const tabs = [
    { id: "help-center", label: "Help Center", icon: HelpCircle },
    { id: "documentation", label: "System Documentation", icon: BookOpen },
    { id: "privacy", label: "Privacy Policy", icon: ShieldCheck },
    { id: "terms", label: "Terms of Service", icon: FileKey }
  ];

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm min-h-[500px]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3">Support Docs</p>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left font-bold text-xs ${
                  isActive
                    ? "bg-[#24D2A6]/10 text-[#24D2A6]"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {activeTab === "help-center" && (
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Staff Help Center &amp; User Guides</h2>
                  <p className="text-sm font-medium text-slate-400 mb-6">Quick reference guides for pharmacy managers and staff members.</p>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-sm mb-2">1. Managing Medicine Inventory</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Navigate to the <strong>Inventory</strong> tab to manage your stock catalog. You can add new drugs, adjust prices, edit therapeutic descriptions, and update stock status between <em>In Stock</em>, <em>Low Stock</em>, and <em>Out of Stock</em> to prevent order discrepancies.
                      </p>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-sm mb-2">2. Processing Patient Orders &amp; Visits</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Under the <strong>Orders</strong> page, you'll see requests from patients. Review prescription attachments, approve orders, and type your CBE or Bank details for transfer. Once the user uploads a payment receipt, cross-reference it in your bank ledger, mark it as approved, and prepare it for collection.
                      </p>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-sm mb-2">3. Operating Schedule &amp; Notice Board</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        The <strong>Schedule</strong> tab allows you to configure your pharmacy's operating times for each day of the week. You can also write announcements (e.g. holiday hour changes or special announcements) which appear on your public directory notice board immediately.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "documentation" && (
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">System Operations Manual</h2>
                  <p className="text-sm font-medium text-slate-400 mb-6">Technical guidelines, integration flows, and dashboard operations.</p>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-sm mb-2">Workflow Order States</h3>
                      <p className="text-xs text-slate-600 leading-relaxed mb-3">
                        Each customer order progresses through strict states:
                      </p>
                      <ul className="list-disc pl-5 text-xs text-slate-500 space-y-1">
                        <li><code>Pending Review</code>: Initial placement, awaiting staff assessment.</li>
                        <li><code>Awaiting Payment</code>: Staff approved order; waiting for receipt screenshot upload.</li>
                        <li><code>Receipt Submitted</code>: Awaiting staff validation of transfer.</li>
                        <li><code>Delivered / Completed</code>: Payment checked; items picked up/sent.</li>
                      </ul>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-sm mb-2">System Event Notifications</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        The top bell icon delivers real-time notifications for new chat messages, order requests, and appointments. When an alert arrives, clicking it takes you directly to the action page with the relevant ticket pre-highlighted.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "privacy" && (
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Pharmacy &amp; Patient Privacy Policy</h2>
                  <p className="text-sm font-medium text-slate-400 mb-6">Rules and compliance standards for protecting patient medical history.</p>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-rose-50/50 border border-rose-100 text-rose-950 rounded-2xl">
                      <h3 className="font-extrabold text-sm mb-2 flex items-center gap-2 text-rose-800">
                        <AlertCircle size={16} /> Patient Information Secrecy
                      </h3>
                      <p className="text-xs leading-relaxed">
                        All patient medical records, prescription images, order names, and direct chat logs are strictly confidential. Staff members must never export, share, or download customer data for external usage outside the platform.
                      </p>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-sm mb-2">Prescription Safety &amp; HIPAA</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Our platform is aligned with medical privacy guidelines. All prescription attachments are stored in secure cloud containers and are accessible only to the pharmacy staff and system administrators.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "terms" && (
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Pharmacy Partner Terms of Service</h2>
                  <p className="text-sm font-medium text-slate-400 mb-6">Platform compliance agreement and listing regulations.</p>
                  
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-sm mb-2">1. Listing Integrity &amp; Price Caps</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Partner pharmacies are contractually required to list actual, real-world medicine prices and accurate stock levels. Deliberately listing fake low prices or unavailable items to attract patient traffic is prohibited and will result in listing suspension.
                      </p>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h3 className="font-extrabold text-slate-800 text-sm mb-2">2. Staff Authorization</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Only verified, certified pharmacy employees are authorized to operate this staff panel. You must report any staff changes or credential leaks to the platform administrator immediately.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
