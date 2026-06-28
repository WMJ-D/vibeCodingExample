/**
 * todo.js — 待办数据状态管理
 * 使用 Vue3 reactive + uni.storage 持久化
 */
import { reactive } from 'vue'

const STORAGE_KEY = 'todo_app_tasks'

// 标签定义
export const TAGS = [
	{ name: '工作', color: '#34D399', bg: 'rgba(52,211,153,0.15)' },
	{ name: '生活', color: '#A855F7', bg: 'rgba(168,85,247,0.15)' },
	{ name: '学习', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
	{ name: '健康', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' },
	{ name: '购物', color: '#F87171', bg: 'rgba(248,113,113,0.15)' }
]

// 优先级定义
export const PRIORITIES = {
	high:   { label: '高', color: '#F87171' },
	medium: { label: '中', color: '#FBBF24' },
	low:    { label: '低', color: '#60A5FA' }
}

// 示例初始数据
const seedTasks = [
	{ id: 1, title: '产品评审会议', date: '2026-06-27', time: '09:30', endTime: '10:30', tag: '工作', priority: 'high', completed: false, reminder: true },
	{ id: 2, title: '提交周报',     date: '2026-06-27', time: '11:00', endTime: '',       tag: '工作', priority: 'medium', completed: true,  reminder: false },
	{ id: 3, title: '健身·跑步30分钟', date: '2026-06-27', time: '15:00', endTime: '',       tag: '健康', priority: 'medium', completed: false, reminder: true },
	{ id: 4, title: '给妈妈打电话',   date: '2026-06-27', time: '18:00', endTime: '',       tag: '生活', priority: 'low',    completed: false, reminder: false },
	{ id: 5, title: '阅读《设计心理学》', date: '2026-06-26', time: '20:00', endTime: '',    tag: '学习', priority: 'low',    completed: true,  reminder: false },
	{ id: 6, title: '整理项目文档',    date: '2026-06-25', time: '14:00', endTime: '',      tag: '工作', priority: 'high',   completed: true,  reminder: false },
	{ id: 7, title: '买周末食材',     date: '2026-06-26', time: '10:00', endTime: '',       tag: '购物', priority: 'low',    completed: true,  reminder: false }
]

// 全局响应式状态
export const state = reactive({
	tasks: [],
	selectedDate: new Date().toISOString().slice(0, 10),
	calendarMode: 'month'
})

// 初始化：从 storage 加载或写入种子数据
export function initStore() {
	try {
		const saved = uni.getStorageSync(STORAGE_KEY)
		if (saved && saved.length > 0) {
			state.tasks = JSON.parse(saved)
		} else {
			state.tasks = [...seedTasks]
			saveToStorage()
		}
	} catch (e) {
		state.tasks = [...seedTasks]
	}
}

function saveToStorage() {
	uni.setStorageSync(STORAGE_KEY, JSON.stringify(state.tasks))
}

// ========== 操作方法 ==========

export function addTask(task) {
	const newTask = {
		id: Date.now(),
		completed: false,
		reminder: false,
		...task
	}
	state.tasks.unshift(newTask)
	saveToStorage()
	return newTask
}

export function toggleTask(id) {
	const task = state.tasks.find(t => t.id === id)
	if (task) {
		task.completed = !task.completed
		saveToStorage()
	}
}

export function deleteTask(id) {
	const idx = state.tasks.findIndex(t => t.id === id)
	if (idx > -1) {
		state.tasks.splice(idx, 1)
		saveToStorage()
	}
}

export function setSelectedDate(date) {
	state.selectedDate = date
}

export function setCalendarMode(mode) {
	state.calendarMode = mode
}
