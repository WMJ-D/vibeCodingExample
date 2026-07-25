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
