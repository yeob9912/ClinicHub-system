"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Shield, FileText, Scale, HeartHandshake, Eye, HelpCircle } from "lucide-react";
import helpAndRights from "../../data/help_and_rights.json";

export default function PatientRightsPage() {
  const icons = [FileText, Eye, Scale, HeartHandshake];

  const rights = helpAndRights.patientRights.map((item, idx) => ({
    icon: icons[idx] || Shield,
    title: item.title,
    desc: item.desc,
  }));

  return (
    <div className="min-h-screen bg-gray-50/50 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-[#24D2A6] font-semibold text-sm mb-8 transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-[2.5rem] p-10 md:p-12 mb-12 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <span className="bg-[#24D2A6]/10 text-[#24D2A6] border border-[#24D2A6]/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 mb-6">
              <Shield size={13} /> Patient Protection
            </span>
            <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">Patient Rights &amp; Protections</h1>
            <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed">
              At MedPay, we are committed to upholding transparency, privacy, and empowerment for all healthcare consumers. Know your rights on our platform.
            </p>
          </div>
          <Shield size={150} className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none" />
        </div>

        {/* Rights Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {rights.map((right, idx) => {
            const Icon = right.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col items-start gap-4 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-[#24D2A6]/10 rounded-2xl flex items-center justify-center text-[#24D2A6] shrink-0 shadow-sm">
                  <Icon size={22} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">{right.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">{right.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
          <h3 className="text-base font-black text-slate-900 mb-2">Have a concern or complaint?</h3>
          <p className="text-slate-400 text-xs mb-6 max-w-sm mx-auto">
            If any pharmacy or provider violates your rights, please submit a formal report immediately.
          </p>
          <Link
            href="/contact-us"
            className="inline-flex bg-[#24D2A6] hover:bg-[#1eb891] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#24D2A6]/15 active:scale-95"
          >
            Submit Complaint / Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
