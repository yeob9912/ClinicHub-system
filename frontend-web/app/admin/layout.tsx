"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useUser } from "@/context/UserContext";
import AuthGuard from "@/components/AuthGuard";
import { Bell, LayoutDashboard, MessageSquare, Pill, Store, Trash2, Users, X, CheckCheck } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Pharmacy", href: "/admin/pharmacy-management", icon: Store },
  { label: "User", href: "/admin/user-management", icon: Users },
  { label: "Medicine", href: "/admin/medicine-management", icon: Pill },
  { label: "Complaint", href: "/admin/complaints", icon: MessageSquare },
];

function getAdminNotificationLink(n: { type: string; link?: string; data?: any }): string {
  if (n.link) return n.link;
  const data = n.data || {};
  if (n.type === "new_medicine") return "/admin/medicine-management";
  if (n.type === "new_complaint") return "/admin/complaints";
  if (n.type === "complaint_update") return "/admin/complaints";
  if (n.type === "pharmacy_approved" || n.type === "pharmacy_rejected" || n.type === "pharmacy_registered") {
    return "/admin/pharmacy-management?tab=requests";
  }
  if (n.type === "pharmacy_rated") return "/admin/pharmacy-management";
  if (data.pharmacy_id) return "/admin/pharmacy-management";
  if (data.complaint_id) return "/admin/complaints";
  return "/admin";
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, notifications, markAsRead, markAllAsRead, clearNotifications, dismissNotification } = useUser();
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const adminInitial = user?.name ? user.name.trim()[0].toUpperCase() : "A";

  const handleNotificationClick = (item: any) => {
    markAsRead(item.id);
    setShowNotifications(false);
    router.push(getAdminNotificationLink(item));
  };

  return (
    <AuthGuard roles={["admin"]}>
    <div className="min-h-screen bg-[#f4f5fb] text-slate-900">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:py-4">
          <div>
            <p className="text-xl font-black text-slate-900">pharma<span className="text-[#24D2A6]">Locator</span></p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Admin Console</p>
          </div>
          <nav className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${
                    active ? "bg-[#24D2A6]/10 text-[#24D2A6]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifications(true)}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-slate-500 hover:bg-slate-50 transition-colors"
              title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "Notifications"}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-black text-white leading-none shadow">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <Link
              href="/admin/profile"
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-gray-200 transition-transform duration-300 hover:scale-105 hover:border-[#24D2A6]/40"
              title="Profile"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#24D2A6] to-[#1eb08b] text-white font-black text-base select-none">
                  {adminInitial}
                </div>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="px-4 pt-20 pb-24 sm:px-6 sm:pt-20 lg:px-6 lg:pt-24 lg:pb-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      <footer className="mt-10 bg-slate-900 text-white pt-16 pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="space-y-6">
              <Link href="/admin" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#24D2A6] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-[#24D2A6]/20">
                  A
                </div>
                <span className="font-black text-2xl tracking-tighter">
                  pharma<span className="text-[#24D2A6]">Locator</span>
                </span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
                Admin console for secure operations: user accounts, pharmacy verification, categories, pricing integrity, and complaints.
              </p>

              {/* Quick Search (admin-only) */}
              <div className="space-y-2">
                <p className="text-sm font-black uppercase tracking-widest text-[#24D2A6]">Quick Search</p>
                <input
                  placeholder="Search users, pharmacies, medicines..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#24D2A6]/60"
                />
              </div>
            </div>

            {/* Admin Tools */}
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-[#24D2A6] mb-8">Admin Tools</h4>
              <ul className="space-y-4">
                <li><Link href="/admin/user-management" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">User Management</Link></li>
                <li><Link href="/admin/pharmacy-management" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Pharmacy Approvals</Link></li>
                <li><Link href="/admin/medicine-management" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Medicine Categories</Link></li>
                <li><Link href="/admin/complaints" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Complaints</Link></li>
              </ul>
            </div>

            {/* Operations */}
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-[#24D2A6] mb-8">Operations</h4>
              <ul className="space-y-4">
                <li><Link href="/admin/pharmacy-management" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Register Pharmacy</Link></li>
                <li><Link href="/admin/medicine-management" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Price Monitoring</Link></li>
                <li><Link href="/admin/profile" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Profile & Logout</Link></li>
                <li><Link href="/admin" className="text-slate-400 hover:text-white transition-colors text-sm font-medium">Reports & Analytics</Link></li>
              </ul>
            </div>

            {/* Security */}
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-[#24D2A6] mb-8">Security</h4>
              <ul className="space-y-4">
                <li className="text-slate-400 text-sm font-medium">Verified pharmacy review required</li>
                <li className="text-slate-400 text-sm font-medium">Optional decision comments stored</li>
                <li className="text-slate-400 text-sm font-medium">Audit-friendly admin actions</li>
                <li className="text-slate-400 text-sm font-medium">Role-based access ready</li>
              </ul>
            </div>
          </div>

          {/* Bottom bar (like user/staff) */}
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
              <p className="text-slate-500 text-xs font-medium">
                © {new Date().getFullYear()} pharmaLocator. All rights reserved.
              </p>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-tighter bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <span className="w-2 h-2 rounded-full bg-[#24D2A6]" /> Certified Admin Operations
              </div>
            </div>
            <div className="flex gap-6">
              {["Security", "Privacy", "Accessibility", "Audit"].map((link) => (
                <span key={link} className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  {link}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 px-2 pb-6 pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] lg:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-2 text-[10px] font-black uppercase tracking-widest ${
                  active ? "text-[#24D2A6]" : "text-slate-400"
                }`}
              >
                <span className={`rounded-xl p-1.5 ${active ? "bg-[#24D2A6]/10" : ""}`}>
                  <Icon size={18} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {showNotifications && (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setShowNotifications(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              className="fixed right-4 top-20 z-[60] flex w-[360px] max-w-[95vw] flex-col overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/50 px-5 py-4">
                <h3 className="text-lg font-black text-slate-900">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllAsRead()}
                      className="flex items-center gap-1 rounded-lg bg-[#24D2A6]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#24D2A6] hover:bg-[#24D2A6]/20 transition-colors"
                      title="Mark all as read"
                    >
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 hover:text-rose-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto p-4">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`w-full rounded-2xl border p-4 text-left transition cursor-pointer ${
                        item.isRead ? "border-gray-100 hover:bg-gray-50" : "border-[#24D2A6]/20 bg-[#24D2A6]/5 ring-1 ring-[#24D2A6]/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => handleNotificationClick(item)}
                        >
                          <p className="text-xs font-black text-slate-900 leading-snug">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.message}</p>
                          <p className="mt-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissNotification(item.id); }}
                          className="ml-1 mt-0.5 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0"
                          title="Delete notification"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-xs font-bold uppercase tracking-wider text-slate-300">No notifications</p>
                )}
              </div>
              {notifications.length > 0 && (
                <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-center gap-6">
                  <button onClick={clearNotifications} className="text-[11px] font-black uppercase tracking-wider text-rose-400 hover:text-rose-600 transition-colors">
                    Clear all
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </AuthGuard>
  );
}
