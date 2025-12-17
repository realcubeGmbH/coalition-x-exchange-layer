import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Prisma must run in the Node.js runtime (not Edge).
   * Externalizing it prevents the bundler from resolving Prisma's Edge entrypoints,
   * which would require an adapter/Accelerate URL.
   */
  serverExternalPackages: ["@prisma/client", "prisma"],
};

export default nextConfig;
