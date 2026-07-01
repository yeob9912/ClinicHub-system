"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, MapPin, ShieldCheck, HeartPulse, Activity } from "lucide-react";
import { useAppContext } from "./providers";

const PLACEHOLDERS = [
  "Paracetamol...",
  "Insulin...",
  "Vitamin C...",
  "Amoxicillin...",
  "Ibuprofen..."
];

export default function Hero() {
  const router = useRouter();
  const { t } = useAppContext();
  const [query, setQuery] = useState("");

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (query.trim()) {
      router.push(`/medicines?q=${encodeURIComponent(query)}`);
    } else {
      router.push("/medicines");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    router.push(`/medicines?q=${encodeURIComponent(val)}`);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <section id="search" className="relative pt-32 pb-12 lg:pt-40 lg:pb-16 overflow-hidden min-h-[750px] flex flex-col justify-center">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full -z-20 overflow-hidden">
        <motion.div 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60" 
          style={{ backgroundImage: 'url("/hero-bg.png")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#24D2A6]/10 via-white/40 to-white" />
      </div>
      
      {/* Floating abstract shapes */}
      <motion.div 
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
        transition={{ duration: 6, repeat: Infinity }}
        className="absolute top-20 left-10 w-64 h-64 bg-[#24D2A6]/20 rounded-full blur-3xl -z-10"
      />
      <motion.div 
        animate={{ y: [0, 30, 0], x: [0, -20, 0] }} 
        transition={{ duration: 8, repeat: Infinity }}
        className="absolute bottom-10 right-10 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl -z-10"
      />

      {/* Floating Medical Assets - Left */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 0.5, x: 0, y: [0, -15, 0] }}
        transition={{ 
          opacity: { duration: 1.5, delay: 0.5 },
          x: { duration: 1.5, delay: 0.5 },
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute left-[-5%] top-[25%] w-[35%] max-w-[450px] hidden lg:block -z-10 pointer-events-none mix-blend-multiply scale-x-[-1]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/medical-assets.png" alt="Medical assets" className="w-full h-auto" />
      </motion.div>

      {/* Floating Medical Assets - Right */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 0.5, x: 0, y: [0, 15, 0] }}
        transition={{ 
          opacity: { duration: 1.5, delay: 0.5 },
          x: { duration: 1.5, delay: 0.5 },
          y: { duration: 7, repeat: Infinity, ease: "easeInOut" }
        }}
        className="absolute right-[-5%] top-[25%] w-[35%] max-w-[450px] hidden lg:block -z-10 pointer-events-none mix-blend-multiply"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/medical-assets.png" alt="Medical assets" className="w-full h-auto" />
      </motion.div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-3xl mx-auto"
        >
          <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-poppins font-bold text-slate-900 leading-tight mb-6">
            {t("hero.title")}
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-base sm:text-lg md:text-xl text-slate-700 mb-10 px-2 sm:px-0">
            {t("hero.subtitle")}
          </motion.p>

          {/* Search Box */}
          <motion.div variants={itemVariants} className="bg-white p-2 rounded-2xl shadow-[0_20px_50px_rgba(37,99,235,0.1)] max-w-2xl mx-auto relative z-10 border border-[#24D2A6]/20">
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 w-full border border-transparent focus-within:border-[#24D2A6] transition-colors">
                <Search className="text-gray-400 mr-2 sm:mr-3" size={18} />
                <input
                  type="text"
                  value={query}
                  onChange={handleChange}
                  onFocus={() => router.push("/medicines")}
                  placeholder={t("hero.placeholder")}
                  className="bg-transparent border-none outline-none w-full text-slate-700 cursor-pointer text-sm sm:text-base"
                />
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  type="button"
                  className="flex items-center justify-center p-3 bg-gray-100 text-slate-700 rounded-xl hover:bg-gray-200 transition-colors group relative shrink-0"
                  title={t("hero.location")}
                >
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                    <MapPin size={20} className="text-[#24D2A6]" />
                  </motion.div>
                  <span className="hidden md:block ml-2 text-sm font-medium">{t("hero.location")}</span>
                </button>
                
                <button 
                  type="submit"
                  className="flex-1 sm:flex-none bg-[#24D2A6] hover:bg-[#1eb08b] text-white px-5 sm:px-6 py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#24D2A6]/20 active:scale-95 transition-all relative overflow-hidden group"
                >
                  <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#24D2A6_1px,transparent_1px)] [background-size:20px_20px]"></div>
                  <span className="absolute inset-0 bg-white/20 scale-0 group-active:scale-100 rounded-xl transition-transform duration-300 origin-center opacity-0 group-active:opacity-100"></span>
                  <span>{t("hero.searchBtn")}</span>
                </button>
              </div>
            </form>
          </motion.div>

          {/* Trust Badges */}
          <motion.div variants={itemVariants} className="mt-12 flex flex-wrap justify-center gap-4 sm:gap-10 text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
              <span className="font-medium text-xs sm:text-sm">HealthHub</span>
            </div>
            <div className="flex items-center gap-2">
              <HeartPulse size={18} className="text-rose-500 shrink-0" />
              <span className="font-medium text-xs sm:text-sm">CuraCare</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-[#24D2A6] shrink-0" />
              <span className="font-medium text-xs sm:text-sm">PharmaPlus</span>
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
