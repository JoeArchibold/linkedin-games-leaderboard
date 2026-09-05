import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle under .next/standalone so the Docker
  // runtime image only needs Node (no node_modules or pnpm) to run the server.
  output: "standalone",
};

export default nextConfig;
