/**
 * popup.js — 弹窗逻辑
 * 点击按钮时，向当前活动标签页注入获取书签/标签页的请求
 */

document.getElementById('btn-send').addEventListener('click', async () => {
  const status = document.getElementById('status')
  const btn = document.getElementById('btn-send')
  btn.disabled = true
  status.textContent = '正在获取数据...'

  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab) {
      status.textContent = '未找到活动标签页'
      btn.disabled = false
      return
    }

    // 向该标签页注入脚本，触发数据获取
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        window.postMessage({ type: 'EXT_GET_ALL' }, '*')
      },
    })

    status.textContent = '已推送到页面，请查看控制台'
  } catch (err) {
    status.textContent = '失败: ' + err.message
  } finally {
    btn.disabled = false
  }
})
