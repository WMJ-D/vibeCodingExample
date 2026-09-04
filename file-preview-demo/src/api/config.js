import { get } from '@/utils/request'

export const getSystemName = () => get('/config/system-name')

export default { getSystemName }
