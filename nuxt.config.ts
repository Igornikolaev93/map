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
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
        { name: 'theme-color', content: '#0a0a1a' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'format-detection', content: 'telephone=no' }
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        },
        {
          rel: 'icon',
          type: 'image/x-icon',
          href: '/favicon.ico'
        },
        {
          rel: 'apple-touch-icon',
          href: '/apple-touch-icon.png'
        }
      ],
      script: [
        {
          src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        }
      ],
      htmlAttrs: {
        lang: 'ru'
      },
      bodyAttrs: {
        class: 'antialiased'
      }
    }
  },

  // Отключаем PostCSS через build
  build: {
    postcss: {
      plugins: {}
    }
  },

  // Настройки для SSR
  ssr: true,

  // Настройки для кэширования
  nitro: {
    preset: 'static',
    static: {
      ignore: ['**/*.html']
    }
  },

  compatibilityDate: '2024-08-12'
})