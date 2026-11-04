// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },

  runtimeConfig: {
    cloudflareApiToken: '',
    cloudflareAccountId: '',
    appUrl: 'http://localhost:3000',
    authSecret: '',
    entraTenantId: '',
    entraClientId: '',
    entraClientSecret: '',
    entraAppRole: 'DNSConsole.Access',
    mysqlUrl: ''
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'bun'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
