/*
 * @Author: wangmingjun 2351405492www...
 * @Date: 2026-07-25 13:57:45
 * @LastEditors: wangmingjun 2351405492www...
 * @LastEditTime: 2026-07-26 15:10:03
 * @FilePath: \file-preview-demo\admin-server\src\app.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { env } from './config/env.js'
import { logger } from './config/logger.js'
import { errorHandler, notFound } from './middleware/error.js'
import { operationLogger } from './middleware/operation-log.js'
import { formatDateTime } from './utils/data.js'
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
  app.get('/health', (_req, res) => ok(res, { status: 'UP', timestamp: formatDateTime() }))
  app.use('/api/v1/auth', authRouter)
  app.use('/api/v1', operationLogger)
  app.use('/api/v1/system', systemRouter)
  app.use('/api/v1/logs', logsRouter)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export default createApp()
