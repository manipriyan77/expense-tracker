import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Claude Agent SDK spawns the Claude Code binary at runtime — keep it out
  // of the server bundle so the subprocess resolves correctly.
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
  async redirects() {
    return [
      {
        source: "/index.html",
        destination: "/learning",
        permanent: false,
      },
      {
        source: "/roadmap.html",
        destination: "/learning/topics?legacy=roadmap",
        permanent: false,
      },
      {
        source: "/:section/:module/index.html",
        destination: "/learning?legacy=/:section/:module/index.html",
        permanent: false,
      },
      {
        source: "/:section/:module/:lesson/index.html",
        destination: "/learning?legacy=/:section/:module/:lesson/index.html",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
