"use client";

import { createContext, useContext, useState } from "react";
import { UserProvider } from "@/context/UserContext";

type Language = "en" | "am";

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    "nav.search": "Search",
    "nav.pharmacies": "Pharmacies",
    "nav.login": "Log In",
    "nav.signup": "Sign Up",
    "hero.title": "Find Medicines Near You at the Best Price",
    "hero.subtitle": "Compare availability and pricing across certified pharmacies in real-time.",
    "hero.placeholder": "Search medicine (e.g. Paracetamol...)",
    "hero.location": "Use my location",
    "hero.searchBtn": "Search",
    "trust.savings": "30% Savings",
    "trust.certified": "100% Certified",
    "trust.stock": "Live Stock",
    "pharmacies.title": "Nearby Pharmacies",
    "pharmacies.open": "Open",
    "pharmacies.closed": "Closed",
    "pharmacies.map": "Show Map",
    "cta.title": "Get your pharmacy listed on pharmaLocator",
    "cta.start": "Get Started",
    "cta.learn": "Learn More",
    "footer.about": "About Us",
    "footer.contact": "Contact",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms",
    "footer.portal": "Pharmacy Portal",
    "nav.home": "Home",
    "nav.medicines": "Medicines",
    "nav.favorites": "Favorites",
    "nav.notifications": "Notifications",
    "nav.account": "Account",
    "nav.signin": "Sign In",
    "notifications.title": "Notifications",
    "notifications.empty": "No notifications yet",
    "notifications.clear": "Clear All",
    "notifications.viewAll": "View all notifications",
    "medicines.heroTitle": "Medicine Discovery",
    "medicines.heroSubtitle": "Find trusted medicines with beautiful, real-time comparisons and availability updates.",
    "pharmacies.heroTitle": "Pharmacy Comparison",
    "pharmacies.heroSubtitle": "Compare nearby pharmacies with live prices, ratings, and stock confidence.",
  },
  am: {
    "nav.search": "ፈልግ",
    "nav.pharmacies": "ፋርማሲዎች",
    "nav.login": "ግባ",
    "nav.signup": "ተመዝገብ",
    "hero.title": "አጠገብዎ ያሉ መድሃኒቶችን ያግኙ",
    "hero.subtitle": "በእውነተኛ ጊዜ ከተረጋገጡ ፋርማሲዎች አቅርቦትን እና ዋጋዎችን ያወዳድሩ።",
    "hero.placeholder": "መድሃኒት ይፈልጉ (ለምሳሌ፡ ፓራሲታሞል...)",
    "hero.location": "አካባቢዬን ተጠቀም",
    "hero.searchBtn": "ፈልግ",
    "trust.savings": "30% ቁጠባ",
    "trust.certified": "100% የተረጋገጠ",
    "trust.stock": "በእውነተኛ ጊዜ ክምችት",
    "pharmacies.title": "በአቅራቢያ ያሉ ፋርማሲዎች",
    "pharmacies.open": "ክፍት ነው",
    "pharmacies.closed": "ዝግ ነው",
    "pharmacies.map": "ካርታ አሳይ",
    "cta.title": "ፋርማሲዎን በpharmaLocator ላይ ያስመዝግቡ",
    "cta.start": "ይጀምሩ",
    "cta.learn": "ተጨማሪ ይወቁ",
    "footer.about": "ስለ እኛ",
    "footer.contact": "አግኙን",
    "footer.privacy": "የግላዊነት ፖሊሲ",
    "footer.terms": "ውሎች",
    "footer.portal": "የፋርማሲ ፖርታል",
    "nav.home": "መነሻ",
    "nav.medicines": "መድሃኒቶች",
    "nav.favorites": "ተወዳጆች",
    "nav.notifications": "ማሳወቂያዎች",
    "nav.account": "መለያ",
    "nav.signin": "ግባ",
    "notifications.title": "ማሳወቂያዎች",
    "notifications.empty": "እስካሁን ማሳወቂያ የለም",
    "notifications.clear": "ሁሉንም አጥፋ",
    "notifications.viewAll": "ሁሉንም ማሳወቂያዎች እይ",
    "medicines.heroTitle": "የመድሃኒት ፍለጋ",
    "medicines.heroSubtitle": "ተመካከሩ የሚታመኑ መድሃኒቶችን እና የእውነተኛ ጊዜ አቅርቦት መረጃን በቀላሉ ያግኙ።",
    "pharmacies.heroTitle": "የፋርማሲ ማወዳደር",
    "pharmacies.heroSubtitle": "በአቅራቢያዎ ያሉ ፋርማሲዎችን በዋጋ፣ ኮከብ ደረጃ እና ክምችት ያወዳድሩ።",
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, t }}>
      <UserProvider>
        {children}
      </UserProvider>
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProviders");
  }
  return context;
}
