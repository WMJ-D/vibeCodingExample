<template>
	<view class="page">
		<!-- 顶部导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @tap="goBack">
				<text class="back-icon">‹</text>
			</view>
			<text class="nav-title">新建待办</text>
			<SystemCapsule />
		</view>

		<!-- 可滚动表单 -->
		<scroll-view scroll-y class="form-scroll">
			<!-- 任务标题输入 -->
			<input class="title-input" type="text" placeholder="输入任务标题..."
				v-model="title" :placeholder-style="'color: #63636E'" />

			<!-- 日期与时间卡片 -->
			<view class="form-card">
				<text class="card-label">日期与时间</text>
				<!-- 日期选择行 -->
				<view class="date-time-row" @tap="pickDate">
					<view class="row-left">
						<view class="row-icon"><text class="icon-emoji">📅</text></view>
						<text class="row-text">{{ dateLabel || '选择日期' }}</text>
					</view>
					<text class="row-arrow">›</text>
				</view>
				<!-- 时间选择行 -->
				<view class="date-time-row" @tap="pickTime">
					<view class="row-left">
						<view class="row-icon"><text class="icon-emoji">🕐</text></view>
						<text class="row-text">{{ time }}</text>
					</view>
					<text class="row-arrow">›</text>
				</view>
			</view>

			<!-- 标签选择 -->
			<view class="form-card">
				<text class="card-label">标签</text>
				<view class="tag-list">
					<view v-for="tag in TAGS" :key="tag.name"
						class="tag-item" :class="{ selected: selectedTag === tag.name }"
						@tap="selectTag(tag.name)">{{ tag.name }}</view>
				</view>
			</view>

			<!-- 优先级选择 -->
			<view class="form-card">
				<text class="card-label">优先级</text>
				<view class="priority-list">
					<view v-for="(p, key) in PRIORITIES" :key="key"
						class="priority-item" :class="{ selected: selectedPriority === key }"
						@tap="selectPriority(key)">
						<view class="priority-dot" :style="{ background: p.color }"></view>
						<text class="priority-text">{{ p.label }}</text>
					</view>
				</view>
			</view>

			<!-- 定时提醒 -->
			<view class="form-card">
				<view class="reminder-header">
					<text class="reminder-label">定时提醒</text>
					<view class="toggle-switch" :class="{ active: reminderEnabled }" @tap="toggleReminder">
						<view class="toggle-knob"></view>
					</view>
				</view>
				<view v-if="reminderEnabled" class="reminder-detail">
					<text class="reminder-icon">🔔</text>
					<text class="reminder-text">提前15分钟提醒</text>
				</view>
			</view>
		</scroll-view>

		<!-- 底部保存按钮 -->
		<view class="save-bar">
			<view class="save-btn" @tap="handleSave">保存任务</view>
		</view>
	</view>
</template>

