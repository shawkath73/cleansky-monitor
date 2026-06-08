import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CityProvider } from "@/context/CityContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://cleansky-monitor.vercel.app",
  ),
  verification: {
    google:
      process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
      "your-verification-code-here",
  },
  title: {
    default: "CleanSky — India AQI Forecast",
    template: "%s | CleanSky AQI",
  },
  description:
    "Real-time air quality index with 48-hour ML predictions for Indian cities. Powered by XGBoost.",
  keywords: [
    "AQI India",
    "air quality forecast",
    "Delhi AQI today",
    "PM2.5 prediction",
    "CleanSky",
  ],
  openGraph: {
    type: "website",
    siteName: "CleanSky Monitor",
    title: "CleanSky — India AQI Forecast",
    description: "Real-time AQI with 48-hour ML predictions.",
    url: "/",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "CleanSky Air Quality Monitor Overview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanSky AQI Monitor",
    description: "Real-time India AQI with ML forecasts",
    images: ["/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-sans"
        suppressHydrationWarning
      >
        <CityProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[5000] focus:rounded-md focus:bg-[#a5c7ff] focus:px-3 focus:py-2 focus:text-[#013060] focus:font-semibold"
          >
            Skip to main content
          </a>
          <Navbar />
          <main
            id="main-content"
            className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8"
          >
            {children}
          </main>
          <Footer />
        </CityProvider>
      </body>
    </html>
  );
}
