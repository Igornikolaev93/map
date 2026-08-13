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
    },
    css: {
      preprocessorOptions: {
        css: {
          // Отключаем некоторые оптимизации PostCSS
        }
      }
    }
  },

  app: {
    baseURL: '/map/'
  },

  compatibilityDate: '2024-08-12',

  // Добавьте это для отключения проблемных оптимизаций
  build: {
    // Отключаем оптимизацию CSS
    postcss: {
      plugins: {
        'postcss-merge-longhand': false,
        'cssnano': {
          preset: ['default', {
            mergeLonghand: false,
            mergeRules: false
          }]
        }
      }
    }
  }
})