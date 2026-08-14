// nuxt.config.ts
const isGithubPages = process.env.GITHUB_ACTIONS === 'true'
const isDev = process.env.NODE_ENV === 'development'

export default defineNuxtConfig({
  devtools: { enabled: true },
  
  modules: ['@pinia/nuxt'],
  
  nitro: {
    preset: 'static'
  },

  css: [],
  
  vite: {
    optimizeDeps: {
      include: ['three', 'leaflet']
    },
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
        // Основной viewport
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' },
        
        // Для PWA на мобильных (современный стандарт)
        { name: 'mobile-web-app-capable', content: 'yes' },
        
        // Для iOS (все еще поддерживается, но лучше использовать вместе с mobile-web-app-capable)
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        
        // Цвет темы для браузера
        { name: 'theme-color', content: '#0a0a1a' },
        
        // Стиль статус-бара для iOS
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        
        // Отключение автоопределения телефонов
        { name: 'format-detection', content: 'telephone=no' },
        
        // Описание для SEO
        { name: 'description', content: 'Интерактивная гибридная карта путешествий с 3D глобусом' }
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
        },
        {
          rel: 'manifest',
          href: '/manifest.json'
        }
      ],
      script: [
        {
          src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        }
      ],
      htmlAttrs: {
        lang: 'ru'
      }
    }
  },

  build: {
    postcss: {
      plugins: {}
    }
  },

  compatibilityDate: '2024-08-12'
})