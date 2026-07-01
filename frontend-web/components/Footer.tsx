"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white pt-16 pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#24D2A6] flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-[#24D2A6]/20">
                P
              </div>
              <span className="font-poppins font-black text-2xl tracking-tighter">
                pharma<span className="text-[#24D2A6]">Locator</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Ethiopia's leading healthcare platform for finding verified medicines and verified pharmacies instantly.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-[#24D2A6] mb-8">Platform</h4>
            <ul className="space-y-4">
              {[
                { name: "Find Medicines", href: "/medicines" },
                { name: "Nearby Pharmacies", href: "/pharmacies" },
                { name: "Health Savings", href: "/favorites" }
              ].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-[#24D2A6] mb-8">Support</h4>
            <ul className="space-y-4">
              {[
                { name: "Help Center", href: "/help-center" },
                { name: "Patient Rights", href: "/patient-rights" },
                { name: "Contact Us", href: "/contact-us" }
              ].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-white/5 flex justify-center items-center">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <p className="text-slate-500 text-xs font-medium">
              © {currentYear} pharmaLocator. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-tighter bg-white/5 px-4 py-2 rounded-full border border-white/5">
              <ShieldCheck size={14} className="text-[#24D2A6]" /> Certified Healthcare Platform
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
