import { del, get, post, put } from '@/utils/request'

const BASE_PATH = '/system/params'

export const getParamList = params => get(BASE_PATH, params)
export const createParam = data => post(BASE_PATH, data)
export const updateParam = (id, data) => put(`${BASE_PATH}/${id}`, data)
export const deleteParam = id => del(`${BASE_PATH}/${id}`)

export default {
  getParamList,
  createParam,
  updateParam,
  deleteParam,
}
