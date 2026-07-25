import { del, get } from '@/utils/request'

const OPERATION_PATH = '/logs/operation'
const LOGIN_PATH = '/logs/login'

export const getOperationLogList = params => get(OPERATION_PATH, params)
export const batchDeleteOperationLogs = ids => del(OPERATION_PATH, { ids })
export const exportOperationLogs = params => get(`${OPERATION_PATH}/export`, params, { responseType: 'blob' })
export const getLoginLogList = params => get(LOGIN_PATH, params)
export const batchDeleteLoginLogs = ids => del(LOGIN_PATH, { ids })
export const exportLoginLogs = params => get(`${LOGIN_PATH}/export`, params, { responseType: 'blob' })

export default {
  getOperationLogList,
  batchDeleteOperationLogs,
  exportOperationLogs,
  getLoginLogList,
  batchDeleteLoginLogs,
  exportLoginLogs,
}
