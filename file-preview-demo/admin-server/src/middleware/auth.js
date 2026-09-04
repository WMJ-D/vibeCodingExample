import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError, asyncHandler } from './error.js'
import { getDb } from '../db/index.js'

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization || ''
  if (!authorization.startsWith('Bearer ')) throw new AppError(401, '请先登录', 'UNAUTHORIZED')
  try {
    req.user = jwt.verify(authorization.slice(7), env.JWT_SECRET)
  } catch {
    throw new AppError(401, '登录凭证无效或已过期', 'INVALID_TOKEN')
  }

  if (!req.user.jti) throw new AppError(401, '登录会话无效，请重新登录', 'INVALID_SESSION')
  const [sessions] = await getDb().query(
    'SELECT status,expires_at FROM sys_user_session WHERE session_id=? AND user_id=? LIMIT 1',
    [req.user.jti, req.user.sub]
  )
  const session = sessions[0]
  if (!session) throw new AppError(401, '登录会话不存在，请重新登录', 'INVALID_SESSION')
  if (session.status === 'KICKED') throw new AppError(401, '当前账号已被管理员强制下线', 'SESSION_KICKED')
  if (session.status !== 'ACTIVE') throw new AppError(401, '登录会话已失效，请重新登录', 'SESSION_INACTIVE')
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await getDb().query("UPDATE sys_user_session SET status='EXPIRED' WHERE session_id=? AND status='ACTIVE'", [req.user.jti])
    throw new AppError(401, '登录会话已过期，请重新登录', 'SESSION_EXPIRED')
  }
  next()
})

export const authorize = (...permissions) => asyncHandler(async (req, _res, next) => {
  if (!permissions.length || req.user.roles?.includes('admin')) return next()
  const [rows] = await getDb().query(
    `SELECT DISTINCT m.permission FROM sys_user_role ur
     JOIN sys_role r ON r.id=ur.role_id AND r.status=1 AND r.deleted=0
     JOIN sys_role_menu rm ON rm.role_id=r.id
     JOIN sys_menu m ON m.id=rm.menu_id AND m.status=1 AND m.deleted=0
     WHERE ur.user_id=? AND m.permission IS NOT NULL`, [req.user.sub]
  )
  const granted = new Set(rows.map(row => row.permission))
  if (!permissions.some(permission => granted.has(permission))) throw new AppError(403, '无权执行此操作', 'FORBIDDEN')
  next()
})
