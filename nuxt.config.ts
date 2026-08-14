// nuxt.config.ts
const isGithubPages = process.env.GITHUB_ACTIONS === 'true'
const isDev = process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: ['@pinia/nuxt'],
  
  nitro: {
    preset: 'static'
  },

  // Убираем ВСЕ CSS импорты
  css: [],
  
  vite: {
    optimizeDeps: {
      include: ['three', 'leaflet']
    },
    // Отключаем обработку CSS
    css: {
      preprocessorOptions: {},
      postcss: false
    }
  },

  app: {
    baseURL: isDev ? '/' : (isGithubPages ? '/map/' : '/'),
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        }
      ],
      script: [
        {
          src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        }
      ]
    }
  },

  // Отключаем PostCSS через build
  build: {
    postcss: {
      plugins: {}
    }
  },

  compatibilityDate: '2024-08-12'
})