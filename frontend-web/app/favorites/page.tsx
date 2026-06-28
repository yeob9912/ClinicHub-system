"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Heart, 
  MapPin, 
  Phone, 
  Trash2, 
  ArrowRight, 
  Package, 
  Store,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { useUser } from "@/context/UserContext";
import { pharmacies } from "@/data/pharmacies";
import { motion, AnimatePresence } from "framer-motion";

export default function FavoritesPage() {
  const { favorites, toggleFavoritePharmacy, toggleFavoriteMedicine } = useUser();
  const [activeTab, setActiveTab] = useState<"pharmacies" | "medicines">("pharmacies");

  const savedPharmacies = pharmacies.filter(p => favorites.pharmacies.includes(p.id));
  const savedMedicines = favorites.medicines;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="mb-10">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-4 flex items-center gap-4">
                My Favorites <span className="text-[#24D2A6]"><Heart fill="currentColor" /></span>
              </h1>
              <p className="text-slate-500 font-medium">Quick access to your trusted pharmacies and essential medicines.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 p-1.5 bg-white rounded-2xl border border-gray-100 mb-8 shadow-sm w-fit">
            <button 
              onClick={() => setActiveTab("pharmacies")}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === "pharmacies" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-gray-50"
              }`}
            >
              <Store size={18} /> Pharmacies ({savedPharmacies.length})
            </button>
            <button 
              onClick={() => setActiveTab("medicines")}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                activeTab === "medicines" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-gray-50"
              }`}
            >
              <Package size={18} /> Medicines ({savedMedicines.length})
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "pharmacies" ? (
              <motion.div 
                key="pharmacies"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {savedPharmacies.length > 0 ? (
                  savedPharmacies.map(pharmacy => (
                    <div key={pharmacy.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-6 group">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                        <img src={pharmacy.image} alt={pharmacy.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#24D2A6] transition-colors">{pharmacy.name}</h3>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                          <MapPin size={14} />
                          {pharmacy.address}
                        </div>
                        <div className="mt-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${pharmacy.isOpen ? "text-emerald-500" : "text-rose-500"}`}>
                            {pharmacy.isOpen ? "Open Now" : "Closed"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${pharmacy.phone}`} className="p-3 bg-gray-50 text-slate-400 rounded-xl hover:bg-[#24D2A6]/10 hover:text-[#24D2A6] transition-all">
                          <Phone size={20} />
                        </a>
                        <Link href={`/pharmacies/${pharmacy.id}`} className="p-3 bg-gray-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                          <ArrowRight size={20} />
                        </Link>
                        <button 
                          onClick={() => toggleFavoritePharmacy(pharmacy.id)}
                          className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState type="pharmacies" />
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="medicines"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {savedMedicines.length > 0 ? (
                  savedMedicines.map(medName => (
                    <div key={medName} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-6 group">
                      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#24D2A6]">
                        <Package size={28} />
                      </div>
                      <div className="flex-grow">
                        <h3 className="text-lg font-bold text-slate-900">{medName}</h3>
                        <p className="text-slate-400 text-sm">Essential Medicine</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link href={`/medicines?q=${medName}`} className="px-5 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">
                          View Availability
                        </Link>
                        <button 
                          onClick={() => toggleFavoriteMedicine(medName)}
                          className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState type="medicines" />
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  return (
    <div className="bg-white rounded-[2.5rem] p-12 text-center border border-dashed border-gray-200">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
        <Heart size={40} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">No {type} saved yet</h3>
      <p className="text-slate-400 max-w-xs mx-auto mb-8">Items you favorite will appear here for quick access.</p>
      <Link href={type === "pharmacies" ? "/pharmacies" : "/medicines"} className="inline-flex items-center gap-2 text-[#24D2A6] font-black uppercase tracking-wider text-sm hover:gap-4 transition-all">
        Browse {type} <ChevronRight size={18} />
      </Link>
    </div>
  );
}