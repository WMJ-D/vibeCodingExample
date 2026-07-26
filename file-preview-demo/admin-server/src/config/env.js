import 'dotenv/config'
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(8788),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().default('file_preview_demo'),
  DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  AI_GATEWAY_BASE_URL: z.string().url().default('https://aigateway.claudeoffice.com/v1'),
  AI_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default('gpt-5.6-sol'),
  JWT_SECRET: z.string().min(32).default('development-secret-change-me-1234567890'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  LOG_LEVEL: z.string().default('info')
})

export const env = schema.parse(process.env)
