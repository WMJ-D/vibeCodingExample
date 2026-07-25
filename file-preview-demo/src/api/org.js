import { del, get, post, put } from '@/utils/request'

const BASE_PATH = '/system/orgs'

export const getOrgList = params => get(BASE_PATH, params)
export const getOrgTree = params => get(BASE_PATH, params)
export const createOrg = data => post(BASE_PATH, data)
export const updateOrg = (id, data) => put(`${BASE_PATH}/${id}`, data)
export const deleteOrg = id => del(`${BASE_PATH}/${id}`)

export default {
  getOrgList,
  getOrgTree,
  createOrg,
  updateOrg,
  deleteOrg,
}
