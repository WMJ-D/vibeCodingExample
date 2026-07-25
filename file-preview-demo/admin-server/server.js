import app from './src/app.js'
import { env } from './src/config/env.js'
import { logger } from './src/config/logger.js'
import { pool } from './src/db/index.js'

let server
let shuttingDown = false

async function start() {
  await pool.query('SELECT 1')
  logger.info('数据库连接验证成功')
  server = app.listen(env.PORT, env.HOST, () => logger.info({ host: env.HOST, port: env.PORT }, '后台服务已启动'))
}

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  logger.info({ signal }, '正在关闭后台服务')

  if (server) {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
  await pool.end()
}

process.on('SIGINT', () => shutdown('SIGINT').then(() => process.exit(0)).catch(error => {
  logger.error({ err: error }, '后台服务关闭失败')
  process.exit(1)
}))
process.on('SIGTERM', () => shutdown('SIGTERM').then(() => process.exit(0)).catch(error => {
  logger.error({ err: error }, '后台服务关闭失败')
  process.exit(1)
}))

start().catch(async error => {
  logger.fatal({ err: error }, '后台服务启动失败')
  await pool.end().catch(() => {})
  process.exit(1)
})
