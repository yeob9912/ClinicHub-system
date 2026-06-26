"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, Search, ShoppingBag, Store, ShieldCheck, HelpCircle } from "lucide-react";

import helpAndRights from "../../data/help_and_rights.json";

export default function HelpCenterPage() {
  const icons = [Search, Store, ShoppingBag, ShieldCheck];
  const guides = helpAndRights.helpCenter.map((item, idx) => ({
    icon: icons[idx] || HelpCircle,
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
              <BookOpen size={13} /> Support Documentation
            </span>
            <h1 className="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">Help Center &amp; Guides</h1>
            <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed">
              Learn how to navigate the MedPay platform, browse pharmacies, track medicine availability, and connect with licensed pharmacists.
            </p>
          </div>
          <HelpCircle size={150} className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none" />
        </div>

        {/* Guides Section */}
        <div className="space-y-6">
          {guides.map((guide, idx) => {
            const Icon = guide.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.08 }}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex items-start gap-6 hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 bg-[#24D2A6]/10 rounded-2xl flex items-center justify-center text-[#24D2A6] shrink-0 shadow-sm">
                  <Icon size={22} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">{guide.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">{guide.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
          <h3 className="text-base font-black text-slate-900 mb-2">Still need assistance?</h3>
          <p className="text-slate-400 text-xs mb-6 max-w-sm mx-auto">
            Our support agents and system administrators are ready to help you with any questions.
          </p>
          <Link
            href="/contact-us"
            className="inline-flex bg-[#24D2A6] hover:bg-[#1eb891] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#24D2A6]/15 active:scale-95"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
