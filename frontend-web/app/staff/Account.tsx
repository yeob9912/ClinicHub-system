"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, User, Lock, Store, Bell,
  ShieldCheck, Save, Smartphone, Image, FileText,
  LogOut, Mail, Trash2, Upload, UserCircle2, RotateCcw,
  Globe, Palette
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { apiFetch } from "./utils";
import { apiRequest } from "@/lib/api";

interface AccountProps {
  pharmacyId: string | null;
  pharmacy: any;
  profileImage: string;
  setProfileImage: (img: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onPharmacyUpdate?: (ph: any) => void;
}

// ── Default avatar: inline SVG contact icon ───────────────────────────────
const DEFAULT_AVATAR = null; // null = show icon placeholder

export default function AccountPage({ pharmacyId, pharmacy, profileImage, setProfileImage, showToast, onPharmacyUpdate }: AccountProps) {
  const { user, updateProfile, uploadAvatarFile } = useUser();

  const [activeTab, setActiveTab] = useState<"Profile & Brand" | "Security" | "Preferences">("Profile & Brand");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);




  // ── Local form state seeded from UserContext ──────────────────────────────
  const [profile, setProfile] = useState({
    name: user?.name ?? "Estifanos Obssi",
    email: user?.email ?? "estifanosobssi@gmail.com",
    avatarUrl: user?.avatarUrl ?? null as string | null,
    phone: user?.phone ?? "+251 911 234 567",
    pharmacyName: "Ethio-Medical Pharmacy",
    pharmacyDesc:
      "Historic pharmacy at Sarbet square offering wide medication range, lab tests, and blood pressure monitoring.",
    pharmacyBanner: null as string | null,
  });

  // Track the DB banner URL so staff can always "reset to default"
  const dbBannerRef = useRef<string | null>(null);

  // Re-sync from context when user loads (in case context resolves late)
  useEffect(() => {
    if (user) {
      setProfile((prev) => ({
        ...prev,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        phone: user.phone ?? prev.phone,
      }));
      if (user.avatarUrl) setProfileImage(user.avatarUrl);
    }
  }, [user]);

  // Load pharmacy banner + name from DB when pharmacyId is known
  useEffect(() => {
    if (!pharmacyId) return;
    apiFetch(`/pharmacies/${pharmacyId}`)
      .then((ph: any) => {
        const rawData = ph?.data || ph;
        const banner = rawData?.logo_url || null;
        const name   = rawData?.name    || "Ethio-Medical Pharmacy";
        const desc   = rawData?.description || "";
        dbBannerRef.current = banner;
        setProfile((prev) => ({
          ...prev,
          pharmacyName: name,
          pharmacyDesc: desc || prev.pharmacyDesc,
          pharmacyBanner: banner,
        }));

        const staffSettings = rawData?.staff_settings;
        if (staffSettings?.preferences) {
          setPreferences({
            notifications: staffSettings.preferences.notifications !== undefined ? staffSettings.preferences.notifications : true,
            language: staffSettings.preferences.language || "English",
            theme: staffSettings.preferences.theme || "Light",
          });
        }
      })
      .catch(() => {
        // fallback: keep existing state
      });
  }, [pharmacyId]);

