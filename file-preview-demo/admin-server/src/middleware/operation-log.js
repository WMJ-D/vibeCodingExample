/*
 * @Author: wangmingjun 2351405492www...
 * @Date: 2026-07-25 13:53:33
 * @LastEditors: wangmingjun 2351405492www...
 * @LastEditTime: 2026-07-25 16:57:48
 * @FilePath: \file-preview-demo\admin-server\src\middleware\operation-log.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { randomUUID } from 'node:crypto'
import { getDb } from '../db/index.js'
import { maskSensitive, getClientIp } from '../utils/security.js'

const metaMap = {
  POST: ['CREATE', '新增'], PUT: ['UPDATE', '修改'], PATCH: ['UPDATE', '修改'], DELETE: ['DELETE', '删除']
}

function inferModule(path) {
  console.log("🚀 ~ inferModule ~ path:", path)
  const name = path.split('/')[1] || '系统'
  return ({ users: '用户管理', roles: '角色管理', menus: '菜单管理', orgs: '组织管理', params: '参数管理', logs: '日志管理' })[name] || name
}

export function operationLogger(req, res, next) {
  if (!metaMap[req.method]) return next()
  const started = Date.now()
  const traceId = req.headers['x-trace-id'] || randomUUID()
  res.setHeader('x-trace-id', traceId)
  res.on('finish', () => {
    if (!req.user || req.path.includes('/auth/')) return
    const [operationType, verb] = metaMap[req.method]
    const params = maskSensitive({ params: req.params, query: req.query, body: req.body })
    getDb().query(
      `INSERT INTO sys_operation_log
       (trace_id,module,operation_type,description,operator_id,operator_username,request_method,request_url,request_params,response_result,ip_address,user_agent,status,error_message,duration_ms)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [traceId, inferModule(req.path), operationType, `${verb}${inferModule(req.path)}`, req.user.sub, req.user.username, req.method, req.originalUrl,
       JSON.stringify(params), JSON.stringify({ statusCode: res.statusCode }), getClientIp(req), req.headers['user-agent'] || '', res.statusCode < 400 ? 1 : 0,
       res.statusCode < 400 ? null : `HTTP ${res.statusCode}`, Date.now() - started]
    ).catch(error => req.log?.error({ err: error }, '操作日志写入失败'))
  })
  next()
}
