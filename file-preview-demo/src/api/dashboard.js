import { get } from '@/utils/request'

const BASE_PATH = '/dashboard'

export const getDashboardStatistics = () => get(`${BASE_PATH}/statistics`)

export default {
  getDashboardStatistics,
}
