/**
 * todo.js — 待办数据状态管理
 * 使用 Vue3 reactive + uni.storage 持久化
 * 支持：任务 CRUD / 归档 / 恢复 / 删除
 */
import { reactive } from 'vue'

const STORAGE_KEY = 'todo_app_tasks'
const ARCHIVE_KEY = 'todo_app_archived'

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
	archivedTasks: [],
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

		// 加载归档数据
		const archived = uni.getStorageSync(ARCHIVE_KEY)
		if (archived && archived.length > 0) {
			state.archivedTasks = JSON.parse(archived)
		}
	} catch (e) {
		state.tasks = [...seedTasks]
	}
}

function saveToStorage() {
	uni.setStorageSync(STORAGE_KEY, JSON.stringify(state.tasks))
}

function saveArchived() {
	uni.setStorageSync(ARCHIVE_KEY, JSON.stringify(state.archivedTasks))
}

// ========== 基础操作方法 ==========

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

// ========== 归档相关方法 ==========

/** 获取已完成但未归档的任务列表 */
export function getCompletedTasks() {
	return state.tasks.filter(t => t.completed).sort((a, b) => {
		// 按日期倒序，最近完成的排前面
		if (b.date !== a.date) return b.date.localeCompare(a.date)
		return (b.time || '').localeCompare(a.time || '')
	})
}

/** 获取已归档的任务列表 */
export function getArchivedTasks() {
	return [...state.archivedTasks].sort((a, b) => {
		if (b.archivedAt !== a.archivedAt) return (b.archivedAt || 0) - (a.archivedAt || 0)
		return (b.date || '').localeCompare(a.date || '')
	})
}

/** 恢复任务（从已完成 → 未完成待办） */
export function restoreTask(id) {
	const task = state.tasks.find(t => t.id === id)
	if (task) {
		task.completed = false
		saveToStorage()
	}
}

/** 将已完成任务移入归档 */
export function archiveTask(id) {
	const idx = state.tasks.findIndex(t => t.id === id)
	if (idx > -1) {
		const task = state.tasks.splice(idx, 1)[0]
		task.archivedAt = Date.now()
		state.archivedTasks.unshift(task)
		saveToStorage()
		saveArchived()
	}
}

/** 从归档恢复为已完成状态（回到活跃列表） */
export function unarchiveTask(id) {
	const idx = state.archivedTasks.findIndex(t => t.id === id)
	if (idx > -1) {
		const task = state.archivedTasks.splice(idx, 1)[0]
		delete task.archivedAt
		task.completed = true
		state.tasks.unshift(task)
		saveToStorage()
		saveArchived()
	}
}

/** 从活跃列表彻底删除任务 */
export function deleteTaskPermanent(id) {
	deleteTask(id)
}

/** 从归档列表彻底删除任务 */
export function deleteArchivedTask(id) {
	const idx = state.archivedTasks.findIndex(t => t.id === id)
	if (idx > -1) {
		state.archivedTasks.splice(idx, 1)
		saveArchived()
	}
}

/** 批量归档所有已完成任务，返回归档数量 */
export function archiveAllCompleted() {
	const completed = state.tasks.filter(t => t.completed)
	completed.forEach(task => {
		task.archivedAt = Date.now()
		state.archivedTasks.unshift(task)
	})
	state.tasks = state.tasks.filter(t => !t.completed)
	saveToStorage()
	saveArchived()
	return completed.length
}

/** 清空所有归档任务 */
export function clearAllArchived() {
	state.archivedTasks = []
	saveArchived()
}
