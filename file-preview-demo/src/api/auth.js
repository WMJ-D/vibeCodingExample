import { get, post } from '@/utils/request'

export const login = data => post('/auth/login', data)
export const logout = () => post('/auth/logout')
export const getMe = () => get('/auth/me')
export const getMenus = () => get('/auth/menus')
export const heartbeat = () => post('/auth/heartbeat')

export default { login, logout, getMe, getMenus, heartbeat }
