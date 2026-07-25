import { beforeAll, describe, expect, it } from 'vitest'
import request from 'supertest'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'

let app
beforeAll(async () => {
  app = (await import('../src/app.js')).createApp()
})

describe('HTTP 基础契约', () => {
  it('GET /health 不依赖数据库并返回 UP', async () => {
    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body.code).toBe(0)
    expect(response.body.data.status).toBe('UP')
    expect(response.body.data.timestamp).toBeTypeOf('string')
  })

  it('未知路由返回统一 404 响应', async () => {
    const response = await request(app).get('/missing')

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({ code: 'NOT_FOUND', message: '接口不存在' })
  })

  it('系统管理路由要求认证', async () => {
    const response = await request(app).get('/api/v1/system/users')

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({ code: 'UNAUTHORIZED', message: '请先登录' })
  })
})
