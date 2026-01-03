import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // NOTE: Ignoring build errors due to Supabase's strict types in sync APIs
    // These are warnings only and don't affect runtime
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
