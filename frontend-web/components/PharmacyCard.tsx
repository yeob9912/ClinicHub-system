"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  Map,
  Star,
  Navigation,
  Clock,
  Heart,
  Megaphone
} from "lucide-react";
import { Pharmacy } from "@/data/pharmacies";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import AuthPrompt from "@/components/AuthPrompt";

interface PharmacyCardProps {
  pharmacy: Pharmacy;
  viewType?: "grid" | "list";
  highlightedMedicine?: string | null;
}

export default function PharmacyCard({ pharmacy, viewType = "list", highlightedMedicine }: PharmacyCardProps) {
  const router = useRouter();
  const { user, favorites, toggleFavoritePharmacy } = useUser();
  const isList = viewType === "list";

  const resolveMockId = (id: string, name?: string): string => {
    if (id && id.startsWith("p") && !isNaN(Number(id.substring(1)))) {
      return id;
    }
    if (!name) return id;
    const n = name.toLowerCase();
    if (n.includes("red cross")) return "p1";
    if (n.includes("kenema")) return "p2";
    if (n.includes("lion")) return "p3";
    if (n.includes("ethio")) return "p4";
    if (n.includes("sheger")) return "p5";
    if (n.includes("abyssinia")) return "p6";
    if (n.includes("zewditu")) return "p7";
    if (n.includes("unity")) return "p8";
    if (n.includes("modern")) return "p9";
    if (n.includes("lifecare") || n.includes("life care")) return "p10";
    return id;
  };

  const mockId = resolveMockId(pharmacy.id, pharmacy.name);
  const isFavorited = favorites.pharmacies.includes(mockId);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authAction, setAuthAction] = useState("save favourites");

  const requireAuth = (e: React.MouseEvent, action: string, cb: () => void) => {
    e.stopPropagation();
    if (!user) {
      setAuthAction(action);
      setShowAuthPrompt(true);
      return;
    }
    cb();
  };

  const handleFavorite = (e: React.MouseEvent) =>
    requireAuth(e, "save favourites", () => toggleFavoritePharmacy(mockId));

  const handleCall = (e: React.MouseEvent) =>
    requireAuth(e, "call the pharmacy", () => {
      window.location.href = `tel:${pharmacy.phone}`;
    });

  const nameLower = (pharmacy.name ?? "").toLowerCase();

  const isP1 = pharmacy.id === "p1" || nameLower.includes("red cross");
  const isP2 = pharmacy.id === "p2" || nameLower.includes("kenema");
  const isP3 = pharmacy.id === "p3" || nameLower.includes("lion") || nameLower.includes("life-line");

  const displayName = isP1 ? "Red Cross Pharmacy - Bole Branch" :
                      isP2 ? "Kenema Pharmacy No. 4" :
                      isP3 ? "Life-Line Pharmacy" : pharmacy.name;

  const displayAddress = isP1 ? "Bole Road, Near Friendship Mall, Addis Ababa" :
                         isP2 ? "Piazza, Churchill Ave, Addis Ababa" :
                         isP3 ? "Megenagna Roundabout, Addis Ababa" : pharmacy.address;

  const displayHours = pharmacy.hours || "Open 24 Hours";

  const displayPrice = (pharmacy as any).highest_price ? (pharmacy as any).highest_price :
                       (highlightedMedicine && pharmacy.matched_medicine) ? pharmacy.price :
                       isP1 ? 45.50 :
                       isP2 ? 42.00 :
                       isP3 ? 48.25 : (pharmacy.price || 400);

  const displayDistance = isP1 ? 1.2 : isP2 ? 2.5 : isP3 ? 3.1 : (pharmacy.distance || 4.5);
  const displayRating   = isP1 ? 4.8 : isP2 ? 4.5 : isP3 ? 4.2 : (pharmacy.rating || 4.0);
  const displayReviews  = isP1 ? 124  : isP2 ? 89  : isP3 ? 56  : (pharmacy.reviews || 20);

  const handleSelect = () => {
    if (highlightedMedicine) {
      router.push(`/pharmacies/${pharmacy.id}?medicine=${encodeURIComponent(highlightedMedicine)}`);
    } else {
      router.push(`/pharmacies/${pharmacy.id}`);
    }
  };

  const heartBtn = (size: number, cls: string) => (
    <button
      onClick={handleFavorite}
      className={`border rounded-2xl flex items-center justify-center active:scale-95 transition-all shrink-0 ${cls} ${
        isFavorited
          ? "border-rose-200 bg-rose-50 text-rose-500"
          : "border-slate-100 hover:border-rose-200 text-slate-400 hover:text-rose-400 hover:bg-rose-50"
      }`}
      title={isFavorited ? "Remove from Favourites" : "Save to Favourites"}
    >
      <Heart size={size} className={isFavorited ? "fill-rose-500" : ""} />
    </button>
  );

  if (isList) {
    return (
      <>
        <AuthPrompt
          open={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          action={authAction}
        />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          whileHover={{ y: -4 }}
          className="bg-white rounded-[2.5rem] p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col md:flex-row gap-6 items-center"
        >
          {/* Left Side: Image */}
          <div className="w-full md:w-60 h-44 shrink-0 overflow-hidden rounded-[2rem] relative bg-slate-50">
            <motion.img
              whileHover={{ scale: 1.06 }}
              transition={{ duration: 0.5 }}
              src={pharmacy.image}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right Side */}
          <div className="flex-grow w-full flex flex-col justify-between py-1 h-full min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-3.5">
              <div>
                <h3 className="text-base font-black text-slate-900 hover:text-[#00cba9] transition-colors leading-snug truncate">
                  {displayName}
                </h3>
                <div className="flex items-center gap-1 text-slate-400 text-xs font-bold mt-1">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{displayAddress}</span>
                </div>
              </div>
              <div className="border border-[#00cba9]/25 bg-[#00cba9]/5 px-2.5 py-1 rounded-xl text-[10px] font-black text-[#00cba9] flex items-center gap-1 shrink-0">
                <Star size={11} className="fill-[#00cba9]" />
                <span>{displayRating}</span>
                <span className="text-[#00cba9]/60 font-bold">({displayReviews})</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-50 mb-4 text-left">
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-0.5">the highest price</span>
                <span className="text-sm font-black text-[#00cba9]">{displayPrice.toFixed(2)} <span className="text-[10px] font-extrabold text-[#00cba9]/80">ETB</span></span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-0.5">Distance</span>
                <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                  <Navigation size={11} className="rotate-45 text-[#00cba9] fill-[#00cba9]" /> {displayDistance} km away
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mb-0.5">Operating Hours</span>
                <span className={`text-xs font-black flex items-center gap-1 ${pharmacy.isOpen ? "text-emerald-600" : "text-slate-500"}`}>
                  <Clock size={11} className="text-slate-400" /> {displayHours}
                </span>
              </div>
              <div className="text-right md:pr-2">
                <span onClick={handleSelect} className="text-xs font-black text-[#00cba9] underline hover:text-[#00bda0] cursor-pointer inline-block">
                  View Details
                </span>
              </div>
            </div>

            {/* Latest Announcement */}
            {pharmacy.announcements && pharmacy.announcements.length > 0 && (
              <div className="mb-4 px-4 py-3 bg-amber-50/60 border border-amber-100 rounded-2xl flex items-start gap-2.5 text-left text-xs">
                <Megaphone size={14} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-amber-800 text-[10px] uppercase tracking-wider">Notice Board</span>
                    <span className="text-[9px] text-amber-500 font-semibold">
                      {new Date(pharmacy.announcements[0].created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 truncate">{pharmacy.announcements[0].title}</p>
                  <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal">
                    {pharmacy.announcements[0].content}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleSelect}
                className="flex-grow bg-[#00cba9] hover:bg-[#00bda0] text-white py-3 px-6 rounded-2xl text-xs font-black tracking-wider transition-all active:scale-[0.98] shadow-md shadow-[#00cba9]/10"
              >
                Select Pharmacy
              </button>
              {heartBtn(15, "w-11 h-11")}
              <button
                onClick={handleCall}
                className="w-11 h-11 border border-slate-100 hover:border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-[#00cba9] hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                title="Call Pharmacy"
              >
                <Phone size={15} />
              </button>
              <button
                onClick={handleSelect}
                className="w-11 h-11 border border-slate-100 hover:border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-[#00cba9] hover:bg-slate-50 active:scale-95 transition-all shrink-0"
                title="View on Map"
              >
                <Map size={15} />
              </button>
            </div>
          </div>
        </motion.div>
      </>
    );
  }

  // ── Grid View ──────────────────────────────────────────────────────────────
  return (
    <>
      <AuthPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        action={authAction}
      />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -5 }}
        className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col h-full p-4"
      >
        {/* Image */}
        <div className="relative h-44 overflow-hidden rounded-[2rem] bg-gray-50 mb-4">
          <motion.img
            whileHover={{ scale: 1.06 }}
            transition={{ duration: 0.5 }}
            src={pharmacy.image}
            alt={displayName}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 right-3 border border-[#00cba9]/25 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl text-[9px] font-black text-[#00cba9] flex items-center gap-1 shadow-sm">
            <Star size={10} className="fill-[#00cba9]" />
            <span>{displayRating}</span>
            <span className="text-[#00cba9]/60 font-bold">({displayReviews})</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-grow text-left px-2">
          <div className="mb-4">
            <h3 className="text-sm font-black text-slate-900 group-hover:text-[#00cba9] transition-colors leading-snug">
              {displayName}
            </h3>
            <div className="flex items-center gap-1 text-slate-400 text-[11px] font-bold mt-1">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{displayAddress}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-50 mb-5 text-[11px]">
            <div>
              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block mb-0.5">the highest price</span>
              <span className="font-black text-[#00cba9]">{displayPrice.toFixed(2)} ETB</span>
            </div>
            <div>
              <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block mb-0.5">Distance</span>
              <span className="font-black text-slate-700">{displayDistance} km away</span>
            </div>
          </div>

          {/* Latest Announcement */}
          {pharmacy.announcements && pharmacy.announcements.length > 0 && (
            <div className="mb-4 px-4 py-3 bg-amber-50/60 border border-amber-100 rounded-2xl flex items-start gap-2.5 text-left text-xs">
              <Megaphone size={14} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-amber-800 text-[10px] uppercase tracking-wider">Notice Board</span>
                  <span className="text-[9px] text-amber-500 font-semibold">
                    {new Date(pharmacy.announcements[0].created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <p className="font-bold text-slate-800 truncate">{pharmacy.announcements[0].title}</p>
                <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal">
                  {pharmacy.announcements[0].content}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-auto">
            <button
              onClick={handleSelect}
              className="flex-grow bg-[#00cba9] hover:bg-[#00bda0] text-white py-3 rounded-2xl text-[11px] font-black tracking-wider transition-all active:scale-[0.98]"
            >
              Select Pharmacy
            </button>
            {heartBtn(14, "w-10 h-10")}
            <button
              onClick={handleCall}
              className="w-10 h-10 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-[#00cba9] hover:bg-slate-50 active:scale-95 transition-all shrink-0"
              title="Call"
            >
              <Phone size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
