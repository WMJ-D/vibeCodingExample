import mysql from 'mysql2/promise'
import { env } from '../config/env.js'

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  timezone: '+08:00',
  dateStrings: true,
  typeCast(field, next) {
    if (field.type === 'DATETIME' || field.type === 'TIMESTAMP') {
      const value = field.string()
      return value ? value.replace(/\.\d+$/, '') : value
    }
    return next()
  },
  decimalNumbers: true,
  supportBigNumbers: true,
  bigNumberStrings: true
})

pool.on('connection', connection => {
  connection.query("SET time_zone = '+08:00'", error => {
    if (error) console.error('设置数据库会话时区失败', error)
  })
})

let database = pool
export function getDb() { return database }
export function setDb(nextDb) { database = nextDb }

export async function withTransaction(work) {
  const connection = await database.getConnection()
  try {
    await connection.beginTransaction()
    const result = await work(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
