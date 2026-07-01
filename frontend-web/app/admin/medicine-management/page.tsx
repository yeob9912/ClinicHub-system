"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, SlidersHorizontal, FileText, Plus, Search, Edit, Trash2, X, Loader2, Building2, Upload, Image as ImageIcon } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { apiRequest } from "@/lib/api";

// Reusable transition curves
const springTransition = { type: "spring", stiffness: 380, damping: 28 };
const smoothEaseInOut = { ease: [0.4, 0, 0.2, 1], duration: 0.25 };

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

export default function MedicineInventoryHub() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  const [selectedDetailsMed, setSelectedDetailsMed] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRxFilter, setSelectedRxFilter] = useState("All");
  const [pharmacyAvailability, setPharmacyAvailability] = useState<any[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [formFields, setFormFields] = useState({
    name: "",
    generic_name: "",
    brand_names: "",
    category: "Anti-Infective",
    description: "",
    usage_info: "",
    side_effects: "",
    dosage_form: "tablet",
    strength: "",
    requires_rx: false,
    nafdac_number: "",
    manufacturer: "",
    imageUrl: "",
    price: "",
  });

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormFields(prev => ({ ...prev, imageUrl: e.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>("/api/v1/admin/medicines?is_active=true&limit=100", { auth: true });
      const medicinesList = Array.isArray(data) ? data : (data?.data ?? []);
      setMedicines(medicinesList.map((m: any) => ({
        id: m._id,
        name: m.name,
        generic_name: m.generic_name || "",
        brand_names: m.brand_names || [],
        category: m.category || "Anti-Infective",
        description: m.description || "",
        usage_info: m.usage_info || "",
        side_effects: m.side_effects || "",
        dosage_form: m.dosage_form || "tablet",
        strength: m.strength || "",
        requires_rx: !!m.requires_rx,
        nafdac_number: m.nafdac_number || "",
        manufacturer: m.manufacturer || "",
        imageUrl: m.image_url || null,
        price: m.price || 0,
        stock: m.stock_quantity !== undefined ? `${m.stock_quantity} units` : "0 units",
        minLevel: 100,
        expiry: "N/A",
        status: m.stockStatus || "Out of Stock",
        created_by_pharmacy: m.created_by_pharmacy || null
      })));
    } catch (err) {
      console.error("Error fetching medicines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  // Fetch pharmacies that stock a selected medicine
  const fetchAvailability = useCallback(async (medId: string) => {
    setAvailabilityLoading(true);
    setPharmacyAvailability([]);
    try {
      const data = await apiRequest<any>(`/api/v1/medicines/${medId}/availability`, { auth: true });
      // Response shape: { medicine, data: [...pharmacies], meta }
      const list = Array.isArray(data) ? data : (data?.data ?? []);
      setPharmacyAvailability(list);
    } catch (err) {
      console.error("Error fetching availability:", err);
      setPharmacyAvailability([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, []);

  // When a medicine is selected for details, also load its pharmacy list
  useEffect(() => {
    if (selectedDetailsMed) {
      fetchAvailability(selectedDetailsMed.id);
    } else {
      setPharmacyAvailability([]);
    }
  }, [selectedDetailsMed, fetchAvailability]);

  const handleOpenAddForm = () => {
    setEditingMedId(null);
    setFormFields({
      name: "",
      generic_name: "",
      brand_names: "",
      category: "Anti-Infective",
      description: "",
      usage_info: "",
      side_effects: "",
      dosage_form: "tablet",
      strength: "",
      requires_rx: false,
      nafdac_number: "",
      manufacturer: "",
      imageUrl: "",
      price: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (e: React.MouseEvent, med: any) => {
    e.stopPropagation(); 
    setEditingMedId(med.id);
    setFormFields({
      name: med.name || "",
      generic_name: med.generic_name || "",
      brand_names: med.brand_names ? med.brand_names.join(", ") : "",
      category: med.category || "Anti-Infective",
      description: med.description || "",
      usage_info: med.usage_info || "",
      side_effects: med.side_effects || "",
      dosage_form: med.dosage_form || "tablet",
      strength: med.strength || "",
      requires_rx: !!med.requires_rx,
      nafdac_number: med.nafdac_number || "",
      manufacturer: med.manufacturer || "",
      imageUrl: med.imageUrl || "",
      price: String(med.price || 0),
    });
    setIsFormOpen(true);
  };

  const handleDeleteMed = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    if (confirm("Are you sure you want to deactivate this medicine record?")) {
      try {
        await apiRequest<any>(`/api/v1/admin/medicines/${id}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify({ is_active: false })
        });
        await fetchMedicines();
        if (selectedDetailsMed?.id === id) {
          setSelectedDetailsMed(null);
        }
      } catch (err: any) {
        alert(err.message || "Failed to deactivate medicine record");
      }
    }
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const brandNamesArray = formFields.brand_names
      ? formFields.brand_names.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const payload = {
      name: formFields.name,
      generic_name: formFields.generic_name || undefined,
      brand_names: brandNamesArray,
      category: formFields.category,
      description: formFields.description || undefined,
      usage_info: formFields.usage_info || undefined,
      side_effects: formFields.side_effects || undefined,
      dosage_form: formFields.dosage_form,
      strength: formFields.strength || undefined,
      requires_rx: formFields.requires_rx,
      nafdac_number: formFields.nafdac_number || undefined,
      manufacturer: formFields.manufacturer || undefined,
      image_url: formFields.imageUrl || undefined,
      price: Number(formFields.price) || 0,
    };

    try {
      if (editingMedId) {
        await apiRequest<any>(`/api/v1/admin/medicines/${editingMedId}`, {
          method: "PUT",
          auth: true,
          body: JSON.stringify(payload)
        });
      } else {
        await apiRequest<any>("/api/v1/admin/medicines", {
          method: "POST",
          auth: true,
          body: JSON.stringify(payload)
        });
      }
      setIsFormOpen(false);
      await fetchMedicines();
    } catch (err: any) {
      alert(err.message || "Failed to save medicine record");
    }
  };

  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || m.category === selectedCategory;
    
    let matchesRx = true;
    if (selectedRxFilter === "Rx") {
      matchesRx = m.requires_rx === true;
    } else if (selectedRxFilter === "OTC") {
      matchesRx = m.requires_rx === false;
    }

    return matchesSearch && matchesCategory && matchesRx;
  });

  return (
    <div className="min-h-screen bg-[#edf4f9] text-[#334155] p-3 sm:p-6 font-sans antialiased overflow-y-auto selection:bg-[#cbdbe5]/60">
      <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        
        {/* --- Header Section --- */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-[#e2eaf1]"
        >
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0f2d4a] uppercase text-center lg:text-left">
            Medicine Inventory Hub
          </h1>
          
          <div className="flex flex-col sm:flex-row flex-1 max-w-2xl items-stretch sm:items-center gap-2 lg:justify-end w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search inventory..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-[#cbdbe5] rounded-lg text-sm transition-all duration-200 focus:outline-none focus:border-[#42a3cf] focus:ring-4 focus:ring-[#42a3cf]/10 text-slate-700"
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-[#e3f2fd] text-[#2196f3] rounded-lg border border-[#bbdefb] hover:bg-[#d0e8ff] flex justify-center items-center transition-colors duration-200"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>

        {/* --- Responsive Matrix Stats Cards --- */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {[
            { label: "Total Medicines", value: medicines.length, icon: "📊", color: "bg-[#e0f2fe] text-[#0369a1]" },
            { label: "Idled / Low Alert", value: 38, icon: "⇅", color: "bg-[#fef3c7] text-[#d97706]", badge: "⚠️ Alert" },
            { label: "Expiring Soon (<3 mos)", value: 19, icon: "🕒", color: "bg-[#fee2e2] text-[#dc2626]", badge: "🚨 Alert" },
            { label: "Pending Approvals", value: 12, icon: "👥", color: "bg-[#f0fdf4] text-[#16a34a]", viewList: true }
          ].map((card, idx) => (
            <motion.div 
              key={idx}
              variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
              transition={springTransition}
              whileHover={{ y: -5, transition: { duration: 0.1 } }}
              className="bg-white p-4 sm:p-5 rounded-xl border border-[#e2eaf1] flex items-center gap-4 shadow-sm"
            >
              <div className={`p-3 rounded-lg font-bold text-lg shrink-0 ${card.color}`}>{card.icon}</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{card.label}:</p>
                <h3 className="text-xl sm:text-2xl font-black text-[#0f2d4a] flex items-center flex-wrap gap-1">
                  {card.value}
                  {card.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 animate-pulse">
                      {card.badge}
                    </span>
                  )}
                  {card.viewList && <span className="text-xs font-bold text-[#2196f3] underline cursor-pointer ml-1">(View)</span>}
                </h3>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* --- Primary Control Hub Strip --- */}
        <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-2 relative z-20">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleOpenAddForm}
            className="flex items-center justify-center gap-1.5 bg-[#2a9d8f] hover:bg-[#227c71] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-all duration-200"
          >
            <Plus className="w-3.5 h-3.5" /> Add New Medicine
          </motion.button>
          
          {/* Filters Configuration Layer */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowReportDropdown(false); }}
              className="flex items-center justify-center gap-1 bg-white border border-[#cbdbe5] hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold shadow-sm w-full"
            >
              <SlidersHorizontal className="w-3 h-3 text-slate-500" /> Filter <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-300 ${showFilterDropdown ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={smoothEaseInOut}
                  className="absolute right-0 mt-1.5 w-full sm:w-60 bg-white border border-[#cbdbe5] rounded-xl shadow-xl p-4 text-xs text-slate-700 space-y-3 z-30"
                >
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Category</label>
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-1.5 focus:ring-1 focus:ring-[#42a3cf] outline-none font-semibold text-slate-700"
                    >
                      <option value="All">All Categories</option>
                      <option value="Anti-Infective">Anti-Infective</option>
                      <option value="Cardiovascular">Cardiovascular</option>
                      <option value="Analgesic">Analgesic</option>
                      <option value="Gastrointestinal">Gastrointestinal</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="Dermatological">Dermatological</option>
                      <option value="Neurological">Neurological</option>
                      <option value="Endocrine">Endocrine</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-500 block mb-1">Prescription Status (Rx)</label>
                    <select 
                      value={selectedRxFilter}
                      onChange={(e) => setSelectedRxFilter(e.target.value)}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-1.5 focus:ring-1 focus:ring-[#42a3cf] outline-none font-semibold text-slate-700"
                    >
                      <option value="All">All Prescription Types</option>
                      <option value="Rx">Rx Only (Prescription Required)</option>
                      <option value="OTC">OTC (Over-The-Counter)</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Business Intelligence Exporter Layer */}
          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => { setShowReportDropdown(!showReportDropdown); setShowFilterDropdown(false); }}
              className="flex items-center justify-center gap-1 bg-white border border-[#cbdbe5] hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold shadow-sm w-full"
            >
              <FileText className="w-3 h-3 text-slate-500" /> Generate Report <ChevronDown className={`w-3 h-3 ml-1 transition-transform duration-300 ${showReportDropdown ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showReportDropdown && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={smoothEaseInOut}
                  className="absolute right-0 mt-1.5 w-full sm:w-52 bg-white border border-[#cbdbe5] rounded-xl shadow-xl py-1 text-xs text-slate-700 z-30 divide-y divide-slate-100"
                >
                  <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors duration-150">Stock Status Summary</button>
                  <button className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors duration-150">Expiry Horizon Map</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* --- Core Content Grid Layout Stack --- */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 items-start relative z-10">
          
          {/* Main Datagrid View */}
          <div className="lg:col-span-3 space-y-4 w-full overflow-hidden">
            <div className="bg-white rounded-xl shadow-sm border border-[#e2eaf1] overflow-hidden">
              
              {/* Balanced Columns Framework - completely hidden on small mobile viewports */}
              <div className="bg-[#f1f6fa] border-b border-[#e2eaf1] p-3 hidden md:grid grid-cols-4 text-xs font-bold text-[#475569] uppercase tracking-wider items-center gap-4 select-none">
                <div>Medicine Name</div>
                <div>Category</div>
                <div>Monitored Price</div>
                <div className="text-right pr-2">Actions</div>
              </div>

              {/* Seamless Anharmonic Dynamic Loop Output */}
              <motion.div layout className="divide-y divide-[#f1f6fa]">
                <AnimatePresence initial={false}>
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 text-xs">
                      <Loader2 className="animate-spin text-[#2a9d8f]" size={24} />
                      <span>Loading medicine catalog...</span>
                    </div>
                  ) : filteredMedicines.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">No records matching parameters.</div>
                  ) : (
                    filteredMedicines.map((med) => (
                      <motion.div 
                        key={med.id} 
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                        transition={springTransition}
                        onClick={() => setSelectedDetailsMed(med)}
                        className="p-4 md:p-3 grid grid-cols-1 md:grid-cols-4 text-xs items-stretch md:items-center transition-all cursor-pointer hover:bg-[#e3f2fd]/40 gap-2.5 md:gap-4 group relative"
                      >
                        {/* Name + image col */}
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden mb-0.5 tracking-wider">Medicine Name</span>
                          <img 
                            src={med.imageUrl || getMedicineImage(med.name)} 
                            alt={med.name} 
                            className="w-9 h-9 rounded-lg object-cover border border-slate-200 flex-shrink-0 bg-white"
                          />
                          <div className="flex flex-col text-left">
                            <span className="font-bold text-slate-800 text-sm md:text-xs tracking-tight break-words">{med.name}</span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              {med.generic_name && <span className="text-slate-400 text-[10px] font-mono">{med.generic_name}</span>}
                              {med.created_by_pharmacy && (
                                <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                                  🏪 {med.created_by_pharmacy.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Category col */}
                        <div className="flex flex-col md:block">
                          <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden mb-0.5 tracking-wider">Category</span>
                          <span className="text-slate-600 break-words">{med.category}</span>
                        </div>

                        {/* Price col */}
                        <div className="flex flex-col md:block">
                          <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden mb-0.5 tracking-wider">Price</span>
                          <span className="font-bold text-slate-700 font-mono">ETB {med.price ?? 0}</span>
                        </div>
                        
                        {/* Actions col */}
                        <div className="flex items-center justify-between md:justify-end gap-3 mt-2 md:mt-0 pt-2.5 md:pt-0 border-t md:border-none border-slate-100">
                          <span className="text-[10px] font-bold text-slate-400 uppercase md:hidden tracking-wider">Actions</span>
                          <div className="flex items-center gap-1">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => handleOpenEditForm(e, med)}
                              className="p-1.5 text-[#2196f3] bg-[#e3f2fd] border border-[#bbdefb] rounded-md hover:bg-[#cbe3f7]"
                              title="Edit Record"
                            >
                              <Edit className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => handleDeleteMed(e, med.id)}
                              className="p-1.5 text-[#ef5350] bg-[#ffebee] border border-[#ffcdd2] rounded-md hover:bg-[#f9d2d6]"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </motion.div>

            </div>
          </div>

          {/* Sticky Side Quick-Actions Module */}
          <div className="space-y-4 w-full">
            <div className="bg-white border border-[#e2eaf1] rounded-xl p-4 space-y-3 shadow-sm">
              <span className="text-xs font-black uppercase text-[#475569] tracking-wider block">Striking Actions:</span>
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} className="w-full text-center py-2 px-3 bg-[#e3f2fd] border border-[#bbdefb] text-[#1e6cb3] rounded-lg font-bold text-xs transition-colors hover:bg-[#d0e8ff]">
                Manage Stock Alerts
              </motion.button>
              <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} className="w-full text-center py-2 px-3 bg-[#e3f2fd] border border-[#bbdefb] text-[#1e6cb3] rounded-lg font-bold text-xs transition-colors hover:bg-[#d0e8ff]">
                Expiry Watchlist
              </motion.button>
              <div className="border-t border-[#f1f6fa] pt-3 mt-1">
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="w-full py-2 px-3 bg-[#1e6cb3] hover:bg-[#165288] text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors">
                  Pharmacy Submissions <span className="bg-[#ffb74d] text-slate-900 text-[10px] font-black px-1.5 py-0.2 rounded-md animate-bounce">12 NEW</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* --- OVERLAY INTERACTIVE MODAL DIALOG: Medicine Details Panel --- */}
      <AnimatePresence>
        {selectedDetailsMed && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 40 }}
              transition={{ type: "spring", damping: 26, stiffness: 340 }}
              className="bg-white border-2 border-[#b0d2ec] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            >
              {/* Modal Banner Title bar */}
              <div className="bg-[#e3f2fd] border-b border-[#cbdbe5] px-4 py-3 flex justify-between items-center shrink-0">
                <h4 className="text-sm font-black text-[#0f2d4a] uppercase tracking-wide">Medicine Specifications</h4>
                <motion.button 
                  whileHover={{ rotate: 90 }}
                  onClick={() => setSelectedDetailsMed(null)} 
                  className="text-slate-400 hover:text-slate-700 bg-white w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center shadow-sm"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Scrolling Parameters Body block */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                  <img 
                    src={selectedDetailsMed.imageUrl || getMedicineImage(selectedDetailsMed.name)} 
                    alt={selectedDetailsMed.name} 
                    className="w-24 h-24 rounded-xl object-cover border border-slate-200 shadow-inner bg-white shrink-0"
                  />

                  <div className="space-y-2 w-full text-center sm:text-left">
                    <div className="text-sm font-black text-[#0f2d4a]">{selectedDetailsMed.name}</div>
                    {selectedDetailsMed.generic_name && (
                      <div className="text-xs text-slate-500 font-bold">Generic Name: <span className="text-slate-700 font-mono">{selectedDetailsMed.generic_name}</span></div>
                    )}
                    <div className="text-slate-500 font-medium">Category: <span className="text-slate-700 font-bold">{selectedDetailsMed.category}</span></div>
                    {selectedDetailsMed.manufacturer && (
                      <div className="text-slate-500 font-medium">Manufacturer: <span className="text-slate-700 font-bold">{selectedDetailsMed.manufacturer}</span></div>
                    )}
                    {selectedDetailsMed.created_by_pharmacy ? (
                      <div className="text-xs font-semibold mt-1">
                        <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg">
                          🏪 Registered by Pharmacy: <strong className="text-amber-900">{selectedDetailsMed.created_by_pharmacy.name}</strong>
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium italic mt-1">
                        ⚙️ Registered by System Administrator
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Full Database Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Dosage Form</span>
                    <span className="font-bold text-slate-700 uppercase">{selectedDetailsMed.dosage_form}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Strength / Concentration</span>
                    <span className="font-bold text-slate-700">{selectedDetailsMed.strength || "N/A"}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Prescription Requirement (Rx)</span>
                    <span className={`font-bold ${selectedDetailsMed.requires_rx ? "text-rose-600" : "text-emerald-600"}`}>
                      {selectedDetailsMed.requires_rx ? "⚠️ Prescription Required (Rx)" : "✅ Over the Counter (OTC)"}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Manufacturer</span>
                    <span className="font-bold text-slate-700">{selectedDetailsMed.manufacturer || "N/A"}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">NAFDAC / Reg Number</span>
                    <span className="font-mono font-bold text-slate-700">{selectedDetailsMed.nafdac_number || "N/A"}</span>
                  </div>
                  <div className="p-2.5 bg-[#e3f2fd] border border-blue-100 rounded-xl">
                    <span className="text-[10px] font-bold text-[#0f2d4a] block uppercase">Monitored Base Price</span>
                    <span className="font-black text-sm text-[#1e6cb3] font-mono">ETB {selectedDetailsMed.price ?? 0}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Brand Names / Synonyms</span>
                    <span className="font-bold text-slate-700">{selectedDetailsMed.brand_names?.length > 0 ? selectedDetailsMed.brand_names.join(", ") : "None Listed"}</span>
                  </div>
                </div>

                {selectedDetailsMed.description && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="font-bold text-[#0f2d4a] block mb-1 text-[10px] tracking-wide uppercase">Therapeutic Description</span>
                    <p className="text-slate-600 leading-relaxed text-left bg-slate-50 p-2.5 rounded-xl border border-slate-100">{selectedDetailsMed.description}</p>
                  </div>
                )}

                {selectedDetailsMed.usage_info && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="font-bold text-[#0f2d4a] block mb-1 text-[10px] tracking-wide uppercase">Usage Guidelines & Dosage</span>
                    <p className="text-slate-600 leading-relaxed text-left bg-slate-50 p-2.5 rounded-xl border border-slate-100">{selectedDetailsMed.usage_info}</p>
                  </div>
                )}

                {selectedDetailsMed.side_effects && (
                  <div className="pt-3 border-t border-slate-100">
                    <span className="font-bold text-[#0f2d4a] block mb-1 text-[10px] tracking-wide uppercase">Contraindications & Side Effects</span>
                    <p className="text-slate-600 leading-relaxed text-left bg-slate-50 p-2.5 rounded-xl border border-slate-100">{selectedDetailsMed.side_effects}</p>
                  </div>
                )}

                {/* Pharmacies that carry this medicine */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-3.5 h-3.5 text-[#2a9d8f]" />
                    <span className="font-bold text-[#0f2d4a] text-xs tracking-wide uppercase">Pharmacies Stocking This Medicine</span>
                  </div>
                  {availabilityLoading ? (
                    <div className="flex items-center justify-center py-6 gap-2 text-slate-400">
                      <Loader2 className="animate-spin w-4 h-4 text-[#2a9d8f]" />
                      <span className="text-xs">Loading availability...</span>
                    </div>
                  ) : pharmacyAvailability.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                      No pharmacies currently stock this medicine.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pharmacyAvailability.map((ph: any, idx: number) => (
                        <div key={ph.pharmacy_id ?? idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-colors">
                          {ph.pharmacy_logo_url ? (
                            <img src={ph.pharmacy_logo_url} alt={ph.pharmacy_name} className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center font-black text-teal-600 text-sm shrink-0">
                              {(ph.pharmacy_name ?? "P").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-xs truncate">{ph.pharmacy_name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{ph.pharmacy_city ?? ph.pharmacy_address ?? ""}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              ph.in_stock ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                            }`}>{ph.in_stock ? "In Stock" : "Out"}</p>
                            {ph.stock_quantity != null && (
                              <p className="text-[10px] text-slate-400 mt-0.5">{ph.stock_quantity} units</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 p-3 border-t border-slate-100 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedDetailsMed(null)}
                  className="bg-slate-200 hover:bg-slate-300 font-bold px-4 py-2 rounded-xl text-slate-700 text-xs transition-colors"
                >
                  Close Specification view
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- FORM MODAL LAYER: Add / Edit Operation Core Pipeline --- */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-50">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 30 }}
              transition={springTransition}
              className="bg-white border border-[#cbdbe5] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden max-h-[95vh] flex flex-col"
            >
              <div className="bg-[#f1f6fa] border-b border-[#e2eaf1] p-4 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-black text-[#0f2d4a] uppercase tracking-wide">
                  {editingMedId ? "Edit Registry Parameter" : "Initialize New Node Item"}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 text-sm font-bold">✕</button>
              </div>

              <form onSubmit={handleSaveForm} className="p-4 overflow-y-auto space-y-3.5 text-xs text-slate-700 max-h-[78vh]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Medicine Name *</label>
                    <input 
                      type="text" required value={formFields.name}
                      onChange={(e) => setFormFields({...formFields, name: e.target.value})}
                      placeholder="e.g. Paracetamol 500mg"
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Generic Name</label>
                    <input 
                      type="text" value={formFields.generic_name}
                      onChange={(e) => setFormFields({...formFields, generic_name: e.target.value})}
                      placeholder="e.g. Acetaminophen"
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Category Group *</label>
                    <select 
                      value={formFields.category}
                      onChange={(e) => setFormFields({...formFields, category: e.target.value})}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                    >
                      <option value="Anti-Infective">Anti-Infective</option>
                      <option value="Cardiovascular">Cardiovascular</option>
                      <option value="Analgesic">Analgesic</option>
                      <option value="Gastrointestinal">Gastrointestinal</option>
                      <option value="Respiratory">Respiratory</option>
                      <option value="Dermatological">Dermatological</option>
                      <option value="Neurological">Neurological</option>
                      <option value="Endocrine">Endocrine</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Dosage Form *</label>
                    <select 
                      value={formFields.dosage_form}
                      onChange={(e) => setFormFields({...formFields, dosage_form: e.target.value})}
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                    >
                      <option value="tablet">tablet</option>
                      <option value="capsule">capsule</option>
                      <option value="syrup">syrup</option>
                      <option value="injection">injection</option>
                      <option value="cream">cream</option>
                      <option value="drops">drops</option>
                      <option value="inhaler">inhaler</option>
                      <option value="patch">patch</option>
                      <option value="other">other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Strength / Concentration</label>
                    <input 
                      type="text" value={formFields.strength}
                      onChange={(e) => setFormFields({...formFields, strength: e.target.value})}
                      placeholder="e.g. 500mg or 10mg/ml"
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Manufacturer</label>
                    <input 
                      type="text" value={formFields.manufacturer}
                      onChange={(e) => setFormFields({...formFields, manufacturer: e.target.value})}
                      placeholder="e.g. GlaxoSmithKline"
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">NAFDAC / Registration Number</label>
                    <input 
                      type="text" value={formFields.nafdac_number}
                      onChange={(e) => setFormFields({...formFields, nafdac_number: e.target.value})}
                      placeholder="e.g. A4-1234"
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600">
                      <input 
                        type="checkbox" 
                        checked={formFields.requires_rx}
                        onChange={(e) => setFormFields({...formFields, requires_rx: e.target.checked})}
                        className="rounded border-[#cbdbe5] text-[#2a9d8f] focus:ring-0 w-4 h-4" 
                      /> 
                      Prescription Required (Rx)
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Brand Names (Comma-separated)</label>
                  <input 
                    type="text" value={formFields.brand_names}
                    onChange={(e) => setFormFields({...formFields, brand_names: e.target.value})}
                    placeholder="e.g. Panadol, Tylenol, Calpol"
                    className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Monitored Price (ETB) *</label>
                    <input 
                      type="number" required min="0" step="any" value={formFields.price}
                      onChange={(e) => setFormFields({...formFields, price: e.target.value})}
                      placeholder="e.g. 150"
                      className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-600 block mb-1">Medicine Image</label>
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none ${
                        isDragging 
                          ? "border-[#42a3cf] bg-[#42a3cf]/5" 
                          : "border-[#cbdbe5] hover:border-[#42a3cf] bg-[#f8fafc] hover:bg-[#f1f5f9]"
                      }`}
                      style={{ height: "46px" }}
                    >
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(file);
                        }}
                        accept="image/jpeg,image/png,image/webp" 
                        className="hidden" 
                      />

                      {formFields.imageUrl ? (
                        <div className="relative w-full h-full flex items-center gap-3">
                          <img 
                            src={formFields.imageUrl} 
                            alt="Custom Preview" 
                            className="w-8 h-8 rounded-md object-cover border border-slate-200 bg-white" 
                          />
                          <div className="flex-grow min-w-0 text-left">
                            <span className="text-[9px] font-black text-[#2a9d8f] bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded uppercase tracking-wider">Custom Image</span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormFields({ ...formFields, imageUrl: "" });
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="px-2 py-1 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 rounded text-[9px] font-black uppercase tracking-wider transition-colors shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="relative w-full h-full flex items-center gap-3">
                          <img 
                            src={getMedicineImage(formFields.name)} 
                            alt="Default Preview" 
                            className="w-8 h-8 rounded-md object-cover border border-slate-200 bg-white grayscale-[25%] opacity-80" 
                          />
                          <div className="flex-grow min-w-0 text-left leading-none">
                            <span className="text-[8px] font-black text-slate-400 bg-slate-100 border border-slate-200 px-1 rounded uppercase tracking-wider">Default Image</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5 truncate">Drag new file or click here to replace</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Therapeutic Description</label>
                  <textarea 
                    value={formFields.description}
                    onChange={(e) => setFormFields({...formFields, description: e.target.value})}
                    placeholder="Brief description of clinical indications..."
                    className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf] h-20 resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Usage Guidelines & Dosage</label>
                  <textarea 
                    value={formFields.usage_info}
                    onChange={(e) => setFormFields({...formFields, usage_info: e.target.value})}
                    placeholder="Recommended instructions for administration..."
                    className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf] h-20 resize-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 block mb-1">Contraindications & Side Effects</label>
                  <textarea 
                    value={formFields.side_effects}
                    onChange={(e) => setFormFields({...formFields, side_effects: e.target.value})}
                    placeholder="Possible reactions or precautions..."
                    className="w-full bg-white border border-[#cbdbe5] rounded-lg p-2.5 focus:outline-none focus:border-[#42a3cf] h-20 resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-[#cbdbe5] flex justify-end gap-2 shrink-0">
                  <button 
                    type="button" onClick={() => setIsFormOpen(false)}
                    className="bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg font-bold text-slate-600 transition-colors"
                  >
                    Cancel Action
                  </button>
                  <button 
                    type="submit"
                    className="bg-[#2a9d8f] hover:bg-[#227c71] text-white px-5 py-2 rounded-lg font-bold shadow-sm transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}