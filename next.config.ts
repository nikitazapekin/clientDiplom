/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3002",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },
  // Turbopack конфигурация
  experimental: {
    turbo: {
      resolveAlias: {
        // Настройка алиасов для Turbopack
        "@styles": "./src/app/styles",
        "@components": "./src/app/components",
      },
    },
  },

  // Sass опции для Webpack (на всякий случай)
  sassOptions: {
    includePaths: ["./src", "./src/app/styles"],
  },
};

module.exports = nextConfig;
