import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "/api/admin/gif": ["./next.config.ts"],
  },
};

export default nextConfig;
