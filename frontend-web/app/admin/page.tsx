"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Store, Pill, Search, ShieldCheck, Clock3, PackageCheck } from "lucide-react";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api";

const roleMapToUI: Record<string, string> = {
  admin: "Admin",
  pharmacy_staff: "Staff",
  patient: "User",
};

const formatPhoneE164 = (phone: string | null | undefined): string => {
  if (!phone) return "No Phone";
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) {
    return trimmed;
  }
  if (trimmed.startsWith("0")) {
    return "+251" + trimmed.slice(1);
  }
  if (trimmed.startsWith("251")) {
    return "+" + trimmed;
  }
  if (trimmed.length === 9) {
    return "+251" + trimmed;
  }
  return trimmed;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>({
    users: { total: 0 },
    pharmacies: { total: 0 },
    medicines: { total: 0 },
    orders: { total: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [recentPharmacies, setRecentPharmacies] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentMedicines, setRecentMedicines] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      apiRequest<any>("/api/v1/admin/stats", { auth: true }),
      apiRequest<any>("/api/v1/admin/pharmacies?limit=4", { auth: true }),
      apiRequest<any>("/api/v1/admin/users?limit=4", { auth: true }),
      apiRequest<any>("/api/v1/admin/medicines?limit=4", { auth: true })
    ])
      .then(([statsData, phData, userData, medData]) => {
        if (statsData) {
          setStats(statsData);
        }
        const phList = Array.isArray(phData) ? phData : (phData?.data ?? []);
        setRecentPharmacies(phList);

        const userList = Array.isArray(userData) ? userData : (userData?.data ?? []);
        setRecentUsers(userList);

        const medList = Array.isArray(medData) ? medData : (medData?.data ?? []);
        setRecentMedicines(medList);
      })
      .catch((err) => console.error("Error fetching admin stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const statsConfig = [
    {
      label: "Total Users",
      value: stats.users?.total ?? 0,
      chip: "+12%",
      icon: Users,
      gradient: "from-blue-500/10 to-indigo-500/5",
      borderTheme: "border-blue-500/20 hover:border-blue-500/40",
      iconColor: "text-blue-600 bg-blue-50",
      chipTheme: "bg-blue-50 text-blue-700 border border-blue-100",
      sparkline: (
        <svg className="absolute bottom-0 left-0 right-0 h-10 w-full overflow-visible opacity-30" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d="M0 20 Q 25 15, 50 18 T 100 5 L100 20 L0 20 Z" fill="url(#blue-grad)" />
          <path d="M0 20 Q 25 15, 50 18 T 100 5" fill="none" stroke="rgb(59, 130, 246)" strokeWidth="1.5" />
          <defs>
            <linearGradient id="blue-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
              <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    {
      label: "Total Pharmacies",
      value: stats.pharmacies?.total ?? 0,
      chip: "+5%",
      icon: Store,
      gradient: "from-emerald-500/10 to-teal-500/5",
      borderTheme: "border-emerald-500/20 hover:border-emerald-500/40",
      iconColor: "text-emerald-600 bg-emerald-50",
      chipTheme: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      sparkline: (
        <svg className="absolute bottom-0 left-0 right-0 h-10 w-full overflow-visible opacity-30" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d="M0 18 Q 30 14, 60 10 T 100 4 L100 20 L0 20 Z" fill="url(#emerald-grad)" />
          <path d="M0 18 Q 30 14, 60 10 T 100 4" fill="none" stroke="rgb(16, 185, 129)" strokeWidth="1.5" />
          <defs>
            <linearGradient id="emerald-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    {
      label: "Total Medicines",
      value: stats.medicines?.total ?? 0,
      chip: "Stable",
      icon: Pill,
      gradient: "from-purple-500/10 to-pink-500/5",
      borderTheme: "border-purple-500/20 hover:border-purple-500/40",
      iconColor: "text-purple-600 bg-purple-50",
      chipTheme: "bg-purple-50 text-purple-700 border border-purple-100",
      sparkline: (
        <svg className="absolute bottom-0 left-0 right-0 h-10 w-full overflow-visible opacity-30" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d="M0 14 Q 25 10, 50 15 T 100 13 L100 20 L0 20 Z" fill="url(#purple-grad)" />
          <path d="M0 14 Q 25 10, 50 15 T 100 13" fill="none" stroke="rgb(168, 85, 247)" strokeWidth="1.5" />
          <defs>
            <linearGradient id="purple-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(168, 85, 247, 0.4)" />
              <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
    {
      label: "Platform Orders",
      value: stats.orders?.total ?? 0,
      chip: "+15%",
      icon: PackageCheck,
      gradient: "from-amber-500/10 to-orange-500/5",
      borderTheme: "border-amber-500/20 hover:border-amber-500/40",
      iconColor: "text-amber-600 bg-amber-50",
      chipTheme: "bg-amber-50 text-amber-700 border border-amber-100",
      sparkline: (
        <svg className="absolute bottom-0 left-0 right-0 h-10 w-full overflow-visible opacity-30" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d="M0 20 Q 25 18, 50 10 T 100 2 L100 20 L0 20 Z" fill="url(#amber-grad)" />
          <path d="M0 20 Q 25 18, 50 10 T 100 2" fill="none" stroke="rgb(245, 158, 11)" strokeWidth="1.5" />
          <defs>
            <linearGradient id="amber-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(245, 158, 11, 0.4)" />
              <stop offset="100%" stopColor="rgba(245, 158, 11, 0)" />
            </linearGradient>
          </defs>
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-4xl font-black text-slate-900">Platform Overview</h1>
        <p className="mt-1 text-slate-500">Real-time health metrics and operational status.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {statsConfig.map((item, idx) => {
          const formattedValue = typeof item.value === "number"
            ? (loading ? "..." : item.value.toLocaleString())
            : item.value;

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.45 }}
              whileHover={{ y: -6, scale: 1.02 }}
              className={`relative overflow-hidden rounded-[2.5rem] border ${item.borderTheme} bg-gradient-to-br from-white via-white to-slate-50/30 p-6 shadow-sm hover:shadow-xl transition-all duration-300 group`}
            >
              {/* Sparkline Graphic */}
              {item.sparkline}

              <div className="flex items-center justify-between relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.iconColor} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                  <item.icon size={20} />
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-black tracking-wider uppercase ${item.chipTheme} shadow-2xs`}>
                  {item.chip}
                </span>
              </div>

              <div className="mt-6 relative z-10 text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 text-3xl font-black text-slate-900 tracking-tight">
                  {formattedValue}
                </p>
              </div>

              {/* Decorative Accent Spot */}
              <div className={`absolute -right-6 -bottom-6 w-16 h-16 rounded-full bg-gradient-to-br ${item.gradient} opacity-20 blur-xl group-hover:scale-150 transition-transform duration-500`} />
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_280px]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-3xl font-black text-slate-900">Recent Pharmacy Approvals</h2>
            <Link href="/admin/pharmacy-management" className="text-xs font-bold text-[#24D2A6] hover:text-[#1eb08b] transition-colors">
              VIEW ALL
            </Link>
          </div>
          <div className="space-y-0">
            {recentPharmacies.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                {loading ? "Loading approvals..." : "No recent pharmacy registrations found."}
              </div>
            ) : (
              recentPharmacies.map((ph, idx) => (
                <motion.div
                  key={ph._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.25 }}
                  className="grid grid-cols-4 items-center border-b border-slate-100 px-5 py-3 text-sm last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    {ph.logo_url || ph.image_url ? (
                      <img 
                        src={ph.logo_url || ph.image_url} 
                        alt={ph.name} 
                        className="w-8 h-8 rounded-lg object-cover border border-slate-205 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#24D2A6] to-[#1eb08b] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                        {ph.name ? ph.name.charAt(0).toUpperCase() : "P"}
                      </div>
                    )}
                    <span className="font-semibold text-slate-800 leading-tight">{ph.name}</span>
                  </div>
                  <span className="text-slate-500">{ph.city || "Addis Ababa"}</span>
                  <span className="text-slate-500">
                    {ph.created_at ? new Date(ph.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}
                  </span>
                  <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                    ph.status === "approved" ? "bg-emerald-100 text-emerald-700" : ph.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                  }`}>
                    {ph.status === "approved" ? "Approved" : ph.status === "pending" ? "Pending" : ph.status}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#24D2A6]/20 bg-gradient-to-br from-[#24D2A6]/10 via-white to-emerald-50 p-4 shadow-sm">
            <h3 className="mb-3 text-xl font-black text-slate-900">Pharmacy Service Pulse</h3>
            <div className="space-y-3">
              {[
                { label: "Verified pharmacies active", value: loading ? "..." : (stats.pharmacies?.approved ?? 0).toLocaleString(), icon: ShieldCheck },
                { label: "Avg prescription preparation", value: "16 min", icon: Clock3 },
                { label: "Successful orders fulfilled today", value: loading ? "..." : (stats.orders?.completed ?? 0).toLocaleString(), icon: PackageCheck },
              ].map((metric) => (
                <div key={metric.label} className="flex items-center justify-between rounded-xl border border-white bg-white/80 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <metric.icon size={14} className="text-[#24D2A6]" />
                    {metric.label}
                  </div>
                  <span className="text-sm font-black text-slate-900">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Users & Medicines Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Users Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-2xl font-black text-slate-900">Recent Users</h2>
            <Link href="/admin/user-management" className="text-xs font-bold text-[#24D2A6] hover:text-[#1eb08b] transition-colors">
              VIEW ALL
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentUsers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                {loading ? "Loading users..." : "No recent users found."}
              </div>
            ) : (
              recentUsers.map((user, idx) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.25 }}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
                      {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-slate-800 text-xs leading-snug">{user.full_name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{user.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500 font-semibold">{formatPhoneE164(user.phone)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      user.role === "admin" 
                        ? "bg-purple-100 text-purple-700 border border-purple-200/50" 
                        : user.role === "pharmacy_staff"
                        ? "bg-blue-100 text-blue-700 border border-blue-200/50"
                        : "bg-slate-100 text-slate-700 border border-slate-200/50"
                    }`}>
                      {roleMapToUI[user.role] || user.role}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Recent Medicines Card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-2xl font-black text-slate-900">Recent Medicines</h2>
            <Link href="/admin/medicine-management" className="text-xs font-bold text-[#24D2A6] hover:text-[#1eb08b] transition-colors">
              VIEW ALL
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentMedicines.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                {loading ? "Loading medicines..." : "No recent medicines found."}
              </div>
            ) : (
              recentMedicines.map((med, idx) => (
                <motion.div
                  key={med._id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.25 }}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {med.image_url ? (
                      <img 
                        src={med.image_url} 
                        alt={med.name} 
                        className="w-8 h-8 rounded-lg object-cover border border-slate-205 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-bold text-xs flex-shrink-0">
                        💊
                      </div>
                    )}
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-slate-800 text-xs leading-snug">{med.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{med.generic_name || "Generic"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                      {med.category || "General"}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${
                      med.requires_rx 
                        ? "bg-rose-100 text-rose-700 border border-rose-200/50 animate-pulse" 
                        : "bg-emerald-100 text-emerald-700 border border-emerald-200/50"
                    }`}>
                      {med.requires_rx ? "Rx Required" : "OTC"}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[#24D2A6] p-6 text-white shadow-sm">
        <p className="text-4xl font-black">Pharmacy Network Growth Update</p>
        <p className="mt-2 max-w-3xl text-white/90">
          Partner pharmacies now fulfill most confirmed medicine requests within minutes, helping users find and reserve medicines faster.
        </p>
      </div>

      <div className="rounded-[2.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-2xl font-black text-slate-900">Animated Analytics Snapshot</h3>
        <p className="mt-1 text-sm text-slate-500">Most searched medicines, complaints trend, and user activity are actively monitored.</p>
        
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {/* Card 1: Search Trend (Weekly User Registrations) */}
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6 flex flex-col justify-between h-56 relative overflow-hidden group">
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Weekly User Growth</p>
              <h4 className="text-sm font-black text-slate-800 mt-1">
                {loading ? "Loading..." : `Most Searched: ${stats.analytics?.most_searched_medicine ?? "Paracetamol"}`}
              </h4>
            </div>
            {/* SVG Line Chart with Grid Lines and Days */}
            <div className="h-28 w-full mt-2 relative">
              {/* Grid background */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-30">
                <div className="border-b border-dashed border-slate-350 w-full h-0" />
                <div className="border-b border-dashed border-slate-350 w-full h-0" />
                <div className="border-b border-dashed border-slate-350 w-full h-0" />
              </div>
              
              <svg className="w-full h-20 overflow-visible" viewBox="0 0 100 25" preserveAspectRatio="none">
                {(() => {
                  const data = stats.analytics?.weekly_user_registrations ?? [];
                  if (data.length === 0) return null;
                  const maxVal = Math.max(...data.map((d: any) => d.count), 5);
                  const points = data.map((d: any, idx: number) => {
                    const x = (idx / (data.length - 1)) * 100;
                    const y = 22 - (d.count / maxVal) * 18;
                    return `${x},${y}`;
                  }).join(" ");

                  const fillPoints = `0,25 ${points} 100,25 Z`;
                  return (
                    <>
                      {/* Area Under Curve */}
                      <polygon points={fillPoints} fill="url(#user-chart-grad)" />
                      {/* Chart Line */}
                      <polyline
                        points={points}
                        fill="none"
                        stroke="#24D2A6"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Chart Dots */}
                      {data.map((d: any, idx: number) => {
                        const x = (idx / (data.length - 1)) * 100;
                        const y = 22 - (d.count / maxVal) * 18;
                        return (
                          <circle
                            key={idx}
                            cx={x}
                            cy={y}
                            r="1.5"
                            fill="#FFFFFF"
                            stroke="#24D2A6"
                            strokeWidth="1"
                          />
                        );
                      })}
                      <defs>
                        <linearGradient id="user-chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(36, 210, 166, 0.35)" />
                          <stop offset="100%" stopColor="rgba(36, 210, 166, 0)" />
                        </linearGradient>
                      </defs>
                    </>
                  );
                })()}
              </svg>
              {/* X Axis Labels */}
              <div className="flex justify-between mt-1 text-[8px] font-extrabold text-slate-450 uppercase tracking-wider">
                {(stats.analytics?.weekly_user_registrations ?? []).map((d: any, idx: number) => (
                  <span key={idx}>{d.day}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Complaints Status Bar Chart */}
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6 flex flex-col justify-between h-56 group">
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Resolution Speed</p>
              <h4 className="text-sm font-black text-slate-800 mt-1">
                Complaint Resolution: {loading ? "..." : `${stats.analytics?.complaint_resolution_rate ?? 100}%`}
              </h4>
            </div>
            {/* SVG Bar Chart with Grid and Ticks */}
            <div className="h-28 w-full mt-2 relative flex flex-col justify-between">
              <div className="flex-1 flex items-end justify-around gap-2 pb-1 relative">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-dashed border-slate-400 w-full h-0" />
                  <div className="border-b border-dashed border-slate-400 w-full h-0" />
                  <div className="border-b border-dashed border-slate-400 w-full h-0" />
                </div>

                {(() => {
                  const breakdown = stats.analytics?.complaints_breakdown ?? { new: 0, under_review: 0, resolved: 0, closed: 0 };
                  const categories = [
                    { label: "New", count: breakdown.new, color: "bg-rose-500 shadow-rose-500/10" },
                    { label: "Review", count: breakdown.under_review, color: "bg-amber-500 shadow-amber-500/10" },
                    { label: "Resolved", count: breakdown.resolved, color: "bg-emerald-500 shadow-emerald-500/10" },
                    { label: "Closed", count: breakdown.closed, color: "bg-slate-500 shadow-slate-500/10" },
                  ];
                  const maxCount = Math.max(...categories.map(c => c.count), 1);

                  return categories.map((cat, i) => {
                    const barHeightPercent = Math.max((cat.count / maxCount) * 100, 8); // min 8% for visibility
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group/bar">
                        <span className="text-[9px] font-black text-slate-700 mb-1 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                          {cat.count}
                        </span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${barHeightPercent}%` }}
                          transition={{ delay: i * 0.06, duration: 0.45 }}
                          className={`w-5 rounded-t-md ${cat.color} opacity-85 hover:opacity-100 hover:scale-x-105 transition-all shadow-md`}
                        />
                      </div>
                    );
                  });
                })()}
              </div>
              {/* X Axis Labels */}
              <div className="flex justify-around mt-1 text-[8px] font-extrabold text-slate-455 uppercase tracking-wider">
                <span>New</span>
                <span>Review</span>
                <span>Resolved</span>
                <span>Closed</span>
              </div>
            </div>
          </div>

          {/* Card 3: Pharmacy Growth Chart */}
          <div className="rounded-[2rem] border border-slate-100 bg-slate-50/50 p-6 flex flex-col justify-between h-56 group">
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Platform Activity</p>
              <h4 className="text-sm font-black text-slate-800 mt-1">
                Daily Active: {loading ? "..." : (stats.analytics?.daily_active_users ?? 0).toLocaleString()}
              </h4>
            </div>
            {/* SVG Bar Chart for weekly pharmacy registrations */}
            <div className="h-28 w-full mt-2 relative flex flex-col justify-between">
              <div className="flex-1 flex items-end justify-around gap-1.5 pb-1 relative">
                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                  <div className="border-b border-dashed border-slate-400 w-full h-0" />
                  <div className="border-b border-dashed border-slate-400 w-full h-0" />
                  <div className="border-b border-dashed border-slate-400 w-full h-0" />
                </div>

                {(() => {
                  const data = stats.analytics?.weekly_pharmacy_registrations ?? [];
                  if (data.length === 0) return null;
                  const maxVal = Math.max(...data.map((d: any) => d.count), 3);
                  return data.map((d: any, idx: number) => {
                    const barHeightPercent = Math.max((d.count / maxVal) * 100, 6);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group/bar">
                        <span className="text-[9px] font-black text-slate-700 mb-1 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                          {d.count}
                        </span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${barHeightPercent}%` }}
                          transition={{ delay: idx * 0.05, duration: 0.45 }}
                          className="w-3 bg-blue-500 rounded-t-md opacity-80 hover:opacity-100 hover:scale-x-110 transition-all shadow-md shadow-blue-500/10"
                        />
                      </div>
                    );
                  });
                })()}
              </div>
              {/* X Axis Labels */}
              <div className="flex justify-between mt-1 text-[8px] font-extrabold text-slate-455 uppercase tracking-wider">
                {(stats.analytics?.weekly_pharmacy_registrations ?? []).map((d: any, idx: number) => (
                  <span key={idx}>{d.day}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
