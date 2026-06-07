/**
 * useBookmarkParser.js
 * 书签解析相关纯函数集合
 * - 解析 Netscape Bookmark HTML 格式
 * - 剥离 Chrome 扩展数据外壳
 * - 书签树过滤、统计、工具函数
 */

/* ========== 常量 ========== */

/** 需要跳过的外壳文件夹名称（Chrome / Edge / Firefox） */
const SKIP_FOLDER_NAMES = /书签栏|bookmarks|其他书签|other bookmarks|移动设备书签|mobile bookmarks/i

/* ========== HTML 解析 ========== */

/**
 * 解析 Netscape Bookmark HTML 格式
 * 遍历根 <DL> 下所有 <DT>，跳过"书签栏""其他书签"等外壳，平铺一级内容
 * @param {string} html - 书签 HTML 文件内容
 * @returns {Array} 书签树数组
 */
export function parseBookmarkHtml(html) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const rootDl = doc.querySelector('dl')
  if (!rootDl) return []

  const rootDts = Array.from(rootDl.children).filter(el => el.tagName === 'DT')
  if (!rootDts.length) return []

  let allItems = []

  rootDts.forEach(dt => {
    const h3 = dt.querySelector(':scope > H3')
    const innerDl = dt.querySelector(':scope > DL')

    if (h3 && SKIP_FOLDER_NAMES.test(h3.textContent.trim()) && innerDl) {
      // 跳过外壳，直接解析内部内容
      allItems = allItems.concat(parseDl(innerDl))
    } else if (innerDl) {
      allItems = allItems.concat(parseDl(innerDl))
    } else {
      // 没有子 <DL>，当作普通书签解析
      const a = dt.querySelector(':scope > A')
      if (a) {
        allItems.push({
          type: 'bookmark',
          title: a.textContent.trim(),
          url: a.getAttribute('HREF') || '',
          icon: a.getAttribute('ICON') || '',
        })
      }
    }
  })

  return allItems
}

/**
 * 递归解析 <DL> 节点下的所有书签和子文件夹
 * @param {Element} dlNode - DOM <DL> 元素
 * @returns {Array} 书签/文件夹混合数组
 */
function parseDl(dlNode) {
  const result = []
  const children = dlNode.children

  for (let i = 0; i < children.length; i++) {
    const el = children[i]
    if (el.tagName !== 'DT') continue

    const h3 = el.querySelector(':scope > H3')
    const a = el.querySelector(':scope > A')

    if (h3) {
      const subDl = el.querySelector(':scope > DL')
      const subItems = subDl ? parseDl(subDl) : []
      const childrenFolders = subItems.filter(item => item.type === 'folder')
      const bookmarks = subItems.filter(item => item.type === 'bookmark')
      result.push({
        type: 'folder',
        name: h3.textContent.trim(),
        bookmarks,
        children: childrenFolders,
      })
    } else if (a) {
      result.push({
        type: 'bookmark',
        title: a.textContent.trim(),
        url: a.getAttribute('HREF') || '',
        icon: a.getAttribute('ICON') || '',
      })
    }
  }

  return result
}

/* ========== 扩展数据处理 ========== */

/**
 * 剥离 Chrome 扩展数据中的外壳文件夹
 * 将"书签栏""其他书签"等内部内容平铺到上一级
 * @param {Array} items - 扩展返回的书签数组
 * @returns {Array} 剥离外壳后的书签数组
 */
export function unwrapExtBookmarks(items) {
  const result = []

  for (const item of items) {
    if (item.type === 'folder' && SKIP_FOLDER_NAMES.test(item.name)) {
      if (item.bookmarks) result.push(...item.bookmarks)
      if (item.children) result.push(...item.children)
    } else {
      result.push(item)
    }
  }

  return result
}

/* ========== 搜索与过滤 ========== */

/**
 * 关键字搜索过滤书签树
 * 递归匹配书签标题/URL，保留包含匹配书签的文件夹路径
 * @param {Array} folders - 文件夹数组
 * @param {string} keyword - 搜索关键字
 * @returns {Array} 过滤后的文件夹数组
 */
export function filterTree(folders, keyword) {
  return folders
    .map(folder => {
      const matchedBookmarks = (folder.bookmarks || []).filter(
        bm => bm.title.toLowerCase().includes(keyword) || bm.url.toLowerCase().includes(keyword)
      )
      const matchedChildren = filterTree(folder.children || [], keyword)
      if (!matchedBookmarks.length && !matchedChildren.length) return null
      return { ...folder, bookmarks: matchedBookmarks, children: matchedChildren }
    })
    .filter(Boolean)
}

/* ========== 工具函数 ========== */

/**
 * 统计文件夹内书签总数（含子文件夹递归）
 * @param {Object} folder - 文件夹对象
 * @returns {number} 书签总数
 */
export function countBookmarks(folder) {
  let count = folder.bookmarks?.length || 0
  if (folder.children) {
    folder.children.forEach(sub => {
      count += countBookmarks(sub)
    })
  }
  return count
}

/**
 * 从 URL 提取域名
 * @param {string} url
 * @returns {string} 域名或原始 URL
 */
export function extractDomain(url) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** 图标加载失败时隐藏 */
export function handleIconError(e) {
  e.target.style.display = 'none'
}
