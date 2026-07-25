import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { errorHandler, notFound } from './middleware/error.js'
import { operationLogger } from './middleware/operation-log.js'
import { ok } from './utils/response.js'
import authRouter from './routes/auth.js'
import systemRouter from './routes/system.js'
import logsRouter from './routes/logs.js'

export function createApp({ appLogger = logger } = {}) {
  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(pinoHttp({ logger: appLogger }))
  app.use(helmet())
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map(item => item.trim()), credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))
  app.get('/health', (_req, res) => ok(res, { status: 'UP', timestamp: new Date().toISOString() }))
  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1', operationLogger)
  app.use('/api/v1/system', systemRouter)
  app.use('/api/v1/logs', logsRouter)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export default createApp()
