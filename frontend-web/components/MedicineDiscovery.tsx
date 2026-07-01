"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useMemo, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  RotateCcw, 
  Check, 
  ArrowRight,
  ChevronLeft,
  Loader2
} from "lucide-react";
import MedicineCard from "./MedicineCard";
import { useAppContext } from "./providers";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function getMedicineImage(name: string) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("amoxicillin")) return "https://images.unsplash.com/photo-1587854236660-1615b1c4123f?auto=format&fit=crop&q=80&w=400";
  if (n.includes("paracetamol") || n.includes("acetaminophen")) return "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400";
  if (n.includes("metformin")) return "https://images.unsplash.com/photo-1583947582415-467b5e408ec9?auto=format&fit=crop&q=80&w=400";
  if (n.includes("vitamin c")) return "https://images.unsplash.com/photo-1471864190281-ad5f9f81ce8c?auto=format&fit=crop&q=80&w=400";
  if (n.includes("omeprazole")) return "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&q=80&w=400";
  if (n.includes("cetirizine")) return "https://images.unsplash.com/photo-1587854692152-cbe660dbbb88?auto=format&fit=crop&q=80&w=400";
  if (n.includes("ibuprofen")) return "https://images.unsplash.com/photo-1550572017-ed200f545dec?auto=format&fit=crop&q=80&w=400";
  if (n.includes("ciprofloxacin")) return "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400";
  if (n.includes("atenolol")) return "https://images.unsplash.com/photo-1576091160550-2173bdb999ef?auto=format&fit=crop&q=80&w=400";
  if (n.includes("zinc")) return "https://images.unsplash.com/photo-1550572017-4f180589f583?auto=format&fit=crop&q=80&w=400";
  return "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=400";
}

function normaliseMedicine(m: any) {
  return {
    id: m._id ?? m.id,
    name: m.name,
    category: m.category?.startsWith("Analgesics") ? "Pain Relief" : m.category === "Diabetes" ? "Diabetes Care" : m.category,
    subCategory: m.category ? m.category.toUpperCase() : "GENERAL",
    dosage: m.strength ?? m.dosage_form ?? "Standard",
    rating: m.rating ?? (4 + (parseInt(m._id?.substring(0, 8) ?? "0", 16) % 10) / 10).toFixed(1),
    reviews: m.reviews ?? (50 + (parseInt(m._id?.substring(8, 16) ?? "0", 16) % 950)),
    stockStatus: m.stockStatus ?? "In Stock",
    price: m.price ?? 15,
    image: m.image_url ? m.image_url : getMedicineImage(m.name),
    isBestValue: m.price < 20,
  };
}

interface MedicineDiscoveryProps {
  initialQuery?: string;
  onClose?: () => void;
}

