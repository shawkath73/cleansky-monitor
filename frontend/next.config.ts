import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://cleansky-monitor.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
