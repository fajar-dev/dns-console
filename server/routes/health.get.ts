import { defineEventHandler, setResponseStatus } from 'h3'
import { logService } from '../composition/logs'

/** Readiness only: check the log schema without exposing configuration or errors. */
export default defineEventHandler(async (event) => {
  try {
    await logService().ready()
    return { status: 'ok' }
  } catch {
    setResponseStatus(event, 503)
    return { status: 'unavailable' }
  }
})
