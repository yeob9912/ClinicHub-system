"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useAppContext } from "./providers";
import PharmacyCard from "./PharmacyCard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function normalisePharmacy(p: any) {
  const resolveImage = () => {
    // 1. Use DB logo_url if it's a real URL or a base64 data URI
    if (p.logo_url && (p.logo_url.startsWith("http") || p.logo_url.startsWith("data:"))) {
      return p.logo_url;
    }
    // 2. Name-based guaranteed-visible Unsplash fallbacks
    const n = (p.name ?? "").toLowerCase();
    if (n.includes("red cross"))  return "https://images.unsplash.com/photo-1538108149393-fdfd81895907?auto=format&fit=crop&q=80&w=800";
    if (n.includes("kenema"))     return "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800";
    if (n.includes("lion"))       return "https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=800";
    if (n.includes("ethio"))      return "https://images.unsplash.com/photo-1576091160550-2173bdb999ef?auto=format&fit=crop&q=80&w=800";
    if (n.includes("abyssinia"))  return "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&q=80&w=800";
    if (n.includes("zewditu"))    return "https://images.unsplash.com/photo-1563361141396-840b1a22f429?auto=format&fit=crop&q=80&w=800";
    if (n.includes("unity"))      return "https://images.unsplash.com/photo-1631549916768-4119b295f7a6?auto=format&fit=crop&q=80&w=800";
    if (n.includes("sheger"))     return "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&q=80&w=800";
    if (n.includes("lifecare") || n.includes("life care")) return "https://images.unsplash.com/photo-1664447962596-13c058a2c8a2?auto=format&fit=crop&q=80&w=800";
    if (n.includes("modern"))     return "https://images.unsplash.com/photo-1586773860418-d3b97978c651?auto=format&fit=crop&q=80&w=800";
    // 3. Generic pharmacy fallback
    return "https://images.unsplash.com/photo-1538108149393-fdfd81895907?auto=format&fit=crop&q=80&w=800";
  };

  return {
    id: p._id ?? p.id,
    name: p.name,
    address: p.address ?? p.city ?? "",
    phone: p.phone ?? "",
    rating: p.rating ?? 0,
    image: resolveImage(),
    price: p.price ?? 450,
    distance: p.distance ?? 1.2,
    isOpen: p.status === "approved",
    hours: p.opening_hours ? (() => {
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const today = days[new Date().getDay()];
      const todayHours = p.opening_hours[today];
      if (!todayHours) {
        const first: any = Object.values(p.opening_hours)[0];
        if (!first) return "Open 24 Hours";
        if (first.closed) return "Closed";
        return `${first.open} - ${first.close}`;
      }
      if (todayHours.closed) return "Closed";
      return `${todayHours.open} - ${todayHours.close}`;
    })() : "Open 24 Hours",
    status: "In Stock",
    medicines: [],
    city: p.city ?? "",
    latitude: p.latitude,
    longitude: p.longitude,
    logo_url: p.logo_url,
    announcements: p.announcements ?? [],
  };
}

export default function NearbyPharmacies() {
  const { t } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [updatingStr, setUpdatingStr] = useState(false);
  const [nearbyPharmacies, setNearbyPharmacies] = useState<any[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/pharmacies?status=approved&limit=4`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to fetch pharmacies");
        return r.json();
      })
      .then((res) => {
        const list = res.data ?? res;
        setNearbyPharmacies(Array.isArray(list) ? list.map(normalisePharmacy) : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    // Simulate real-time stock updates every few seconds
    const interval = setInterval(() => {
      setUpdatingStr(true);
      setTimeout(() => setUpdatingStr(false), 800);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <section id="pharmacies" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col justify-start items-start mb-12">
          <div className="max-w-2xl text-left">
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-[#24D2A6]/10 text-[#24D2A6] px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={12} /> Nearby Services
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 leading-tight">
              Pharmacies <span className="text-[#24D2A6]">Near You</span>
            </h2>
            <div className="flex items-center text-sm font-bold text-slate-500 gap-3 h-6">
              {updatingStr ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-[#24D2A6]">
                  <div className="w-2.5 h-2.5 bg-[#24D2A6] rounded-full animate-ping" />
                  Updating live inventory...
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-emerald-500">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                  All data synced in real-time
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="space-y-12">
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm animate-pulse">
                    <div className="h-52 bg-gray-100"></div>
                    <div className="p-8 space-y-4">
                      <div className="h-6 bg-gray-100 rounded-lg w-2/3"></div>
                      <div className="h-4 bg-gray-100 rounded-lg w-1/2"></div>
                      <div className="h-12 bg-gray-100 rounded-xl w-full mt-6"></div>
                    </div>
                  </div>
                ))
              ) : (
                nearbyPharmacies.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} viewType="grid" />
                ))
              )}
            </motion.div>

            {!loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center mt-12"
              >
                <Link 
                  href="/pharmacies"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center gap-2 group"
                >
                  View All Pharmacies
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
