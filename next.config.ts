import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local loopback host in dev so HMR/client bundles are not blocked on 127.0.0.1.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
