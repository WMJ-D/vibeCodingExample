import { Router } from 'express'
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

function loginWhere(query){const conditions=['deleted=0'];const values=[];addLike(conditions,values,'username',query.username);addLike(conditions,values,'ip_address',query.ip||query.ipAddress);if(query.status!==undefined&&query.status!==''){conditions.push('status=?');values.push(['成功','1',1].includes(query.status)?1:0)}addRange(conditions,values,'login_at',query);return{where:conditions.join(' AND '),values}}
router.get('/login',authorize('log:login:list'),asyncHandler(async(req,res)=>{const{pageNum,pageSize,offset}=pagination(req.query);const{where,values}=loginWhere(req.query);const[counts]=await getDb().query(`SELECT COUNT(*) total FROM sys_login_log WHERE ${where}`,values);const[rows]=await getDb().query(`SELECT id,username,ip_address,location,browser,os,login_type,status,message,login_at FROM sys_login_log WHERE ${where} ORDER BY login_at DESC LIMIT ? OFFSET ?`,[...values,pageSize,offset]);page(res,rows.map(row=>{const item=toCamelRow(row);return{...item,ip:row.ip_address,status:row.status===1?'成功':'失败',loginTime:row.login_at}}),counts[0].total,pageNum,pageSize)}))
router.delete('/login',authorize('log:login:delete'),asyncHandler(async(req,res)=>{const values=ids(req.body);await getDb().query(`UPDATE sys_login_log SET deleted=1 WHERE id IN (${placeholders(values)})`,values);ok(res,null,'删除成功')}))
router.get('/login/export',authorize('log:login:export'),asyncHandler(async(req,res)=>{const{where,values}=loginWhere(req.query);const[rows]=await getDb().query(`SELECT username,ip_address,location,browser,os,status,message,login_at FROM sys_login_log WHERE ${where} ORDER BY login_at DESC LIMIT 10000`,values);sendCsv(res,'login-logs.csv',[{key:'username',label:'用户名'},{key:'ip_address',label:'登录IP'},{key:'location',label:'登录地点'},{key:'browser',label:'浏览器'},{key:'os',label:'操作系统'},{key:'statusText',label:'状态'},{key:'message',label:'提示信息'},{key:'login_at',label:'登录时间'}],rows.map(row=>({...row,statusText:row.status===1?'成功':'失败'})))}))

export default router
