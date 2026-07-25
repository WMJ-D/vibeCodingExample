import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { env } from '../config/env.js'
import { getDb } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { verifyPassword } from '../utils/password.js'
import { ok } from '../utils/response.js'
import { buildTree, toCamelRow } from '../utils/data.js'
import { getClientIp, parseUserAgent } from '../utils/security.js'

const router = Router()
const loginSchema = z.object({ username: z.string().trim().min(1).max(64), password: z.string().min(1).max(128) })
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV !== 'production',
  message: { code: 'TOO_MANY_ATTEMPTS', message: '登录尝试过于频繁，请稍后再试' }
})

async function writeLoginLog(req, values) {
  const userAgent = req.headers['user-agent'] || ''
  const { browser, os } = parseUserAgent(userAgent)
  await getDb().query(
    `INSERT INTO sys_login_log (user_id,username,ip_address,browser,os,user_agent,login_type,status,message)
     VALUES (?,?,?,?,?,?,'PASSWORD',?,?)`,
    [values.userId || null, values.username, getClientIp(req), browser, os, userAgent, values.status, values.message]
  )
}

async function loadIdentity(userId) {
  const [users] = await getDb().query(
    `SELECT u.id,u.username,u.nickname,u.phone,u.email,u.avatar_url,u.status,u.org_id,o.org_name
     FROM sys_user u LEFT JOIN sys_org o ON o.id=u.org_id AND o.deleted=0 WHERE u.id=? AND u.deleted=0`, [userId]
  )
  if (!users[0] || users[0].status !== 1) throw new AppError(401, '用户不存在或已禁用', 'USER_DISABLED')
  const [roles] = await getDb().query(
    `SELECT r.id,r.role_name,r.role_key FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id
     WHERE ur.user_id=? AND r.status=1 AND r.deleted=0 ORDER BY r.sort_order,r.id`, [userId]
  )
  const [permissions] = await getDb().query(
    `SELECT DISTINCT m.permission FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id AND r.status=1 AND r.deleted=0
     JOIN sys_role_menu rm ON rm.role_id=r.id JOIN sys_menu m ON m.id=rm.menu_id AND m.status=1 AND m.deleted=0
     WHERE ur.user_id=? AND m.permission IS NOT NULL ORDER BY m.permission`, [userId]
  )
  return { ...toCamelRow(users[0]), roles: roles.map(toCamelRow), permissions: permissions.map(row => row.permission) }
}

router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body)
  const [rows] = await getDb().query('SELECT id,username,password_hash,nickname,status,deleted FROM sys_user WHERE username=? LIMIT 1', [input.username])
  const user = rows[0]
  const valid = user && !user.deleted && user.status === 1 && await verifyPassword(input.password, user.password_hash)
  if (!valid) {
    await writeLoginLog(req, { userId: user?.id, username: input.username, status: 0, message: '用户名、密码错误或账号已禁用' })
    throw new AppError(401, '用户名、密码错误或账号已禁用', 'LOGIN_FAILED')
  }
  const identity = await loadIdentity(user.id)
  const roleKeys = identity.roles.map(role => role.roleKey)
  const token = jwt.sign({ sub: String(user.id), username: user.username, roles: roleKeys }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN })
  await getDb().query('UPDATE sys_user SET last_login_ip=?,last_login_at=CURRENT_TIMESTAMP(3) WHERE id=?', [getClientIp(req), user.id])
  await writeLoginLog(req, { userId: user.id, username: user.username, status: 1, message: '登录成功' })
  ok(res, { token, tokenType: 'Bearer', expiresIn: env.JWT_EXPIRES_IN, user: identity }, '登录成功')
}))

router.get('/me', authenticate, asyncHandler(async (req, res) => ok(res, await loadIdentity(req.user.sub))))

router.get('/menus', authenticate, asyncHandler(async (req, res) => {
  const admin = req.user.roles?.includes('admin')
  const sql = admin
    ? `SELECT DISTINCT m.* FROM sys_menu m WHERE m.deleted=0 AND m.status=1 AND m.visible=1 AND m.menu_type<>'F' ORDER BY m.sort_order,m.id`
    : `SELECT DISTINCT m.* FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id AND r.status=1 AND r.deleted=0
       JOIN sys_role_menu rm ON rm.role_id=r.id JOIN sys_menu m ON m.id=rm.menu_id
       WHERE ur.user_id=? AND m.deleted=0 AND m.status=1 AND m.visible=1 AND m.menu_type<>'F' ORDER BY m.sort_order,m.id`
  const [rows] = await getDb().query(sql, admin ? [] : [req.user.sub])
  ok(res, buildTree(rows.map(toCamelRow)))
}))

router.post('/logout', authenticate, (_req, res) => ok(res, null, '退出成功'))

export default router
