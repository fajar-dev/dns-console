import { closeLogDatabase } from '../composition/logs'
import { defineNitroPlugin } from '#imports'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', closeLogDatabase)
})
