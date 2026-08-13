export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: ['@pinia/nuxt'],
  
  nitro: {
    preset: 'static'
  },

  // Убираем глобальный импорт CSS
  // css: [],
  
  vite: {
    optimizeDeps: {
      include: ['three', 'leaflet']
    },
    css: {
      // Отключаем минификацию CSS во время сборки
      devSourcemap: false
    }
  },

  app: {
    baseURL: '/map/',
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

  build: {
    // Отключаем оптимизацию CSS
    postcss: false
  },

  compatibilityDate: '2024-08-12'
})