import { Router } from 'express'
import { z } from 'zod'
import { getDb, withTransaction } from '../db/index.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { AppError, asyncHandler } from '../middleware/error.js'
import { hashPassword } from '../utils/password.js'
import { ok, page } from '../utils/response.js'
import { buildTree, pagination, placeholders, toCamelRow } from '../utils/data.js'

const router = Router()
router.use(authenticate)

const idParam = z.object({ id: z.coerce.number().int().positive() })
const statusBody = z.object({ status: z.coerce.number().int().min(0).max(1) })
const nullableId = z.union([z.coerce.number().int().positive(), z.null()]).optional()
const optionalText = length => z.string().trim().max(length).nullish().transform(value => value || null)
const actor = req => req.user.sub

function parseIds(value) {
  const raw = Array.isArray(value) ? value : String(value || '').split(',')
  const ids = raw.map(Number).filter(Number.isInteger).filter(id => id > 0)
  if (!ids.length) throw new AppError(400, '请提供有效ID', 'INVALID_IDS')
  return [...new Set(ids)]
}

function addLike(conditions, values, column, value) {
  if (value) { conditions.push(`${column} LIKE ?`); values.push(`%${value}%`) }
}

const userSchema = z.object({
  username: z.string().trim().min(2).max(64), nickname: z.string().trim().min(1).max(64),
  phone: optionalText(32), email: z.string().email().max(128).nullish().transform(value => value || null),
  orgId: nullableId, roleIds: z.array(z.coerce.number().int().positive()).default([]),
  password: z.string().min(6).max(128).optional(), status: z.coerce.number().int().min(0).max(1).default(1)
})

