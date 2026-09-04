import { del, get, post } from '@/utils/request'

const BASE_PATH = '/system/files'

export const getFileList = params => get(BASE_PATH, params)
export const uploadFiles = (formData, options) => post(`${BASE_PATH}/upload`, formData, options)
export const deleteFiles = ids => del(BASE_PATH, { ids })
export const downloadFile = (id, options) => get(`${BASE_PATH}/${id}/download`, null, { ...options, responseType: 'blob' })

export default { getFileList, uploadFiles, deleteFiles, downloadFile }
