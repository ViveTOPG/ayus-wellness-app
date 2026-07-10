/** @type {import('next').NextConfig} */
const API = process.env.AYUR_API || "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API}/:path*` },
    ];
  },
};

export default nextConfig;
