import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the parent home directory otherwise makes
  // Next.js guess the workspace root incorrectly.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
