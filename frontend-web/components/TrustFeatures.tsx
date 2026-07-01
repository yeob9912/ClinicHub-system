"use client";

import { motion } from "framer-motion";
import { PiggyBank, ShieldCheck, Box } from "lucide-react";
import { useAppContext } from "./providers";

export default function TrustFeatures() {
  const { t } = useAppContext();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <section className="pt-8 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {/* Card 1 */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-slate-50 rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-[#24D2A6]/10 transition-all duration-300 flex flex-col items-center text-center"
          >
            <motion.div 
              animate={{ rotate: [-5, 5, -5] }} 
              transition={{ duration: 4, repeat: Infinity }}
              className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 text-emerald-600"
            >
              <PiggyBank size={32} />
            </motion.div>
            <h3 className="text-xl font-bold font-poppins text-slate-900 mb-2">{t("trust.savings")}</h3>
            <p className="text-slate-600 font-medium">Find the most affordable options across multiple pharmacies instantly.</p>
          </motion.div>

          {/* Card 2 */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-slate-50 rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-[#24D2A6]/10 transition-all duration-300 flex flex-col items-center text-center"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }} 
              transition={{ duration: 3, repeat: Infinity }}
              className="w-16 h-16 bg-[#24D2A6]/10 rounded-2xl flex items-center justify-center mb-6 text-[#24D2A6]"
            >
              <ShieldCheck size={32} />
            </motion.div>
            <h3 className="text-xl font-bold font-poppins text-slate-900 mb-2">{t("trust.certified")}</h3>
            <p className="text-slate-600 font-medium">All listed pharmacies are verified and licensed by health authorities.</p>
          </motion.div>

          {/* Card 3 */}
          <motion.div
            variants={cardVariants}
            whileHover={{ y: -8, scale: 1.02 }}
            className="bg-slate-50 rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-[#24D2A6]/10 transition-all duration-300 flex flex-col items-center text-center"
          >
            <motion.div 
              animate={{ y: [0, -5, 0] }} 
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 bg-[#24D2A6]/10 rounded-2xl flex items-center justify-center mb-6 text-[#24D2A6]"
            >
              <Box size={32} />
            </motion.div>
            <h3 className="text-xl font-bold font-poppins text-slate-900 mb-2">{t("trust.stock")}</h3>
            <p className="text-slate-600 font-medium">See accurate real-time inventory updates so you never make a wasted trip.</p>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}
