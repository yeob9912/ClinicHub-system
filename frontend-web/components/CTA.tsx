"use client";

import { motion } from "framer-motion";
import { ArrowRight, Info } from "lucide-react";
import { useAppContext } from "./providers";

export default function CTA() {
  const { t } = useAppContext();

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Base gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0d9e7a 0%, #24D2A6 40%, #0fb386 70%, #059669 100%)",
          zIndex: 0,
        }}
      />

      {/* Animated floating orbs */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
        {/* Large orb top-left */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            top: "-80px",
            left: "-60px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        {/* Medium orb top-right */}
        <motion.div
          animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          style={{
            position: "absolute",
            top: "-40px",
            right: "-40px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)",
          }}
        />
        {/* Bottom orb */}
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -20, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "30%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)",
          }}
        />

        {/* Animated pulsing rings */}
        <motion.div
          animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            top: "50%",
            left: "15%",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.5)",
            transform: "translate(-50%, -50%)",
          }}
        />
        <motion.div
          animate={{ scale: [1, 3], opacity: [0.25, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeOut", delay: 1.5 }}
          style={{
            position: "absolute",
            top: "30%",
            right: "20%",
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.4)",
          }}
        />

        {/* Animated moving grid lines */}
        <motion.div
          animate={{ backgroundPosition: ["0px 0px", "40px 40px"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Floating sparkle dots */}
        {[
          { top: "20%", left: "10%", size: 6, dur: 3 },
          { top: "70%", left: "80%", size: 4, dur: 4 },
          { top: "40%", left: "60%", size: 8, dur: 5 },
          { top: "80%", left: "25%", size: 5, dur: 3.5 },
          { top: "15%", left: "75%", size: 4, dur: 4.5 },
          { top: "55%", left: "45%", size: 6, dur: 6 },
        ].map((dot, i) => (
          <motion.div
            key={i}
            animate={{ y: [0, -20, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: dot.dur, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
            style={{
              position: "absolute",
              top: dot.top,
              left: dot.left,
              width: dot.size,
              height: dot.size,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.8)",
              boxShadow: `0 0 ${dot.size * 3}px rgba(255,255,255,0.8)`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 text-center relative" style={{ zIndex: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold font-poppins text-white mb-6 leading-tight">
            {t("cta.title")}
          </h2>
          <p className="text-emerald-50 text-lg mb-10 max-w-2xl mx-auto">
            Join hundreds of pharmacies already using pharmaLocator to reach more customers, increase sales, and manage inventory easily.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-white text-[#24D2A6] rounded-full font-bold text-lg shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] flex items-center gap-2 transition-shadow w-full sm:w-auto justify-center group"
            >
              {t("cta.start")}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 bg-emerald-800/40 hover:bg-emerald-800/60 text-white rounded-full font-medium text-lg border border-emerald-400/30 backdrop-blur-sm flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
            >
              <Info size={20} />
              {t("cta.learn")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
