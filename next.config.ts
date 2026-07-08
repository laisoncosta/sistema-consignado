import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const origensNgrok = [
  "*.ngrok-free.dev",
  "*.ngrok-free.app",
  "*.ngrok.app",
  "*.ngrok.io",
];

const origensDevExtras = [
  "localhost",
  "127.0.0.1",
  "192.168.1.45",
  "192.168.1.82",
  "192.168.5.189",
  ...origensNgrok,
  ...(process.env.NGROK_HOST?.trim() ? [process.env.NGROK_HOST.trim()] : []),
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  devIndicators: false,
  /** Permite HMR e assets /_next/* via IP local, ngrok e túneis HTTPS. */
  allowedDevOrigins: Array.from(new Set(origensDevExtras)),  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
