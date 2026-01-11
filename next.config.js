/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Ensure Next/Turbopack uses this folder as the project root
  experimental: {
    turbopack: {
      // Silence “inferred workspace root” warnings and fix module resolution
      root: __dirname,
    },
  },
  // Also pin file tracing root for monorepo-like setups
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iyrlzkglbhgnqoxh.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default config;
