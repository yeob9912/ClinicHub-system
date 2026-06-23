import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, Bell, Trash2, Upload, Image as ImageIcon,
  Volume2, Pin, Eye, HelpCircle, Megaphone
} from "lucide-react";
import { apiFetch } from "./utils";
import { apiRequest } from "@/lib/api";

interface ScheduleProps {
  pharmacyId: string | null;
  pharmacyName: string;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function SchedulePage({ pharmacyId, pharmacyName, showToast }: ScheduleProps) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // Operating Hours states
  const [is24Hours, setIs24Hours] = useState(true);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<Record<string, any>>({
    mon: { open: "08:00", close: "22:00", closed: false },
    tue: { open: "08:00", close: "22:00", closed: false },
    wed: { open: "08:00", close: "22:00", closed: false },
    thu: { open: "08:00", close: "22:00", closed: false },
    fri: { open: "08:00", close: "22:00", closed: false },
    sat: { open: "08:00", close: "22:00", closed: false },
    sun: { open: "08:00", close: "22:00", closed: true }
  });

  const handleSaveSchedule = async () => {
    if (!pharmacyId) return;
    setIsSavingSchedule(true);
    try {
      const opening_hours = is24Hours ? null : weeklyHours;
      await apiRequest(`/api/v1/pharmacies/${pharmacyId}/settings`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          opening_hours
        })
      });
      showToast("Schedule updated successfully!", "success");
      setIsEditingSchedule(false);
    } catch (err: any) {
      showToast("Failed to update schedule: " + err.message, "error");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // New announcement state
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    type: "general" as "holiday" | "service_interruption" | "emergency" | "maintenance" | "event" | "achievement" | "general",
    image_url: "",
    is_pinned: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load pharmacy data & announcements from database
  useEffect(() => {
    if (!pharmacyId) return;
    apiFetch(`/pharmacies/${pharmacyId}`)
      .then((res: any) => {
        const phData = res.data ?? res;
        if (phData) {
          if (phData.opening_hours) {
            setIs24Hours(false);
            setWeeklyHours(phData.opening_hours);
          } else {
            setIs24Hours(true);
          }

          if (phData.announcements) {
            // Sort announcements: pinned first, then newest
            const sorted = [...phData.announcements].sort((a: any, b: any) => {
              if (a.is_pinned && !b.is_pinned) return -1;
              if (!a.is_pinned && b.is_pinned) return 1;
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
            setAnnouncements(sorted);
          }
        }
      })
      .catch(() => {});
  }, [pharmacyId]);

  // Handle local base64 image upload for announcement
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast("Image size must be smaller than 2MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setNewAnnouncement(prev => ({ ...prev, image_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Publish Announcement
  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyId) {
      showToast("Pharmacy ID not loaded.", "error");
      return;
    }
    if (!newAnnouncement.title.trim() && !newAnnouncement.image_url) {
      showToast("Please provide at least a title or an image.", "error");
      return;
    }

    setIsPublishing(true);
    try {
      const res = await apiRequest<any>(`/api/v1/pharmacies/${pharmacyId}/announcements`, {
        method: "POST",
        auth: true,
        body: JSON.stringify(newAnnouncement)
      });
      
      const published = res.data ?? res;
      setAnnouncements(prev => {
        const next = [published, ...prev];
        return next.sort((a: any, b: any) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      });

      setNewAnnouncement({
        title: "",
        content: "",
        type: "general",
        image_url: "",
        is_pinned: false
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      showToast("Announcement published successfully!", "success");
    } catch {
      showToast("Failed to publish announcement.", "error");
    } finally {
      setIsPublishing(false);
    }
  };

  // Delete Announcement
  const handleDeleteAnnouncement = async (annId: string) => {
    if (!pharmacyId) return;
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    try {
      await apiRequest(`/api/v1/pharmacies/${pharmacyId}/announcements/${annId}`, {
        method: "DELETE",
        auth: true
      });
      setAnnouncements(prev => prev.filter(a => a._id !== annId));
      showToast("Announcement deleted successfully.", "info");
    } catch {
      showToast("Failed to delete announcement.", "error");
    }
  };

  const getAnnouncementBadgeStyles = (type: string) => {
    switch (type) {
      case "emergency":
        return "bg-rose-50 border-rose-100 text-rose-700";
      case "holiday":
        return "bg-amber-50 border-amber-100 text-amber-700";
      case "service_interruption":
        return "bg-orange-50 border-orange-100 text-orange-700";
      case "maintenance":
        return "bg-slate-50 border-slate-200 text-slate-700";
      case "event":
        return "bg-purple-50 border-purple-100 text-purple-700";
      case "achievement":
        return "bg-emerald-50 border-emerald-100 text-emerald-700";
      default:
        return "bg-teal-50 border-teal-100 text-[#0F766E]";
    }
  };

  return (
    <div className="bg-[#F1F3F6] text-[#1E293B] p-6 md:p-10 font-sans relative rounded-3xl shadow-xs">
      
      {/* Background Graphic Accent Mesh */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* HEADER SECTION */}
      <header className="mb-8 relative z-10">
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Volume2 className="h-8 w-8 text-[#0F766E]" /> Announcements & Schedule
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Broadcast announcements and updates about pharmacy operations. Your schedule is configured as 24-hour service. Use notices to alert users about exceptions.
        </p>
      </header>

      {/* CORE WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">
        
        {/* COLUMN 1: SCHEDULE OVERVIEW & PUBLIC USER-PAGE PREVIEW (4 Columns) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Pharmacy Public Working Hours Status Card */}
          {isEditingSchedule ? (
            <div className="bg-white rounded-2xl border border-[#0F766E]/40 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-[#0F766E]" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Edit Schedule</h3>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Open 24/7 (Always Open)</span>
                  <span className="block text-[9px] text-slate-400 font-medium">Default mode showing open 24 hours every day.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIs24Hours(!is24Hours)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${is24Hours ? "bg-[#0F766E]" : "bg-slate-300"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${is24Hours ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              {!is24Hours && (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {[
                    { key: "mon", label: "Monday" },
                    { key: "tue", label: "Tuesday" },
                    { key: "wed", label: "Wednesday" },
                    { key: "thu", label: "Thursday" },
                    { key: "fri", label: "Friday" },
                    { key: "sat", label: "Saturday" },
                    { key: "sun", label: "Sunday" }
                  ].map((day) => {
                    const dayHours = weeklyHours[day.key] || { open: "08:00", close: "22:00", closed: false };
                    return (
                      <div key={day.key} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-700">{day.label}</span>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={dayHours.closed}
                              onChange={(e) => {
                                setWeeklyHours(prev => ({
                                  ...prev,
                                  [day.key]: { ...dayHours, closed: e.target.checked }
                                }));
                              }}
                              className="rounded text-[#0F766E] focus:ring-[#0F766E] h-3.5 w-3.5"
                            />
                            <span className="text-[11px] font-semibold text-slate-500">Closed</span>
                          </label>
                        </div>

                        {!dayHours.closed && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Open</label>
                              <input
                                type="text"
                                placeholder="08:00"
                                value={dayHours.open}
                                onChange={(e) => {
                                  setWeeklyHours(prev => ({
                                    ...prev,
                                    [day.key]: { ...dayHours, open: e.target.value }
                                  }));
                                }}
                                className="w-full px-2.5 py-1 text-xs border rounded-lg text-slate-800 bg-white font-semibold font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 uppercase">Close</label>
                              <input
                                type="text"
                                placeholder="22:00"
                                value={dayHours.close}
                                onChange={(e) => {
                                  setWeeklyHours(prev => ({
                                    ...prev,
                                    [day.key]: { ...dayHours, close: e.target.value }
                                  }));
                                }}
                                className="w-full px-2.5 py-1 text-xs border rounded-lg text-slate-800 bg-white font-semibold font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  disabled={isSavingSchedule}
                  className="flex-1 py-2 bg-[#0F766E] hover:bg-[#0d665f] text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingSchedule && <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />}
                  Save Schedule
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4.5 w-4.5 text-[#0F766E]" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Weekly Schedule</h3>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${is24Hours ? "bg-emerald-50 text-emerald-600" : "bg-teal-50 text-[#0F766E]"}`}>
                  {is24Hours ? "24 Hours" : "Custom"}
                </span>
              </div>
              
              <div className="space-y-3 text-xs leading-relaxed font-semibold text-slate-500">
                {is24Hours ? (
                  <>
                    <p>This pharmacy is designated as an <span className="text-emerald-600 font-bold">All-Day 24-Hour Service provider</span>.</p>
                    <p>The public schedule shows <span className="text-slate-800 font-bold">Open 24 Hours</span> for all days.</p>
                  </>
                ) : (
                  <div className="space-y-1.5 border-t border-slate-100/60 pt-2">
                    {[
                      { key: "mon", label: "Monday" },
                      { key: "tue", label: "Tuesday" },
                      { key: "wed", label: "Wednesday" },
                      { key: "thu", label: "Thursday" },
                      { key: "fri", label: "Friday" },
                      { key: "sat", label: "Saturday" },
                      { key: "sun", label: "Sunday" }
                    ].map((day) => {
                      const dayHours = weeklyHours[day.key] || { closed: true };
                      return (
                        <div key={day.key} className="flex justify-between items-center py-0.5 border-b border-slate-50 last:border-b-0">
                          <span className="text-slate-500">{day.label}</span>
                          {dayHours.closed ? (
                            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">Closed</span>
                          ) : (
                            <span className="font-bold font-mono text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md">
                              {dayHours.open} - {dayHours.close}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsEditingSchedule(true)}
                  className="w-full mt-2 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[#0F766E] font-bold text-xs rounded-xl transition-all"
                >
                  Edit Working Hours
                </button>
              </div>
            </div>
          )}

          {/* DYNAMIC PUBLIC CLIENT-SIDE USER-PAGE PREVIEW CARD BLOCK */}
          <div className="bg-white rounded-2xl border border-[#0F766E]/30 overflow-hidden shadow-sm relative">
            <div className="bg-gradient-to-r from-[#0F766E] to-teal-800 px-4 py-2 flex justify-between items-center text-white">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Public hours page
              </span>
              <span className="text-[9px] bg-white/20 text-white font-black uppercase px-2 py-0.5 rounded tracking-wide">
                Live Preview
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 tracking-tight">{pharmacyName}</h4>
                <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 inline-block px-2 py-0.5 rounded-full mt-1">
                  ● {is24Hours ? "24 Hour Service Active" : "Custom Hours Active"}
                </p>
              </div>

              {/* Public Display Target Component Row */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-1 text-[#0F766E] text-[10px] font-black uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" /> Working Hours
                </div>

                {is24Hours ? (
                  <div className="flex items-center justify-between bg-white border border-emerald-100 rounded-lg px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold text-slate-600">Every Day</span>
                    </div>
                    <span className="font-mono font-black text-xs bg-emerald-50 px-3 py-1 rounded-full text-emerald-700 border border-emerald-100">
                      Open 24 Hours
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1 bg-white border border-slate-100 rounded-lg p-2.5 text-[10px]">
                    {[
                      { key: "mon", label: "Mon" },
                      { key: "tue", label: "Tue" },
                      { key: "wed", label: "Wed" },
                      { key: "thu", label: "Thu" },
                      { key: "fri", label: "Fri" },
                      { key: "sat", label: "Sat" },
                      { key: "sun", label: "Sun" }
                    ].map((day) => {
                      const dayHours = weeklyHours[day.key] || { closed: true };
                      return (
                        <div key={day.key} className="flex justify-between py-0.5 border-b border-slate-50 last:border-b-0">
                          <span className="font-bold text-slate-500">{day.label}</span>
                          {dayHours.closed ? (
                            <span className="text-rose-600 font-bold">Closed</span>
                          ) : (
                            <span className="font-mono font-bold text-slate-800">
                              {dayHours.open} - {dayHours.close}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

                <p className="text-[9px] text-slate-400 font-medium pt-1">
                  Use announcements to signal any temporary exceptions.
                </p>
              </div>
            </div>
          </div>

        {/* COLUMN 2: REAL-TIME ANNOUNCEMENTS & NOTICES (8 Columns) */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Form to Publish Announcement */}
            <div className="md:col-span-5 bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Volume2 className="h-5 w-5 text-[#0F766E]" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">Publish Notice</h3>
              </div>

              <form onSubmit={handlePublishAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notice Category</label>
                  <select
                    value={newAnnouncement.type}
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-semibold"
                  >
                    <option value="general">General Notice</option>
                    <option value="holiday">Holiday Closure</option>
                    <option value="service_interruption">Service Interruption</option>
                    <option value="emergency">Emergency Notice ⚠️</option>
                    <option value="maintenance">Maintenance Update</option>
                    <option value="event">Special Event / Promotion</option>
                    <option value="achievement">Achievement & Award 🏆</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Temporary Closure Notice"
                    value={newAnnouncement.title} 
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Content / Message</label>
                  <textarea 
                    rows={4}
                    placeholder="Type exception details for customers and administrators..."
                    value={newAnnouncement.content} 
                    onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-medium leading-relaxed"
                  />
                </div>

                {/* Image uploading */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Attach Image Graphic</span>
                  
                  <div className="flex items-center gap-4">
                    {newAnnouncement.image_url ? (
                      <div className="w-16 h-16 bg-slate-200 rounded-lg overflow-hidden border shrink-0">
                        <img src={newAnnouncement.image_url} alt="Attached Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center shrink-0 text-slate-300">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold shadow-2xs hover:bg-slate-50 hover:border-[#0F766E]/40 transition-all cursor-pointer">
                        <Upload className="h-3 w-3 text-[#0F766E]" />
                        Upload graphic
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                      {newAnnouncement.image_url && (
                        <button
                          type="button"
                          onClick={() => setNewAnnouncement(prev => ({ ...prev, image_url: "" }))}
                          className="text-[10px] text-rose-600 font-bold hover:underline self-start"
                        >
                          Remove graphic
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pin announcement */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="block text-xs font-bold text-slate-800">Pin at top of page</span>
                    <span className="block text-[9px] text-slate-400 font-medium">Highlight this notice prominently for customers.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewAnnouncement(prev => ({ ...prev, is_pinned: !prev.is_pinned }))}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${newAnnouncement.is_pinned ? "bg-[#0F766E]" : "bg-slate-300"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${newAnnouncement.is_pinned ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={isPublishing}
                  className="w-full py-2.5 bg-[#0F766E] text-white font-bold text-xs rounded-xl hover:bg-[#0d665f] transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-98 disabled:opacity-60 font-black uppercase tracking-wider"
                >
                  {isPublishing ? (
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Megaphone className="h-3.5 w-3.5" />
                  )}
                  Publish Notice
                </button>
              </form>
            </div>

            {/* Published Announcement List */}
            <div className="md:col-span-7 space-y-3">
              <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2">Active Notices & Announcements ({announcements.length})</span>
              
              <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
                {announcements.length === 0 ? (
                  <div className="bg-white p-8 rounded-2xl border border-slate-200/60 text-center space-y-2">
                    <HelpCircle className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-400 leading-relaxed">
                      No active announcements published yet.<br />Use the form to post holiday closures, emergency notices, or promotions.
                    </p>
                  </div>
                ) : announcements.map((ann) => (
                  <div 
                    key={ann._id} 
                    className={`bg-white rounded-2xl border p-4 shadow-sm relative overflow-hidden transition-all flex flex-col justify-between ${
                      ann.is_pinned ? "border-amber-300 shadow-md ring-2 ring-amber-50" : "border-slate-200/60"
                    }`}
                  >
                    {/* Pinned flag */}
                    {ann.is_pinned && (
                      <div className="absolute top-0 right-0 bg-amber-400 text-white pl-3 pr-2.5 py-1 rounded-bl-xl flex items-center gap-1 font-bold text-[9px] uppercase tracking-wider shadow-2xs">
                        <Pin size={10} className="fill-current" /> Pinned
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border font-mono ${getAnnouncementBadgeStyles(ann.type)}`}>
                          {ann.type.replace("_", " ")}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(ann.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight">{ann.title}</h4>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2.5 whitespace-pre-line">{ann.content}</p>
                      </div>

                      {ann.image_url && (
                        <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-100">
                          <img src={ann.image_url} alt="Notice Graphic" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-3 mt-3 border-t border-slate-100/60">
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(ann._id)}
                        className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Delete Notice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}