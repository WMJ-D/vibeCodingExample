function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function safeUrl(value = '') {
  const url = String(value).trim()
  return /^(https?:\/\/|mailto:|#)/i.test(url) ? escapeHtml(url) : '#'
}

function renderInline(value = '') {
  let html = escapeHtml(value)
  const codeSpans = []
  const links = []
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const index = codeSpans.push(`<code>${code}</code>`) - 1
    return `\u0000CODE${index}\u0000`
  })
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g, (_, label, url, title) => {
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : ''
    const index = links.push(`<a href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer"${titleAttr}>${label}</a>`) - 1
    return `\u0000LINK${index}\u0000`
  })
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>')
  html = html.replace(/\u0000CODE(\d+)\u0000/g, (_, index) => codeSpans[Number(index)] || '')
  return html.replace(/\u0000LINK(\d+)\u0000/g, (_, index) => links[Number(index)] || '')
}

function isTableDivider(line = '') {
  const cells = line.trim().replace(/^\||\|$/g, '').split('|')
  return cells.length > 0 && cells.every(cell => /^\s*:?-{3,}:?\s*$/.test(cell))
}

function tableCells(line = '') {
  return line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
}

function startsBlock(lines, index) {
  const line = lines[index] || ''
  const next = lines[index + 1] || ''
  return !line.trim()
    || /^```/.test(line)
    || /^#{1,6}\s+/.test(line)
    || /^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)
    || /^>\s?/.test(line)
    || /^\s*[-+*]\s+/.test(line)
    || /^\s*\d+\.\s+/.test(line)
    || (line.includes('|') && isTableDivider(next))
}

export function renderMarkdown(markdown = '') {
  if (!markdown) return ''
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n')
  const output = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = line.match(/^```\s*([\w-]*)\s*$/)
    if (fence) {
      const code = []
      index += 1
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : ''
      output.push(`<pre><code${language}>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`)
      index += 1
      continue
    }

    if (/^\s*([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      output.push('<hr>')
      index += 1
      continue
    }

    if (line.includes('|') && isTableDivider(lines[index + 1])) {
      const headers = tableCells(line)
      index += 2
      const rows = []
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(tableCells(lines[index]))
        index += 1
      }
      const head = headers.map(cell => `<th>${renderInline(cell)}</th>`).join('')
      const body = rows.map(row => `<tr>${headers.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')
      output.push(`<div class="markdown-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`)
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      output.push(`<blockquote>${quote.map(renderInline).join('<br>')}</blockquote>`)
      continue
    }

    if (/^\s*[-+*]\s+/.test(line)) {
      const items = []
      while (index < lines.length && /^\s*[-+*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-+*]\s+/, ''))
        index += 1
      }
      output.push(`<ul>${items.map(item => `<li>${renderInline(item)}</li>`).join('')}</ul>`)
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''))
        index += 1
      }
      output.push(`<ol>${items.map(item => `<li>${renderInline(item)}</li>`).join('')}</ol>`)
      continue
    }

    const paragraph = [line]
    index += 1
    while (index < lines.length && !startsBlock(lines, index)) {
      paragraph.push(lines[index])
      index += 1
    }
    output.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`)
  }

  return output.join('')
}

export default renderMarkdown
