import { del, get, patch, post, put } from '@/utils/request'

const BASE_PATH = '/system/users'

export const getUserList = params => get(BASE_PATH, params)
export const getUser = id => get(`${BASE_PATH}/${id}`)
export const createUser = data => post(BASE_PATH, data)
export const updateUser = (id, data) => put(`${BASE_PATH}/${id}`, data)
export const deleteUser = id => del(`${BASE_PATH}/${id}`)
export const updateUserStatus = (id, status) => patch(`${BASE_PATH}/${id}/status`, { status })
export const resetUserPassword = (id, password) => post(`${BASE_PATH}/${id}/reset-password`, { password })
export const batchDeleteUsers = ids => del(`${BASE_PATH}/${ids.join(',')}`)

export default {
  getUserList,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  resetUserPassword,
  batchDeleteUsers,
}
