"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  Calendar, 
  ShoppingBag, 
  Info, 
  Trash2, 
  CheckCheck,
  ChevronRight,
  Clock,
  AlertCircle
} from "lucide-react";
import { useUser, Notification } from "@/context/UserContext";
import { motion, AnimatePresence } from "framer-motion";

export default function NotificationsPage() {
  const router = useRouter();
  const { user, notifications, markAsRead, clearNotifications, dismissNotification } = useUser();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "appointment": return <Calendar size={20} />;
      case "order": return <ShoppingBag size={20} />;
      default: return <Info size={20} />;
    }
  };

  const getBgColor = (type: Notification["type"]) => {
    switch (type) {
      case "appointment": return "bg-emerald-50 text-emerald-600";
      case "order": return "bg-blue-50 text-blue-600";
      default: return "bg-amber-50 text-amber-600";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      
      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2 flex items-center gap-4">
                Notifications
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-xs font-black px-3 py-1 rounded-full">
                    {unreadCount} NEW
                  </span>
                )}
              </h1>
              <p className="text-slate-500 font-medium">Stay updated on your health activities and orders.</p>
            </div>
            
            {notifications.length > 0 && (
              <button 
                onClick={clearNotifications}
                className="flex items-center gap-2 text-rose-500 font-bold text-sm hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
              >
                <Trash2 size={18} /> Clear All
              </button>
            )}
          </div>

          <div className="space-y-4">
            {notifications.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {notifications.map((n, idx) => (
                  <motion.div 
                    key={n.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={async () => {
                      await markAsRead(n.id);

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

                      if (n.link) {
                        router.push(n.link);
                        return;
                      }

                      const pharmacyId = (n as any).data?.pharmacy_id;
                      const orderId    = (n as any).data?.order_id;

                      if (n.type === "chat_message") {
                        router.push(pharmacyId ? `/pharmacies/${pharmacyId}?action=chat` : "/pharmacies");
                      } else if (n.type === "call" || n.type === "call_request" || n.type === "visit_request") {
                        router.push(pharmacyId ? `/pharmacies/${pharmacyId}?action=call` : "/pharmacies");
                      } else if (n.type?.startsWith("order_") || n.type === "order" || n.type === "appointment") {
                        router.push(orderId ? `/account?tab=history&order_id=${orderId}` : "/account?tab=history");
                      } else {
                        router.push("/notifications");
                      }
                    }}
                    className={`relative bg-white p-6 rounded-[2rem] border transition-all cursor-pointer group ${
                      n.isRead ? "border-gray-100 opacity-70" : "border-[#24D2A6]/20 shadow-lg shadow-[#24D2A6]/5 ring-1 ring-[#24D2A6]/10"
                    }`}
                  >
                    <div className="flex gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${getBgColor(n.type)}`}>
                        {getIcon(n.type)}
                      </div>
                      
                      <div className="flex-grow">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={`font-bold text-lg ${n.isRead ? "text-slate-700" : "text-slate-900"}`}>{n.title}</h3>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <Clock size={12} />
                              {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(n.id);
                              }}
                              className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-all duration-200"
                              title="Delete notification"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <p className={`text-sm leading-relaxed mb-4 ${n.isRead ? "text-slate-400" : "text-slate-600"}`}>
                          {n.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {!n.isRead && (
                              <span className="flex items-center gap-1.5 text-[10px] font-black text-[#24D2A6] uppercase tracking-widest">
                                <CheckCheck size={14} /> New Update
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                              {new Date(n.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {n.link && (
                            <Link href={n.link} className="flex items-center gap-1 text-blue-600 font-bold text-sm hover:gap-2 transition-all">
                              View Details <ChevronRight size={16} />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <div className="bg-white rounded-[3rem] p-16 text-center border border-gray-100 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-300">
                  <Bell size={48} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2">No notifications yet</h3>
                <p className="text-slate-400 max-w-xs mx-auto mb-10">We'll let you know when your orders are ready or appointments are confirmed.</p>
                <Link href="/" className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20">
                  Go back home
                </Link>
              </div>
            )}
          </div>

          {/* Tips Section */}
          <div className="mt-12 bg-[#24D2A6]/5 border border-[#24D2A6]/10 rounded-3xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 bg-[#24D2A6] text-white rounded-xl flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">Tip: Enable Push Notifications</h4>
              <p className="text-sm text-slate-600">Get real-time updates even when the app is closed. You can manage this in your browser settings.</p>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}
