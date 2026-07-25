/*
 * @Author: wangmingjun 2351405492www...
 * @Date: 2026-07-25 13:53:33
 * @LastEditors: wangmingjun 2351405492www...
 * @LastEditTime: 2026-07-25 17:10:00
 * @FilePath: \file-preview-demo\admin-server\src\middleware\operation-log.js
 * @Description: 操作日志中间件，记录请求参数与响应结果
 */
import { randomUUID } from 'node:crypto'
import { getDb } from '../db/index.js'
import { maskSensitive, getClientIp } from '../utils/security.js'

const metaMap = {
  POST: ['CREATE', '新增'], PUT: ['UPDATE', '修改'], PATCH: ['UPDATE', '修改'], DELETE: ['DELETE', '删除']
}

const MODULE_MAP = {
  users: '用户管理', roles: '角色管理', menus: '菜单管理', orgs: '组织管理', params: '参数管理', logs: '日志管理'
}

function inferModule(path) {
  const name = path.split('/')[1] || '系统'
  return MODULE_MAP[name] || name
}

// 拦截 res.json，捕获真实响应体，避免日志里只存一个状态码交差
function captureResponseBody(res) {
  let payload
  const originalJson = res.json.bind(res)
  res.json = (body) => {
    payload = body
    return originalJson(body)
  }
  return () => payload
}

export function operationLogger(req, res, next) {
  if (!metaMap[req.method]) return next()
  const started = Date.now()
  const traceId = req.headers['x-trace-id'] || randomUUID()
  res.setHeader('x-trace-id', traceId)
  const getResponsePayload = captureResponseBody(res)
  res.on('finish', () => {
    if (!req.user || req.path.includes('/auth/')) return
    const [operationType, verb] = metaMap[req.method]
    const params = maskSensitive({ params: req.params, query: req.query, body: req.body })
    const responsePayload = maskSensitive(getResponsePayload())
    const responseResult = {
      statusCode: res.statusCode,
      ...(responsePayload && typeof responsePayload === 'object' ? { body: responsePayload } : {})
    }
    getDb().query(
      `INSERT INTO sys_operation_log
       (trace_id,module,operation_type,description,operator_id,operator_username,request_method,request_url,request_params,response_result,ip_address,user_agent,status,error_message,duration_ms)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [traceId, inferModule(req.path), operationType, `${verb}${inferModule(req.path)}`, req.user.sub, req.user.username, req.method, req.originalUrl,
       JSON.stringify(params), JSON.stringify(responseResult), getClientIp(req), req.headers['user-agent'] || '', res.statusCode < 400 ? 1 : 0,
       res.statusCode < 400 ? null : `HTTP ${res.statusCode}`, Date.now() - started]
    ).catch(error => req.log?.error({ err: error }, '操作日志写入失败'))
  })
  next()
}
