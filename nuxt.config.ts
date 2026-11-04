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
    adminPassword: '',
    sessionPassword: '',
    auditDatabasePath: './.data/audit.sqlite'
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'bun',
    externals: { external: ['bun:sqlite'] }
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