<script>
	import SystemCapsule from '@/components/SystemCapsule.vue'
	import { addTask, TAGS, PRIORITIES } from '@/store/todo.js'

	export default {
		components: { SystemCapsule },
		data() {
			return {
				TAGS,
				PRIORITIES,
				title: '',
				date: '',
				time: '15:00',
				selectedTag: '工作',
				selectedPriority: 'medium',
				reminderEnabled: true,
				dateLabel: ''
			}
		},
		onLoad(options) {
			if (options && options.date) {
				this.date = options.date
			} else {
				const d = new Date()
				this.date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
			}
			this.updateDateLabel()
		},
		methods: {
			updateDateLabel() {
				if (!this.date) return
				const parts = this.date.split('-')
				this.dateLabel = `${parts[0]}年${parseInt(parts[1])}月${parseInt(parts[2])}日`
			},
			pickDate() {
				const self = this
				uni.showActionSheet({
					itemList: ['今天', '明天', '后天', '自定义'],
					success: function(res) {
						const now = new Date()
						if (res.tapIndex < 3) {
							now.setDate(now.getDate() + res.tapIndex)
							self.date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
							self.updateDateLabel()
						} else {
							// #ifdef H5
							const input = document.createElement('input')
							input.type = 'date'
							input.value = self.date
							input.onchange = function(e) {
								if (e.target.value) {
									self.date = e.target.value
									self.updateDateLabel()
								}
							}
							input.click()
							// #endif
							// #ifndef H5
							uni.showModal({
								title: '输入日期',
								content: '格式: 2026-06-28',
								success: function(r) {
									if (r.confirm && r.content) {
										self.date = r.content
										self.updateDateLabel()
									}
								}
							})
							// #endif
						}
					}
				})
			},
			pickTime() {
				const self = this
				// #ifdef H5
				const input = document.createElement('input')
				input.type = 'time'
				input.value = this.time
				input.onchange = function(e) {
					if (e.target.value) {
						self.time = e.target.value
					}
				}
				input.click()
				// #endif
				// #ifndef H5
				uni.showModal({
					title: '输入时间',
					content: '格式: 15:00',
					success: function(r) {
						if (r.confirm && r.content) {
							self.time = r.content
						}
					}
				})
				// #endif
			},
			selectTag(tagName) {
				this.selectedTag = tagName
			},
			selectPriority(p) {
				this.selectedPriority = p
			},
			toggleReminder() {
				this.reminderEnabled = !this.reminderEnabled
			},
			handleSave() {
				if (!this.title.trim()) {
					uni.showToast({ title: '请输入任务标题', icon: 'none' })
					return
				}
				addTask({
					title: this.title.trim(),
					date: this.date,
					time: this.time,
					endTime: '',
					tag: this.selectedTag,
					priority: this.selectedPriority,
					completed: false,
					reminder: this.reminderEnabled
				})
				uni.showToast({ title: '保存成功', icon: 'success' })
				setTimeout(function() {
					uni.navigateBack()
				}, 800)
			},
			goBack() {
				uni.navigateBack()
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: #1A1A1E;
	}

	/* 导航栏 */
	.nav-bar {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 104rpx;
		padding: 0 32rpx;
		background: #1A1A1E;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.nav-back {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 72rpx;
		height: 72rpx;
		border-radius: 20rpx;
	}
	.back-icon {
		font-size: 44rpx;
		color: #F5F5F7;
	}
	.nav-title {
		font-size: 34rpx;
		font-weight: 600;
		color: #F5F5F7;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	/* 表单区域 */
	.form-scroll {
		padding: 40rpx 32rpx 200rpx;
		height: calc(100vh - 104rpx);
	}

	/* 标题输入 */
	.title-input {
		width: 100%;
		background: #222226;
		border: 3rpx solid rgba(255, 255, 255, 0.1);
		border-radius: 24rpx;
		padding: 32rpx;
		font-size: 40rpx;
		font-weight: 600;
		color: #F5F5F7;
		margin-bottom: 40rpx;
	}

	/* 通用卡片 */
	.form-card {
		background: #222226;
		border-radius: 28rpx;
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.25);
		padding: 32rpx;
		margin-bottom: 32rpx;
	}
	.card-label {
		font-size: 26rpx;
		font-weight: 600;
		color: #A1A1AA;
		letter-spacing: 1rpx;
		margin-bottom: 28rpx;
		display: block;
	}

	/* 日期时间行 */
	.date-time-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24rpx 0;
	}
	.date-time-row + .date-time-row {
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.row-left {
		display: flex;
		align-items: center;
		gap: 24rpx;
	}
	.row-icon {
		width: 72rpx;
		height: 72rpx;
		border-radius: 20rpx;
		background: #2A2A2F;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.icon-emoji {
		font-size: 36rpx;
	}
	.row-text {
		font-size: 30rpx;
		font-weight: 500;
		color: #F5F5F7;
	}
	.row-arrow {
		font-size: 32rpx;
		color: #63636E;
	}

	/* 标签列表 */
	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 16rpx;
	}
	.tag-item {
		padding: 16rpx 36rpx;
		border-radius: 9999rpx;
		font-size: 28rpx;
		font-weight: 500;
		background: transparent;
		border: 3rpx solid rgba(255, 255, 255, 0.1);
		color: #A1A1AA;
		transition: all 0.2s;
	}
	.tag-item.selected {
		background: #34D399;
		border-color: #34D399;
		color: #1A1A1E;
		font-weight: 600;
	}

	/* 优先级 */
	.priority-list {
		display: flex;
		gap: 20rpx;
	}
	.priority-item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16rpx;
		padding: 28rpx 16rpx;
		border-radius: 24rpx;
		background: #2A2A2F;
		border: 3rpx solid rgba(255, 255, 255, 0.06);
		transition: all 0.2s;
	}
	.priority-item.selected {
		border-color: #34D399;
		box-shadow: 0 0 0 4rpx rgba(52, 211, 153, 0.15);
	}
	.priority-dot {
		width: 20rpx;
		height: 20rpx;
		border-radius: 50%;
	}
	.priority-text {
		font-size: 26rpx;
		font-weight: 500;
		color: #A1A1AA;
	}
	.priority-item.selected .priority-text {
		color: #F5F5F7;
		font-weight: 600;
	}

	/* 提醒开关 */
	.reminder-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.reminder-label {
		font-size: 30rpx;
		font-weight: 500;
		color: #F5F5F7;
	}
	.toggle-switch {
		width: 96rpx;
		height: 56rpx;
		background: #2A2A2F;
		border-radius: 9999rpx;
		position: relative;
		border: 1px solid rgba(255, 255, 255, 0.1);
		transition: all 0.2s;
	}
	.toggle-switch.active {
		background: #34D399;
		border-color: #34D399;
	}
	.toggle-knob {
		width: 44rpx;
		height: 44rpx;
		background: white;
		border-radius: 50%;
		position: absolute;
		top: 4rpx;
		left: 4rpx;
		transition: transform 0.2s;
		box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.2);
	}
	.toggle-switch.active .toggle-knob {
		transform: translateX(40rpx);
	}
	.reminder-detail {
		margin-top: 24rpx;
		padding-top: 24rpx;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		gap: 12rpx;
	}
	.reminder-icon {
		font-size: 28rpx;
	}
	.reminder-text {
		font-size: 28rpx;
		color: #A1A1AA;
	}

	/* 底部保存按钮 */
	.save-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 32rpx 32rpx 40rpx;
		background: linear-gradient(to bottom, transparent 0%, #1A1A1E 30%);
		z-index: 100;
	}
	.save-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100rpx;
		background: #34D399;
		color: #1A1A1E;
		font-size: 32rpx;
		font-weight: 600;
		border-radius: 32rpx;
		box-shadow: 0 8rpx 32rpx rgba(52, 211, 153, 0.3);
	}
	.save-btn:active {
		transform: scale(0.98);
	}
</style>
