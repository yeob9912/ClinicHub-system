import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow images from external hosts used in the app
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.onrender.com",       // backend-served images
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile pictures
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",    // if Cloudinary is used later
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",   // placeholder images in dev/demo
      },
    ],
  },

  // Compress responses
  compress: true,

  // Trailing slash consistency
  trailingSlash: false,

  // Redirect www → non-www in production (optional)
  async redirects() {
    return [];
  },

  // Security: restrict what the app can connect to
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
