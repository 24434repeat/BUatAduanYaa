import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Optimize font loading to reduce preload warnings
  optimizeFonts: true,
  // Suppress preload warnings in development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
