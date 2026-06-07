/**
 * useBookmarkStore.js
 * 书签数据状态管理 composable
 * - 管理书签树、搜索、文件夹展开等响应式状态
 * - 自动检测 Chrome 扩展，降级到 HTML 文件
 */
import { ref, reactive, computed } from 'vue'
import {
  parseBookmarkHtml,
  unwrapExtBookmarks,
  filterTree,
  countBookmarks,
  extractDomain,
  handleIconError,
} from './useBookmarkParser'

export function useBookmarkStore() {
  /* ---------- 状态 ---------- */
  const bookmarkLoading = ref(false)
  const bookmarkTree = ref([])
  const bookmarkKeyword = ref('')
  const folderOpenMap = reactive({})
  /** 数据来源：'extension' | 'html' */
  const dataSource = ref('')
  /** 扩展是否已连接 */
  const extConnected = ref(false)
  /** 当前打开的标签页列表（仅扩展模式可用） */
  const openTabs = ref([])

  /* ---------- 计算属性 ---------- */

  /** 过滤后的一级书签 */
  const filteredTopBookmarks = computed(() => {
    const kw = bookmarkKeyword.value.trim().toLowerCase()
    const items = bookmarkTree.value.filter(item => item.type === 'bookmark')
    if (!kw) return items
    return items.filter(bm => bm.title.toLowerCase().includes(kw) || bm.url.toLowerCase().includes(kw))
  })

  /** 过滤后的文件夹 */
  const filteredFolders = computed(() => {
    const kw = bookmarkKeyword.value.trim().toLowerCase()
    const folders = bookmarkTree.value.filter(item => item.type === 'folder')
    if (!kw) return folders
    return filterTree(folders, kw)
  })

  /* ---------- 方法 ---------- */

  /** 切换文件夹展开/折叠 */
  function toggleFolder(name) {
    folderOpenMap[name] = !folderOpenMap[name]
  }

  /**
   * 加载书签：优先使用 Chrome 扩展直连，降级到 HTML 文件
   * 扩展模式下同时获取当前标签页列表
   */
  async function loadBookmarks() {
    bookmarkLoading.value = true
    try {
      const extData = await requestFromExtension()
      if (extData) {
        bookmarkTree.value = unwrapExtBookmarks(extData.bookmarks || [])
        openTabs.value = extData.tabs || []
        dataSource.value = 'extension'
        extConnected.value = true
        bookmarkLoading.value = false
        return
      }
    } catch {
      // 扩展不可用，降级
    }

    try {
      const res = await fetch('/bookmarks.html')
      const html = await res.text()
      bookmarkTree.value = parseBookmarkHtml(html)
      dataSource.value = 'html'
    } catch (e) {
      console.error('书签加载失败:', e)
    } finally {
      bookmarkLoading.value = false
    }
  }

  /** 通过 content script 向扩展请求书签 + 标签页数据 */
  function requestFromExtension() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        window.removeEventListener('message', onMessage)
        reject(new Error('扩展未响应'))
      }, 1500)

      function onMessage(event) {
        if (event.source !== window) return
        const msg = event.data
        if (!msg || msg.type !== 'EXT_ALL_RESULT') return
        clearTimeout(timeout)
        window.removeEventListener('message', onMessage)
        if (msg.success) {
          resolve(msg.data)
        } else {
          reject(new Error(msg.error || '扩展返回错误'))
        }
      }

      window.addEventListener('message', onMessage)
      window.postMessage({ type: 'EXT_GET_ALL' }, '*')
    })
  }

  /* ---------- 导出 ---------- */
  return {
    // 状态
    bookmarkLoading,
    bookmarkTree,
    bookmarkKeyword,
    folderOpenMap,
    dataSource,
    extConnected,
    openTabs,
    // 计算属性
    filteredTopBookmarks,
    filteredFolders,
    // 方法
    loadBookmarks,
    toggleFolder,
    // 工具函数（透传供模板使用）
    countBookmarks,
    extractDomain,
    handleIconError,
  }
}
