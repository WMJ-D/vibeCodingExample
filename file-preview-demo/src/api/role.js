import { del, get, post, put } from '@/utils/request'

const BASE_PATH = '/system/roles'

export const getRoleList = params => get(BASE_PATH, params)
export const createRole = data => post(BASE_PATH, data)
export const updateRole = (id, data) => put(`${BASE_PATH}/${id}`, data)
export const deleteRole = id => del(`${BASE_PATH}/${id}`)
export const getRolePermissions = id => get(`${BASE_PATH}/${id}/menu-ids`)
export const updateRolePermissions = (id, menuIds) => put(`${BASE_PATH}/${id}/menus`, { menuIds })

export default {
  getRoleList,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
}
