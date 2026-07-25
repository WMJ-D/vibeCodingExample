export function ok(res, data = null, message = '操作成功') {
  return res.json({ code: 0, message, data })
}

export function page(res, list, total, pageNum, pageSize) {
  return ok(res, { list, total: Number(total), pageNum: Number(pageNum), pageSize: Number(pageSize) })
}
