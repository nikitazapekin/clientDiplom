/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack конфигурация
  experimental: {
    turbo: {
      resolveAlias: {
        // Настройка алиасов для Turbopack
        '@styles': './src/app/styles',
        '@components': './src/app/components',
      }
    }
  },
  
  // Sass опции для Webpack (на всякий случай)
  sassOptions: {
    includePaths: [
      './src',
      './src/app/styles',
    ],
  },
}

module.exports = nextConfig
