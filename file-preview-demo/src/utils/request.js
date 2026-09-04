import { getToken, removeToken } from './token'

const BASE_URL = '/api/v1'
const SUCCESS_CODES = new Set([0, 200])
// 多子系统架构：统一携带子系统标识请求头（运行时配置，来自 public/config.js）
const APP_ID = window.__APP_CONFIG__?.appId || ''

export class RequestError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'RequestError'
    this.status = options.status
    this.code = options.code
    this.data = options.data
  }
}

function redirectToLogin() {
  removeToken()
  if (window.location.hash === '#/login' || window.location.hash.startsWith('#/login?')) return
  window.location.replace(`${window.location.pathname}${window.location.search}#/login`)
}

function buildUrl(url, params) {
  const target = /^https?:\/\//i.test(url) ? url : `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
  if (!params) return target

  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      value.forEach(item => searchParams.append(key, item))
      return
    }
    searchParams.append(key, value)
  })
  const query = searchParams.toString()
  return query ? `${target}${target.includes('?') ? '&' : '?'}${query}` : target
}

async function readError(response) {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null)
    return {
      message: payload?.message || payload?.msg || `请求失败（${response.status}）`,
      code: payload?.code,
      data: payload?.data ?? payload?.details,
    }
  }

  const text = await response.text().catch(() => '')
  return { message: text || `请求失败（${response.status}）` }
}

export async function request(url, options = {}) {
  const {
    method = 'GET',
    params,
    data,
    headers: customHeaders = {},
    responseType = 'json',
    signal,
  } = options
  const headers = new Headers(customHeaders)
  const token = getToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (APP_ID && !headers.has('X-App-Id')) {
    headers.set('X-App-Id', APP_ID)
  }

  let body
  if (data !== undefined && data !== null) {
    if (data instanceof FormData || data instanceof Blob || typeof data === 'string') {
      body = data
    } else {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(data)
    }
  }

  let response
  try {
    response = await fetch(buildUrl(url, params), {
      method,
      headers,
      body,
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new RequestError('网络连接失败，请稍后重试', { data: error })
  }

  if (response.status === 401 && !buildUrl(url).endsWith('/auth/login')) {
    redirectToLogin()
  }

  if (!response.ok) {
    const error = await readError(response)
    throw new RequestError(error.message, {
      status: response.status,
      code: error.code,
      data: error.data,
    })
  }

  if (responseType === 'blob') return response.blob()
  if (response.status === 204) return undefined

  const payload = await response.json().catch(() => {
    throw new RequestError('服务端返回了无效的 JSON 数据', { status: response.status })
  })
  const { code, message, data: result } = payload || {}
  if (!SUCCESS_CODES.has(code)) {
    if (code === 401) redirectToLogin()
    throw new RequestError(message || '请求失败', {
      status: response.status,
      code,
      data: result,
    })
  }
  return result
}

export const get = (url, params, options) => request(url, { ...options, method: 'GET', params })
export const post = (url, data, options) => request(url, { ...options, method: 'POST', data })
export const put = (url, data, options) => request(url, { ...options, method: 'PUT', data })
export const patch = (url, data, options) => request(url, { ...options, method: 'PATCH', data })
export const del = (url, data, options) => request(url, { ...options, method: 'DELETE', data })

export default request
