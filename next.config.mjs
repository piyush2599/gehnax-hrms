import withPWA from "@ducanh2912/next-pwa";

const withPWAConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
    clientsClaim: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "mongoose",
      "mongodb-memory-server",
      "mongodb-memory-server-core",
      "otplib",
      "qrcode",
      "nodemailer",
      "pdf-parse",
      "mammoth",
      "basic-ftp",
      "googleapis",
      "google-auth-library",
      "@react-pdf/renderer",
    ],
  },
};

export default withPWAConfig(nextConfig);
