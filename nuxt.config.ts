// nuxt.config.ts
const isGithubPages = process.env.GITHUB_ACTIONS === 'true'
const isDev = process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: ['@pinia/nuxt'],
  
  nitro: {
    preset: 'static'
  },

  css: ['leaflet/dist/leaflet.css'],
  
  vite: {
    optimizeDeps: {
      include: ['three', 'leaflet']
    }
  },

  // Автоматически выбирает правильный baseURL
  app: {
    baseURL: isGithubPages ? '/map/' : '/'
  },

  compatibilityDate: '2024-08-12'
})