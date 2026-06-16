import type { Metadata, Viewport } from "next";
import LayoutWrapper from '../components/LayoutWrapper';
import { AppProviders } from '../components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: "pharmaLocator — Find Medicines Near You",
    template: "%s | pharmaLocator",
  },
  description:
    "pharmaLocator helps you find pharmacies, compare medicine prices, and order prescriptions online — fast, trusted, and always nearby.",
  keywords: [
    "pharmacy locator",
    "find medicine",
    "compare drug prices",
    "online pharmacy Ethiopia",
    "prescription delivery",
    "pharmaLocator",
  ],
  authors: [{ name: "pharmaLocator" }],
  creator: "pharmaLocator",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://pharmalocator.vercel.app"
  ),
  openGraph: {
    type: "website",
    siteName: "pharmaLocator",
    title: "pharmaLocator — Find Medicines Near You",
    description:
      "Find pharmacies, compare medicine prices, and order prescriptions online.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "pharmaLocator — Find Medicines Near You",
    description:
      "Find pharmacies, compare medicine prices, and order prescriptions online.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#24D2A6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="antialiased">
        <AppProviders>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </AppProviders>
      </body>
    </html>
  );
}