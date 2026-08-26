import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      source: "/",
      destination: "/setup",
      permanent: false,
    }];
  },
};

export default nextConfig;
