import { fileURLToPath } from 'node:url'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  $production: {
    nitro: {
      entry: fileURLToPath(new URL('./server/runtime/bun.ts', import.meta.url))
    }
  },

  components: [{ path: '~/components', pathPrefix: false }],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },

  runtimeConfig: {
    cloudflareAccountsFile: 'config/cloudflare-accounts.json',
    appUrl: 'http://localhost:3000',
    authSecret: '',
    entraTenantId: '',
    entraClientId: '',
    entraClientSecret: '',
    entraAppRole: 'DNSConsole.Access',
    sqlitePath: '.data/dns-console.sqlite'
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
