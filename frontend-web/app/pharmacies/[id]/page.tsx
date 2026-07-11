"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Phone, MessageCircle, Star, MapPin, Clock,
  Heart, Share2, Stethoscope, ShoppingBag, Calendar, Check,
  AlertCircle, ChevronRight, Video, Send, Loader2,
  X, Plus, Minus, CheckCircle2, XCircle, Navigation, Copy,
  Volume2, Pin
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StarRating from "@/components/StarRating";
import { useUser } from "@/context/UserContext";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("medpay_access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...getAuthHeader(), ...(opts.headers ?? {}) },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? "Request failed");
  return json;
}

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

interface InventoryItem {
  _id: string;
  medicine_id: { name: string; _id: string; image_url?: string };
  stock_quantity: number;
  price: number;
  is_available: boolean;
}

interface Pharmacy {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  rating?: number;
  opening_hours?: Record<string, string>;
  status: string;
  latitude?: number;
  longitude?: number;
  announcements?: any[];
}

interface ChatMessage {
  _id: string;
  sender_id: { _id: string; full_name: string; avatar_url?: string };
  message: string;
  created_at: string;
  is_read: boolean;
}

export default function PharmacyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const seedMedicine = searchParams.get("medicine");
  const actionParam   = searchParams.get("action");  // 'chat' | 'call' from notification redirect
  const { favorites, toggleFavoritePharmacy, user } = useUser();

  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingToast, setRatingToast] = useState<string | null>(null);

  const resolveMockId = (pid: string, name?: string): string => {
    if (pid && pid.startsWith("p") && !isNaN(Number(pid.substring(1)))) {
      return pid;
    }
    if (!name) return pid;
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
    return pid;
  };

  const mockId = useMemo(() => {
    return resolveMockId(id as string, pharmacy?.name);
  }, [id, pharmacy]);

  const isFavorited = favorites?.pharmacies?.includes(mockId);

  // Modal states
  const [showVisit, setShowVisit] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showCall, setShowCall] = useState(false);
  const [showAuthWarning, setShowAuthWarning] = useState(false);

  const handleActionCheck = (action: () => void) => {
    if (!user) {
      setShowAuthWarning(true);
    } else {
      action();
    }
  };

  const handleRatingChange = async (newRating: number) => {
    if (!user) { setShowAuthWarning(true); return; }
    if (ratingSubmitting) return;
    setRatingSubmitting(true);
    try {
      const pharmacyIdToRate = pharmacy?._id ?? id;
      const res = await apiFetch(`/pharmacies/${pharmacyIdToRate}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating: newRating }),
      });
      // Update local pharmacy rating with the new average from server
      setPharmacy(prev => prev ? { ...prev, rating: res.data?.rating ?? newRating } : prev);
      setRatingToast(`Thanks! You rated this pharmacy ${newRating} ⭐`);
      setTimeout(() => setRatingToast(null), 3500);
    } catch {
      setRatingToast('Could not submit rating. Please try again.');
      setTimeout(() => setRatingToast(null), 3000);
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Order state
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [orderNotes, setOrderNotes] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<"success" | "error" | null>(null);
  const [orderMessage, setOrderMessage] = useState("");

  // Visit state
  const [visitDate, setVisitDate] = useState("");
  const [visitTime, setVisitTime] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [visitSubmitting, setVisitSubmitting] = useState(false);
  const [visitResult, setVisitResult] = useState<"success" | "error" | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch pharmacy data
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const fetchPharmacyAndInventory = async () => {
      try {
        const phRes = await apiFetch(`/pharmacies/${id}`);
        const phData = phRes.data ?? phRes;
        setPharmacy(phData);

        if (phData && phData._id) {
          // If the URL has a mock ID, replace the history state with the real database ObjectId
          if (id.startsWith("p")) {
            window.history.replaceState(null, "", `/pharmacies/${phData._id}${window.location.search}`);
          }

          const invRes = await apiFetch(`/pharmacies/${phData._id}/inventory?limit=50`).catch(() => ({ data: [] }));
          setInventory(invRes?.data ?? []);
        }
      } catch (err) {
        console.error("Failed to load pharmacy details or inventory", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacyAndInventory();
  }, [id]);

  // Auto-open modal when arriving via notification link (?action=chat or ?action=call)
  useEffect(() => {
    if (!actionParam || loading) return;
    if (actionParam === "chat") {
      if (user) {
        setShowChat(true);
      } else {
        setShowAuthWarning(true);
      }
    } else if (actionParam === "call") {
      if (user) {
        setShowCall(true);
      } else {
        setShowAuthWarning(true);
      }
    }
  }, [actionParam, loading, user]);

  // Fetch chat history when chat opens and poll for updates every 4 seconds
  useEffect(() => {
    if (!showChat || !id) return;

    const fetchHistory = (isSilent = false) => {
      if (!isSilent) setChatLoading(true);
      apiFetch(`/chats/${id}`)
        .then((res) => {
          setChatMessages(res.data ?? []);
          if (!isSilent) setChatLoading(false);
        })
        .catch(() => {
          if (!isSilent) setChatLoading(false);
        });
    };

    fetchHistory(false);

    const interval = setInterval(() => {
      fetchHistory(true);
    }, 4000);

    return () => clearInterval(interval);
  }, [showChat, id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Sorted inventory (seed medicine first)
  const sortedInventory = useMemo(() => {
    if (!seedMedicine) return inventory;
    return [...inventory].sort((a, b) => {
      const aMatch = a.medicine_id?.name?.toLowerCase().includes(seedMedicine.toLowerCase());
      const bMatch = b.medicine_id?.name?.toLowerCase().includes(seedMedicine.toLowerCase());
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [inventory, seedMedicine]);

  // Resolved today's hours and overall open status
  const todayHoursInfo = useMemo(() => {
    if (!pharmacy || !pharmacy.opening_hours) {
      return { text: "Open 24 Hours", isOpen: true, schedule: null };
    }
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const todayKey = days[new Date().getDay()];
    const dayHours: any = pharmacy.opening_hours[todayKey];
    
    if (!dayHours) {
      return { text: "Open 24 Hours", isOpen: true, schedule: pharmacy.opening_hours };
    }
    
    if (dayHours.closed) {
      return { text: "Closed Today", isOpen: false, schedule: pharmacy.opening_hours };
    }
    
    return { text: `${dayHours.open} - ${dayHours.close}`, isOpen: true, schedule: pharmacy.opening_hours };
  }, [pharmacy]);

  const availableItems = inventory.filter((i) => i.is_available && i.stock_quantity > 0);

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      if (prev[itemId]) {
        const next = { ...prev };
        delete next[itemId];
        return next;
      }
      return { ...prev, [itemId]: 1 };
    });
  };

  const adjustQty = (itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const current = prev[itemId] ?? 0;
      const next = current + delta;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[itemId];
        return copy;
      }
      return { ...prev, [itemId]: next };
    });
  };

  const submitOrder = async () => {
    setOrderSubmitting(true);
    setOrderResult(null);
    try {
      const items = Object.entries(selectedItems).map(([itemId, qty]) => {
        const inv = inventory.find((i) => i._id === itemId);
        return { 
          medicine_id: inv?.medicine_id?._id || null, 
          name: inv?.medicine_id?.name ?? "Unknown Medicine", 
          quantity: qty, 
          price: inv?.price 
        };
      });
      await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({ pharmacy_id: id, type: "order", items, notes: orderNotes }),
      });
      setOrderResult("success");
      setOrderMessage("Order placed! The pharmacy will respond shortly.");
    } catch (e: any) {
      setOrderResult("error");
      setOrderMessage(e.message ?? "Failed to place order.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  const submitVisit = async () => {
    if (!visitNotes.trim()) return;
    setVisitSubmitting(true);
    setVisitResult(null);
    try {
      await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({ pharmacy_id: id, type: "visit", notes: visitNotes }),
      });
      setVisitResult("success");
    } catch {
      setVisitResult("error");
    } finally {
      setVisitSubmitting(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !pharmacy) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      const ownerId = (pharmacy as any).owner_id?._id ?? (pharmacy as any).owner_id;
      const res = await apiFetch("/chats", {
        method: "POST",
        body: JSON.stringify({ pharmacy_id: id, recipient_id: ownerId, message: text }),
      });
      setChatMessages((prev) => [...prev, res.data]);
    } catch {
      setChatInput(text);
    }
  };

  const shareLinks = pharmacy
    ? {
        whatsapp: `https://wa.me/?text=Check out ${encodeURIComponent(pharmacy.name)} pharmacy on Smart Pharmacy Locator! ${encodeURIComponent(window?.location?.href ?? "")}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(window?.location?.href ?? "")}&text=Check out ${encodeURIComponent(pharmacy.name)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window?.location?.href ?? "")}`,
        linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window?.location?.href ?? "")}&title=${encodeURIComponent(pharmacy.name)}`,
      }
    : null;

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={40} className="animate-spin text-[#24D2A6]" />
          <p className="text-slate-400 font-medium">Loading pharmacy...</p>
        </div>
      </div>
    );
  }

  if (!pharmacy) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Pharmacy not found</h2>
          <button onClick={() => router.back()} className="text-[#24D2A6] font-bold mt-4">← Go back</button>
        </div>
      </div>
    );
  }

  const todayMin = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Rating Toast */}
      <AnimatePresence>
        {ratingToast && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 right-6 z-[999] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold"
          >
            <Star size={16} className="text-amber-400 fill-amber-400 shrink-0" />
            {ratingToast}
          </motion.div>
        )}
      </AnimatePresence>
      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top bar */}
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-[#24D2A6] font-bold text-sm transition-colors group">
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              BACK TO RESULTS
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => toggleFavoritePharmacy(mockId)}
                className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm border ${isFavorited ? "bg-rose-50 border-rose-100 text-rose-500" : "bg-white border-gray-100 text-slate-400 hover:text-rose-500"}`}
              >
                <Heart size={20} fill={isFavorited ? "currentColor" : "none"} />
              </button>
              <button onClick={() => setShowShare(true)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 text-slate-400 hover:text-blue-500 transition-all shadow-sm">
                <Share2 size={20} />
              </button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className="flex-grow lg:w-2/3">
              <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 mb-8">
                {/* Hero */}
                <div className="h-80 relative bg-gradient-to-br from-slate-700 to-slate-900">
                  <img 
                    src={(() => {
                      // 1. Use stored logo_url if it's a real URL or a base64 data URI
                      if (
                        pharmacy.logo_url &&
                        (pharmacy.logo_url.startsWith("http") || pharmacy.logo_url.startsWith("data:"))
                      ) {
                        return pharmacy.logo_url;
                      }
                      // 2. Name-based guaranteed-visible Unsplash fallbacks
                      const n = (pharmacy.name ?? "").toLowerCase();
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
                    })()}
                    alt={pharmacy.name} 
                    className="w-full h-full object-cover opacity-50" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent flex items-end p-8 md:p-12">
                    <div className="w-full">
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${pharmacy.status === "approved" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>
                          {pharmacy.status === "approved" ? "🟢 Active" : pharmacy.status}
                        </span>
                        {pharmacy.rating != null && (
                          <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 text-white text-[10px] font-bold">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            {pharmacy.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">{pharmacy.name}</h1>
                      <div className="flex items-center gap-2 text-white/80 font-medium">
                        <MapPin size={18} className="text-[#24D2A6]" />
                        {pharmacy.address ?? pharmacy.city ?? "Address not set"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pinned Announcement Banner */}
                {pharmacy.announcements && pharmacy.announcements.some((a: any) => a.is_pinned) && (
                  <div className="bg-amber-50 border-b border-amber-100 px-8 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
                      <Pin className="fill-current animate-bounce" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider font-sans">PINNED BULLETIN</span>
                      <p className="text-xs font-black text-amber-900 truncate">
                        {pharmacy.announcements.find((a: any) => a.is_pinned).title}: {pharmacy.announcements.find((a: any) => a.is_pinned).content}
                      </p>
                    </div>
                  </div>
                )}

                {/* Quick Info */}
                <div className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-gray-50">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Phone</span>
                    <p className="text-lg font-bold text-slate-900">{pharmacy.phone ?? "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Rating</span>
                    <StarRating
                      initialRating={pharmacy.rating ?? 0}
                      interactive={true}
                      onRatingChange={handleRatingChange}
                    />
                    {ratingSubmitting && <p className="text-[10px] text-slate-400 mt-1 animate-pulse">Submitting…</p>}
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">Email</span>
                    <p className="text-base font-bold text-slate-900 truncate">{pharmacy.email ?? "N/A"}</p>
                  </div>
                </div>

                {/* About This Pharmacy */}
                <div className="p-8 md:p-12 border-b border-gray-50">
                  <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <Stethoscope size={24} className="text-[#24D2A6]" /> About This Pharmacy
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Description */}
                    <div className="space-y-5">
                      <p className="text-slate-600 text-sm leading-relaxed font-medium">
                        {pharmacy.name} is a trusted, licensed pharmacy committed to providing quality medicines and professional healthcare services to the community. Our trained pharmacists are always ready to assist you with prescriptions, general health advice, and medication guidance.
                      </p>
                      <div className="flex flex-col gap-3">
                        {/* Hours summary — 24 Hour Service */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                          <div className="flex items-center gap-3">
                            <Clock size={18} className="text-[#24D2A6] shrink-0" />
                            <div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Operating Hours</span>
                              <span className={`text-sm font-black flex items-center gap-1.5 ${todayHoursInfo.isOpen ? "text-emerald-600" : "text-rose-600"}`}>
                                <span className="relative flex h-2 w-2">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${todayHoursInfo.isOpen ? "bg-emerald-400" : "bg-rose-400"} opacity-75`}></span>
                                  <span className={`relative inline-flex rounded-full h-2 w-2 ${todayHoursInfo.isOpen ? "bg-emerald-500" : "bg-rose-500"}`}></span>
                                </span>
                                {todayHoursInfo.text}
                              </span>
                            </div>
                          </div>

                          {/* Alert message if there are active announcements regarding service interruptions/holidays */}
                          {pharmacy.announcements && pharmacy.announcements.some(
                            (a: any) => a.type === "holiday" || a.type === "service_interruption" || a.type === "emergency"
                          ) && (
                            <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black text-rose-600 uppercase tracking-wider animate-pulse">
                              ⚠️ Active Schedule Exception Notice: See bulletin board below
                            </div>
                          )}

                          {/* Full Weekly Hours Detail List */}
                          <div className="pt-2 border-t border-slate-200/50 space-y-1.5 text-xs">
                            {todayHoursInfo.schedule ? (
                              Object.entries(todayHoursInfo.schedule).map(([dayKey, info]: [string, any]) => {
                                const dayNames: Record<string, string> = {
                                  mon: "Monday",
                                  tue: "Tuesday",
                                  wed: "Wednesday",
                                  thu: "Thursday",
                                  fri: "Friday",
                                  sat: "Saturday",
                                  sun: "Sunday"
                                };
                                const daysArray = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
                                const isToday = dayKey === daysArray[new Date().getDay()];
                                return (
                                  <div key={dayKey} className="flex items-center justify-between py-0.5">
                                    <span className={`font-semibold ${isToday ? "text-[#24D2A6]" : "text-slate-600"}`}>
                                      {dayNames[dayKey] ?? dayKey} {isToday && "(Today)"}
                                    </span>
                                    {info.closed ? (
                                      <span className="font-mono font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">Closed</span>
                                    ) : (
                                      <span className={`font-mono font-bold px-2.5 py-0.5 rounded-full ${isToday ? "text-[#24D2A6] bg-[#24D2A6]/5 border border-[#24D2A6]/20" : "text-slate-600 bg-slate-50 border border-slate-100"}`}>
                                        {info.open} - {info.close}
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  <span className="font-semibold text-slate-600">Every Day</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">Open 24 Hours</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Location */}
                        <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-4">
                          <MapPin size={18} className="text-rose-400 shrink-0" />
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Location</span>
                            <span className="text-sm font-black text-slate-800">{pharmacy.address ?? pharmacy.city ?? "Address not set"}</span>
                          </div>
                        </div>
                        {/* Contact */}
                        {pharmacy.phone && (
                          <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-5 py-4">
                            <Phone size={18} className="text-[#24D2A6] shrink-0" />
                            <div className="flex-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Phone</span>
                              <span className="text-sm font-black text-slate-800">{pharmacy.phone}</span>
                            </div>
                            <button
                              onClick={() => handleActionCheck(() => setShowCall(true))}
                              className="bg-[#24D2A6] text-white px-4 py-2 rounded-xl text-xs font-black hover:bg-[#1fb896] transition-all active:scale-95"
                            >
                              Call Now
                            </button>
                          </div>
                        )}

                        {/* Pharmacy Staff / Pharmacist Contact */}
                        {(pharmacy as any).owner_id && (
                          <div className="flex items-start gap-4 bg-blue-50/40 border border-blue-100/40 rounded-2xl px-5 py-4 mt-1">
                            <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm shadow-blue-500/10">
                              {((pharmacy as any).owner_id.full_name ?? "S").charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Pharmacist Representative</span>
                              <span className="text-sm font-black text-slate-800 block">{(pharmacy as any).owner_id.full_name}</span>
                              <div className="mt-1 flex flex-col gap-0.5 text-xs text-slate-500 font-semibold">
                                {((pharmacy as any).owner_id.phone) && (
                                  <span className="truncate">📞 Phone: {(pharmacy as any).owner_id.phone}</span>
                                )}
                                {((pharmacy as any).owner_id.email) && (
                                  <span className="truncate">✉️ Email: {(pharmacy as any).owner_id.email}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Highlights card */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-black text-[#24D2A6] uppercase tracking-widest block mb-3">Why Choose Us</span>
                        <h4 className="text-xl font-black mb-5 leading-snug">Quality Care,<br/>Every Step</h4>
                        <ul className="space-y-3 text-sm text-slate-300">
                          <li className="flex items-center gap-2"><Check size={15} className="text-[#24D2A6] shrink-0" /> Licensed &amp; certified pharmacists</li>
                          <li className="flex items-center gap-2"><Check size={15} className="text-[#24D2A6] shrink-0" /> Genuine, verified medicines</li>
                          <li className="flex items-center gap-2"><Check size={15} className="text-[#24D2A6] shrink-0" /> Fast in-store &amp; delivery service</li>
                          <li className="flex items-center gap-2"><Check size={15} className="text-[#24D2A6] shrink-0" /> Confidential health consultations</li>
                        </ul>
                      </div>
                      <Stethoscope size={90} className="absolute -bottom-6 -right-6 text-white/5" />
                    </div>
                  </div>
                </div>

                {/* Announcements & Notices Board */}
                {pharmacy.announcements && pharmacy.announcements.length > 0 && (
                  <div className="p-8 md:p-12 border-b border-gray-50 bg-slate-50/40">
                    <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                      <Volume2 size={24} className="text-[#24D2A6]" /> Announcements & Notices
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pharmacy.announcements.map((ann: any) => {
                        const isPinned = ann.is_pinned;
                        return (
                          <div 
                            key={ann._id} 
                            className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                              isPinned ? "border-amber-300 shadow-md ring-2 ring-amber-50" : "border-slate-100 hover:shadow-lg"
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border font-mono ${
                                  ann.type === "emergency" ? "bg-rose-50 border-rose-100 text-rose-700 animate-pulse" :
                                  ann.type === "holiday" ? "bg-amber-50 border-amber-100 text-amber-700" :
                                  ann.type === "service_interruption" ? "bg-orange-50 border-orange-100 text-orange-700" :
                                  ann.type === "maintenance" ? "bg-slate-50 border-slate-200 text-slate-700" :
                                  ann.type === "event" ? "bg-purple-50 border-purple-100 text-purple-700" :
                                  ann.type === "achievement" ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                  "bg-teal-50 border-teal-100 text-[#0F766E]"
                                }`}>
                                  {ann.type.replace("_", " ")}
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                  {new Date(ann.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                              </div>

                              <div>
                                <h4 className="text-sm font-black text-slate-900 tracking-tight leading-tight flex items-center gap-1.5">
                                  {isPinned && <Pin size={12} className="text-amber-500 fill-amber-500 shrink-0" />}
                                  {ann.title}
                                </h4>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2 whitespace-pre-line">{ann.content}</p>
                              </div>

                              {ann.image_url && (
                                <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-100 mt-2">
                                  <img src={ann.image_url} alt="Notice Graphic" className="w-full h-full object-cover" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Medicines */}
                <div className="p-8 md:p-12">
                  <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
                    <ShoppingBag size={24} className="text-[#24D2A6]" /> Available Medicines
                    <span className="ml-auto text-base font-bold text-slate-400">{inventory.length} items</span>
                  </h2>
                  {sortedInventory.length === 0 ? (
                    <p className="text-slate-400 text-center py-12">No inventory listed yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {sortedInventory.map((item) => {
                        const isMatch = seedMedicine && item.medicine_id?.name?.toLowerCase().includes(seedMedicine.toLowerCase());
                        const inStock = (item.is_available ?? item.in_stock ?? true) && item.stock_quantity > 0;
                        return (
                          <div key={item._id} className={`group p-6 rounded-3xl transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${isMatch ? "bg-[#24D2A6]/5 border-2 border-[#24D2A6] shadow-lg" : "bg-white border border-gray-100 hover:border-[#24D2A6]/20 hover:shadow-xl"}`}>
                            <div className="flex items-center gap-5">
                              {item.medicine_id?.image_url || getMedicineImage(item.medicine_id?.name) ? (
                                <img
                                  src={item.medicine_id?.image_url || getMedicineImage(item.medicine_id?.name)}
                                  alt={item.medicine_id?.name ?? "Medicine"}
                                  className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shrink-0"
                                />
                              ) : (
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isMatch ? "bg-[#24D2A6] text-white" : inStock ? "bg-emerald-50 text-emerald-500" : "bg-rose-50 text-rose-500"}`}>
                                  <Stethoscope size={28} />
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <h3 className="text-lg font-bold text-slate-900">{item.medicine_id?.name ?? "Unknown"}</h3>
                                  {isMatch && <span className="bg-[#24D2A6] text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">🎯 Your Search</span>}
                                </div>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${inStock ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                                  {inStock ? `In Stock (${item.stock_quantity})` : "Out of Stock"}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-4">
                              <div className="text-right md:mr-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Price</span>
                                <span className="text-xl font-black text-slate-900">{item.price?.toLocaleString() ?? "—"} ETB</span>
                              </div>
                              <button
                                disabled={!inStock}
                                onClick={() => handleActionCheck(() => { setSelectedItems({ [item._id]: 1 }); setShowOrder(true); })}
                                className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-slate-800 disabled:opacity-30 disabled:grayscale transition-all"
                              >Order</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-96 shrink-0">
              <div className="space-y-8 sticky top-24">
                {/* Map */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                  <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <MapPin size={20} className="text-rose-500" /> Location
                  </h3>
                  <div className="h-48 bg-slate-100 rounded-3xl mb-6 relative overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=800" alt="Map" className="w-full h-full object-cover grayscale opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-[#24D2A6] rounded-full flex items-center justify-center text-white animate-pulse">
                        <MapPin size={24} />
                      </div>
                    </div>
                  </div>
                  {pharmacy.latitude && pharmacy.longitude ? (
                    <a
                      href={`https://www.google.com/maps?q=${pharmacy.latitude},${pharmacy.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-lg"
                    >
                      <Navigation size={20} /> Get Directions
                    </a>
                  ) : (
                    <button disabled className="w-full bg-slate-200 text-slate-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 cursor-not-allowed">
                      <Navigation size={20} /> Location Not Set
                    </button>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-[#24D2A6] rounded-[2.5rem] p-8 text-white shadow-xl shadow-[#24D2A6]/30">
                  <h3 className="text-xl font-black mb-6">Quick Actions</h3>
                  <div className="space-y-4">
                    <button onClick={() => handleActionCheck(() => { setShowVisit(true); setShowChat(false); setShowOrder(false); })} className="w-full bg-white/20 backdrop-blur-md text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-white/30 transition-all border border-white/30">
                      <Calendar size={20} /> Request Visit
                    </button>
                    <button onClick={() => handleActionCheck(() => { setShowOrder(true); setShowChat(false); setShowVisit(false); })} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl">
                      <ShoppingBag size={20} /> Order Medicines
                    </button>
                  </div>
                </div>

                {/* Dynamic Panel: Chat, Visit, Order, or Contact Options */}
                {showChat ? (
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-lg overflow-hidden flex flex-col h-[480px] transition-all duration-300">
                    {/* Inline Chat Header */}
                    <div className="flex items-center gap-3 p-5 border-b border-gray-100 bg-slate-50 flex-shrink-0">
                      <button
                        onClick={() => setShowChat(false)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-200 text-slate-500 transition-colors shrink-0"
                        title="Back to contact info"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-[#24D2A6]/10 flex items-center justify-center text-[#24D2A6] font-black text-sm shrink-0">
                        {pharmacy.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate leading-tight">{pharmacy.name}</p>
                        <p className="text-[10px] font-black text-[#24D2A6] tracking-wider uppercase">
                          Online · Chatting with {(pharmacy as any).owner_id?.full_name || "Staff"}
                        </p>
                      </div>
                    </div>

                    {/* Inline Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/20">
                      {chatLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2">
                          <Loader2 size={24} className="animate-spin text-[#24D2A6]" />
                          <span className="text-[11px] text-slate-400 font-bold">Loading messages...</span>
                        </div>
                      ) : chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-4">
                          <MessageCircle size={32} className="mb-2 text-[#24D2A6]/40" />
                          <p className="font-black text-slate-800 text-xs uppercase tracking-wider mb-1">Start Chatting</p>
                          <p className="text-[11px] font-medium leading-relaxed max-w-[200px]">Ask about medicines availability, prices, or delivery.</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMine = msg.sender_id?._id === (user as any)?._id || msg.sender_id?._id === (user as any)?.id;
                          return (
                            <div key={msg._id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-xs font-semibold ${isMine ? "bg-[#24D2A6] text-white rounded-br-sm" : "bg-gray-100 text-slate-800 rounded-bl-sm"}`}>
                                {msg.message}
                                <div className={`text-[9px] mt-1 text-right ${isMine ? "text-white/70" : "text-slate-400"}`}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Inline Chat Input */}
                    <div className="p-3 border-t border-gray-100 flex gap-2 flex-shrink-0 bg-white">
                      <input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
                        placeholder="Type a message..."
                        className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-xs font-semibold focus:outline-none focus:border-[#24D2A6]"
                      />
                      <button
                        onClick={sendChatMessage}
                        disabled={!chatInput.trim()}
                        className="w-10 h-10 bg-[#24D2A6] text-white rounded-xl flex items-center justify-center hover:bg-[#1db891] transition-colors disabled:opacity-40 shrink-0"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                ) : showVisit ? (
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-lg overflow-hidden flex flex-col h-[480px] transition-all duration-300">
                    {/* Inline Visit Header */}
                    <div className="flex items-center gap-3 p-5 border-b border-gray-100 bg-slate-50 flex-shrink-0">
                      <button
                        onClick={() => { setShowVisit(false); setVisitResult(null); setVisitNotes(""); }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-200 text-slate-500 transition-colors shrink-0"
                        title="Back to contact info"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate leading-tight">Request Visit</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pharmacy.name}</p>
                      </div>
                    </div>

                    {/* Inline Visit Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                      {visitResult === "success" ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-md shadow-emerald-500/10">
                            <Check size={32} strokeWidth={3} />
                          </div>
                          <h4 className="text-base font-black text-slate-900 mb-2">Request Sent!</h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[240px]">Your appointment request has been sent. The pharmacy staff will reply to you.</p>
                          <button
                            onClick={() => { setShowVisit(false); setVisitResult(null); setVisitNotes(""); }}
                            className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 h-full flex flex-col justify-between">
                          <div className="space-y-3">
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                              Send a text request to the pharmacy staff for an appointment. They will review your availability and schedule it.
                            </p>
                            <div className="space-y-1.5 pt-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Message to Pharmacy Staff *</label>
                              <textarea
                                value={visitNotes}
                                onChange={(e) => setVisitNotes(e.target.value)}
                                rows={6}
                                required
                                placeholder="Explain what you want to consult about (e.g. prescription help, general consultation) and when you are free..."
                                className="w-full border border-gray-200 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                              />
                            </div>
                            {visitResult === "error" && (
                              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-medium flex items-center gap-2">
                                <AlertCircle size={16} /> Failed to send request. Please try again.
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 border-t border-gray-100 pt-4 flex-shrink-0">
                            <button
                              onClick={() => { setShowVisit(false); setVisitResult(null); setVisitNotes(""); }}
                              className="flex-1 py-3 rounded-xl font-bold text-xs text-slate-500 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={submitVisit}
                              disabled={!visitNotes.trim() || visitSubmitting}
                              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {visitSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                              {visitSubmitting ? "Sending…" : "Send Request"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : showOrder ? (
                  <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-lg overflow-hidden flex flex-col h-[480px] transition-all duration-300">
                    {/* Inline Order Header */}
                    <div className="flex items-center gap-3 p-5 border-b border-gray-100 bg-slate-50 flex-shrink-0">
                      <button
                        onClick={() => { setShowOrder(false); setOrderResult(null); setSelectedItems({}); }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-200 text-slate-500 transition-colors shrink-0"
                        title="Back to contact info"
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <ShoppingBag size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-900 text-sm truncate leading-tight">Order Medicines</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{pharmacy.name}</p>
                      </div>
                    </div>

                    {/* Inline Order Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-3">
                      {orderResult === "success" ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-4">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 shadow-md shadow-blue-500/10">
                            <Check size={32} strokeWidth={3} />
                          </div>
                          <h4 className="text-base font-black text-slate-900 mb-2">Order Placed!</h4>
                          <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-[240px]">{orderMessage}</p>
                          <button
                            onClick={() => { setShowOrder(false); setOrderResult(null); setSelectedItems({}); }}
                            className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                          >
                            Close
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3 h-full flex flex-col justify-between">
                          <div className="flex-grow overflow-y-auto space-y-2 max-h-[180px] pr-1">
                            {availableItems.length === 0 ? (
                              <p className="text-slate-400 text-center py-8 text-xs font-medium">No medicines in stock.</p>
                            ) : (
                              availableItems.map((item) => (
                                <div
                                  key={item._id}
                                  onClick={() => toggleItem(item._id)}
                                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                    selectedItems[item._id] ? "border-blue-500 bg-blue-50/50" : "border-gray-100 hover:border-gray-200"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                                      selectedItems[item._id] ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 bg-white"
                                    }`}>
                                      {selectedItems[item._id] && <Check size={12} strokeWidth={4} />}
                                    </div>
                                    <div className="min-w-0">
                                      <span className="font-bold text-xs text-slate-700 block truncate">{item.medicine_id?.name}</span>
                                      <span className="text-[10px] text-slate-400">{item.price?.toLocaleString()} ETB</span>
                                    </div>
                                  </div>
                                  {selectedItems[item._id] && (
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <button onClick={() => adjustQty(item._id, -1)} className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold"><Minus size={10} /></button>
                                      <span className="font-black text-slate-900 text-xs w-4 text-center">{selectedItems[item._id]}</span>
                                      <button onClick={() => adjustQty(item._id, 1)} className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold"><Plus size={10} /></button>
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Special Instructions</label>
                            <textarea
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                              rows={2}
                              placeholder="Type any instructions..."
                              className="w-full border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                            />
                            {orderResult === "error" && (
                              <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-medium flex items-center gap-1.5">
                                <AlertCircle size={14} /> {orderMessage}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 border-t border-gray-100 pt-4 flex-shrink-0">
                            <button
                              onClick={() => { setShowOrder(false); setOrderResult(null); setSelectedItems({}); }}
                              className="flex-1 py-3 rounded-xl font-bold text-xs text-slate-500 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={submitOrder}
                              disabled={Object.keys(selectedItems).length === 0 || orderSubmitting}
                              className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {orderSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
                              {orderSubmitting ? "Placing…" : `Order (${Object.keys(selectedItems).length})`}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Direct Contact</h3>
                    <div className="space-y-3">
                      <button onClick={() => handleActionCheck(() => setShowCall(true))} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-[#24D2A6]/5 transition-colors group text-left">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#24D2A6] shadow-sm group-hover:scale-110 transition-transform"><Phone size={18} /></div>
                        <span className="font-bold text-slate-900">Call Now</span>
                        <ChevronRight size={16} className="ml-auto text-slate-300" />
                      </button>
                      <button onClick={() => handleActionCheck(() => { setShowChat(true); setShowVisit(false); setShowOrder(false); })} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-colors group text-left">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform"><MessageCircle size={18} /></div>
                        <span className="font-bold text-slate-900">Chat with Pharmacy</span>
                        <ChevronRight size={16} className="ml-auto text-slate-300" />
                      </button>
                      <button onClick={() => handleActionCheck(() => router.push(`/favorites/complaint?pharmacy=${encodeURIComponent(pharmacy.name)}&pharmacy_id=${encodeURIComponent(pharmacy._id)}`))} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-rose-50 transition-colors group text-left">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-110 transition-transform"><AlertCircle size={18} /></div>
                        <span className="font-bold text-slate-900">Report an Issue</span>
                        <ChevronRight size={16} className="ml-auto text-slate-300" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>




      {/* ── Share Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showShare && shareLinks && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">Share Pharmacy</h2>
                <button onClick={() => setShowShare(false)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-slate-400"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <a href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors">
                  <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center text-white text-base font-black">W</div>
                  <span className="font-bold text-slate-700 text-sm">WhatsApp</span>
                </a>
                <a href={shareLinks.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center text-white"><Send size={16} /></div>
                  <span className="font-bold text-slate-700 text-sm">Telegram</span>
                </a>
                <a href={shareLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
                  <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-base font-black">f</div>
                  <span className="font-bold text-slate-700 text-sm">Facebook</span>
                </a>
                <a href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-2xl bg-sky-50 hover:bg-sky-100 transition-colors">
                  <div className="w-9 h-9 bg-sky-600 rounded-xl flex items-center justify-center text-white text-xs font-black">in</div>
                  <span className="font-bold text-slate-700 text-sm">LinkedIn</span>
                </a>
              </div>
              <button onClick={copyLink} className="w-full flex items-center justify-center gap-2 py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl font-bold text-slate-700 transition-colors">
                <Copy size={16} /> Copy Link
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Call Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showCall && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 text-center">
              <div className="w-20 h-20 bg-[#24D2A6]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Phone size={36} className="text-[#24D2A6]" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Contact Pharmacy</h2>
              <p className="text-slate-500 mb-8">Choose how you'd like to reach {pharmacy.name}</p>
              <div className="space-y-3 mb-6">
                {pharmacy.phone && (
                  <a href={`tel:${pharmacy.phone}`} className="w-full flex items-center justify-center gap-3 py-4 bg-[#24D2A6] text-white rounded-2xl font-bold hover:bg-[#1db891] transition-colors shadow-lg shadow-[#24D2A6]/30">
                    <Phone size={20} /> Call {pharmacy.phone}
                  </a>
                )}
                <button
                  onClick={() => handleActionCheck(() => { setShowCall(false); setShowChat(true); })}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-blue-50 text-blue-700 rounded-2xl font-bold hover:bg-blue-100 transition-colors"
                >
                  <MessageCircle size={20} /> In-App Chat
                </button>
                <button className="w-full flex items-center justify-center gap-3 py-4 bg-purple-50 text-purple-700 rounded-2xl font-bold hover:bg-purple-100 transition-colors">
                  <Video size={20} /> Video Call (Coming Soon)
                </button>
              </div>
              <button onClick={() => setShowCall(false)} className="text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Auth Warning Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showAuthWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 text-center relative">
              <button onClick={() => setShowAuthWarning(false)} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-slate-400"><X size={18} /></button>
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Access Required</h2>
              <p className="text-slate-600 mb-6 font-medium">
                To get access please <Link href="/login" className="text-[#24D2A6] underline font-black hover:text-[#1db891] transition-colors">sign in</Link>
              </p>
              <button onClick={() => setShowAuthWarning(false)} className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
