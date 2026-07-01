"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, LogOut } from "lucide-react";
import { useUser } from "@/context/UserContext";

export default function AdminProfilePage() {
  const router = useRouter();
  const { logout, user, updateProfile, uploadAvatarFile } = useUser();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // First letter of name for initials fallback
  const initial = (user?.name ?? name ?? "A").trim()[0]?.toUpperCase() ?? "A";

  // When the avatar circle is clicked → trigger hidden file input
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // File selected → upload to DB immediately, context updates user.avatarUrl → nav reflects change
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      await uploadAvatarFile(file);
      setSaveMsg("Profile image updated!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      setSaveMsg(err?.message ?? "Failed to upload image");
      setTimeout(() => setSaveMsg(null), 4000);
    } finally {
      setUploadingAvatar(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, email });
      setSaveMsg("Profile saved successfully!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: any) {
      setSaveMsg(err?.message ?? "Failed to save profile");
      setTimeout(() => setSaveMsg(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-4xl font-black text-slate-900">Profile</h1>
        <p className="mt-1 text-slate-500">Manage your admin account details.</p>
      </div>

      <div className="max-w-2xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Avatar — click to upload */}
        <div className="rounded-2xl border border-[#24D2A6]/20 bg-[#24D2A6]/5 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">Profile Image</p>
          <div className="flex items-center gap-5">
            {/* Clickable avatar circle */}
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={uploadingAvatar}
              className="relative h-[88px] w-[88px] shrink-0 rounded-2xl overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#24D2A6]"
              title="Click to change profile image"
            >
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#24D2A6] to-[#1eb08b] text-3xl font-black text-white select-none">
                  {initial}
                </div>
              )}
              {/* Overlay on hover */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                {uploadingAvatar ? (
                  <Loader2 size={20} className="animate-spin text-white" />
                ) : (
                  <>
                    <Camera size={18} className="text-white" />
                    <span className="text-[9px] font-black text-white uppercase tracking-wide mt-1">Change</span>
                  </>
                )}
              </div>
            </button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">Click the image to upload a new one</p>
              <p className="text-xs text-slate-400">Supported: JPG, PNG, WEBP — max 5MB</p>
              {uploadingAvatar && (
                <p className="text-xs text-[#24D2A6] font-bold flex items-center gap-1">
                  <Loader2 size={11} className="animate-spin" /> Uploading...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#24D2A6]"
          />
        </div>

        {/* Email */}
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#24D2A6]"
          />
        </div>

        {/* Role — read-only */}
        <div>
          <label className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-400">Role</label>
          <input
            value="Super Admin"
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 outline-none cursor-not-allowed"
          />
        </div>

        {/* Save feedback */}
        {saveMsg && (
          <p className={`text-xs font-bold px-3 py-2 rounded-xl ${saveMsg.includes("success") || saveMsg.includes("updated") ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {saveMsg}
          </p>
        )}

        {/* Save button */}
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-[#24D2A6] px-4 py-2 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1eb08b] disabled:opacity-60"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? "Saving..." : "Save Profile"}
        </button>

        {/* Logout */}
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Session</p>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
