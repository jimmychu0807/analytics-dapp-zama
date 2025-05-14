import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*", // Set your origin
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          // {
          //   key: "Cross-Origin-Embedder-Policy", // Matched parameters can be used in the key
          //   value: "require-corp",
          // },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin", // Matched parameters can be used in the value
          },
        ],
      },
    ];
  },
};

export default nextConfig;
