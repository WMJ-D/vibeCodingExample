export class AppError extends Error {
  constructor(status, message, code = 'BAD_REQUEST', details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function notFound(req, res, next) {
  next(new AppError(404, '接口不存在', 'NOT_FOUND'))
}

export function errorHandler(error, req, res, _next) {
  if (error?.issues) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: '请求参数不合法', details: error.issues })
  }
  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ code: 'DUPLICATE_DATA', message: '数据已存在' })
  }
  const status = error.status || 500
  if (status >= 500) req.log?.error({ err: error }, '请求处理失败')
  res.status(status).json({ code: error.code || 'INTERNAL_ERROR', message: status >= 500 ? '服务器内部错误' : error.message, details: error.details })
}
