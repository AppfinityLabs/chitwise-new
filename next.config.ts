import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CORS is handled dynamically in middleware.ts
  // Do not add static CORS headers here as they conflict with the dynamic handling
};

export default nextConfig;

