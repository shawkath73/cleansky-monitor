"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { getAQICategory, getAQIColorByValue } from "@/lib/aqi";

interface AQIGaugeProps {
  aqi: number;
  size?: number;
}

export default function AQIGauge({ aqi, size = 200 }: AQIGaugeProps) {
  const category = getAQICategory(aqi);
  const color = getAQIColorByValue(aqi);

  // Normalize AQI to 0-100% for the radial bar (max AQI ~500)
  const fill = Math.min((aqi / 500) * 100, 100);

  const data = [
    {
      name: "AQI",
      value: fill,
      fill: color,
    },
  ];

  return (
    <div className="flex flex-col items-center">
      <div style={{ width: size, height: size }} className="relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="70%"
            outerRadius="100%"
            startAngle={225}
            endAngle={-45}
            data={data}
            barSize={12}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              background={{ fill: "#1F2937" }}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>
            {Math.round(aqi)}
          </span>
          <span className="text-sm text-[#9CA3AF] mt-1">{category}</span>
        </div>
      </div>
    </div>
  );
}