router.get('/users', authorize('system:user:list'), asyncHandler(async (req, res) => {
  const { pageNum, pageSize, offset } = pagination(req.query)
  const conditions = ['u.deleted=0']; const values = []
  addLike(conditions, values, 'u.username', req.query.username); addLike(conditions, values, 'u.phone', req.query.phone)
  if (req.query.status !== undefined && req.query.status !== '') { conditions.push('u.status=?'); values.push(Number(req.query.status)) }
  if (req.query.orgId) { conditions.push('u.org_id=?'); values.push(Number(req.query.orgId)) }
  const where = conditions.join(' AND ')
  const [countRows] = await getDb().query(`SELECT COUNT(DISTINCT u.id) total FROM sys_user u WHERE ${where}`, values)
  const [rows] = await getDb().query(
    `SELECT u.id,u.username,u.nickname,u.phone,u.email,u.avatar_url,u.org_id,o.org_name,u.status,u.last_login_at,u.created_at,
     GROUP_CONCAT(DISTINCT r.id ORDER BY r.id) role_ids,GROUP_CONCAT(DISTINCT r.role_name ORDER BY r.sort_order SEPARATOR ',') role_name
     FROM sys_user u LEFT JOIN sys_org o ON o.id=u.org_id AND o.deleted=0 LEFT JOIN sys_user_role ur ON ur.user_id=u.id
     LEFT JOIN sys_role r ON r.id=ur.role_id AND r.deleted=0 WHERE ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  )
  page(res, rows.map(row => ({ ...toCamelRow(row), roleIds: row.role_ids ? row.role_ids.split(',').map(Number) : [], createTime: row.created_at })), countRows[0].total, pageNum, pageSize)
}))

router.get('/users/:id', authorize('system:user:list'), asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params)
  const [rows] = await getDb().query('SELECT id,username,nickname,phone,email,avatar_url,org_id,status,created_at FROM sys_user WHERE id=? AND deleted=0', [id])
  if (!rows[0]) throw new AppError(404, '用户不存在', 'NOT_FOUND')
  const [roles] = await getDb().query('SELECT role_id FROM sys_user_role WHERE user_id=?', [id])
  ok(res, { ...toCamelRow(rows[0]), roleIds: roles.map(row => Number(row.role_id)) })
}))

router.post('/users', authorize('system:user:add'), asyncHandler(async (req, res) => {
  const input = userSchema.parse(req.body)
  const passwordHash = await hashPassword(input.password || '123456')
  const id = await withTransaction(async connection => {
    const [result] = await connection.query(
      `INSERT INTO sys_user (org_id,username,password_hash,nickname,phone,email,status,password_updated_at,created_by,updated_by)
       VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP(3),?,?)`,
      [input.orgId, input.username, passwordHash, input.nickname, input.phone, input.email, input.status, actor(req), actor(req)]
    )
    if (input.roleIds.length) await connection.query(`INSERT INTO sys_user_role (user_id,role_id) VALUES ${input.roleIds.map(() => '(?,?)').join(',')}`, input.roleIds.flatMap(roleId => [result.insertId, roleId]))
    return result.insertId
  })
  ok(res, { id: String(id) }, '新增成功')
}))

router.put('/users/:id', authorize('system:user:edit'), asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params); const input = userSchema.omit({ password: true }).parse(req.body)
  await withTransaction(async connection => {
    const [result] = await connection.query(
      `UPDATE sys_user SET org_id=?,nickname=?,phone=?,email=?,status=?,updated_by=? WHERE id=? AND deleted=0`,
      [input.orgId, input.nickname, input.phone, input.email, input.status, actor(req), id]
    )
    if (!result.affectedRows) throw new AppError(404, '用户不存在', 'NOT_FOUND')
    await connection.query('DELETE FROM sys_user_role WHERE user_id=?', [id])
    if (input.roleIds.length) await connection.query(`INSERT INTO sys_user_role (user_id,role_id) VALUES ${input.roleIds.map(() => '(?,?)').join(',')}`, input.roleIds.flatMap(roleId => [id, roleId]))
  })
  ok(res, null, '修改成功')
}))

router.patch('/users/:id/status', authorize('system:user:change-status'), asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params); const { status } = statusBody.parse(req.body)
  const [result] = await getDb().query('UPDATE sys_user SET status=?,updated_by=? WHERE id=? AND deleted=0', [status, actor(req), id])
  if (!result.affectedRows) throw new AppError(404, '用户不存在', 'NOT_FOUND'); ok(res)
}))

router.post('/users/:id/reset-password', authorize('system:user:reset-password'), asyncHandler(async (req, res) => {
  const { id } = idParam.parse(req.params)
  const body = z.object({ password: z.string().min(6).max(128).default('123456') }).parse(req.body || {})
  const [result] = await getDb().query('UPDATE sys_user SET password_hash=?,password_updated_at=CURRENT_TIMESTAMP(3),updated_by=? WHERE id=? AND deleted=0', [await hashPassword(body.password), actor(req), id])
  if (!result.affectedRows) throw new AppError(404, '用户不存在', 'NOT_FOUND'); ok(res, null, '密码重置成功')
}))

router.delete('/users/:id', authorize('system:user:delete'), asyncHandler(async (req, res) => {
  const ids = parseIds(req.params.id); if (ids.map(String).includes(String(req.user.sub))) throw new AppError(400, '不能删除当前登录用户')
  await getDb().query(`UPDATE sys_user SET deleted=1,updated_by=? WHERE id IN (${placeholders(ids)})`, [actor(req), ...ids]); ok(res, null, '删除成功')
}))

const roleSchema = z.object({
  roleName: z.string().trim().min(1).max(64), roleKey: z.string().trim().min(1).max(64),
  dataScope: z.coerce.number().int().min(1).max(5).default(1), sort: z.coerce.number().int().min(0).default(0),
  status: z.coerce.number().int().min(0).max(1).default(1), remark: optionalText(500)
})

router.get('/roles', authorize('system:role:list'), asyncHandler(async (req, res) => {
  const { pageNum, pageSize, offset } = pagination(req.query); const conditions = ['deleted=0']; const values = []
  addLike(conditions, values, 'role_name', req.query.roleName)
  if (req.query.status !== undefined && req.query.status !== '') { conditions.push('status=?'); values.push(Number(req.query.status)) }
  const where = conditions.join(' AND '); const [counts] = await getDb().query(`SELECT COUNT(*) total FROM sys_role WHERE ${where}`, values)
  const [rows] = await getDb().query(`SELECT id,role_name,role_key,data_scope,sort_order AS sort,status,remark,created_at FROM sys_role WHERE ${where} ORDER BY sort_order,id LIMIT ? OFFSET ?`, [...values, pageSize, offset])
  page(res, rows.map(row => ({ ...toCamelRow(row), createTime: row.created_at })), counts[0].total, pageNum, pageSize)
}))

router.post('/roles', authorize('system:role:add'), asyncHandler(async (req, res) => {
  const input = roleSchema.parse(req.body); const [result] = await getDb().query(
    'INSERT INTO sys_role (role_name,role_key,data_scope,sort_order,status,remark,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?)',
    [input.roleName,input.roleKey,input.dataScope,input.sort,input.status,input.remark,actor(req),actor(req)])
  ok(res,{ id:String(result.insertId) },'新增成功')
}))

router.put('/roles/:id', authorize('system:role:edit'), asyncHandler(async (req,res) => {
  const { id }=idParam.parse(req.params); const input=roleSchema.parse(req.body)
  const [result]=await getDb().query('UPDATE sys_role SET role_name=?,role_key=?,data_scope=?,sort_order=?,status=?,remark=?,updated_by=? WHERE id=? AND deleted=0',[input.roleName,input.roleKey,input.dataScope,input.sort,input.status,input.remark,actor(req),id])
  if(!result.affectedRows) throw new AppError(404,'角色不存在','NOT_FOUND'); ok(res,null,'修改成功')
}))

router.delete('/roles/:id', authorize('system:role:delete'), asyncHandler(async (req,res) => {
  const ids=parseIds(req.params.id); const [protectedRows]=await getDb().query(`SELECT id FROM sys_role WHERE role_key='admin' AND id IN (${placeholders(ids)})`,ids)
  if(protectedRows.length) throw new AppError(400,'不能删除超级管理员角色')
  await getDb().query(`UPDATE sys_role SET deleted=1,updated_by=? WHERE id IN (${placeholders(ids)})`,[actor(req),...ids]); ok(res,null,'删除成功')
}))

router.get('/roles/:id/menu-ids', authorize('system:role:list'), asyncHandler(async(req,res)=>{
  const {id}=idParam.parse(req.params); const [rows]=await getDb().query('SELECT menu_id FROM sys_role_menu WHERE role_id=?',[id]); ok(res,rows.map(row=>Number(row.menu_id)))
}))

router.put('/roles/:id/menus', authorize('system:role:permission'), asyncHandler(async(req,res)=>{
  const {id}=idParam.parse(req.params); const {menuIds}=z.object({menuIds:z.array(z.coerce.number().int().positive()).default([])}).parse(req.body)
  await withTransaction(async connection=>{ await connection.query('DELETE FROM sys_role_menu WHERE role_id=?',[id]); if(menuIds.length) await connection.query(`INSERT INTO sys_role_menu (role_id,menu_id) VALUES ${menuIds.map(()=>'(?,?)').join(',')}`,menuIds.flatMap(menuId=>[id,menuId])) }); ok(res,null,'权限保存成功')
}))

const menuSchema=z.object({
  parentId:nullableId, menuName:z.string().trim().min(1).max(100), menuType:z.enum(['M','C','F']), path:optionalText(255), component:optionalText(255),
  routeName:optionalText(100), permission:optionalText(128), icon:optionalText(100), sort:z.coerce.number().int().min(0).default(0),
  visible:z.coerce.number().int().min(0).max(1).default(1), status:z.coerce.number().int().min(0).max(1).default(1),
  keepAlive:z.coerce.number().int().min(0).max(1).default(1), externalLink:z.coerce.number().int().min(0).max(1).default(0), remark:optionalText(500)
})

router.get('/menus', authorize('system:menu:list'), asyncHandler(async(req,res)=>{
  const conditions=['deleted=0']; const values=[]; addLike(conditions,values,'menu_name',req.query.menuName)
  if(req.query.status!==undefined&&req.query.status!==''){conditions.push('status=?');values.push(Number(req.query.status))}
  const [rows]=await getDb().query(`SELECT id,parent_id,menu_name,menu_type,path,component,route_name,permission,icon,sort_order AS sort,visible,status,keep_alive,external_link,remark,created_at FROM sys_menu WHERE ${conditions.join(' AND ')} ORDER BY sort_order,id`,values)
  ok(res,buildTree(rows.map(row=>({...toCamelRow(row),createTime:row.created_at}))))
}))
router.post('/menus',authorize('system:menu:add'),asyncHandler(async(req,res)=>{const i=menuSchema.parse(req.body);const [r]=await getDb().query('INSERT INTO sys_menu (parent_id,menu_name,menu_type,path,component,route_name,permission,icon,sort_order,visible,status,keep_alive,external_link,remark,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[i.parentId,i.menuName,i.menuType,i.path,i.component,i.routeName,i.permission,i.icon,i.sort,i.visible,i.status,i.keepAlive,i.externalLink,i.remark,actor(req),actor(req)]);ok(res,{id:String(r.insertId)},'新增成功')}))
router.put('/menus/:id',authorize('system:menu:edit'),asyncHandler(async(req,res)=>{const{id}=idParam.parse(req.params);const i=menuSchema.parse(req.body);if(Number(i.parentId)===id)throw new AppError(400,'上级菜单不能是自身');const[r]=await getDb().query('UPDATE sys_menu SET parent_id=?,menu_name=?,menu_type=?,path=?,component=?,route_name=?,permission=?,icon=?,sort_order=?,visible=?,status=?,keep_alive=?,external_link=?,remark=?,updated_by=? WHERE id=? AND deleted=0',[i.parentId,i.menuName,i.menuType,i.path,i.component,i.routeName,i.permission,i.icon,i.sort,i.visible,i.status,i.keepAlive,i.externalLink,i.remark,actor(req),id]);if(!r.affectedRows)throw new AppError(404,'菜单不存在','NOT_FOUND');ok(res,null,'修改成功')}))
router.delete('/menus/:id',authorize('system:menu:delete'),asyncHandler(async(req,res)=>{const{id}=idParam.parse(req.params);const[children]=await getDb().query('SELECT id FROM sys_menu WHERE parent_id=? AND deleted=0 LIMIT 1',[id]);if(children.length)throw new AppError(400,'请先删除子菜单');await getDb().query('UPDATE sys_menu SET deleted=1,updated_by=? WHERE id=?',[actor(req),id]);ok(res,null,'删除成功')}))

const orgSchema=z.object({parentId:nullableId,orgName:z.string().trim().min(1).max(100),orgCode:optionalText(64),leader:optionalText(64),phone:optionalText(32),email:z.string().email().max(128).nullish().transform(v=>v||null),sort:z.coerce.number().int().min(0).default(0),status:z.coerce.number().int().min(0).max(1).default(1)})
router.get('/orgs',authorize('system:org:list'),asyncHandler(async(req,res)=>{const conditions=['deleted=0'];const values=[];addLike(conditions,values,'org_name',req.query.orgName);const[rows]=await getDb().query(`SELECT id,parent_id,ancestors,org_name,org_code,leader,phone,email,sort_order AS sort,status,created_at FROM sys_org WHERE ${conditions.join(' AND ')} ORDER BY sort_order,id`,values);ok(res,buildTree(rows.map(row=>({...toCamelRow(row),createTime:row.created_at}))))}))
router.post('/orgs',authorize('system:org:add'),asyncHandler(async(req,res)=>{const i=orgSchema.parse(req.body);let ancestors='';if(i.parentId){const[p]=await getDb().query('SELECT ancestors FROM sys_org WHERE id=? AND deleted=0',[i.parentId]);if(!p[0])throw new AppError(400,'上级组织不存在');ancestors=p[0].ancestors?`${p[0].ancestors},${i.parentId}`:String(i.parentId)}const[r]=await getDb().query('INSERT INTO sys_org (parent_id,ancestors,org_name,org_code,leader,phone,email,sort_order,status,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[i.parentId,ancestors,i.orgName,i.orgCode,i.leader,i.phone,i.email,i.sort,i.status,actor(req),actor(req)]);ok(res,{id:String(r.insertId)},'新增成功')}))
router.put('/orgs/:id',authorize('system:org:edit'),asyncHandler(async(req,res)=>{const{id}=idParam.parse(req.params);const i=orgSchema.parse(req.body);if(Number(i.parentId)===id)throw new AppError(400,'上级组织不能是自身');let ancestors='';if(i.parentId){const[p]=await getDb().query('SELECT ancestors FROM sys_org WHERE id=? AND deleted=0',[i.parentId]);if(!p[0])throw new AppError(400,'上级组织不存在');ancestors=p[0].ancestors?`${p[0].ancestors},${i.parentId}`:String(i.parentId)}const[r]=await getDb().query('UPDATE sys_org SET parent_id=?,ancestors=?,org_name=?,org_code=?,leader=?,phone=?,email=?,sort_order=?,status=?,updated_by=? WHERE id=? AND deleted=0',[i.parentId,ancestors,i.orgName,i.orgCode,i.leader,i.phone,i.email,i.sort,i.status,actor(req),id]);if(!r.affectedRows)throw new AppError(404,'组织不存在','NOT_FOUND');ok(res,null,'修改成功')}))
router.delete('/orgs/:id',authorize('system:org:delete'),asyncHandler(async(req,res)=>{const{id}=idParam.parse(req.params);const[children]=await getDb().query('SELECT id FROM sys_org WHERE parent_id=? AND deleted=0 LIMIT 1',[id]);if(children.length)throw new AppError(400,'请先删除下级组织');await getDb().query('UPDATE sys_org SET deleted=1,updated_by=? WHERE id=?',[actor(req),id]);ok(res,null,'删除成功')}))

const paramSchema=z.object({paramName:z.string().trim().min(1).max(200),paramKey:z.string().trim().min(1).max(200),paramValue:z.string().max(65535),paramType:z.enum(['Y','N']).default('N'),valueType:z.enum(['string','number','boolean','json']).default('string'),remark:optionalText(1000)})
router.get('/params',authorize('system:param:list'),asyncHandler(async(req,res)=>{const{pageNum,pageSize,offset}=pagination(req.query);const conditions=['deleted=0'];const values=[];addLike(conditions,values,'param_name',req.query.paramName);addLike(conditions,values,'param_key',req.query.paramKey);if(req.query.paramType){conditions.push('param_type=?');values.push(req.query.paramType)}const where=conditions.join(' AND ');const[counts]=await getDb().query(`SELECT COUNT(*) total FROM sys_param WHERE ${where}`,values);const[rows]=await getDb().query(`SELECT id,param_name,param_key,param_value,param_type,value_type,remark,created_at FROM sys_param WHERE ${where} ORDER BY id LIMIT ? OFFSET ?`,[...values,pageSize,offset]);page(res,rows.map(row=>({...toCamelRow(row),createTime:row.created_at})),counts[0].total,pageNum,pageSize)}))
router.post('/params',authorize('system:param:add'),asyncHandler(async(req,res)=>{const i=paramSchema.parse(req.body);const[r]=await getDb().query('INSERT INTO sys_param (param_name,param_key,param_value,param_type,value_type,remark,created_by,updated_by) VALUES (?,?,?,?,?,?,?,?)',[i.paramName,i.paramKey,i.paramValue,i.paramType,i.valueType,i.remark,actor(req),actor(req)]);ok(res,{id:String(r.insertId)},'新增成功')}))
router.put('/params/:id',authorize('system:param:edit'),asyncHandler(async(req,res)=>{const{id}=idParam.parse(req.params);const i=paramSchema.parse(req.body);const[r]=await getDb().query('UPDATE sys_param SET param_name=?,param_key=?,param_value=?,param_type=?,value_type=?,remark=?,updated_by=? WHERE id=? AND deleted=0',[i.paramName,i.paramKey,i.paramValue,i.paramType,i.valueType,i.remark,actor(req),id]);if(!r.affectedRows)throw new AppError(404,'参数不存在','NOT_FOUND');ok(res,null,'修改成功')}))
router.delete('/params/:id',authorize('system:param:delete'),asyncHandler(async(req,res)=>{const ids=parseIds(req.params.id);await getDb().query(`UPDATE sys_param SET deleted=1,updated_by=? WHERE id IN (${placeholders(ids)})`,[actor(req),...ids]);ok(res,null,'删除成功')}))

export default router
