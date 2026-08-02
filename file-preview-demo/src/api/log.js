import { del, get } from '@/utils/request'

const OPERATION_PATH = '/logs/operation'
const LOGIN_PATH = '/logs/login'
const ONLINE_PATH = '/logs/online'

export const getOperationLogList = params => get(OPERATION_PATH, params)
export const batchDeleteOperationLogs = ids => del(OPERATION_PATH, { ids })
export const exportOperationLogs = params => get(`${OPERATION_PATH}/export`, params, { responseType: 'blob' })
export const getLoginLogList = params => get(LOGIN_PATH, params)
export const batchDeleteLoginLogs = ids => del(LOGIN_PATH, { ids })
export const exportLoginLogs = params => get(`${LOGIN_PATH}/export`, params, { responseType: 'blob' })
export const getOnlineUserList = params => get(ONLINE_PATH, params)
export const kickOnlineSession = (sessionId, reason) => del(`${ONLINE_PATH}/${sessionId}`, { reason })
export const batchKickOnlineSessions = (sessionIds, reason) => del(ONLINE_PATH, { sessionIds, reason })
export const cleanExpiredSessions = () => del(`${ONLINE_PATH}/expired`)

export default {
  getOperationLogList,
  batchDeleteOperationLogs,
  exportOperationLogs,
  getLoginLogList,
  batchDeleteLoginLogs,
  exportLoginLogs,
  getOnlineUserList,
  kickOnlineSession,
  batchKickOnlineSessions,
  cleanExpiredSessions,
}
