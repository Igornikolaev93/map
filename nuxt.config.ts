// nuxt.config.ts
const isGithubPages = process.env.GITHUB_ACTIONS === 'true'
const isDev = process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: ['@pinia/nuxt'],
  
  nitro: {
    preset: 'static'
  },

  vite: {
    optimizeDeps: {
      include: ['three', 'leaflet']
    },
    css: {
      // Отключаем минификацию CSS
      devSourcemap: false
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

  // Отключаем PostCSS полностью
  build: {
    postcss: false
  },

  compatibilityDate: '2024-08-12'
})