  const [security, setSecurity] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [preferences, setPreferences] = useState({ notifications: true, language: "English", theme: "Light" });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Avatar upload via UserContext ─────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic local preview
    const localUrl = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, avatarUrl: localUrl }));
    setProfileImage(localUrl);

    try {
      const remoteUrl = await uploadAvatarFile(file);
      setProfile((prev) => ({ ...prev, avatarUrl: remoteUrl }));
      setProfileImage(remoteUrl);
      localStorage.setItem("staff_image", remoteUrl);
      showToast("Profile image updated!", "success");
    } catch {
      showToast("Failed to upload image. Showing local preview.", "error");
    }
  };

  // ── Avatar delete ─────────────────────────────────────────────────────────
  const handleAvatarDelete = async () => {
    setProfile((prev) => ({ ...prev, avatarUrl: null }));
    setProfileImage("");
    localStorage.removeItem("staff_image");
    try {
      await updateProfile({ name: profile.name, phone: profile.phone ?? undefined, avatarUrl: null });
      showToast("Profile image removed.", "info");
    } catch {
      showToast("Could not sync deletion to server.", "error");
    }
    // Reset file input so same file can be re-selected
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  // ── Pharmacy banner upload ────────────────────────────────────────────────
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pharmacyId) return;

    // Optimistic local preview
    const localUrl = URL.createObjectURL(file);
    setProfile((prev) => ({ ...prev, pharmacyBanner: localUrl }));

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const result = await apiRequest<{ logo_url: string }>(`/api/v1/pharmacies/${pharmacyId}/logo`, {
        method: "POST",
        auth: true,
        body: formData,
      });

      setProfile((prev) => ({ ...prev, pharmacyBanner: result.logo_url }));
      dbBannerRef.current = result.logo_url;
      if (onPharmacyUpdate && pharmacy) {
        onPharmacyUpdate({ ...pharmacy, logo_url: result.logo_url });
      }
      showToast("Pharmacy banner updated!", "success");
    } catch {
      showToast("Failed to upload pharmacy banner.", "error");
    }
  };

  // Reset to the original banner fetched from the DB
  const handleBannerReset = () => {
    setProfile((prev) => ({ ...prev, pharmacyBanner: dbBannerRef.current }));
    if (bannerInputRef.current) bannerInputRef.current.value = "";
    if (onPharmacyUpdate && pharmacy) {
      onPharmacyUpdate({ ...pharmacy, logo_url: dbBannerRef.current });
    }
    showToast("Banner reset to original.", "info");
  };

  // ── Save settings ─────────────────────────────────────────────────────────
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Clean phone number: remove spaces, parentheses, dashes
      const cleanedPhone = profile.phone ? profile.phone.replace(/[\s\-\(\)]+/g, "") : "";

      // 1. Update the User profile (propagates automatically backend-side as well)
      await updateProfile({
        name: profile.name,
        phone: cleanedPhone || undefined,
        avatarUrl: profile.avatarUrl,
      });

      // 2. Update the Pharmacy settings and preferences (propagates back to User details if changed there)
      if (pharmacyId) {
        const result = await apiRequest<any>(`/api/v1/pharmacies/${pharmacyId}/settings`, {
          method: "PATCH",
          auth: true,
          body: JSON.stringify({
            name: profile.pharmacyName,
            description: profile.pharmacyDesc,
            logo_url: profile.pharmacyBanner,
            staff_settings: {
              name: profile.name,
              phone: cleanedPhone || undefined,
              avatarUrl: profile.avatarUrl,
              preferences: {
                notifications: preferences.notifications,
                language: preferences.language,
                theme: preferences.theme,
              },
            },
          }),
        });
        if (onPharmacyUpdate && result) {
          onPharmacyUpdate(result.data ?? result);
        }
      }

      setSaveSuccess(true);
      showToast("Settings saved successfully!", "success");
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      showToast("Failed to save settings.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Log out ───────────────────────────────────────────────────────────────
  const handleLogOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_role");
    sessionStorage.clear();
    window.location.href = "/login";
  };

  // ── Avatar display helper ─────────────────────────────────────────────────
  const AvatarDisplay = ({ size = 56 }: { size?: number }) =>
    profile.avatarUrl ? (
      <img
        src={profile.avatarUrl}
        alt="Staff Avatar"
        style={{ width: size, height: size }}
        className="rounded-full border-2 border-[#0F766E] object-cover object-top shrink-0"
      />
    ) : (
      <span
        style={{ width: size, height: size }}
        className="rounded-full border-2 border-dashed border-[#0F766E]/40 bg-slate-100 flex items-center justify-center shrink-0"
      >
        <UserCircle2 className="text-slate-400" style={{ width: size * 0.65, height: size * 0.65 }} />
      </span>
    );

  return (
    <div className="bg-[#F1F3F6] text-[#1E293B] p-6 md:p-10 font-sans relative rounded-3xl shadow-xs">

      {/* Background dot mesh */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* HEADER */}
      <header className="mb-8 relative z-10">
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#0F766E]" /> Operational Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure profile details, adjust client-facing storefront parameters, and modify account security access.
        </p>
      </header>

      {/* 3-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">

        {/* COLUMN 1: SIDEBAR NAV */}
        <div className="lg:col-span-2 flex flex-col justify-between self-stretch gap-4">
          <div className="space-y-2">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2 mb-3">Control Units</span>
            <div className="flex flex-row lg:flex-col overflow-x-auto gap-1 pb-2 lg:pb-0">
              {([
                { name: "Profile & Brand", icon: Store },
                { name: "Security", icon: Lock },
                { name: "Preferences", icon: Bell },
              ] as const).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.name}
                    type="button"
                    onClick={() => setActiveTab(tab.name)}
                    className={`w-full text-left whitespace-nowrap px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                      activeTab === tab.name
                        ? "bg-white text-[#0F766E] border-l-4 border-[#0F766E] shadow-sm font-extrabold"
                        : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            {/* LOG OUT */}
            <div className="pt-2 lg:pt-6 lg:border-t lg:border-slate-200/60 pl-1">
              <button
                type="button"
                onClick={handleLogOut}
                className="w-full text-left whitespace-nowrap px-3 py-2.5 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" />
                Log out
              </button>
            </div>

            {/* Info card */}
            <div className="bg-[#0F766E]/5 rounded-xl border border-dashed border-[#0F766E]/20 p-4 text-[10px] font-medium text-slate-500 leading-relaxed">
              This module controls the configuration metrics for your role inside the{" "}
              <span className="font-bold text-slate-700">Pharmacy Locator</span> platform ecosystem.
            </div>
          </div>
        </div>

        {/* COLUMN 2: FORM */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
          <form onSubmit={handleSaveSettings} className="space-y-6">

            {/* ── TAB 1: PROFILE & BRAND ── */}
            {activeTab === "Profile & Brand" && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-[#0F766E]" /> Account & Storefront Customization
                </h3>

                {/* PROFILE IMAGE CARD */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Staff Profile Image</span>

                  <div className="flex items-center gap-4">
                    {/* Avatar / Default Icon */}
                    <AvatarDisplay size={56} />

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2">
                      {/* Upload */}
                      <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-xs hover:bg-slate-50 hover:border-[#0F766E]/40 transition-all cursor-pointer">
                        <Upload className="h-3.5 w-3.5 text-[#0F766E]" />
                        {profile.avatarUrl ? "Change image" : "Upload image"}
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                      </label>

                      {/* Delete — only shown when image is set */}
                      {profile.avatarUrl && (
                        <button
                          type="button"
                          onClick={handleAvatarDelete}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove image
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium">
                    Supports PNG, JPG, or WEBP. Default shows a contact placeholder icon.
                  </p>
                </div>

                {/* Profile Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Staff Name</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-medium"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Staff Phone Number</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={profile.phone ?? ""}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Email — read-only, pulled from account */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Staff Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      className="w-full pl-9 pr-10 py-2 border rounded-xl text-xs bg-slate-100 text-slate-600 font-mono cursor-not-allowed border-slate-200"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5 uppercase tracking-wide">
                      Verified
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Email is linked to your account and cannot be changed here.
                  </p>
                </div>

                {/* Pharmacy public variables */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">User-Facing Public Variables</h4>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pharmacy Name</label>
                    <input
                      type="text"
                      value={profile.pharmacyName}
                      onChange={(e) => setProfile({ ...profile, pharmacyName: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-semibold"
                    />
                  </div>

                  {/* Pharmacy Banner */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pharmacy Page Banner Graphic</span>

                    <div className="flex items-center gap-4">
                      {/* Banner preview / default */}
                      {profile.pharmacyBanner ? (
                        <div className="w-20 h-12 bg-slate-200 rounded-lg overflow-hidden border shrink-0">
                          <img src={profile.pharmacyBanner} alt="Banner Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-12 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex items-center justify-center shrink-0">
                          <Image className="h-5 w-5 text-slate-300" />
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <label className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold shadow-xs hover:bg-slate-50 hover:border-[#0F766E]/40 transition-all cursor-pointer">
                          <Upload className="h-3.5 w-3.5 text-[#0F766E]" />
                          {profile.pharmacyBanner ? "Change banner" : "Upload banner"}
                          <input
                            ref={bannerInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleBannerUpload}
                          />
                        </label>

                        {/* Reset to original DB banner */}
                        {dbBannerRef.current && profile.pharmacyBanner !== dbBannerRef.current && (
                          <button
                            type="button"
                            onClick={handleBannerReset}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-all"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset to original
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 font-medium">Recommended aspect ratio: 16:9 widescreen format.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Pharmacy Description</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                      <textarea
                        rows={3}
                        value={profile.pharmacyDesc}
                        onChange={(e) => setProfile({ ...profile, pharmacyDesc: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-medium leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB 2: SECURITY ── */}
            {activeTab === "Security" && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-indigo-600" /> Account Security Settings
                </h3>

                {/* Current email badge */}
                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                  <Mail className="h-4 w-4 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Signed-in email</p>
                    <p className="text-xs font-bold text-indigo-800 font-mono mt-0.5">{profile.email}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Current Password</label>
                    <input type="password" placeholder="••••••••" value={security.currentPassword} onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Password</label>
                    <input type="password" placeholder="Minimum 8 characters" value={security.newPassword} onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-mono" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Confirm New Password</label>
                    <input type="password" placeholder="Match new password" value={security.confirmPassword} onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-mono" />
                  </div>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-800 font-medium">
                  <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>A strong password protects against unauthorized access to your pharmacy's operational data.</p>
                </div>
              </div>
            )}

            {/* ── TAB 3: PREFERENCES ── */}
            {activeTab === "Preferences" && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-500" /> System Metrics Preferences
                </h3>

                <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Notification Preferences</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Ping dashboard alerts on incoming prescription streams.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreferences({ ...preferences, notifications: !preferences.notifications })}
                    className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${preferences.notifications ? "bg-[#0F766E]" : "bg-slate-300"}`}
                  >
                    <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${preferences.notifications ? "translate-x-4" : "translate-x-0"}`} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Globe className="h-3 w-3" /> Language Settings</label>
                    <select value={preferences.language} onChange={(e) => setPreferences({ ...preferences, language: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-semibold">
                      <option value="English">English</option>
                      <option value="Amharic">አማርኛ (Amharic)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Palette className="h-3 w-3" /> Theme Preferences</label>
                    <select value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })} className="w-full px-3 py-2 border rounded-xl text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 font-semibold">
                      <option value="Light">Light Framework</option>
                      <option value="Dark">Dark Mode</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SAVE BUTTON */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">All changes apply instantly upon saving.</span>
              <div className="flex items-center gap-3">
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.span
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs text-emerald-600 font-bold flex items-center gap-1"
                    >
                      <ShieldCheck className="h-4 w-4" /> Config Synced!
                    </motion.span>
                  )}
                </AnimatePresence>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#0F766E] text-white font-bold text-xs rounded-xl hover:bg-[#0d665f] transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                >
                  {isSaving ? (
                    <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Properties
                </button>
              </div>
            </div>

          </form>
        </div>

        {/* COLUMN 3: LIVE PREVIEW */}
        <div className="lg:col-span-4 space-y-4">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2">Live Public User-Page Preview</span>

          <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
            {/* Banner */}
            <div className="h-28 w-full relative bg-slate-100">
              {profile.pharmacyBanner ? (
                <img src={profile.pharmacyBanner} alt="Banner Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-50 to-slate-100 flex items-center justify-center">
                  <Store className="h-8 w-8 text-slate-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
              <span className="absolute top-3 right-3 text-[9px] bg-black/60 text-white font-bold uppercase px-2 py-0.5 rounded-md tracking-wider backdrop-blur-xs">
                Live Preview
              </span>
            </div>

            {/* Body */}
            <div className="p-5 relative">
              <div className="flex justify-between items-end -mt-10 mb-3 relative z-10">
                <div className="p-1 bg-white rounded-xl shadow-xs">
                  <AvatarDisplay size={48} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5">
                  Verified Open
                </span>
              </div>

              <h3 className="text-base font-black text-slate-900 tracking-tight">{profile.pharmacyName || "Unnamed Pharmacy"}</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2 text-justify line-clamp-3">
                {profile.pharmacyDesc || "No description provided yet."}
              </p>

              {/* Staff info in preview */}
              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Staff:</span>
                  <span className="text-slate-700 font-bold">{profile.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Email:</span>
                  <span className="text-slate-700 font-mono truncate max-w-[140px]">{profile.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Phone:</span>
                  <span className="text-slate-700 font-mono font-bold">{profile.phone || "Not configured"}</span>
                </div>
              </div>


            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
