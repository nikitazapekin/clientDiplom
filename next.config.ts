/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. ОТКЛЮЧАЕТ почти все логи разработки (запросы, fetch и т.д.)
  // Поддерживается с Next.js 15+
  logging: false,

  // 2. УДАЛЯЕТ ваш собственный console.log (опционально)
  compiler: {
    removeConsole: {
      // Оставляем 'error' и 'warn', чтобы видеть важные ошибки
      exclude: ["error", "warn"],
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "31.128.40.81",
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
  turbopack: {
    resolveAlias: {
      "@styles": "./src/app/styles",
      "@components": "./src/app/components",
    },
  },

  // Sass опции для Webpack (на всякий случай)
  sassOptions: {
    includePaths: ["./src", "./src/app/styles"],
  },
};

module.exports = nextConfig;
