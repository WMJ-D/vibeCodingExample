export function formatDateTime(value = new Date(), timeZone = 'Asia/Shanghai') {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(value)
  const map = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`
}

export function toCamelRow(row) {
  const result = {}
  for (const [key, value] of Object.entries(row)) {
    const camel = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
    result[camel] = typeof value === 'bigint' ? String(value) : value
  }
  return result
}

export function buildTree(rows, parentKey = 'parentId') {
  const nodes = rows.map(row => ({ ...row, children: [] }))
  const map = new Map(nodes.map(node => [String(node.id), node]))
  const roots = []
  for (const node of nodes) {
    const parent = node[parentKey] == null ? null : map.get(String(node[parentKey]))
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

export function pagination(query) {
  const pageNum = Math.max(1, Number(query.pageNum) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10))
  return { pageNum, pageSize, offset: (pageNum - 1) * pageSize }
}

export function placeholders(items) {
  return items.map(() => '?').join(',')
}
