import { defineEventHandler, setResponseHeader, createError } from 'h3'
import type { EventHandlerRequest, H3Event } from 'h3'
import * as z from 'zod'
import { ApplicationError } from '../domain/errors'

export function apiHandler<T>(handler: (event: H3Event<EventHandlerRequest>) => Promise<T> | T) {
  return defineEventHandler(async (event) => {
    setResponseHeader(event, 'Cache-Control', 'no-store')
    try {
      return await handler(event)
    } catch (error) {
      if (error instanceof z.ZodError) throw createError({ statusCode: 400, statusMessage: 'Invalid request', data: { message: error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') } })
      if (error instanceof ApplicationError) throw createError({ statusCode: error.status, statusMessage: 'Request failed', data: { message: error.message } })
      throw error
    }
  })
}
