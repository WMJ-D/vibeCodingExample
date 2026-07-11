<template>
	<view class="page">
		<!-- 顶部导航栏 -->
		<view class="nav-bar">
			<view class="nav-back" @tap="goBack">
				<text class="back-icon">‹</text>
			</view>
			<text class="nav-title">已归档任务</text>
		</view>

		<!-- 统计概览 -->
		<view class="archive-summary">
			<view class="summary-item">
				<text class="summary-num">{{ completedTasks.length }}</text>
				<text class="summary-label">已完成</text>
			</view>
			<view class="summary-divider"></view>
			<view class="summary-item">
				<text class="summary-num">{{ archivedTasks.length }}</text>
				<text class="summary-label">已归档</text>
			</view>
			<view class="summary-divider"></view>
			<view class="summary-item">
				<text class="summary-num highlight">{{ totalDoneCount }}</text>
				<text class="summary-label">累计完成</text>
			</view>
		</view>

		<!-- Tab 切换 -->
		<view class="archive-tabs">
			<view class="archive-tab" :class="{ active: activeTab === 'completed' }" @tap="activeTab = 'completed'">
				已完成（{{ completedTasks.length }}）
			</view>
			<view class="archive-tab" :class="{ active: activeTab === 'archived' }" @tap="activeTab = 'archived'">
				已归档（{{ archivedTasks.length }}）
			</view>
		</view>

		<!-- 任务列表（用 page 原生滚动，避免 scroll-view 高度问题） -->
		<view class="task-list-scroll">
			<!-- 已完成列表 -->
			<view v-if="activeTab === 'completed'">
				<view v-if="completedTasks.length" v-for="task in completedTasks" :key="task.id"
					class="archive-card">
					<view class="card-left">
						<view class="check-circle done">
							<text class="check-icon">✓</text>
						</view>
					</view>
					<view class="card-body">
						<view class="card-title-row">
							<text class="card-title">{{ task.title }}</text>
							<view class="card-actions">
								<view class="action-btn restore-btn" @tap="handleRestore(task.id)">恢复</view>
								<view class="action-btn archive-btn" @tap="handleArchive(task.id)">归档</view>
								<view class="action-btn delete-btn" @tap="handleDelete(task.id)">删除</view>
							</view>
						</view>
						<view class="card-meta">
							<text class="meta-date">📅 {{ task.date }}</text>
							<text class="meta-time" v-if="task.time">🕐 {{ task.time }}</text>
							<text class="meta-tag" :style="getTagStyle(task.tag)">{{ task.tag }}</text>
							<view class="meta-priority" :style="{ background: getPriorityColor(task.priority) }"></view>
						</view>
					</view>
				</view>
				<view v-else class="empty-state">
					<text class="empty-icon">✅</text>
					<text class="empty-text">暂无已完成的任务</text>
					<text class="empty-sub">完成任务后会显示在这里</text>
				</view>
			</view>

			<!-- 已归档列表 -->
			<view v-if="activeTab === 'archived'">
				<view v-if="archivedTasks.length" v-for="task in archivedTasks" :key="task.id"
					class="archive-card archived">
					<view class="card-left">
						<view class="check-circle archived-circle">
							<text class="check-icon">📦</text>
						</view>
					</view>
					<view class="card-body">
						<view class="card-title-row">
							<text class="card-title">{{ task.title }}</text>
							<view class="card-actions">
								<view class="action-btn restore-btn" @tap="handleUnarchive(task.id)">恢复</view>
								<view class="action-btn delete-btn" @tap="handleDeleteArchived(task.id)">彻底删除</view>
							</view>
						</view>
						<view class="card-meta">
							<text class="meta-date">📅 {{ task.date }}</text>
							<text class="meta-time" v-if="task.time">🕐 {{ task.time }}</text>
							<text class="meta-tag" :style="getTagStyle(task.tag)">{{ task.tag }}</text>
							<view class="meta-priority" :style="{ background: getPriorityColor(task.priority) }"></view>
						</view>
					</view>
				</view>
				<view v-else class="empty-state">
					<text class="empty-icon">📦</text>
					<text class="empty-text">暂无已归档的任务</text>
					<text class="empty-sub">从「已完成」列表中归档任务后会显示在这里</text>
				</view>
			</view>
		  <!-- 底部操作栏 -->
		  <view v-if="activeTab === 'completed' && completedTasks.length" class="bottom-bar">
		  	<view class="batch-btn" @tap="handleArchiveAll">全部归档</view>
		  </view>
		  <view v-if="activeTab === 'archived' && archivedTasks.length" class="bottom-bar">
		  	<view class="batch-btn danger" @tap="handleClearArchived">清空归档</view>
		  </view>
		</view>

	

		<!-- 底部Tab栏 -->
		<!-- <TabBar active="stats" /> -->
	</view>
</template>

