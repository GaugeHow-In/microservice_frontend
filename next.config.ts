import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
    ],
  },
  async rewrites() {
    // Public share links use the short /p/<handle> form but are served by the
    // existing /profiles/<handle> route without changing the visible URL.
    return [{ source: "/p/:handle", destination: "/profiles/:handle" }];
  },
};

export default nextConfig;
