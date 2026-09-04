import { ref } from 'vue'

const THEME_KEY = 'app-theme'

// 主题清单（供切换入口展示）
export const themeGroups = [
  {
    group: 'Trae',
    items: [
      { id: 'trae', name: 'Trae 经典绿', color: '#2ee68a', sub: '#0d1c13' },
    ],
  },
  {
    group: '抖音系列',
    items: [
      { id: 'douyin-dark', name: '抖音暗夜', color: '#25f4ee', sub: '#121216' },
      { id: 'douyin-red', name: '抖音热力', color: '#fe2c55', sub: '#ffffff' },
    ],
  },
  {
    group: '豆包系列',
    items: [
      { id: 'doubao-blue', name: '豆包星夜', color: '#4d6bfe', sub: '#10141f' },
      { id: 'doubao-light', name: '豆包晴空', color: '#4d6bfe', sub: '#ffffff' },
    ],
  },
]

// 校验存储的主题 id 是否有效，无效则回退默认
const validIds = new Set(themeGroups.flatMap(g => g.items.map(i => i.id)))
const storedTheme = localStorage.getItem(THEME_KEY)
const currentTheme = ref(validIds.has(storedTheme) ? storedTheme : 'trae')

// 应用主题到 <html data-theme="xxx"> 并持久化
function applyTheme(id) {
  if (!validIds.has(id)) return
  document.documentElement.dataset.theme = id
  currentTheme.value = id
  localStorage.setItem(THEME_KEY, id)
}

// 应用启动时调用，恢复上次选择的主题
export function initTheme() {
  applyTheme(currentTheme.value)
}

// JS 侧读取主题 CSS 变量（echarts 等场景）
export function getThemeVar(name, fallback = '') {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function useTheme() {
  return { currentTheme, applyTheme, themeGroups }
}
