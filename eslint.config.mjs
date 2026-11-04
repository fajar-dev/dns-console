// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultAttributes } from 'eslint-plugin-better-tailwindcss/api/defaults'

export default withNuxt(
  betterTailwindcss.configs['correctness-error'],
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
        attributes: [
          ...getDefaultAttributes(),
          ['^v-bind:ui$', [{ match: 'objectValues' }]]
        ]
      }
    }
  },
  {
    files: ['server/domain/**/*.ts', 'server/application/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['h3', 'vue', 'nuxt', '#imports', '**/infrastructure/**', '**/composition/**', '**/http/**', '**/validation/**'],
          message: 'Business code depends on domain contracts and shared models, not framework, transport or infrastructure adapters.'
        }]
      }]
    }
  },
  {
    files: ['server/infrastructure/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/application/**', '**/composition/**'], message: 'Adapters implement domain ports; compose application services at the composition root.' }]
      }]
    }
  },
  {
    files: ['app/**/*.{ts,vue}', 'shared/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/server/**'], message: 'Client/shared modules must never depend on server implementations or credentials.' }]
      }]
    }
  }
)
