import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Current Next.js API-template defaults. Analytical routes stay uncached
  // unless a handler explicitly opts in with `use cache`.
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
};

export default nextConfig;