function DiscoveryContent({ initialQuery = "" }: MedicineDiscoveryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useAppContext();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || initialQuery);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams.get("cat") || null); // default to null (All)
  const [priceRange, setPriceRange] = useState(500);
  const [inStockOnly, setInStockOnly] = useState(true); // default true like screenshot
  const [sortBy, setSortBy] = useState("price"); // default Best Price
  const [currentPage, setCurrentPage] = useState(1);

  // Raw medicines from API
  const [allMedicines, setAllMedicines] = useState<any[]>([]);
  const [apiLoading, setApiLoading] = useState(true);

  // Fetch medicines from backend
  useEffect(() => {
    setApiLoading(true);
    fetch(`${API}/medicines?limit=100`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to fetch medicines");
        return r.json();
      })
      .then((res) => {
        const list = res.data ?? res;
        setAllMedicines(Array.isArray(list) ? list.map(normaliseMedicine) : []);
      })
      .catch((err) => console.error(err))
      .finally(() => setApiLoading(false));
  }, []);

  // Sync with URL params
  useEffect(() => {
    const q = searchParams.get("q");
    const cat = searchParams.get("cat");
    if (q !== null) setSearchQuery(q);
    setSelectedCategory(cat);
  }, [searchParams]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, priceRange, inStockOnly, sortBy]);

  const categories = ["All", "Pain Relief", "Antibiotics", "Cardiovascular", "Diabetes Care"];

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    return allMedicines.filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           m.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || selectedCategory === "All" || m.category === selectedCategory;
      const matchesPrice = m.price <= priceRange;
      const matchesStock = !inStockOnly || m.stockStatus === "In Stock" || m.stockStatus === "Low Stock";
      
      return matchesSearch && matchesCategory && matchesPrice && matchesStock;
    });
  }, [allMedicines, searchQuery, selectedCategory, priceRange, inStockOnly]);

  // Sort medicines
  const sortedMedicines = useMemo(() => {
    const list = [...filteredMedicines];
    if (sortBy === "price") {
      list.sort((a, b) => a.price - b.price); // Best Price (Low to High)
    } else if (sortBy === "rating") {
      list.sort((a, b) => b.rating - a.rating); // Highest Rating
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical
    }
    return list;
  }, [filteredMedicines, sortBy]);

  const displayedMedicines = sortedMedicines;

  const toggleCategory = (cat: string) => {
    const newCat = cat === "All" ? null : (selectedCategory === cat ? null : cat);
    setSelectedCategory(newCat);
    
    // Update URL
    const params = new URLSearchParams(searchParams.toString());
    if (newCat) params.set("cat", newCat);
    else params.delete("cat");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const resetFilters = () => {
    setSelectedCategory(null);
    setPriceRange(500);
    setInStockOnly(false);
    setSearchQuery("");
    router.push("/medicines", { scroll: false });
  };

  return (
    <section id="results" className="py-12 bg-slate-50/50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {apiLoading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="animate-spin text-[#0B57D0]" size={36} />
          </div>
        ) : (
          /* Main Two-Column Layout */
          <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT COLUMN: Sidebar Filters & Promo */}
          <aside className="w-full lg:w-72 shrink-0 space-y-6 lg:sticky lg:top-28 z-20">
            
            {/* Filters Container */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              {/* Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Filter size={16} className="text-[#0B57D0]" /> Filters
                </h2>
                <button 
                  onClick={resetFilters}
                  className="text-xs font-black text-[#0B57D0] uppercase tracking-wider hover:text-blue-700 transition-colors"
                >
                  RESET
                </button>
              </div>

              {/* Categories Checkbox List */}
              <div className="mb-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Categories</h3>
                <div className="space-y-3.5">
                  {categories.map((cat) => {
                    const isChecked = cat === "All" ? (selectedCategory === null) : (selectedCategory === cat);
                    return (
                      <label key={cat} className="flex items-center group cursor-pointer relative">
                        <div className="relative flex items-center">
                          <input 
                            type="checkbox" 
                            className="sr-only"
                            checked={isChecked}
                            onChange={() => toggleCategory(cat)}
                          />
                          <div className={`w-5 h-5 border-2 rounded-md transition-all flex items-center justify-center ${
                            isChecked 
                              ? "bg-[#0B57D0] border-[#0B57D0]" 
                              : "bg-white border-gray-200 group-hover:border-[#0B57D0]"
                          }`}>
                            {isChecked && (
                              <Check size={13} className="text-white animate-in zoom-in duration-150" strokeWidth={4} />
                            )}
                          </div>
                        </div>
                        <span className={`ml-3 text-xs font-bold transition-colors ${
                          isChecked ? "text-[#0B57D0] font-black" : "text-slate-600 group-hover:text-slate-900"
                        }`}>{cat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Price Range Slider */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Price Range</h3>
                  <span className="text-xs font-black text-[#0B57D0]">${priceRange}+</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="500" 
                  step="10"
                  value={priceRange}
                  onChange={(e) => setPriceRange(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#0B57D0]"
                />
                <div className="flex justify-between mt-2 text-[9px] font-extrabold text-slate-400">
                  <span>$0</span>
                  <span>$500+</span>
                </div>
              </div>

              {/* In Stock Toggle Checkbox */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">In Stock Only</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={inStockOnly}
                    onChange={() => setInStockOnly(!inStockOnly)}
                  />
                  <div className="w-10 h-5.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#0B57D0]"></div>
                </label>
              </div>
            </div>

            {/* Blue Member Exclusive Promo Box */}
            <div className="bg-[#0B57D0] rounded-3xl p-6 text-white relative overflow-hidden shadow-sm group">
              <svg className="absolute -right-4 -bottom-4 w-28 h-28 opacity-10 text-white group-hover:scale-110 transition-transform duration-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6h-3V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H5c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-9-2h4v2h-4V4zm8 15H6V8h12v11zm-5-9h-2v2H9v2h2v2h2v-2h2v-2h-2v-2z"/>
              </svg>
              
              <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest block mb-2">
                Member Exclusive
              </span>
              <h4 className="font-bold text-base text-white leading-snug mb-5">
                Save up to 40% on prescriptions
              </h4>
              
              <button className="w-full bg-white text-[#0B57D0] py-3 rounded-2xl text-[10px] font-black tracking-widest hover:bg-blue-50 transition-all uppercase shadow-lg shadow-blue-900/10 active:scale-95">
                Join pharmaLocator
              </button>
            </div>
          </aside>

          {/* RIGHT COLUMN: Results Header, Grid, Pagination */}
          <div className="flex-grow w-full">
            
            {/* Header Control Panel */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 mb-8 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div>
                {/* Dynamically display Selected Category or Search query */}
                <h1 className="text-xl font-black text-slate-900">
                  {selectedCategory ? `${selectedCategory} Results` : "All Products"}
                </h1>
                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  Found {filteredMedicines.length} products matching your search
                </p>
              </div>

              {/* Action items: Global Search + Sorting */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Search field */}
                <div className="bg-slate-50 rounded-2xl px-4 py-2 border border-slate-100 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#0B57D0]/20 transition-all">
                  <Search className="text-slate-400" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search medicines..."
                    className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 w-36 sm:w-44 placeholder-slate-400"
                  />
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-100 text-slate-700 text-xs font-bold rounded-2xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-[#0B57D0]/20 transition-all cursor-pointer"
                  >
                    <option value="price">Best Price</option>
                    <option value="rating">Highest Rating</option>
                    <option value="name">Alphabetical</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Medicines Cards Grid */}
            {displayedMedicines.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {displayedMedicines.map((medicine) => (
                    <MedicineCard key={medicine.id} medicine={medicine} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl p-16 text-center border border-dashed border-gray-200"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search size={26} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No medicines found</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
                  We couldn't find any medicines matching your search. Please adjust your category checkboxes or price range slider.
                </p>
                <button 
                  onClick={resetFilters}
                  className="bg-[#0B57D0] text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-md shadow-blue-500/10"
                >
                  Clear Filters
                </button>
              </motion.div>
            )}


          </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function MedicineDiscovery(props: MedicineDiscoveryProps) {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black text-[#0B57D0] uppercase tracking-widest text-xs animate-pulse">Loading pharmaLocator Discovery...</div>}>
      <DiscoveryContent {...props} />
    </Suspense>
  );
}