<script>
	import TabBar from '@/components/TabBar.vue'
	import { state, TAGS, PRIORITIES, getCompletedTasks, getArchivedTasks, restoreTask, archiveTask, deleteTask, unarchiveTask, deleteArchivedTask, archiveAllCompleted, clearAllArchived } from '@/store/todo.js'

	export default {
		components: { TabBar },
		data() {
			return {
				state,
				TAGS,
				PRIORITIES,
				activeTab: 'completed'
			}
		},
		computed: {
			completedTasks() {
				return getCompletedTasks()
			},
			archivedTasks() {
				return getArchivedTasks()
			},
			totalDoneCount() {
				return this.completedTasks.length + this.archivedTasks.length
			}
		},
		methods: {
			goBack() {
				uni.navigateBack()
			},
			getTagStyle(tagName) {
				const tag = this.TAGS.find(t => t.name === tagName)
				if (!tag) return {}
				return { color: tag.color, background: tag.bg }
			},
			getPriorityColor(priority) {
				return this.PRIORITIES[priority]?.color || '#63636E'
			},
			handleRestore(id) {
				restoreTask(id)
				uni.showToast({ title: '已恢复到待办列表', icon: 'success' })
			},
			handleArchive(id) {
				archiveTask(id)
				uni.showToast({ title: '已归档', icon: 'success' })
			},
			handleDelete(id) {
				uni.showModal({
					title: '确认删除',
					content: '删除后无法恢复，确定要删除这个任务吗？',
					success: (res) => {
						if (res.confirm) {
							deleteTask(id)
							uni.showToast({ title: '已删除', icon: 'success' })
						}
					}
				})
			},
			handleUnarchive(id) {
				unarchiveTask(id)
				uni.showToast({ title: '已恢复为已完成', icon: 'success' })
			},
			handleDeleteArchived(id) {
				uni.showModal({
					title: '彻底删除',
					content: '此操作不可撤销，确定要彻底删除吗？',
					success: (res) => {
						if (res.confirm) {
							deleteArchivedTask(id)
							uni.showToast({ title: '已彻底删除', icon: 'success' })
						}
					}
				})
			},
			handleArchiveAll() {
				uni.showModal({
					title: '全部归档',
					content: `将 ${this.completedTasks.length} 个已完成任务全部移入归档？`,
					success: (res) => {
						if (res.confirm) {
							const count = archiveAllCompleted()
							uni.showToast({ title: `已归档 ${count} 个任务`, icon: 'success' })
						}
					}
				})
			},
			handleClearArchived() {
				uni.showModal({
					title: '清空归档',
					content: `将永久删除 ${this.archivedTasks.length} 个归档任务，不可恢复？`,
					success: (res) => {
						if (res.confirm) {
							clearAllArchived()
							uni.showToast({ title: '已清空归档', icon: 'success' })
						}
					}
				})
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: #1A1A1E;
		overflow: auto;
		-webkit-overflow-scrolling: touch;
		/* 无 TabBar，只需留出底部按钮空间 + 安全区 */
		padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(160rpx + constant(safe-area-inset-bottom));
	}

	/* 导航栏 - 加上顶部安全区 */
	.nav-bar {
		display: flex;
		align-items: center;
		padding: calc(24rpx + env(safe-area-inset-top)) 40rpx 16rpx;
		padding: calc(24rpx + constant(safe-area-inset-top)) 40rpx 16rpx;
		min-height: 100rpx;
		gap: 16rpx;
	}
	.nav-back {
		width: 72rpx;
		height: 72rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 8rpx;
		border-radius: 50%;
	}
	.nav-back:active {
		background: rgba(255, 255, 255, 0.06);
	}
	.back-icon {
		font-size: 52rpx;
		color: #F5F5F7;
		line-height: 1;
	}
	.nav-title {
		flex: 1;
		text-align: left;
		font-size: 36rpx;
		font-weight: 600;
		color: #F5F5F7;
		margin-left: 8rpx;
	}

	/* 统计概览 */
	.archive-summary {
		margin: 24rpx 32rpx 0;
		display: flex;
		align-items: center;
		background: #222226;
		border-radius: 24rpx;
		border: 1px solid rgba(255, 255, 255, 0.06);
		padding: 32rpx 0;
		gap: 4rpx;
	}
	.summary-item {
		flex: 1;
		text-align: center;
		padding: 0 12rpx;
	}
	.summary-num {
		font-size: 44rpx;
		font-weight: 700;
		color: #F5F5F7;
		display: block;
		line-height: 1.3;
	}
	.summary-num.highlight {
		color: #34D399;
	}
	.summary-label {
		font-size: 24rpx;
		color: #A1A1AA;
		margin-top: 10rpx;
		display: block;
		letter-spacing: 1rpx;
	}
	.summary-divider {
		width: 1px;
		height: 64rpx;
		background: rgba(255, 255, 255, 0.08);
		flex-shrink: 0;
	}

	/* Tab 切换 */
	.archive-tabs {
		margin: 28rpx 32rpx 0;
		display: flex;
		background: #222226;
		border-radius: 20rpx;
		padding: 8rpx;
		border: 1px solid rgba(255, 255, 255, 0.06);
		gap: 8rpx;
	}
	.archive-tab {
		flex: 1;
		text-align: center;
		padding: 22rpx 0;
		border-radius: 14rpx;
		font-size: 28rpx;
		font-weight: 500;
		color: #63636E;
		transition: all 0.2s;
	}
	.archive-tab:active {
		opacity: 0.7;
	}
	.archive-tab.active {
		background: #34D399;
		color: #1A1A1E;
		font-weight: 600;
	}

	/* 列表区域 */
	.task-list-scroll {
		margin-top: 24rpx;
		padding: 0 8rpx;
		box-sizing: border-box;
	}

	/* 归档卡片 */
	.archive-card {
		margin: 0 24rpx 24rpx;
		background: #222226;
		border-radius: 24rpx;
		border: 1px solid rgba(255, 255, 255, 0.06);
		padding: 28rpx 28rpx;
		display: flex;
		align-items: flex-start;
		gap: 24rpx;
	}
	.archive-card.archived {
		opacity: 0.75;
		border-color: rgba(52, 211, 153, 0.15);
	}

	.card-left {
		flex-shrink: 0;
		padding-top: 4rpx;
	}
	.check-circle {
		width: 52rpx;
		height: 52rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.check-circle.done {
		background: #34D399;
	}
	.archived-circle {
		background: rgba(52, 211, 153, 0.08);
		border: 2px solid #34D399;
	}
	.check-icon {
		font-size: 26rpx;
		color: #1A1A1E;
		line-height: 1;
	}

	.card-body {
		flex: 1;
		min-width: 0;
	}
	.card-title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		margin-bottom: 16rpx;
	}
	.card-title {
		font-size: 30rpx;
		font-weight: 500;
		color: #F5F5F7;
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		line-height: 1.4;
	}
	.archive-card.archived .card-title {
		color: #A1A1AA;
	}

	/* 操作按钮组 - 横向排列，自适应换行 */
	.card-actions {
		display: flex;
		gap: 12rpx;
		flex-shrink: 0;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.action-btn {
		padding: 10rpx 20rpx;
		border-radius: 10rpx;
		font-size: 22rpx;
		font-weight: 600;
		letter-spacing: 1rpx;
		transition: opacity 0.15s;
		line-height: 1.2;
	}
	.action-btn:active {
		opacity: 0.65;
	}
	.restore-btn {
		background: rgba(96, 165, 250, 0.15);
		color: #60A5FA;
	}
	.archive-btn {
		background: rgba(168, 85, 247, 0.15);
		color: #A855F7;
	}
	.delete-btn {
		background: rgba(248, 113, 113, 0.15);
		color: #F87171;
	}

	/* 卡片元信息 */
	.card-meta {
		display: flex;
		align-items: center;
		gap: 16rpx;
		flex-wrap: wrap;
		margin-top: 6rpx;
	}
	.meta-date, .meta-time {
		font-size: 24rpx;
		color: #63636E;
		font-weight: 500;
		line-height: 1;
	}
	.meta-tag {
		padding: 6rpx 18rpx;
		border-radius: 9999rpx;
		font-size: 22rpx;
		font-weight: 600;
		line-height: 1.2;
	}
	.meta-priority {
		width: 14rpx;
		height: 14rpx;
		border-radius: 50%;
		flex-shrink: 0;
	}

	/* 空状态 */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 120rpx 40rpx 80rpx;
		gap: 20rpx;
	}
	.empty-icon {
		font-size: 96rpx;
	}
	.empty-text {
		font-size: 32rpx;
		color: #A1A1AA;
		font-weight: 500;
	}
	.empty-sub {
		font-size: 26rpx;
		color: #63636E;
	}

	/* 底部操作栏 - 无 TabBar，贴底显示（仅留安全区），不拦截上层点击 */
	.bottom-bar {
		position: fixed;
		bottom: calc(24rpx + env(safe-area-inset-bottom));
		bottom: calc(24rpx + constant(safe-area-inset-bottom));
		left: 32rpx;
		right: 32rpx;
		z-index: 101;
		pointer-events: none;
	}
	.batch-btn {
		background: #34D399;
		color: #1A1A1E;
		text-align: center;
		padding: 28rpx 0;
		border-radius: 20rpx;
		font-size: 30rpx;
		font-weight: 700;
		box-shadow: 0 8rpx 32rpx rgba(52, 211, 153, 0.25);
		letter-spacing: 2rpx;
		pointer-events: auto;
	}
	.batch-btn:active {
		transform: scale(0.98);
		opacity: 0.9;
	}
	.batch-btn.danger {
		background: #F87171;
		box-shadow: 0 8rpx 32rpx rgba(248, 113, 113, 0.25);
	}
</style>
