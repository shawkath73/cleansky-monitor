import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CityProvider } from "@/context/CityContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CleanSky — Air Quality Monitor",
  description:
    "Real-time air quality monitoring and 48-hour AQI forecasts for Indian cities. Powered by ML predictions.",
  keywords: ["AQI", "air quality", "pollution", "forecast", "India", "CleanSky"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <CityProvider>
          <Navbar />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </CityProvider>
      </body>
    </html>
  );
}
