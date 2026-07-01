"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Home, 
  Pill, 
  Store, 
  Star, 
  Bell,
  User as UserIcon,
  ChevronUp,
  LogIn,
  X,
  LogOut,
  Settings,
  ShoppingBag,
  MessageSquare,
  Calendar,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  Building2,
  ChevronDown
} from "lucide-react";
import { useAppContext } from "./providers";
import { useUser } from "@/context/UserContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useAppContext();
  const { user, logout, notifications, markAsRead, markAllAsRead, clearNotifications, dismissNotification } = useUser();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    if (type === "chat_message") return { Icon: MessageSquare, bg: "bg-blue-100", color: "text-blue-500" };
    if (type === "visit_request") return { Icon: Calendar, bg: "bg-purple-100", color: "text-purple-500" };
    if (type === "complaint_update" || type === "new_complaint") return { Icon: ShieldAlert, bg: "bg-amber-100", color: "text-amber-500" };
    if (type?.startsWith("order_") || type === "order" || type === "appointment") return { Icon: ShoppingBag, bg: "bg-[#24D2A6]/15", color: "text-[#24D2A6]" };
    return { Icon: Bell, bg: "bg-teal-100", color: "text-[#24D2A6]" };
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    setShowNotifications(false);

    // If user is an admin, always redirect within the admin portal only
    if (user?.role === "admin") {
      const cId = n.data?.complaint_id || n.data?.id || n._id || "";
      const pId = n.data?.pharmacy_id || n.data?.id || n._id || "";
      if (n.type === "complaint_update" || n.type === "new_complaint" || n.type?.includes("complaint")) {
        router.push(`/admin/complaints?id=${cId}`);
      } else if (
        n.type === "new_pharmacy_request" ||
        n.type === "pharmacy_registered"
      ) {
        router.push(`/admin/pharmacy-management?tab=requests&request_id=${pId}`);
      } else if (
        n.type === "pharmacy_approved" ||
        n.type === "pharmacy_rejected" ||
        n.type === "pharmacy_rated" ||
        n.type?.startsWith("pharmacy_")
      ) {
        router.push(`/admin/pharmacy-management?partner_id=${pId}`);
      } else {
        router.push("/admin");
      }
      return;
    }

    // If a pre-built link is provided, use it directly
    if (n.link) {
      router.push(n.link);
      return;
    }

    const pharmacyId = n.data?.pharmacy_id;
    const orderId    = n.data?.order_id;

    if (n.type === "chat_message") {
      // Go directly to the pharmacy chat panel
      if (pharmacyId) {
        router.push(`/pharmacies/${pharmacyId}?action=chat`);
      } else {
        router.push("/pharmacies");
      }
    } else if (n.type === "call" || n.type === "call_request" || n.type === "visit_request") {
      // Go to the pharmacy call/visit panel
      if (pharmacyId) {
        router.push(`/pharmacies/${pharmacyId}?action=call`);
      } else {
        router.push("/pharmacies");
      }
    } else if (
      n.type?.startsWith("order_") ||
      n.type === "order" ||
      n.type === "appointment"
    ) {
      if (orderId) {
        router.push(`/account?tab=history&order_id=${orderId}`);
      } else {
        router.push("/account?tab=history");
      }
    } else {
      router.push("/notifications");
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: t("nav.home"), href: "/", icon: Home },
    { name: t("nav.medicines"), href: "/medicines", icon: Pill },
    { name: t("nav.pharmacies"), href: "/pharmacies", icon: Store },
    { name: t("nav.favorites"), href: "/favorites", icon: Star },
  ];

  const serviceLinks = [
    { name: "My Orders & Booking", href: "/account?tab=history", icon: ShoppingBag, color: "text-[#24D2A6]", bg: "hover:bg-[#24D2A6]/10", subtitle: "Orders & visits history" },
    { name: "Complaint", href: "/favorites/complaint", icon: AlertTriangle, color: "text-rose-500", bg: "hover:bg-rose-50", subtitle: "File a report" },
    { name: "Pharma Registr", href: "/favorites/register", icon: Building2, color: "text-emerald-500", bg: "hover:bg-emerald-50", subtitle: "Join as partner" },
  ];

  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  return (
    <>
      {/* --- DESKTOP NAVBAR --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? "bg-white border-b border-gray-100 py-3 shadow-sm" : "bg-white border-b border-gray-50 py-4 shadow-md"
      } hidden lg:block`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-[#24D2A6] flex items-center justify-center text-white font-black text-2xl group-hover:scale-105 transition-transform shadow-lg shadow-[#24D2A6]/20">
                P
              </div>
              <span className={`font-poppins font-black text-2xl tracking-tighter transition-colors ${scrolled ? "text-slate-900" : "text-slate-900"}`}>
                pharma<span className="text-[#24D2A6]">Locator</span>
              </span>
            </Link>
            
            {/* Nav Links */}
            <div className="flex items-center gap-2" onMouseLeave={() => { setHoveredPath(null); }}>
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link 
                    key={link.name}
                    href={link.href} 
                    onMouseEnter={() => setHoveredPath(link.href)}
                    className={`relative px-5 py-2.5 text-sm font-black transition-all group ${
                      isActive ? "text-[#24D2A6]" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <link.icon size={18} className={isActive ? "animate-pulse" : "group-hover:scale-110 transition-transform"} />
                      {link.name}
                    </span>
                    {(isActive || hoveredPath === link.href) && (
                      <motion.div 
                        layoutId="navUnderline"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ 
                          height: isActive ? 4 : 2, 
                          opacity: isActive ? 1 : 0.6,
                        }}
                        className={`absolute bottom-0 left-0 right-0 bg-[#24D2A6] rounded-full ${isActive ? "shadow-[0_0_15px_rgba(36,210,166,0.5)]" : ""}`}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                      />
                    )}
                  </Link>
                );
              })}

              {/* Services Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowServicesMenu(!showServicesMenu)}
                  onMouseEnter={() => setShowServicesMenu(true)}
                  className={`relative px-4 py-2.5 text-sm font-black transition-all flex items-center gap-2 rounded-xl border ${
                    serviceLinks.some(s => pathname === s.href)
                      ? "bg-rose-50 text-rose-500 border-rose-200"
                      : "text-slate-500 hover:text-slate-900 border-transparent hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <AlertTriangle size={16} className={serviceLinks.some(s => pathname === s.href) ? "text-rose-500" : "text-rose-400"} />
                  <span>Services</span>
                  <ChevronDown size={13} className={`transition-transform duration-200 ${showServicesMenu ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {showServicesMenu && (
                    <>
                      <div className="fixed inset-0 z-[90]" onClick={() => setShowServicesMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        onMouseLeave={() => setShowServicesMenu(false)}
                        className="absolute top-full left-0 mt-2 w-56 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-gray-100 z-[100] overflow-hidden p-2"
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 pt-1 pb-2">Services</p>
                        {serviceLinks.map((s) => {
                          const isActive = pathname.startsWith(s.href.split("?")[0]) && (s.href.includes("?") ? pathname + window?.location?.search === s.href : true);
                          return (
                            <Link
                              key={s.href}
                              href={s.href}
                              onClick={() => setShowServicesMenu(false)}
                              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${
                                isActive ? `bg-gray-50 ${s.color}` : `text-slate-600 ${s.bg}`
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color} ${
                                s.href.includes("complaint") ? "bg-rose-50" : s.href.includes("register") ? "bg-emerald-50" : "bg-[#24D2A6]/10"
                              }`}>
                                <s.icon size={16} />
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800">{s.name}</p>
                                <p className="text-[10px] text-slate-400">{s.subtitle}</p>
                              </div>
                            </Link>
                          );
                        })}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {user && (
                <button 
                  onClick={() => setShowNotifications(true)}
                  className={`p-3 rounded-2xl transition-all relative group bg-white/50 backdrop-blur-md text-slate-400 border border-gray-100 hover:text-[#24D2A6]`}
                >
                  <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}

              {user ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center justify-center p-0.5 rounded-full hover:scale-105 active:scale-95 transition-transform cursor-pointer"
                    title="User Profile"
                  >
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-10 h-10 rounded-full object-cover border-2 border-[#24D2A6] shadow-sm" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#24D2A6] to-[#1eb891] text-white flex items-center justify-center font-poppins font-black text-sm border-2 border-white shadow-md shadow-[#24D2A6]/10 uppercase">
                        {user.name ? user.name[0] : "?"}
                      </div>
                    )}
                  </button>
 
                  <AnimatePresence>
                    {showProfileDropdown && (
                      <>
                        <div className="fixed inset-0 z-[100]" onClick={() => setShowProfileDropdown(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute right-0 mt-3.5 w-[300px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-[110] overflow-hidden border border-gray-100 p-6 flex flex-col gap-5 text-left"
                        >
                          <div className="flex items-center gap-3 pb-4 border-b border-gray-50">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-[#24D2A6]/30 shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#24D2A6] to-[#1eb891] text-white flex items-center justify-center font-poppins font-black text-lg border border-[#24D2A6]/20 shadow-inner uppercase">
                                {user.name ? user.name[0] : "?"}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-poppins font-black text-slate-900 text-sm truncate leading-tight">{user.name}</p>
                              <p className="text-[11px] font-bold text-slate-400 truncate mt-0.5">{user.email}</p>
                              <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1.5 ${
                                user.role === 'admin' 
                                  ? 'bg-rose-50 text-rose-500 border border-rose-200' 
                                  : user.role === 'pharmacy' 
                                    ? 'bg-blue-50 text-blue-500 border border-blue-200' 
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              }`}>
                                {user.role === 'admin' ? 'Admin' : user.role === 'pharmacy' ? 'Pharmacy' : 'Patient'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <Link 
                              href="/account"
                              onClick={() => setShowProfileDropdown(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left"
                            >
                              <UserIcon size={18} className="text-slate-400 group-hover:text-[#24D2A6] transition-colors" />
                              <span className="text-xs font-black text-slate-700">Account Dashboard</span>
                            </Link>
                            <Link 
                              href="/favorites"
                              onClick={() => setShowProfileDropdown(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left"
                            >
                              <Star size={18} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                              <span className="text-xs font-black text-slate-700">My Favorites</span>
                            </Link>
                            <Link 
                              href="/notifications"
                              onClick={() => setShowProfileDropdown(false)}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors group text-left"
                            >
                              <Bell size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                              <span className="text-xs font-black text-slate-700">Notifications</span>
                            </Link>

                            
                            {user.role === "pharmacy" && (
                              <Link 
                                href="/staff"
                                onClick={() => setShowProfileDropdown(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-50 transition-colors group text-left"
                              >
                                <Store size={18} className="text-emerald-500" />
                                <span className="text-xs font-black text-emerald-700">Staff Portal</span>
                              </Link>
                            )}

                            {user.role === "admin" && (
                              <Link 
                                href="/admin"
                                onClick={() => setShowProfileDropdown(false)}
                                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50 transition-colors group text-left"
                              >
                                <Settings size={18} className="text-rose-500" />
                                <span className="text-xs font-black text-rose-700">Admin Portal</span>
                              </Link>
                            )}
                          </div>

                          <button 
                            onClick={() => {
                              setShowProfileDropdown(false);
                              logout();
                            }}
                            className="w-full mt-2 bg-slate-900 hover:bg-rose-600 text-white py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md hover:shadow-rose-600/20 cursor-pointer"
                          >
                            <LogOut size={14} /> Log Out
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link href="/login">
                  <button className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95 cursor-pointer">
                    {t("nav.signin")}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* --- MOBILE TOP BAR --- */}
      <nav className={`fixed top-0 w-full z-50 lg:hidden px-3 py-4 transition-all duration-300 bg-white border-b border-gray-100 shadow-sm`}>
        <div className="flex justify-between items-center max-w-md mx-auto gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-[#24D2A6] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#24D2A6]/20">
              P
            </div>
            <span className="font-poppins font-black text-lg tracking-tighter text-slate-900">
              pharma<span className="text-[#24D2A6]">Locator</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Notification Bell for Mobile Top */}
            {user && (
              <button 
                onClick={() => setShowNotifications(true)}
                className="p-2.5 rounded-xl bg-gray-50 text-slate-400 relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Auth Button */}
            {user ? (
              <Link href="/account" className="shrink-0 flex items-center">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-[#24D2A6]/50 shadow-sm" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#24D2A6] to-[#1eb891] text-white flex items-center justify-center font-poppins font-black text-xs border border-[#24D2A6]/20 shadow-inner uppercase">
                    {user.name ? user.name[0] : "?"}
                  </div>
                )}
              </Link>
            ) : (
              <Link href="/login">
                <button className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-slate-900/20 flex items-center gap-2 active:scale-95 transition-transform">
                    <LogIn size={14} /> {t("nav.signin")}
                </button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* --- MOBILE/SMALL BOTTOM NAV --- */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 lg:hidden px-1 pb-6 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.name}
                href={link.href} 
                className={`flex flex-col items-center gap-0.5 transition-all duration-300 relative px-1.5 ${
                  isActive ? "text-[#24D2A6]" : "text-slate-400"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? "bg-[#24D2A6]/10" : ""}`}>
                  <link.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? "opacity-100" : "opacity-60"}`}>
                  {link.name}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="bottomNavDot"
                    className="absolute -top-1 w-1.5 h-1.5 bg-[#24D2A6] rounded-full shadow-[0_0_10px_#24D2A6]"
                  />
                )}
              </Link>
            );
          })}

          {/* Complaint & Pharma Registr — mobile dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setShowServicesMenu(!showServicesMenu)}
              className={`flex flex-col items-center gap-0.5 transition-all duration-300 relative px-1.5 ${
                serviceLinks.some(s => pathname === s.href) ? "text-rose-500" : "text-slate-400"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                serviceLinks.some(s => pathname === s.href) ? "bg-rose-50" : ""
              }`}>
                <AlertTriangle size={20} strokeWidth={2} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-tight text-center max-w-[52px]">
                Services
              </span>
            </button>

            <AnimatePresence>
              {showServicesMenu && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setShowServicesMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.18 }}
                    className="absolute bottom-full right-0 mb-3 w-52 bg-white rounded-2xl shadow-[0_-8px_40px_rgba(0,0,0,0.14)] border border-gray-100 z-[100] overflow-hidden p-2"
                  >
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 pt-1 pb-2">Services</p>
                    {serviceLinks.map((s) => (
                      <Link
                        key={s.href}
                        href={s.href}
                        onClick={() => setShowServicesMenu(false)}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
                          pathname === s.href.split("?")[0] ? `bg-gray-50 ${s.color}` : `text-slate-600 ${s.bg}`
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color} ${
                          s.href.includes("complaint") ? "bg-rose-50" : s.href.includes("register") ? "bg-emerald-50" : "bg-[#24D2A6]/10"
                        }`}>
                          <s.icon size={17} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-slate-400">{s.subtitle}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* --- FLOATING NOTIFICATIONS PANEL (user-style cards) --- */}
      <AnimatePresence>
        {showNotifications && (
          <>
            {/* Transparent Backdrop to capture clicks */}
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={() => setShowNotifications(false)}
            />
            
            {/* The Panel */}
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="fixed top-20 right-4 sm:right-10 lg:right-20 w-[350px] sm:w-[410px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[110] overflow-hidden border border-gray-100 flex flex-col"
              style={{ maxHeight: 'min(600px, 80vh)' }}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-slate-50/30">
                <h3 className="text-lg font-black text-slate-900">{t("notifications.title")}</h3>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifications(false);
                  }}
                  className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
                  title="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content - Height grows dynamically */}
              <div className="overflow-y-auto p-4 space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <motion.div 
                      key={n.id} 
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleNotificationClick(n)} 
                      className={`p-4 rounded-[1.5rem] transition-all cursor-pointer flex gap-4 border ${
                        !n.isRead ? "bg-[#24D2A6]/5 border-[#24D2A6]/20 ring-1 ring-[#24D2A6]/10" : "hover:bg-gray-50 border-gray-100"
                      }`}
                    >
                      {(() => {
                        const { Icon, bg, color } = getNotificationIcon(n.type);
                        return (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg} ${color}`}>
                            <Icon size={18} />
                          </div>
                        );
                      })()}
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-black text-slate-900 text-xs mb-1">{n.title}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissNotification(n.id);
                            }}
                            className="text-slate-350 hover:text-rose-500 p-1 rounded transition-colors shrink-0 cursor-pointer hover:bg-rose-50"
                            title="Delete notification"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <Bell size={32} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">{t("notifications.empty")}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-4 border-t border-gray-50 bg-slate-50/30 flex items-center justify-between gap-3">
                  <button
                    onClick={() => { markAllAsRead(); }}
                    className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    Mark all read
                  </button>
                  <button 
                    onClick={clearNotifications}
                    className="text-[10px] font-black text-[#24D2A6] uppercase tracking-widest hover:text-[#1eb08b] transition-colors"
                  >
                    {t("notifications.clear")}
                  </button>
                </div>
              )}
              <div className="px-4 pb-4">
                <Link
                  href="/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-slate-900 text-white py-3 text-xs font-black tracking-wide hover:bg-slate-800 transition-colors"
                >
                  {t("notifications.viewAll")}
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
