"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Filter, 
  RotateCcw, 
  ChevronDown, 
  Star,
  MapPin,
  Clock,
  Check,
  Search,
  Grid,
  List,
  ArrowUpDown,
  Loader2
} from "lucide-react";
import PharmacyCard from "./PharmacyCard";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("medpay_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const SEEDED_MEDICINES = [
  { name: "Amoxicillin 500mg Capsule", price: 450, stockStatus: "In Stock" },
  { name: "Paracetamol 500mg Tablet", price: 150, stockStatus: "In Stock" },
  { name: "Metformin 500mg Tablet", price: 440, stockStatus: "Low Stock" },
  { name: "Vitamin C 1000mg Effervescent", price: 300, stockStatus: "In Stock" },
  { name: "Omeprazole 20mg Capsule", price: 510, stockStatus: "In Stock" },
  { name: "Cetirizine 10mg Tablet", price: 200, stockStatus: "In Stock" },
  { name: "Ibuprofen 400mg Tablet", price: 250, stockStatus: "In Stock" },
  { name: "Ciprofloxacin 500mg Tablet", price: 550, stockStatus: "In Stock" },
  { name: "Atenolol 50mg Tablet", price: 450, stockStatus: "In Stock" },
  { name: "Zinc Sulphate 20mg Tablet", price: 180, stockStatus: "In Stock" },
];

// Normalise a backend pharmacy to the shape PharmacyCard expects
function normalisePharmacy(p: any) {
  const nameLower = (p.name ?? "").toLowerCase();
  const isP1 = p.id === "p1" || p._id === "p1" || nameLower.includes("red cross");
  const isP2 = p.id === "p2" || p._id === "p2" || nameLower.includes("kenema");
  const isP3 = p.id === "p3" || p._id === "p3" || nameLower.includes("lion") || nameLower.includes("life-line");

  const resolvedRating = isP1 ? 4.8 : isP2 ? 4.5 : isP3 ? 4.2 : (p.rating || 4.0);
  const resolvedDistance = isP1 ? 1.2 : isP2 ? 2.5 : isP3 ? 3.1 : (p.distance || 4.5);
  
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const today = days[new Date().getDay()];
  const todayHours = p.opening_hours ? p.opening_hours[today] : null;
  const displayHours = todayHours 
    ? (todayHours.closed ? "Closed" : `${todayHours.open} - ${todayHours.close}`)
    : (p.opening_hours ? (() => {
        const first: any = Object.values(p.opening_hours)[0];
        if (!first) return "Open 24 Hours";
        if (first.closed) return "Closed";
        return `${first.open} - ${first.close}`;
      })() : "Open 24 Hours");

  return {
    id: p._id ?? p.id,
    name: isP1 ? "Red Cross Pharmacy - Bole Branch" : isP2 ? "Kenema Pharmacy No. 4" : isP3 ? "Life-Line Pharmacy" : p.name,
    address: isP1 ? "Bole Road, Near Friendship Mall, Addis Ababa" : isP2 ? "Piazza, Churchill Ave, Addis Ababa" : isP3 ? "Megenagna Roundabout, Addis Ababa" : (p.address ?? p.city ?? ""),
    phone: p.phone ?? "",
    rating: resolvedRating,
    image: (() => {
      // 1. Use DB logo_url if it's a real http URL or a base64 data URI
      if (p.logo_url && (p.logo_url.startsWith("http") || p.logo_url.startsWith("data:"))) {
        return p.logo_url;
      }
      // 2. Name-based fallbacks (always visible Unsplash images)
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
    })(),
    price: p.price ?? 400,
    highest_price: p.highest_price ?? p.price ?? 400,
    distance: resolvedDistance,
    isOpen: p.status === "approved",
    hours: displayHours,
    status: p.matched_medicine 
      ? (p.matched_medicine.stock_quantity >= 15 ? "In Stock" : p.matched_medicine.stock_quantity > 0 ? "Low Stock" : "Out of Stock") 
      : "In Stock",
    medicines: SEEDED_MEDICINES,
    city: p.city ?? "",
    latitude: p.latitude,
    longitude: p.longitude,
    logo_url: p.logo_url,
    matched_medicine: p.matched_medicine,
    announcements: p.announcements ?? [],
  };
}

function DiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get("medicine") || "");
  const [viewType, setViewType] = useState<"grid" | "list">("list");
  const [sortBy, setSortBy] = useState("rating");
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [distance, setDistance] = useState(5);
  const [priceMax, setPriceMax] = useState(1000);

  // Raw pharmacies from API
  const [allPharmacies, setAllPharmacies] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fetchTick, setFetchTick] = useState(0); // increment to retry

  // Fetch approved pharmacies from backend on mount, retry, or searchQuery changes
  useEffect(() => {
    setApiLoading(true);
    setApiError(null);
    const medicineParam = searchQuery.trim();
    const url = `${API}/pharmacies?status=approved&limit=100${medicineParam ? `&medicine=${encodeURIComponent(medicineParam)}` : ''}`;
    
    fetch(url, {
      headers: getAuthHeader(),
    })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          if (r.status === 401) throw new Error("UNAUTHORIZED");
          throw new Error(body.message ?? `Error ${r.status}`);
        }
        return r.json();
      })
      .then((res) => {
        const list = res.data ?? res;
        setAllPharmacies(Array.isArray(list) ? list.map(normalisePharmacy) : []);
      })
      .catch((err: Error) => {
        setAllPharmacies([]);
        setApiError(err.message ?? "Failed to load pharmacies");
      })
      .finally(() => setApiLoading(false));
  }, [fetchTick, searchQuery]);

  // Sync with URL params
  useEffect(() => {
    const medicineParam = searchParams.get("medicine");
    setSearchQuery(medicineParam ?? "");
  }, [searchParams]);

  const filteredPharmacies = useMemo(() => {
    let result = allPharmacies.filter((p) => {
      const matchesRating = !selectedRating || p.rating >= selectedRating;
      const matchesSearch = !searchQuery.trim() || 
                            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.matched_medicine && p.matched_medicine.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesOpen = !openNowOnly || p.hours !== "Closed";
      const matchesStock = !inStockOnly || p.status === "In Stock" || p.status === "Low Stock";
      const matchesDistance = p.distance <= distance;
      const matchesPrice = p.price <= priceMax || p.highest_price <= priceMax;

      return matchesRating && matchesSearch && matchesOpen && matchesStock && matchesDistance && matchesPrice;
    });

    if (sortBy === "rating") result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "name") result.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "price") result.sort((a, b) => a.price - b.price);
    return result;
  }, [allPharmacies, selectedRating, sortBy, searchQuery, openNowOnly, inStockOnly, distance, priceMax]);

  const resetFilters = () => {
    setSelectedRating(null);
    setSortBy("rating");
    setSearchQuery("");
    setOpenNowOnly(false);
    setInStockOnly(false);
    setDistance(5);
    setPriceMax(1000);
    router.push("/pharmacies", { scroll: false });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {apiLoading && (
        <div className="flex justify-center py-16">
          <Loader2 size={36} className="animate-spin text-[#00cba9]" />
        </div>
      )}
      {!apiLoading && (
        <>
        {/* Main Two-Column Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LEFT COLUMN: Sidebar Filters */}
        <aside className="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-28 z-20">
          
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-left">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Filter size={16} className="text-[#00cba9]" /> Filters
              </h2>
              <button 
                onClick={resetFilters}
                className="text-xs font-black text-slate-400 hover:text-[#00cba9] uppercase tracking-wider transition-colors"
              >
                Clear All
              </button>
            </div>

            {/* Availability */}
            <div className="mb-8">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Availability</h3>
              <div className="space-y-4">
                {/* Open Now Select Dropdown Box */}
                <div className="bg-slate-50 border border-slate-100 px-4 py-3 rounded-2xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Open Now</span>
                  <button 
                    onClick={() => setOpenNowOnly(!openNowOnly)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                      openNowOnly ? "bg-[#00cba9]" : "bg-white border border-gray-200"
                    }`}
                  >
                    {openNowOnly && <Check size={12} className="text-white" strokeWidth={4} />}
                  </button>
                </div>

                {/* In Stock Only Checkbox */}
                <div 
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className="flex items-center cursor-pointer group select-none"
                >
                  <div 
                    className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                      inStockOnly ? "bg-[#00cba9]" : "bg-white border border-gray-200 group-hover:border-[#00cba9]"
                    }`}
                  >
                    {inStockOnly && <Check size={11} className="text-white" strokeWidth={4} />}
                  </div>
                  <span className="ml-2.5 text-xs font-bold text-slate-600 group-hover:text-slate-900">In Stock Only</span>
                </div>
              </div>
            </div>

            {/* Distance */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distance (km)</h3>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="5" 
                step="0.1"
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#00cba9]"
              />
              <div className="flex justify-between mt-2.5 text-[9px] font-black text-[#00cba9] uppercase tracking-wide">
                <span>0 km</span>
                <span className="bg-[#00cba9]/10 px-2.5 py-0.5 rounded-full text-[10px] font-black">{distance} km</span>
                <span>5 km</span>
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Range (ETB)</h3>
              </div>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10"
                value={priceMax}
                onChange={(e) => setPriceMax(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#00cba9]"
              />
              <div className="flex justify-between mt-2.5 text-[9px] font-black text-[#00cba9] uppercase tracking-wide mb-4">
                <span>10 ETB</span>
                <span>1000 ETB</span>
              </div>

              {/* Min and Max input boxes */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">Min</span>
                  <input 
                    type="text" 
                    value="10" 
                    disabled 
                    className="w-full bg-slate-50 border border-slate-150 pl-10 pr-3 py-2 rounded-xl text-xs font-black text-slate-500 text-center" 
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">Max</span>
                  <input 
                    type="text" 
                    value={priceMax} 
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (!isNaN(val)) setPriceMax(Math.min(Math.max(val, 10), 1000));
                    }}
                    className="w-full bg-white border border-slate-200 pl-10 pr-3 py-2 rounded-xl text-xs font-black text-slate-800 text-center focus:border-[#00cba9] outline-none" 
                  />
                </div>
              </div>
            </div>

            {/* Pharmacy Rating */}
            <div className="mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Pharmacy Rating</h3>
              <div className="space-y-3.5">
                {[4, 3, 2].map((stars) => (
                  <div 
                    key={stars} 
                    onClick={() => setSelectedRating(selectedRating === stars ? null : stars)}
                    className="flex items-center cursor-pointer group select-none"
                  >
                    <div 
                      className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all shrink-0 ${
                        selectedRating === stars ? "bg-[#00cba9]" : "bg-white border border-gray-200 group-hover:border-[#00cba9]"
                      }`}
                    >
                      {selectedRating === stars && <Check size={11} className="text-white" strokeWidth={4} />}
                    </div>
                    <span className="ml-2.5 text-xs font-bold text-slate-600 group-hover:text-slate-900 flex items-center gap-1.5">
                      {stars}+ Stars
                      <div className="flex items-center text-[#00cba9]">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            size={10} 
                            className={i < stars ? "fill-[#00cba9] text-[#00cba9]" : "text-slate-100"} 
                          />
                        ))}
                      </div>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Help Alert Box */}
            <div className="bg-[#00cba9]/5 border border-[#00cba9]/10 rounded-2xl p-4 mt-6 text-left">
              <div className="flex items-center gap-2 mb-1.5 text-xs font-black text-[#00cba9]">
                <span className="w-4 h-4 rounded-full bg-[#00cba9] text-white font-extrabold flex items-center justify-center text-[10px]">?</span>
                Need Help?
              </div>
              <p className="text-[11px] font-bold text-slate-400 leading-normal">
                Prices and stock information are updated every 15 minutes by participating pharmacies.
              </p>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Results Header & Listings */}
        <div className="flex-grow w-full">
          
          {/* Header Controls Panel */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm text-left">
            <div>
              <h1 className="text-xl font-black text-slate-900">
                {searchQuery ? (
                  <>Pharmacies for <span className="text-[#00cba9]">"{searchQuery}"</span></>
                ) : (
                  <>All <span className="text-[#00cba9]">Pharmacies</span></>
                )}
                <span className="ml-3 text-xs font-extrabold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                  {filteredPharmacies.length} Results
                </span>
              </h1>
            </div>

            {/* Action items: Search Box + View Selector + Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Search input box replaces the previous showing text */}
              <div className="bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-100 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#00cba9]/20 transition-all w-full md:w-56">
                <Search className="text-slate-400" size={16} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    const params = new URLSearchParams(searchParams.toString());
                    if (e.target.value.trim()) params.set("medicine", e.target.value.trim());
                    else params.delete("medicine");
                    router.push(`?${params.toString()}`, { scroll: false });
                  }}
                  placeholder="Search medicine in stock..."
                  className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-full placeholder-slate-400"
                />
              </div>

              {/* List / Grid Selector Pills */}
              <div className="flex items-center bg-slate-50 border border-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setViewType("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                    viewType === "list" 
                      ? "bg-white text-[#00cba9] shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <List size={14} /> List
                </button>
                <button 
                  onClick={() => setViewType("grid")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 ${
                    viewType === "grid" 
                      ? "bg-white text-[#00cba9] shadow-sm" 
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  <Grid size={14} /> Grid
                </button>
              </div>

              {/* Sort by Dropdown */}
              <div className="relative">
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-slate-50 border border-slate-100 text-slate-700 text-xs font-bold rounded-xl pl-9 pr-8 py-3.5 focus:outline-none focus:ring-2 focus:ring-[#00cba9]/25 transition-all cursor-pointer"
                >
                  <option value="rating">Sort by: Rating</option>
                  <option value="name">Sort by: Name (A–Z)</option>
                  <option value="price">Sort by: Price (Low to High)</option>
                </select>
                <ArrowUpDown size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <ChevronDown size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* API Error Banner */}
          {apiError && (
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 text-center mb-6">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin size={28} className="text-rose-400" />
              </div>
              {apiError === "UNAUTHORIZED" ? (
                <>
                  <h3 className="text-lg font-black text-slate-900 mb-2">Backend restart needed</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                    The server is returning a 401. Please <strong>restart your backend</strong> to apply the public-route fix, then click Retry.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-black text-slate-900 mb-2">Could not load pharmacies</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                    {apiError} — make sure the backend is running on <code className="bg-rose-100 px-1.5 py-0.5 rounded-md">localhost:3001</code>.
                  </p>
                </>
              )}
              <button
                onClick={() => setFetchTick(t => t + 1)}
                className="inline-flex items-center gap-2 bg-[#00cba9] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#00bda0] transition-colors"
              >
                <RotateCcw size={13} /> Retry
              </button>
            </div>
          )}

          {/* Listings Container */}
          {!apiError && filteredPharmacies.length > 0 ? (
            <div className={viewType === "grid" ? "grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200" : "space-y-5 animate-in fade-in duration-200"}>
              {filteredPharmacies.map((pharmacy) => (
                <PharmacyCard 
                  key={pharmacy.id} 
                  pharmacy={pharmacy} 
                  viewType={viewType} 
                  highlightedMedicine={searchQuery}
                />
              ))}
            </div>
          ) : !apiError ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200">
              <MapPin size={48} className="mx-auto text-gray-200 mb-6" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No pharmacies found</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
                Try adjusting your filters to see nearby pharmacies.
              </p>
              <button 
                onClick={resetFilters}
                className="bg-[#00cba9] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-[#00bda0] transition-colors"
              >
                Clear all filters
              </button>
            </div>
          ) : null}
        </div>

        </div>
        </>
      )}
    </div>
  );
}

export default function PharmacyDiscovery() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black text-[#00cba9] uppercase tracking-widest text-xs animate-pulse">Loading Pharmacies...</div>}>
      <DiscoveryContent />
    </Suspense>
  );
}
