import { del, get, post, put } from '@/utils/request'

const BASE_PATH = '/system/menus'

export const getMenuList = params => get(BASE_PATH, params)
export const getMenuTree = params => get(BASE_PATH, params)
export const createMenu = data => post(BASE_PATH, data)
export const updateMenu = (id, data) => put(`${BASE_PATH}/${id}`, data)
export const deleteMenu = id => del(`${BASE_PATH}/${id}`)

export default {
  getMenuList,
  getMenuTree,
  createMenu,
  updateMenu,
  deleteMenu,
}
