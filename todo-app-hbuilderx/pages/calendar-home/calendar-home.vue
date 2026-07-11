<template>
	<view class="page">
		<!-- 1. 顶部状态栏 -->
		<view class="status-bar">
			<text class="status-bar__date">{{ statusBarDate }}</text>
		</view>

		<!-- 2. 日历区域 -->
		<view class="calendar-section">
			<!-- 月/周切换 -->
			<view class="calendar-tabs">
				<view class="calendar-tab" :class="{ active: calendarMode === 'month' }" @tap="calendarMode = 'month'">月</view>
				<view class="calendar-tab" :class="{ active: calendarMode === 'week' }" @tap="calendarMode = 'week'">周</view>
			</view>

			<!-- 月份导航（月视图） -->
			<view v-if="calendarMode === 'month'" class="month-nav">
				<view class="month-nav__btn" @tap="prevMonth">‹</view>
				<text class="month-nav__label">{{ currentYear }}年{{ monthLabel }}</text>
				<view class="month-nav__btn" @tap="nextMonth">›</view>
			</view>

			<!-- 星期标题（仅月视图显示） -->
			<view v-if="calendarMode === 'month'" class="calendar-weekdays">
				<text v-for="(w, i) in weekdays" :key="i" class="weekday">{{ w }}</text>
			</view>

			<!-- 月视图日历网格 -->
			<view v-if="calendarMode === 'month'" class="calendar-grid">
				<view v-for="(day, i) in calendarDays" :key="i"
					class="calendar-day"
					:class="{ empty: day.empty, past: day.isPast, today: day.isToday, selected: day.isSelected }"
					@tap="selectDay(day)">
					<text class="calendar-day__num">{{ day.empty ? '' : day.day }}</text>
					<view v-if="day.hasTask && !day.isSelected" class="calendar-day__dot"></view>
				</view>
			</view>

			<!-- 周视图 -->
			<view v-else class="week-grid">
				<view v-for="(day, i) in weekDays" :key="i"
					class="calendar-day"
					:class="{ today: day.isToday, selected: day.isSelected }"
					@tap="selectedDate = day.dateStr">
					<text class="weekday-label">{{ day.weekday }}</text>
					<text class="calendar-day__num">{{ day.day }}</text>
					<view v-if="day.hasTask && !day.isSelected" class="calendar-day__dot"></view>
				</view>
			</view>
		</view>

		<!-- 3. 待办列表 -->
		<view class="todo-section">
			<view class="todo-header">
				<text class="todo-header__title">今日待办</text>
				<text class="todo-header__count">{{ taskCount }}项</text>
			</view>

			<!-- 上午分组 -->
			<view v-if="groupedTasks.morning.length" class="todo-group">
				<text class="todo-group__label">上午</text>
				<view v-for="task in groupedTasks.morning" :key="task.id"
					class="todo-card" :class="{ completed: task.completed }">
					<view class="todo-card__checkbox" @tap="handleToggle(task.id)">
						<text v-if="task.completed" class="check-icon">✓</text>
					</view>
					<view class="todo-card__content">
						<view class="todo-card__title-row">
							<text class="todo-card__title">{{ task.title }}</text>
							<view v-if="task.priority" class="todo-card__priority"
								:style="{ background: getPriorityColor(task.priority) }"></view>
						</view>
						<view class="todo-card__time-row">
							<text class="time-icon">🕐</text>
							<text class="todo-card__time">{{ task.time }}{{ task.endTime ? ' - ' + task.endTime : '' }}</text>
						</view>
						<view class="todo-card__tags">
							<text class="tag" :style="getTagStyle(task.tag)">{{ task.tag }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 下午分组 -->
			<view v-if="groupedTasks.afternoon.length" class="todo-group">
				<text class="todo-group__label">下午</text>
				<view v-for="task in groupedTasks.afternoon" :key="task.id"
					class="todo-card" :class="{ completed: task.completed }">
					<view class="todo-card__checkbox" @tap="handleToggle(task.id)">
						<text v-if="task.completed" class="check-icon">✓</text>
					</view>
					<view class="todo-card__content">
						<view class="todo-card__title-row">
							<text class="todo-card__title">{{ task.title }}</text>
							<view v-if="task.priority" class="todo-card__priority"
								:style="{ background: getPriorityColor(task.priority) }"></view>
						</view>
						<view class="todo-card__time-row">
							<text class="time-icon">🕐</text>
							<text class="todo-card__time">{{ task.time }}{{ task.endTime ? ' - ' + task.endTime : '' }}</text>
						</view>
						<view class="todo-card__tags">
							<text class="tag" :style="getTagStyle(task.tag)">{{ task.tag }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-if="taskCount === 0" class="empty-state">
				<text class="empty-icon">📋</text>
				<text class="empty-text">今天还没有待办</text>
				<text class="empty-sub">点击右下角 + 添加任务</text>
			</view>
		</view>

		<!-- 4. 浮动新建按钮 -->
		<view class="fab-add" @tap="goAddTask">
			<text class="fab-icon">+</text>
		</view>

		<!-- 5. 底部Tab栏 -->
		<TabBar active="home" />
	</view>
</template>

<script>
	import TabBar from '@/components/TabBar.vue'
	import SystemCapsule from '@/components/SystemCapsule.vue'
	import { state, toggleTask, TAGS, PRIORITIES } from '@/store/todo.js'

	export default {
		components: { TabBar, SystemCapsule },
		data() {
			const today = new Date()
			return {
				state,
				TAGS,
				PRIORITIES,
				today,
				currentYear: today.getFullYear(),
				currentMonth: today.getMonth(),
				selectedDate: today.toISOString().slice(0, 10),
				calendarMode: 'month',
				weekdays: ['日', '一', '二', '三', '四', '五', '六']
			}
		},
		computed: {
			monthLabel() {
				return `${this.currentMonth + 1}月`
			},
			statusBarDate() {
				const d = new Date()
				const weekDay = this.weekdays[d.getDay()]
				return `${d.getMonth() + 1}月 ${weekDay === '日' ? '周日' : weekDay === '六' ? '周六' : '周' + weekDay}`
			},
			calendarDays() {
				const y = this.currentYear
				const m = this.currentMonth
				const firstDay = new Date(y, m, 1)
				const lastDay = new Date(y, m + 1, 0)
				const firstDayWeek = firstDay.getDay()
				const daysInMonth = lastDay.getDate()
				const todayStr = new Date().toISOString().slice(0, 10)

				const days = []
				for (let i = 0; i < firstDayWeek; i++) {
					days.push({ day: 0, empty: true })
				}
				for (let d = 1; d <= daysInMonth; d++) {
					const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
					days.push({
						day: d,
						dateStr,
						isToday: dateStr === todayStr,
						isSelected: dateStr === this.selectedDate,
						hasTask: state.tasks.some(t => t.date === dateStr),
						isPast: new Date(y, m, d) < new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate()),
						empty: false
					})
				}
				return days
			},
			weekDays() {
				const sel = new Date(this.selectedDate)
				const dayOfWeek = sel.getDay()
				const monday = new Date(sel)
				monday.setDate(sel.getDate() - dayOfWeek)

				const days = []
				const todayStr = new Date().toISOString().slice(0, 10)
				for (let i = 0; i < 7; i++) {
					const d = new Date(monday)
					d.setDate(monday.getDate() + i)
					const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
					days.push({
						day: d.getDate(),
						dateStr,
						isToday: dateStr === todayStr,
						isSelected: dateStr === this.selectedDate,
						hasTask: state.tasks.some(t => t.date === dateStr),
						weekday: this.weekdays[i]
					})
				}
				return days
			},
			groupedTasks() {
				const tasks = state.tasks
						.filter(t => t.date === this.selectedDate)
						.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
				const morning = tasks.filter(t => parseInt((t.time || '00:00').split(':')[0]) < 12)
				const afternoon = tasks.filter(t => parseInt((t.time || '00:00').split(':')[0]) >= 12)
				return { morning, afternoon }
			},
			taskCount() {
				return this.groupedTasks.morning.length + this.groupedTasks.afternoon.length
			}
		},
		onShow() {
			// store 是全局响应式，数据自动更新
		},
		methods: {
			selectDay(day) {
				if (day.empty) return
				this.selectedDate = day.dateStr
			},
			prevMonth() {
				if (this.currentMonth === 0) {
					this.currentMonth = 11
					this.currentYear--
				} else {
					this.currentMonth--
				}
			},
			nextMonth() {
				if (this.currentMonth === 11) {
					this.currentMonth = 0
					this.currentYear++
				} else {
					this.currentMonth++
				}
			},
			getTagStyle(tagName) {
				const tag = this.TAGS.find(t => t.name === tagName)
				if (!tag) return {}
				return { color: tag.color, background: tag.bg }
			},
			getPriorityColor(priority) {
				return this.PRIORITIES[priority]?.color || '#63636E'
			},
			handleToggle(id) {
				toggleTask(id)
			},
			goAddTask() {
				uni.navigateTo({ url: `/pages/add-task/add-task?date=${this.selectedDate}` })
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: #1A1A1E;
		/* 底部留出 TabBar 高度 + 安全区 */
		padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(180rpx + constant(safe-area-inset-bottom));
	}


	/* ===== 1. 状态栏 ===== */
	.status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		/* 顶部留出状态栏 + 安全区 */
		padding: calc(24rpx + env(safe-area-inset-top)) 40rpx 0;
		padding: calc(24rpx + constant(safe-area-inset-top)) 40rpx 0;
		min-height: 88rpx;
	}
	.status-bar__date {
		font-size: 26rpx;
		font-weight: 600;
		color: #F5F5F7;
		letter-spacing: 0.6rpx;
	}


	/* ===== 2. 日历区域 ===== */
	.calendar-section {
		padding: 24rpx 40rpx 0;
	}
	.calendar-tabs {
		display: flex;
		margin-bottom: 32rpx;
		background: #222226;
		border-radius: 20rpx;
		padding: 6rpx;
		width: fit-content;
		border: 1px solid rgba(255, 255, 255, 0.06);
	}
	.calendar-tab {
		padding: 12rpx 40rpx;
		border-radius: 14rpx;
		font-size: 26rpx;
		font-weight: 500;
		color: #63636E;
		transition: all 0.2s;
	}
	.calendar-tab.active {
		background: #34D399;
		color: #1A1A1E;
		font-weight: 600;
	}

	/* 月份导航 */
	.month-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 40rpx;
		margin-bottom: 24rpx;
	}
	.month-nav__btn {
		font-size: 40rpx;
		color: #A1A1AA;
		width: 64rpx;
		height: 64rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
	}
	.month-nav__btn:active {
		background: rgba(255, 255, 255, 0.06);
	}
	.month-nav__label {
		font-size: 30rpx;
		font-weight: 600;
		color: #F5F5F7;
		min-width: 200rpx;
		text-align: center;
	}

	/* 星期标题 */
	.calendar-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		margin-bottom: 16rpx;
	}
	.weekday {
		font-size: 22rpx;
		font-weight: 500;
		color: #63636E;
		padding: 8rpx 0;
		text-align: center;
	}

	/* 日历网格 */
	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4rpx;
	}
	.calendar-day {
		/* 用 aspect-ratio 保证正圆，避免不同屏幕宽度下变形 */
		aspect-ratio: 1 / 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		border-radius: 50%;
		transition: all 0.15s;
		max-width: 88rpx;
		margin: 0 auto;
		width: 100%;
	}
	.calendar-day:active {
		transform: scale(0.92);
	}
	.calendar-day__num {
		font-size: 26rpx;
		font-weight: 500;
		color: #A1A1AA;
		line-height: 1;
	}
	.calendar-day__dot {
		width: 8rpx;
		height: 8rpx;
		border-radius: 50%;
		background: #34D399;
		position: absolute;
		bottom: 6rpx;
		left: 50%;
		transform: translateX(-50%);
	}
	.calendar-day.past .calendar-day__num {
		color: #4A4A52;
	}
	.calendar-day.today .calendar-day__num {
		color: #34D399;
		font-weight: 700;
	}
	.calendar-day.today {
		border: 2rpx solid rgba(52, 211, 153, 0.5);
	}
	.calendar-day.selected {
		background: #34D399;
		border-color: transparent;
	}
	.calendar-day.selected .calendar-day__num {
		color: #1A1A1E;
		font-weight: 600;
	}
	.calendar-day.selected .calendar-day__dot {
		display: none;
	}
	.calendar-day.empty {
		pointer-events: none;
	}

	/* 周视图 */
	.week-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 8rpx;
	}
	.week-grid .calendar-day {
		height: 120rpx;
		aspect-ratio: auto;
		border-radius: 24rpx;
	}
	.week-grid .calendar-day.selected {
		border-radius: 24rpx;
	}
	.weekday-label {
		font-size: 20rpx;
		color: #63636E;
		margin-bottom: 4rpx;
	}


	/* ===== 3. 待办列表 ===== */
	.todo-section {
		padding: 40rpx 40rpx 0;
	}
	.todo-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 28rpx;
	}
	.todo-header__title {
		font-size: 40rpx;
		font-weight: 700;
		color: #F5F5F7;
	}
	.todo-header__count {
		font-size: 26rpx;
		font-weight: 600;
		color: #34D399;
	}
	.todo-group {
		margin-bottom: 32rpx;
	}
	.todo-group__label {
		font-size: 22rpx;
		font-weight: 600;
		color: #63636E;
		margin-bottom: 20rpx;
		padding-left: 8rpx;
		letter-spacing: 2rpx;
		text-transform: uppercase;
	}

	/* 待办卡片 */
	.todo-card {
		background: #222226;
		border-radius: 28rpx;
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.25);
		padding: 28rpx 32rpx;
		margin-bottom: 20rpx;
		display: flex;
		align-items: flex-start;
		gap: 24rpx;
	}
	.todo-card:active {
		transform: scale(0.99);
	}
	.todo-card__checkbox {
		width: 44rpx;
		height: 44rpx;
		min-width: 44rpx;
		border-radius: 50%;
		border: 4rpx solid #34D399;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-top: 4rpx;
	}
	.todo-card__checkbox:active {
		transform: scale(0.9);
	}
	.check-icon {
		font-size: 24rpx;
		color: #1A1A1E;
		font-weight: bold;
		display: none;
	}
	.todo-card.completed .todo-card__checkbox {
		background: #34D399;
	}
	.todo-card.completed .check-icon {
		display: block;
	}
	.todo-card.completed .todo-card__title {
		text-decoration: line-through;
		color: #63636E;
	}
	.todo-card.completed .todo-card__time {
		color: #63636E;
	}
	.todo-card.completed {
		opacity: 0.7;
	}
	.todo-card__content {
		flex: 1;
		min-width: 0;
	}
	.todo-card__title-row {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 12rpx;
	}
	.todo-card__title {
		font-size: 30rpx;
		font-weight: 500;
		color: #F5F5F7;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.todo-card__priority {
		width: 16rpx;
		height: 16rpx;
		min-width: 16rpx;
		border-radius: 50%;
	}
	.todo-card__time-row {
		display: flex;
		align-items: center;
		gap: 12rpx;
		margin-bottom: 16rpx;
	}
	.time-icon {
		font-size: 24rpx;
		line-height: 1;
	}
	.todo-card__time {
		font-size: 22rpx;
		color: #A1A1AA;
		font-weight: 500;
	}
	.todo-card__tags {
		display: flex;
		gap: 12rpx;
	}
	.tag {
		padding: 8rpx 20rpx;
		border-radius: 9999rpx;
		font-size: 22rpx;
		font-weight: 500;
		line-height: 1.2;
	}

	/* 空状态 */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 100rpx 0;
		gap: 16rpx;
	}
	.empty-icon {
		font-size: 80rpx;
	}
	.empty-text {
		font-size: 30rpx;
		color: #A1A1AA;
	}
	.empty-sub {
		font-size: 24rpx;
		color: #63636E;
	}

	/* ===== 4. 浮动按钮 ===== */
	.fab-add {
		position: fixed;
		bottom: calc(200rpx + env(safe-area-inset-bottom));
		bottom: calc(200rpx + constant(safe-area-inset-bottom));
		right: 40rpx;
		width: 112rpx;
		height: 112rpx;
		border-radius: 50%;
		background: #34D399;
		box-shadow: 0 8rpx 32rpx rgba(52, 211, 153, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 101;
	}
	.fab-add:active {
		transform: scale(0.92);
	}
	.fab-icon {
		font-size: 56rpx;
		color: #1A1A1E;
		font-weight: 300;
		line-height: 1;
	}
</style>
