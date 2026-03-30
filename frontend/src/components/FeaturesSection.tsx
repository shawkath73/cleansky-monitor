"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Brain,
  Shield,
  Bell,
  FileText,
  Waves,
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Real-Time AQI Monitoring",
    description:
      "Live air quality index tracking with minute-by-minute updates across multiple monitoring stations.",
  },
  {
    icon: Brain,
    title: "ML-Powered Forecasts",
    description:
      "48-hour AQI predictions using advanced machine learning models trained on historical pollution data.",
  },
  {
    icon: Waves,
    title: "Pollutant Analysis",
    description:
      "Detailed breakdown of PM2.5, PM10, NO₂, SO₂, CO, and O₃ levels with WHO guideline comparisons.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Automated email and in-app alerts for AQI threshold breaches, health advisories, and trend changes.",
  },
  {
    icon: Shield,
    title: "AI-Powered Health Insights",
    description:
      "Personalized health risk assessments and actionable recommendations based on current air quality.",
  },
  {
    icon: FileText,
    title: "Historical Reports",
    description:
      "Comprehensive air quality reports with trend analysis, seasonal patterns, and data export capabilities.",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

export default function FeaturesSection() {
  return (
    <section className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <p className="text-[#64748B] text-xs uppercase tracking-[0.2em] mb-2">
          What We Offer
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-[#E2E8F0]">
          Platform{" "}
          <span className="text-[#7C9CFF] italic font-light">Features</span>
        </h2>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              className="glass-green p-6 group cursor-default"
              variants={cardVariants}
            >
              {/* Top row: Icon + Number */}
              <div className="flex items-start justify-between mb-5">
                <div className="w-11 h-11 rounded-xl bg-[#7C9CFF]/10 border border-[#7C9CFF]/15 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[#7C9CFF]" strokeWidth={1.8} />
                </div>
                <span className="text-[#64748B]/40 text-xs font-mono tracking-wider">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-[#E2E8F0] text-lg font-semibold mb-2 group-hover:text-[#7C9CFF] transition-colors duration-300">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-[#94A3B8]/70 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
