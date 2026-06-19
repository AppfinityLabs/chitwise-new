import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep native/Node-only packages out of the Turbopack bundle so they use the
  // real Node runtime (mongoose relies on process.getBuiltinModule, bcryptjs is native).
  serverExternalPackages: ["mongoose", "bcryptjs", "firebase-admin"],
  // CORS is handled dynamically in middleware.ts
  // Do not add static CORS headers here as they conflict with the dynamic handling
};

export default nextConfig;

