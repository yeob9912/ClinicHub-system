"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Heart } from "lucide-react";
import { Medicine } from "@/data/medicines";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import AuthPrompt from "@/components/AuthPrompt";

interface MedicineCardProps {
  medicine: Medicine;
}

export default function MedicineCard({ medicine }: MedicineCardProps) {
  const router = useRouter();
  const { user, favorites, toggleFavoriteMedicine } = useUser();
  const isFavorited = favorites.medicines.includes(medicine.name);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const handleFavoriteMedicine = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setShowAuthPrompt(true);
      return;
    }
    toggleFavoriteMedicine(medicine.name);
  };

  // Formatting reviews count to match screenshot (e.g. 1.2k)
  const formattedReviews = medicine.reviews >= 1000
    ? `${(medicine.reviews / 1000).toFixed(1)}k`
    : medicine.reviews;

  return (
    <>
      <AuthPrompt
        open={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        action="save favourites"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -6 }}
        onClick={() => router.push(`/pharmacies?medicine=${medicine.name}`)}
        className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-full cursor-pointer"
      >
        {/* Image Container */}
        <div className="relative h-44 overflow-hidden bg-gray-50">
          <motion.img
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.5 }}
            src={medicine.image}
            alt={medicine.name}
            className="w-full h-full object-cover"
          />

          {/* Overlay Badges on Top Left */}
          <div className="absolute top-3 left-3 flex gap-1.5 z-10">
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              medicine.stockStatus === "In Stock" ? "bg-emerald-500 text-white" :
              medicine.stockStatus === "Low Stock" ? "bg-amber-500 text-white" : "bg-rose-500 text-white"
            } shadow-sm`}>
              {medicine.stockStatus}
            </span>
            {medicine.isBestValue && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-orange-400 text-white shadow-sm">
                Best Value
              </span>
            )}
          </div>

          {/* Favorite Heart Button on Top Right */}
          <button
            onClick={handleFavoriteMedicine}
            className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all z-10 ${
              isFavorited ? "bg-rose-50 text-rose-500 scale-110" : "bg-white/90 text-slate-400 hover:text-rose-500 hover:scale-110 shadow-sm"
            }`}
            title={user ? "Toggle Favourite" : "Sign in to save favourites"}
          >
            <Heart size={15} fill={isFavorited ? "currentColor" : "none"} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-grow">
          <div className="mb-2">
            {/* Subheading e.g. PAIN RELIEF • 500MG */}
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 block">
              {medicine.subCategory || medicine.category} • {medicine.dosage}
            </span>
            {/* Medicine Name */}
            <h3 className="text-base font-bold text-slate-900 group-hover:text-[#0B57D0] transition-colors leading-snug">
              {medicine.name}
            </h3>
          </div>

          {/* Single-Star Rating Layout */}
          <div className="flex items-center gap-1.5 mb-5 mt-1.5">
            <Star size={14} className="text-amber-400 fill-amber-400" />
            <span className="text-xs font-black text-slate-800">{medicine.rating}</span>
            <span className="text-[11px] font-bold text-slate-400">({formattedReviews} reviews)</span>
          </div>

          {/* Price & Action Row */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
            <div>
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block mb-0.5">From</span>
              <span className="text-lg font-black text-slate-900">${medicine.price.toFixed(2)}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/pharmacies?medicine=${medicine.name}`);
              }}
              className="bg-[#0B57D0] text-white hover:bg-blue-700 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 shrink-0 shadow-md shadow-blue-500/5"
            >
              Compare Prices
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
