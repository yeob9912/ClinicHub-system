import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, CheckCheck, ChevronRight } from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  desc: string;
  time: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bg: string;
  isRead: boolean;
}

interface NotificationsProps {
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  recentActivity: NotificationItem[];
  onNotificationClick: (item: NotificationItem) => void;
  onNotificationDelete: (id: string, e: React.MouseEvent) => void;
  onMarkAllAsRead: () => void;
}

export default function Notifications({
  showNotifications,
  setShowNotifications,
  recentActivity,
  onNotificationClick,
  onNotificationDelete,
  onMarkAllAsRead,
}: NotificationsProps) {
  const hasRealNotifications = recentActivity.length > 0 && recentActivity[0].id !== "1";
  const unreadCount = recentActivity.filter((n) => !n.isRead && n.id !== "1").length;

  return (
    <AnimatePresence>
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setShowNotifications(false)} />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed top-20 right-4 sm:right-10 lg:right-20 w-[350px] sm:w-[400px] bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[110] overflow-hidden border border-gray-100 flex flex-col"
            style={{ maxHeight: "min(600px,80vh)" }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">System Alerts</h3>
                {unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Mark All as Read — right side, no underline, with arrow + hover */}
                {hasRealNotifications && (
                  <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#24D2A6] hover:bg-[#24D2A6]/10 hover:text-[#1a9f80] transition-all group cursor-pointer"
                    title="Mark all notifications as read"
                  >
                    <CheckCheck size={13} className="shrink-0" />
                    <span>Mark all read</span>
                    <ChevronRight size={11} className="shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto p-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {recentActivity.map((n) => {
                  const IconComponent = n.icon;
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                      key={n.id}
                      onClick={() => onNotificationClick(n)}
                      className={`p-4 rounded-[1.5rem] flex items-start gap-4 transition-all cursor-pointer group/item relative ${
                        !n.isRead ? "bg-[#24D2A6]/5 hover:bg-[#24D2A6]/10" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Unread dot indicator */}
                      {!n.isRead && n.id !== "1" && (
                        <span className="absolute top-3.5 left-3 w-1.5 h-1.5 bg-[#24D2A6] rounded-full" />
                      )}

                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.bg} ${n.color} mt-0.5`}>
                        <IconComponent size={18} />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className={`font-black text-slate-900 text-xs mb-1 truncate ${!n.isRead ? "text-slate-950" : ""}`}>
                            {n.title}
                          </p>
                          {n.id !== "1" && (
                            <button
                              onClick={(e) => onNotificationDelete(n.id, e)}
                              className="text-slate-300 hover:text-rose-500 group-hover/item:text-slate-400 p-1 rounded transition-all shrink-0 cursor-pointer hover:bg-rose-50/50"
                              title="Delete alert"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-1.5 break-words">{n.desc}</p>
                        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider">{n.time}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
