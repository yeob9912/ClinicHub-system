"use client";

import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LocationIndicator() {
  const [locationName, setLocationName] = useState<string>("Sensing location...");

  useEffect(() => {
    const handleLocation = (coords: { lat: number; lng: number }, source: string) => {
      setLocationName(source);
      // Save coordinates to localStorage so other components can retrieve them
      localStorage.setItem("user_detected_lat", coords.lat.toString());
      localStorage.setItem("user_detected_lng", coords.lng.toString());
      localStorage.setItem("user_detected_name", source);
      window.dispatchEvent(new Event("location_detected"));
    };

    const fallbackToIP = () => {
      fetch("https://ipapi.co/json/")
        .then((r) => r.json())
        .then((data) => {
          if (data.latitude && data.longitude) {
            const locStr = data.city ? `${data.city}, ${data.country_name || ""}` : "Near You";
            handleLocation({ lat: data.latitude, lng: data.longitude }, `${locStr} (IP Location)`);
          } else {
            fallbackToDefault();
          }
        })
        .catch(() => {
          fallbackToDefault();
        });
    };

    const fallbackToDefault = () => {
      handleLocation({ lat: 9.03, lng: 38.74 }, "Addis Ababa (Default)");
    };

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleLocation(
            { lat: pos.coords.latitude, lng: pos.coords.longitude },
            "GPS (Live Position)"
          );
        },
        () => {
          fallbackToIP();
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      fallbackToIP();
    }
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed top-[96px] right-4 md:right-8 z-40"
      >
        <div className="flex items-center gap-2.5 bg-white/90 backdrop-blur-md border-2 border-[#24D2A6]/40 px-4 py-2 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
          <div className="w-2 h-2 rounded-full bg-[#24D2A6] animate-pulse" />
          <div className="text-left">
            <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest block leading-none mb-0.5">your location</span>
            <span className="text-[11px] font-black text-slate-700 leading-none">{locationName}</span>
          </div>
          <MapPin size={13} className="text-[#24D2A6] ml-1 shrink-0" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
