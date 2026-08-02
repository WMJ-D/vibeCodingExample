import { Router } from 'express'
import { z } from 'zod'
import { getDb } from '../db/index.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { asyncHandler, AppError } from '../middleware/error.js'
import { ok, page } from '../utils/response.js'
import { pagination, placeholders, toCamelRow } from '../utils/data.js'

const router = Router()
router.use(authenticate)

const typeMap = { '新增': 'CREATE', '修改': 'UPDATE', '删除': 'DELETE', '查询': 'QUERY', '导出': 'EXPORT', CREATE: 'CREATE', UPDATE: 'UPDATE', DELETE: 'DELETE', QUERY: 'QUERY', EXPORT: 'EXPORT' }
const displayType = { CREATE: '新增', UPDATE: '修改', DELETE: '删除', QUERY: '查询', EXPORT: '导出', IMPORT: '导入', OTHER: '其他' }

function addLike(conditions, values, column, value) { if (value) { conditions.push(`${column} LIKE ?`); values.push(`%${value}%`) } }
function addRange(conditions, values, column, query) {
  const range = query.dateRange ? (Array.isArray(query.dateRange) ? query.dateRange : String(query.dateRange).split(',')) : [query.startDate, query.endDate]
  if (range[0]) { conditions.push(`${column} >= ?`); values.push(`${range[0]} 00:00:00`) }
  if (range[1]) { conditions.push(`${column} < DATE_ADD(?, INTERVAL 1 DAY)`); values.push(range[1]) }
}
function ids(body) {
  const result = (body.ids || []).map(Number).filter(Number.isInteger).filter(id => id > 0)
  if (!result.length) throw new AppError(400, '请选择需要删除的记录')
  return [...new Set(result)]
}
function escapeCsv(value) {
  if (value == null) return ''
  const string = String(value).replaceAll('"', '""')
  return /[",\n\r]/.test(string) ? `"${string}"` : string
}
function sendCsv(res, filename, headers, rows) {
  const content = '\uFEFF' + [headers.map(item => escapeCsv(item.label)).join(','), ...rows.map(row => headers.map(item => escapeCsv(row[item.key])).join(','))].join('\r\n')
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(content)
}

function operationWhere(query) {
  const conditions = ['deleted=0']; const values = []
  addLike(conditions, values, 'module', query.module); addLike(conditions, values, 'operator_username', query.operator || query.operatorUsername)
  if (query.type || query.operationType) { conditions.push('operation_type=?'); values.push(typeMap[query.type || query.operationType] || query.type || query.operationType) }
  if (query.status !== undefined && query.status !== '') { conditions.push('status=?'); values.push(['成功', '1', 1].includes(query.status) ? 1 : 0) }
  addRange(conditions, values, 'operated_at', query)
  return { where: conditions.join(' AND '), values }
}

router.get('/operation', authorize('log:operation:list'), asyncHandler(async(req,res)=>{
  const {pageNum,pageSize,offset}=pagination(req.query); const {where,values}=operationWhere(req.query)
  const[counts]=await getDb().query(`SELECT COUNT(*) total FROM sys_operation_log WHERE ${where}`,values)
  const[rows]=await getDb().query(`SELECT id,trace_id,module,operation_type,description,operator_username,request_method,request_url,request_params,response_result,ip_address,status,error_message,duration_ms,operated_at FROM sys_operation_log WHERE ${where} ORDER BY operated_at DESC LIMIT ? OFFSET ?`,[...values,pageSize,offset])
  page(res,rows.map(row=>{const item=toCamelRow(row);return{...item,type:displayType[row.operation_type]||row.operation_type,operator:row.operator_username,ip:row.ip_address,status:row.status===1?'成功':'失败',operTime:row.operated_at}}),counts[0].total,pageNum,pageSize)
}))
router.delete('/operation',authorize('log:operation:delete'),asyncHandler(async(req,res)=>{const values=ids(req.body);await getDb().query(`UPDATE sys_operation_log SET deleted=1 WHERE id IN (${placeholders(values)})`,values);ok(res,null,'删除成功')}))
router.get('/operation/export',authorize('log:operation:export'),asyncHandler(async(req,res)=>{const{where,values}=operationWhere(req.query);const[rows]=await getDb().query(`SELECT module,operation_type,description,operator_username,request_url,request_params,response_result,ip_address,status,error_message,duration_ms,operated_at FROM sys_operation_log WHERE ${where} ORDER BY operated_at DESC LIMIT 10000`,values);sendCsv(res,'operation-logs.csv',[{key:'module',label:'操作模块'},{key:'type',label:'操作类型'},{key:'description',label:'操作描述'},{key:'operator',label:'操作人'},{key:'request_url',label:'请求地址'},{key:'request_params',label:'请求参数'},{key:'response_result',label:'响应结果'},{key:'ip',label:'操作IP'},{key:'statusText',label:'状态'},{key:'error_message',label:'错误信息'},{key:'duration_ms',label:'耗时(ms)'},{key:'operated_at',label:'操作时间'}],rows.map(row=>({...row,type:displayType[row.operation_type]||row.operation_type,operator:row.operator_username,ip:row.ip_address,statusText:row.status===1?'成功':'失败',request_params:row.request_params?JSON.stringify(row.request_params):'',response_result:row.response_result?JSON.stringify(row.response_result):''})))}))

router.get('/online', authorize('log:online:list'), asyncHandler(async(req,res)=>{
  const {pageNum,pageSize,offset}=pagination(req.query)
  const conditions=["s.status='ACTIVE'","s.expires_at>CURRENT_TIMESTAMP(3)","s.last_active_at>=DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 5 MINUTE)"]
  const values=[]
  addLike(conditions,values,'s.username',req.query.username)
  addLike(conditions,values,'s.ip_address',req.query.ip||req.query.ipAddress)
  const where=conditions.join(' AND ')
  const[counts]=await getDb().query(`SELECT COUNT(*) total FROM sys_user_session s WHERE ${where}`,values)
  const[rows]=await getDb().query(
    `SELECT s.session_id,s.user_id,s.username,u.nickname,o.org_name,s.ip_address,s.location,s.browser,s.os,
     s.login_at,s.last_active_at,TIMESTAMPDIFF(SECOND,s.login_at,CURRENT_TIMESTAMP(3)) online_duration_seconds
     FROM sys_user_session s JOIN sys_user u ON u.id=s.user_id AND u.deleted=0
     LEFT JOIN sys_org o ON o.id=u.org_id AND o.deleted=0
     WHERE ${where} ORDER BY s.last_active_at DESC LIMIT ? OFFSET ?`,
    [...values,pageSize,offset]
  )
  page(res,rows.map(row=>{const item=toCamelRow(row);return{...item,ip:row.ip_address,isCurrent:row.session_id===req.user.jti}}),counts[0].total,pageNum,pageSize)
}))

const kickBody=z.object({reason:z.string().trim().max(500).optional().default('管理员强制下线')})
const batchKickBody=z.object({sessionIds:z.array(z.string().uuid()).min(1),reason:z.string().trim().max(500).optional().default('管理员批量强制下线')})

router.delete('/online/expired',authorize('log:online:clean'),asyncHandler(async(_req,res)=>{
  const[expired]=await getDb().query("UPDATE sys_user_session SET status='EXPIRED' WHERE status='ACTIVE' AND (expires_at<=CURRENT_TIMESTAMP(3) OR last_active_at<DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 5 MINUTE))")
  const[removed]=await getDb().query("DELETE FROM sys_user_session WHERE status<>'ACTIVE' AND COALESCE(kicked_at,logout_at,expires_at)<DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 30 DAY)")
  ok(res,{expiredCount:Number(expired.affectedRows||0),removedCount:Number(removed.affectedRows||0)},'清理完成')
}))

router.delete('/online/:sessionId',authorize('log:online:kick'),asyncHandler(async(req,res)=>{
  const sessionId=z.string().uuid().parse(req.params.sessionId)
  const{reason}=kickBody.parse(req.body||{})
  if(sessionId===req.user.jti) throw new AppError(400,'不能强制下线当前操作会话','CANNOT_KICK_SELF')
  const[result]=await getDb().query(
    "UPDATE sys_user_session SET status='KICKED',kicked_by=?,kicked_at=CURRENT_TIMESTAMP(3),kick_reason=? WHERE session_id=? AND status='ACTIVE'",
    [req.user.sub,reason,sessionId]
  )
  if(!result.affectedRows) throw new AppError(404,'在线会话不存在或已离线','SESSION_NOT_FOUND')
  ok(res,null,'强制下线成功')
}))

router.delete('/online',authorize('log:online:kick'),asyncHandler(async(req,res)=>{
  const{sessionIds,reason}=batchKickBody.parse(req.body||{})
  const targets=[...new Set(sessionIds)].filter(sessionId=>sessionId!==req.user.jti)
  if(!targets.length) throw new AppError(400,'没有可强制下线的会话','NO_KICKABLE_SESSION')
  const[result]=await getDb().query(
    `UPDATE sys_user_session SET status='KICKED',kicked_by=?,kicked_at=CURRENT_TIMESTAMP(3),kick_reason=? WHERE session_id IN (${placeholders(targets)}) AND status='ACTIVE'`,
    [req.user.sub,reason,...targets]
  )
  ok(res,{count:Number(result.affectedRows||0)},'批量强制下线成功')
}))

function loginWhere(query){const conditions=['deleted=0'];const values=[];addLike(conditions,values,'username',query.username);addLike(conditions,values,'ip_address',query.ip||query.ipAddress);if(query.status!==undefined&&query.status!==''){conditions.push('status=?');values.push(['成功','1',1].includes(query.status)?1:0)}addRange(conditions,values,'login_at',query);return{where:conditions.join(' AND '),values}}
router.get('/login',authorize('log:login:list'),asyncHandler(async(req,res)=>{const{pageNum,pageSize,offset}=pagination(req.query);const{where,values}=loginWhere(req.query);const[counts]=await getDb().query(`SELECT COUNT(*) total FROM sys_login_log WHERE ${where}`,values);const[rows]=await getDb().query(`SELECT id,username,ip_address,location,browser,os,login_type,status,message,login_at FROM sys_login_log WHERE ${where} ORDER BY login_at DESC LIMIT ? OFFSET ?`,[...values,pageSize,offset]);page(res,rows.map(row=>{const item=toCamelRow(row);return{...item,ip:row.ip_address,status:row.status===1?'成功':'失败',loginTime:row.login_at}}),counts[0].total,pageNum,pageSize)}))
router.delete('/login',authorize('log:login:delete'),asyncHandler(async(req,res)=>{const values=ids(req.body);await getDb().query(`UPDATE sys_login_log SET deleted=1 WHERE id IN (${placeholders(values)})`,values);ok(res,null,'删除成功')}))
router.get('/login/export',authorize('log:login:export'),asyncHandler(async(req,res)=>{const{where,values}=loginWhere(req.query);const[rows]=await getDb().query(`SELECT username,ip_address,location,browser,os,status,message,login_at FROM sys_login_log WHERE ${where} ORDER BY login_at DESC LIMIT 10000`,values);sendCsv(res,'login-logs.csv',[{key:'username',label:'用户名'},{key:'ip_address',label:'登录IP'},{key:'location',label:'登录地点'},{key:'browser',label:'浏览器'},{key:'os',label:'操作系统'},{key:'statusText',label:'状态'},{key:'message',label:'提示信息'},{key:'login_at',label:'登录时间'}],rows.map(row=>({...row,statusText:row.status===1?'成功':'失败'})))}))

export default router
