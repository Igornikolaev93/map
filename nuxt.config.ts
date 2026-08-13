const isProduction = process.env.NODE_ENV === 'production'

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

  app: {
    baseURL: isProduction ? '/map/' : '/'
  },

  compatibilityDate: '2024-08-12'
})