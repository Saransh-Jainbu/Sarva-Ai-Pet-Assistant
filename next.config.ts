import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sarvam SDK + node-only modules stay on the server; route handlers hold the API key.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
