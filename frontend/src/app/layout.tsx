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
    process.env.NEXT_PUBLIC_SITE_URL || "https://cleansky-monitor.vercel.app/",
  ),
  title: {
    default: "CleanSky - Air Quality Monitor",
    template: "%s | CleanSky",
  },
  description:
    "Real-time air quality monitoring and 48-hour AQI forecasts for Indian cities. Powered by ML predictions.",
  keywords: [
    "AQI",
    "air quality",
    "pollution",
    "forecast",
    "India",
    "CleanSky",
  ],
  openGraph: {
    type: "website",
    title: "CleanSky - Air Quality Monitor",
    description:
      "Real-time air quality monitoring and 48-hour AQI forecasts for Indian cities.",
    siteName: "CleanSky",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "CleanSky - Air Quality Monitor",
    description:
      "Real-time air quality monitoring and 48-hour AQI forecasts for Indian cities.",
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
