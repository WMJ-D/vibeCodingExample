import { del, get, post, put } from '@/utils/request'

const BASE_PATH = '/system/apps'

export const getAppList = params => get(BASE_PATH, params)
export const createApp = data => post(BASE_PATH, data)
export const updateApp = (id, data) => put(`${BASE_PATH}/${id}`, data)
export const deleteApp = id => del(`${BASE_PATH}/${id}`)

export default {
  getAppList,
  createApp,
  updateApp,
  deleteApp,
}
