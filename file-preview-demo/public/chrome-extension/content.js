/**
 * content.js — Content Script
 * 注入到 localhost 页面，桥接扩展与网页之间的通信
 *
 * 通信流程：
 *   网页 window.postMessage({ type: 'EXT_GET_BOOKMARKS' })
 *     → content.js 监听到 → chrome.runtime.sendMessage
 *       → background.js 处理 → 返回结果
 *         → content.js 通过 window.postMessage 回传给网页
 */

/* ---------- 监听网页发来的消息 ---------- */
window.addEventListener('message', (event) => {
  // 只处理来自同源页面的消息
  if (event.source !== window) return
  const msg = event.data
  if (!msg || typeof msg !== 'object') return

  if (msg.type === 'EXT_GET_BOOKMARKS') {
    chrome.runtime.sendMessage({ type: 'GET_BOOKMARKS' }, (res) => {
      window.postMessage({ type: 'EXT_BOOKMARKS_RESULT', ...res }, '*')
    })
  }

  if (msg.type === 'EXT_GET_TABS') {
    chrome.runtime.sendMessage({ type: 'GET_TABS' }, (res) => {
      window.postMessage({ type: 'EXT_TABS_RESULT', ...res }, '*')
    })
  }

  if (msg.type === 'EXT_GET_ALL') {
    chrome.runtime.sendMessage({ type: 'GET_ALL' }, (res) => {
      window.postMessage({ type: 'EXT_ALL_RESULT', ...res }, '*')
    })
  }
})

/* ---------- 通知网页扩展已就绪 ---------- */
window.postMessage({ type: 'EXT_READY' }, '*')
