import type { NextConfig } from "next";

const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET ||
  (process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000"
    : "https://cleansky-monitor.onrender.com")
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
