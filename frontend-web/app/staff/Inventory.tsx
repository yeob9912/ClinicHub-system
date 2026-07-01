import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Search, AlertCircle, Plus, Edit3, 
  Calendar, Save, X, Activity, ArrowDownRight
} from "lucide-react";
import { apiFetch, normaliseInventoryItem } from "./utils";

interface InventoryProps {
  pharmacyId: string | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function InventoryPage({ pharmacyId, showToast }: InventoryProps) {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Add Modal & Edit States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [allMedicines, setAllMedicines] = useState<any[]>([]);
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [newMedQty, setNewMedQty] = useState("");
  const [newMedPrice, setNewMedPrice] = useState("");

  // Register New Medicine Profile states
  const [isRegisterNew, setIsRegisterNew] = useState(false);
  const [medName, setMedName] = useState("");
  const [medCategory, setMedCategory] = useState("Antibiotics");
  const [medStrength, setMedStrength] = useState("");
  const [medDesc, setMedDesc] = useState("");
  const [medRequiresRx, setMedRequiresRx] = useState(false);
  const [medGenericName, setMedGenericName] = useState("");
  const [medBrandNames, setMedBrandNames] = useState("");
  const [medDosageForm, setMedDosageForm] = useState("tablet");
  const [medManufacturer, setMedManufacturer] = useState("");
  const [medNafdac, setMedNafdac] = useState("");
  const [medUsageInfo, setMedUsageInfo] = useState("");
  const [medSideEffects, setMedSideEffects] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(0);

  const categoriesList = ["All", "Antibiotics", "Analgesics", "Antidiabetics", "Cardiovascular"];

  const fetchInventory = useCallback(() => {
    if (!pharmacyId) return;
    setLoading(true);
    apiFetch(`/pharmacies/${pharmacyId}/inventory`)
      .then((res) => {
        const items = res.data ?? [];
        const normalized = items.map((item: any) => {
          const norm = normaliseInventoryItem(item);
          return {
            id: norm.id,
            name: norm.name,
            category: norm.category,
            qty: norm.stock,
            price: norm.price,
            expiry: "Oct 24, 2026", // Mock expiry
          };
        });
        setMedicines(normalized);
      })
      .catch((err) => {
        showToast("Failed to load inventory: " + err.message, "error");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [pharmacyId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  useEffect(() => {
    const highlight = localStorage.getItem("highlight_inventory_item");
    if (highlight) {
      setSearchQuery(highlight);
      localStorage.removeItem("highlight_inventory_item");
    }
  }, []);

  // Load medicines dropdown on modal open
  useEffect(() => {
    if (isAddModalOpen) {
      apiFetch("/medicines?limit=100")
        .then((res) => {
          setAllMedicines(res.data ?? []);
        })
        .catch(() => {});
    }
  }, [isAddModalOpen]);

  // Form Handlers
  const handleAddNewMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pharmacyId || !newMedQty || !newMedPrice) return;

    try {
      let finalMedicineId = selectedMedicineId;

      if (isRegisterNew) {
        if (!medName || !medCategory || !medStrength || !medDesc) {
          showToast("Please fill out all medicine details including category", "error");
          return;
        }

        const brandNamesArray = medBrandNames
          ? medBrandNames.split(",").map((s) => s.trim()).filter(Boolean)
          : [medName.trim()];

        // 1. Create the new medicine profile in the database
        const res = await apiFetch("/medicines", {
          method: "POST",
          body: JSON.stringify({
            name: medName.trim(),
            generic_name: medGenericName.trim() || undefined,
            brand_names: brandNamesArray,
            category: medCategory,
            dosage_form: medDosageForm,
            strength: medStrength.trim(),
            description: medDesc.trim(),
            usage_info: medUsageInfo.trim() || undefined,
            side_effects: medSideEffects.trim() || undefined,
            manufacturer: medManufacturer.trim() || undefined,
            nafdac_number: medNafdac.trim() || undefined,
            requires_rx: medRequiresRx,
            price: parseFloat(newMedPrice) || 0,
          }),
        });

        // Backend sendSuccess returns { success: true, data: {...} }
        const createdMed = res.data ?? res;
        if (!createdMed?._id) {
          throw new Error("Failed to retrieve new medicine database ID");
        }
        finalMedicineId = createdMed._id;
      } else {
        if (!selectedMedicineId) {
          showToast("Please select a medicine from the list", "error");
          return;
        }
      }

      // 2. Add to pharmacy inventory
      await apiFetch(`/pharmacies/${pharmacyId}/inventory`, {
        method: "POST",
        body: JSON.stringify({
          medicine_id: finalMedicineId,
          stock_quantity: parseInt(newMedQty) || 0,
          price: parseFloat(newMedPrice) || 0,
        }),
      });

      showToast(
        isRegisterNew 
          ? "Medicine registered & added to inventory" 
          : "Medicine added to inventory successfully", 
        "success"
      );

      // Reset form states
      setIsAddModalOpen(false);
      setSelectedMedicineId("");
      setNewMedQty("");
      setNewMedPrice("");
      setIsRegisterNew(false);
      setMedName("");
      setMedCategory("Antibiotics");
      setMedStrength("");
      setMedDesc("");
      setMedRequiresRx(false);
      setMedGenericName("");
      setMedBrandNames("");
      setMedDosageForm("tablet");
      setMedManufacturer("");
      setMedNafdac("");
      setMedUsageInfo("");
      setMedSideEffects("");
      fetchInventory();
    } catch (err: any) {
      showToast("Failed to process request: " + err.message, "error");
    }
  };

  const handleQuickAddIncrement = (id: string, currentQty: number) => {
    if (!pharmacyId) return;
    const newQty = currentQty + 5;
    apiFetch(`/pharmacies/${pharmacyId}/inventory/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        stock_quantity: newQty,
      }),
    })
      .then(() => {
        setMedicines(prev => prev.map(m => m.id === id ? { ...m, qty: newQty } : m));
        showToast("Stock incremented (+5 units)", "success");
      })
      .catch((err) => {
        showToast("Increment failed: " + err.message, "error");
      });
  };

  const startInlineEditing = (id: string, currentQty: number) => {
    setEditingId(id);
    setEditQty(currentQty);
  };

  const saveInlineQuantityUpdate = (id: string) => {
    if (!pharmacyId) return;
    apiFetch(`/pharmacies/${pharmacyId}/inventory/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        stock_quantity: editQty,
      }),
    })
      .then(() => {
        setMedicines(prev => prev.map(m => m.id === id ? { ...m, qty: editQty } : m));
        setEditingId(null);
        showToast("Stock quantity updated successfully", "success");
      })
      .catch((err) => {
        showToast("Update failed: " + err.message, "error");
      });
  };

  // Filter logic
  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || med.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-[#F1F3F6] text-[#1E293B] p-6 md:p-10 font-sans relative rounded-3xl overflow-hidden shadow-xs">
      
      {/* Background Graphic Accent */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none bg-[radial-gradient(#0f766e_1px,transparent_1px)] [background-size:24px_24px]"></div>

      {/* HEADER SECTION */}
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
        <div>
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Package className="h-8 w-8 text-[#0F766E]" /> Inventory Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage medicine lists, categories, and evaluate stock levels.</p>
        </div>

        <motion.button 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0F766E] text-white font-semibold text-sm rounded-xl shadow-sm hover:bg-[#0d665f] transition-all"
        >
          <Plus className="h-4 w-4 stroke-[3]" /> Add New Medicine
        </motion.button>
      </header>

      {/* SEARCH FIELD BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm mb-6 relative z-10">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search medicines by generic name, brand name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-[#0F766E] focus:bg-white transition-all text-slate-800"
          />
        </div>
      </div>

      {/* MAIN 3-COLUMN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10 items-start">
        
        {/* COLUMN 1: LEFT HAND SIDE CATEGORY NAVIGATION PANEL */}
        <div className="lg:col-span-2 space-y-2">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-2 mb-3">Categories</span>
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-1 pb-2 lg:pb-0 scrollbar-none">
            {categoriesList.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`w-full text-left whitespace-nowrap px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                  selectedCategory === cat 
                    ? "bg-white text-[#0F766E] border-l-4 border-[#0F766E] shadow-sm font-extrabold" 
                    : "text-slate-500 hover:bg-white/50 hover:text-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* COLUMN 2: PRIMARY MEDICINE MANAGEMENT LISTING (7 Columns) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-500 font-medium">
                Loading inventory items...
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-500 tracking-wide uppercase">
                    <th className="p-4 pl-6">Medicine Details</th>
                    <th className="p-4">Stock Quantity</th>
                    <th className="p-4">Expiry Date</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMedicines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                        No medicines match the selected search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredMedicines.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="p-4 pl-6">
                          <div className="font-semibold text-slate-900">{med.name}</div>
                          <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded">
                            {med.category}
                          </span>
                        </td>
                        
                        <td className="p-4">
                          {editingId === med.id ? (
                            <input 
                              type="number" 
                              value={editQty}
                              onChange={(e) => setEditQty(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-20 px-2 py-1 text-xs border rounded border-[#0F766E] text-slate-900 bg-white font-mono font-bold"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold ${med.qty <= 5 ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded' : 'text-slate-800'}`}>
                                {med.qty} Items
                              </span>
                              {med.qty <= 5 && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
                            </div>
                          )}
                        </td>

                        <td className="p-4">
                          <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" /> {med.expiry}
                          </span>
                        </td>

                        <td className="p-4 pr-6 text-right whitespace-nowrap">
                          {editingId === med.id ? (
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => saveInlineQuantityUpdate(med.id)}
                                className="p-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md hover:bg-emerald-100"
                                title="Save Changes"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="p-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-md hover:bg-slate-100"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1.5">
                              <button 
                                onClick={() => handleQuickAddIncrement(med.id, med.qty)}
                                className="p-2 bg-emerald-50 text-[#0F766E] border border-emerald-100 rounded-lg hover:bg-[#0F766E] hover:text-white transition-all"
                                title="Quick Add +5 Units"
                              >
                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                              </button>
                              <button 
                                onClick={() => startInlineEditing(med.id, med.qty)}
                                className="p-2 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-100 transition-all"
                                title="Update Quantity"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* COLUMN 3: RIGHT PANEL (3 Columns) - RESTORED RECENT AUDIT LEDGER TIMELINE */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Restored Audit Ledger Timeline */}
          <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" /> Recent Activities Log
            </h4>
            <div className="relative border-l border-slate-200 pl-4 ml-1 space-y-5 py-1">
              {[
                { time: "10:42 AM", title: "Order #8834 Verified", desc: "Narcotics crosscheck complete" },
                { time: "10:15 AM", title: "Stock Updated", desc: "Received +100 Units Paracetamol" },
                { time: "09:30 AM", title: "Walk-in Transaction", desc: "POS payment successful" }
              ].map((act, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline Node dot */}
                  <div className="absolute -left-[22.5px] top-1 h-2.5 w-2.5 rounded-full bg-white border-2 border-indigo-500 group-hover:bg-indigo-500 transition-colors" />
                  
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-indigo-600 font-bold">{act.time}</span>
                    <span className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowDownRight className="h-3 w-3 rotate-45 text-slate-400" />
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 mt-0.5">{act.title}</h4>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5 leading-tight">{act.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Critical Alert Panel */}
          <div className="bg-[#FEE2E2] rounded-2xl border border-rose-200 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-rose-800 mb-3 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="h-4 w-4" /> Low Stock Items
            </div>
            <div className="space-y-2">
              {medicines.filter(m => m.qty <= 5).map((m, idx) => (
                <div key={idx} className="p-3 bg-white/70 border border-rose-100 rounded-xl flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-800 truncate pr-2">{m.name}</p>
                  <span className="text-[10px] font-mono font-black bg-rose-600 text-white px-2 py-0.5 rounded">
                    {m.qty === 0 ? "Empty" : `${m.qty} Left`}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ADD NEW MEDICINE MODAL POPUP */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl border border-slate-200 p-6 shadow-xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-slate-900">Add New Product Profile</h3>
                <button onClick={() => { setIsAddModalOpen(false); setIsRegisterNew(false); }} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Mode Selector */}
              <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsRegisterNew(false)}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                    !isRegisterNew ? "bg-[#0F766E] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegisterNew(true)}
                  className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                    isRegisterNew ? "bg-[#0F766E] text-white shadow-xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Register New Product
                </button>
              </div>

              <form onSubmit={handleAddNewMedicine} className="space-y-4">
                {!isRegisterNew ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Select Medicine</label>
                    <select 
                      required
                      value={selectedMedicineId}
                      onChange={(e) => setSelectedMedicineId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                    >
                      <option value="">Choose medicine...</option>
                      {allMedicines.map((m) => (
                        <option key={m._id} value={m._id}>
                          {m.name} ({m.strength})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Medicine Name *</label>
                        <input 
                          type="text" required placeholder="e.g. Paracetamol"
                          value={medName}
                          onChange={(e) => setMedName(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Generic Name</label>
                        <input 
                          type="text" placeholder="e.g. Acetaminophen"
                          value={medGenericName}
                          onChange={(e) => setMedGenericName(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Brand Names (Comma-separated)</label>
                      <input 
                        type="text" placeholder="e.g. Panadol, Tylenol, Calpol"
                        value={medBrandNames}
                        onChange={(e) => setMedBrandNames(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Category *</label>
                        <select
                          value={medCategory}
                          onChange={(e) => setMedCategory(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                        >
                          <option value="Anti-Infective">Anti-Infective</option>
                          <option value="Cardiovascular">Cardiovascular</option>
                          <option value="Analgesic">Analgesic</option>
                          <option value="Gastrointestinal">Gastrointestinal</option>
                          <option value="Respiratory">Respiratory</option>
                          <option value="Dermatological">Dermatological</option>
                          <option value="Neurological">Neurological</option>
                          <option value="Endocrine">Endocrine</option>
                          <option value="Antibiotics">Antibiotics</option>
                          <option value="Pain Relief">Pain Relief</option>
                          <option value="Analgesics">Analgesics</option>
                          <option value="Antidiabetics">Antidiabetics</option>
                          <option value="Diabetes Care">Diabetes Care</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Dosage Form *</label>
                        <select
                          value={medDosageForm}
                          onChange={(e) => setMedDosageForm(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Strength *</label>
                        <input 
                          type="text" required placeholder="e.g. 500mg"
                          value={medStrength}
                          onChange={(e) => setMedStrength(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Manufacturer</label>
                        <input 
                          type="text" placeholder="e.g. GlaxoSmithKline"
                          value={medManufacturer}
                          onChange={(e) => setMedManufacturer(e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">NAFDAC / Reg Number</label>
                      <input 
                        type="text" placeholder="e.g. A4-1234"
                        value={medNafdac}
                        onChange={(e) => setMedNafdac(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Therapeutic Description *</label>
                      <textarea
                        required rows={2} placeholder="Brief clinical indications..."
                        value={medDesc}
                        onChange={(e) => setMedDesc(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 resize-none leading-normal"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Usage Guidelines & Dosage</label>
                      <textarea
                        rows={2} placeholder="Usage instructions..."
                        value={medUsageInfo}
                        onChange={(e) => setMedUsageInfo(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 resize-none leading-normal"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Contraindications & Side Effects</label>
                      <textarea
                        rows={2} placeholder="Side effects..."
                        value={medSideEffects}
                        onChange={(e) => setMedSideEffects(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800 resize-none leading-normal"
                      />
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Requires Prescription</span>
                      <button
                        type="button"
                        onClick={() => setMedRequiresRx(prev => !prev)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${medRequiresRx ? "bg-[#0F766E]" : "bg-slate-300"}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-200 ${medRequiresRx ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Price (ETB)</label>
                    <input 
                      type="number" step="0.01" required placeholder="Price"
                      value={newMedPrice}
                      onChange={(e) => setNewMedPrice(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">Initial Stock</label>
                    <input 
                      type="number" required placeholder="Quantity Units"
                      value={newMedQty}
                      onChange={(e) => setNewMedQty(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-xs bg-slate-50 focus:outline-none focus:border-[#0F766E] text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button 
                    type="button" onClick={() => { setIsAddModalOpen(false); setIsRegisterNew(false); }}
                    className="px-4 py-2 border rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-[#0F766E] text-white font-semibold text-xs rounded-lg hover:bg-[#0d665f]"
                  >
                    Save Entry
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