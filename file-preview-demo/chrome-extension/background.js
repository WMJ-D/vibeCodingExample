/**
 * background.js — Service Worker
 * 负责接收 content script 的消息请求，调用 Chrome API 获取书签和标签页数据
 */

/* ---------- 工具函数 ---------- */

/** 递归将 chrome.bookmarks 树转换为统一格式 */
function flattenBookmarkTree(nodes) {
  const result = []
  for (const node of nodes) {
    if (node.url) {
      // 叶子节点 = 书签
      result.push({
        type: 'bookmark',
        title: node.title || '',
        url: node.url,
      })
    } else if (node.children) {
      const children = flattenBookmarkTree(node.children)
      // Chrome 根节点（id=0, 无 title）不做文件夹包装，直接返回其子内容
      if (!node.title && node.id === '0') {
        result.push(...children)
        continue
      }
      // 普通文件夹：分离直接书签和子文件夹
      const bookmarks = children.filter(c => c.type === 'bookmark')
      const subFolders = children.filter(c => c.type === 'folder')
      result.push({
        type: 'folder',
        name: node.title || '未命名文件夹',
        bookmarks,
        children: subFolders,
      })
    }
  }
  return result
}

/** 获取当前所有打开的标签页 */
async function getOpenTabs() {
  const tabs = await chrome.tabs.query({})
  return tabs.map(tab => ({
    title: tab.title || '',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl || '',
    windowId: tab.windowId,
    active: tab.active,
  }))
}

/* ---------- 消息监听 ---------- */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_BOOKMARKS') {
    chrome.bookmarks.getTree().then(tree => {
      const data = flattenBookmarkTree(tree)
      sendResponse({ success: true, data })
    }).catch(err => {
      sendResponse({ success: false, error: err.message })
    })
    // 返回 true 表示异步 sendResponse
    return true
  }

  if (message.type === 'GET_TABS') {
    getOpenTabs().then(tabs => {
      sendResponse({ success: true, data: tabs })
    }).catch(err => {
      sendResponse({ success: false, error: err.message })
    })
    return true
  }

  if (message.type === 'GET_ALL') {
    Promise.all([
      chrome.bookmarks.getTree().then(flattenBookmarkTree),
      getOpenTabs(),
    ]).then(([bookmarks, tabs]) => {
      sendResponse({ success: true, data: { bookmarks, tabs } })
    }).catch(err => {
      sendResponse({ success: false, error: err.message })
    })
    return true
  }
})
