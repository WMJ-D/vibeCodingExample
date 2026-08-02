import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import { hashPassword, verifyPassword } from '../src/utils/password.js'

process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-secret-at-least-32-characters-long'

const adminHash = await hashPassword('123456')
const activeSessions = new Set()
const mockDb = {
  query: vi.fn(async (sql, params = []) => {
    if (sql === 'SELECT 1') return [[{ 1: 1 }], []]
    if (sql.includes('FROM sys_user WHERE username=')) return [[{ id: 1, username: 'admin', password_hash: adminHash, nickname: '超级管理员', status: 1, deleted: 0 }], []]
    if (sql.includes('FROM sys_user u LEFT JOIN sys_org')) return [[{ id: 1, username: 'admin', nickname: '超级管理员', phone: null, email: null, avatar_url: null, status: 1, org_id: 1, org_name: '总公司' }], []]
    if (sql.includes('SELECT r.id,r.role_name,r.role_key')) return [[{ id: 1, role_name: '超级管理员', role_key: 'admin' }], []]
    if (sql.includes('SELECT DISTINCT m.permission')) return [[{ permission: 'system:user:list' }], []]
    if (sql.startsWith('UPDATE sys_user SET')) return [{ affectedRows: 1 }, []]
    if (sql.startsWith('INSERT INTO sys_login_log')) return [{ insertId: 1 }, []]
    if (sql.includes('INSERT INTO sys_user_session')) { activeSessions.add(params[0]); return [{ insertId: activeSessions.size }, []] }
    if (sql.includes('SELECT status,expires_at FROM sys_user_session')) {
      return activeSessions.has(params[0]) ? [[{ status: 'ACTIVE', expires_at: new Date(Date.now() + 3600000) }], []] : [[], []]
    }
    if (sql.includes("UPDATE sys_user_session SET last_active_at")) return [{ affectedRows: 1 }, []]
    if (sql.includes("UPDATE sys_user_session SET status='LOGOUT'")) { activeSessions.delete(params[0]); return [{ affectedRows: 1 }, []] }
    if (sql.includes('SELECT DISTINCT m.* FROM sys_menu')) return [[{ id: 100, parent_id: null, menu_name: '首页', menu_type: 'C', path: '/dashboard', status: 1 }], []]
    if (sql.includes('AS today_visit_count')) return [[{ user_count: 8, role_count: 3, menu_count: 24, today_visit_count: 2 }], []]
    return [[], []]
  })
}

let app
beforeAll(async () => {
  const db = await import('../src/db/index.js')
  db.setDb(mockDb)
  app = (await import('../src/app.js')).createApp()
})
afterAll(() => vi.restoreAllMocks())

describe('基础能力', () => {
  it('scrypt 密码可校验', async () => {
    const encoded = await hashPassword('secret123')
    expect(encoded).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/)
    expect(await verifyPassword('secret123', encoded)).toBe(true)
    expect(await verifyPassword('wrong', encoded)).toBe(false)
  })

  it('健康检查成功', async () => {
    const response = await request(app).get('/health')
    expect(response.status).toBe(200)
    expect(response.body.data.status).toBe('UP')
  })

  it('登录后可获取当前用户与菜单', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: '123456' })
    expect(login.status).toBe(200)
    expect(login.body.data.token).toBeTruthy()
    const headers = { Authorization: `Bearer ${login.body.data.token}` }
    const me = await request(app).get('/api/v1/auth/me').set(headers)
    expect(me.status).toBe(200)
    expect(me.body.data.username).toBe('admin')
    const menus = await request(app).get('/api/v1/auth/menus').set(headers)
    expect(menus.status).toBe(200)
    expect(menus.body.data[0].menuName).toBe('首页')
  })

  it('登录后可获取首页统计数据', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: '123456' })
    const response = await request(app)
      .get('/api/v1/dashboard/statistics')
      .set({ Authorization: `Bearer ${login.body.data.token}` })

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      userCount: 8,
      roleCount: 3,
      menuCount: 24,
      todayVisitCount: 2,
    })
  })

  it('登录会话支持心跳和退出', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: '123456' })
    const headers = { Authorization: `Bearer ${login.body.data.token}` }
    const heartbeat = await request(app).post('/api/v1/auth/heartbeat').set(headers)
    expect(heartbeat.status).toBe(200)
    const logout = await request(app).post('/api/v1/auth/logout').set(headers)
    expect(logout.status).toBe(200)
    const me = await request(app).get('/api/v1/auth/me').set(headers)
    expect(me.status).toBe(401)
    expect(me.body.code).toBe('INVALID_SESSION')
  })

  it('未认证请求被拒绝', async () => {
    const response = await request(app).get('/api/v1/system/users')
    expect(response.status).toBe(401)
  })
})
