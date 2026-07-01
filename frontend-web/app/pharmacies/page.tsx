"use client";

import { motion } from "framer-motion";
import PharmacyDiscovery from "@/components/PharmacyDiscovery";
import { useAppContext } from "@/components/providers";

export default function PharmaciesPage() {
  const { t } = useAppContext();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/50">
      <main className="flex-grow pt-24 pb-20">
        {/* Page Header */}
        <div className="relative overflow-hidden bg-white border-b border-gray-100 py-12">
          <div className="absolute inset-0 -z-10">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-10"
              style={{ backgroundImage: 'url("/medical-assets.png")' }}
            />
            <video
              autoPlay
              loop
              muted
              playsInline
              style={{ opacity: 0.18 }}
              className="absolute inset-0 w-full h-full object-cover"
            >
              <source src="https://assets.mixkit.co/videos/preview/mixkit-doctor-explaining-something-to-a-patient-41870-large.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-b from-[#24D2A6]/5 via-white/80 to-white" />
            <motion.div
              animate={{ y: [0, 16, 0], x: [0, -8, 0] }}
              transition={{ duration: 8, repeat: Infinity }}
              className="absolute -top-4 right-4 h-44 w-44 rounded-full bg-emerald-300/20 blur-3xl"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          >
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-poppins">
              <span className="text-[#24D2A6]">{t("pharmacies.heroTitle")}</span>
            </h1>
            <p className="mt-2 text-slate-500 font-medium">
              {t("pharmacies.heroSubtitle")}
            </p>
          </motion.div>
        </div>

        <PharmacyDiscovery />
      </main>
    </div>
  );
}
