import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the parent home directory otherwise makes
  // Next.js guess the workspace root incorrectly.
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  // Turbopack's build tracer silently ignores this option (confirmed: browsers.json
  // is absent from the .nft.json trace manifest under `next build`'s default Turbopack
  // bundler), which is why `npm run build` forces `--webpack` — only webpack's tracer
  // actually includes these globs in the deployed function bundle.
  outputFileTracingIncludes: {
    "/api/reports/[token]/pdf": [
      "./node_modules/playwright-core/**/*",
      "./node_modules/@sparticuz/chromium/**/*",
    ],
  },
};

export default nextConfig;
