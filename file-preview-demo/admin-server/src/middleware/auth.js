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
