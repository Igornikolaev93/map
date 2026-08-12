export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: ['@pinia/nuxt'],
  
  css: ['leaflet/dist/leaflet.css'],
  
  nitro: {
    preset: 'node-server'
  },

  vite: {
    optimizeDeps: {
      include: ['three', 'leaflet']
    }
  },
   app: {
    baseURL: 'https://github.com/Igornikolaev93/map'  // <- ВАЖНО: название вашего репозитория
  },

  compatibilityDate: '2024-08-12'
})