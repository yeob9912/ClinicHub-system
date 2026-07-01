"use client";

import { motion } from "framer-motion";
import MedicineDiscovery from "@/components/MedicineDiscovery";
import { useAppContext } from "@/components/providers";

export default function SearchPage() {
  const { t } = useAppContext();

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow pt-24 pb-20">
        {/* Page Header */}
        <div className="relative overflow-hidden bg-white border-b border-gray-100 py-12">
          <div className="absolute inset-0 -z-10">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-10"
              style={{ backgroundImage: 'url("/hero-bg.png")' }}
            />
          <video
              autoPlay
              loop
              muted
              playsInline
              style={{ opacity: 0.18 }}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="https://assets.mixkit.co/videos/preview/mixkit-taking-pills-from-a-container-43283-large.mp4" type="video/mp4" />
              <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-[#24D2A6]/5 via-white/80 to-white" />
            <motion.div
              animate={{ y: [0, -14, 0], x: [0, 10, 0] }}
              transition={{ duration: 7, repeat: Infinity }}
              className="absolute top-4 left-8 h-40 w-40 rounded-full bg-[#24D2A6]/20 blur-3xl"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          >
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 font-poppins">
              <span className="text-[#24D2A6]">{t("medicines.heroTitle")}</span>
            </h1>
            <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
              {t("medicines.heroSubtitle")}
            </p>
          </motion.div>
        </div>

        <MedicineDiscovery />
      </main>
    </div>
  );
}
