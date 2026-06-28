<template>
	<view class="page">
		<!-- 顶部标题 -->
		<view class="page-header">
			<view class="page-header__left">
				<text class="page-title">数据统计</text>
				<text class="page-subtitle">本周概览 · 6.22 - 6.28</text>
			</view>
			<SystemCapsule />
		</view>

		<!-- 环形图卡片 -->
		<view class="card ring-card">
			<view class="ring-chart-wrapper">
				<!-- #ifdef H5 -->
				<svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="70" cy="70" r="56" stroke="#2A2A2F" stroke-width="10" fill="none" />
					<circle cx="70" cy="70" r="56" stroke="#34D399" stroke-width="10" fill="none"
						stroke-linecap="round" :stroke-dasharray="ringDashArray"
						transform="rotate(-90 70 70)" />
				</svg>
				<!-- #endif -->
				<!-- #ifndef H5 -->
				<view class="ring-fallback" :style="{ background: 'conic-gradient(#34D399 ' + (stats.rate * 3.6) + 'deg, #2A2A2F 0deg)' }">
					<view class="ring-inner"></view>
				</view>
				<!-- #endif -->
				<view class="ring-chart-label">
					<text class="percent-value">{{ stats.rate }}%</text>
					<text class="percent-text">完成率</text>
				</view>
			</view>
			<view class="ring-stats">
				<view class="ring-stat-item">
					<text class="stat-num completed">{{ stats.completed }}</text>
					<text class="stat-label">已完成</text>
				</view>
				<view class="ring-stat-item">
					<text class="stat-num pending">{{ stats.pending }}</text>
					<text class="stat-label">未完成</text>
				</view>
			</view>
		</view>

		<!-- 柱状图卡片 -->
		<view class="card bar-card">
			<view class="bar-card-header">
				<text class="bar-title">任务完成趋势</text>
				<view class="bar-tab-switch">
					<view class="tab-btn" :class="{ active: chartMode === 'week' }" @tap="setChartMode('week')">周</view>
					<view class="tab-btn" :class="{ active: chartMode === 'month' }" @tap="setChartMode('month')">月</view>
				</view>
			</view>
			<view class="bar-chart-area">
				<view class="bar-columns">
					<view v-for="(item, i) in stats.weekData" :key="i"
						class="bar-col" :class="{ today: item.isToday }">
						<view class="bar" :style="{ height: (item.count / stats.maxWeek * 100) + '%' }"></view>
						<text class="bar-day-label">{{ item.label }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 分类完成情况 -->
		<view class="card category-card">
			<text class="card-label-bold">分类完成情况</text>
			<view v-for="tag in TAGS" :key="tag.name" class="category-item">
				<view class="category-item-header">
					<text class="cat-name">{{ tag.name }}</text>
					<text class="cat-count">{{ (stats.byTag[tag.name] && stats.byTag[tag.name].done) || 0 }}/{{ (stats.byTag[tag.name] && stats.byTag[tag.name].total) || 0 }}</text>
				</view>
				<view class="progress-track">
					<view class="progress-fill" :style="{ width: ((stats.byTag[tag.name] && stats.byTag[tag.name].rate) || 0) + '%' }"></view>
				</view>
			</view>
		</view>

		<!-- 归档入口 -->
		<view class="archive-entry">
			<text class="archive-link">查看已归档任务 ›</text>
		</view>

		<!-- 底部Tab栏 -->
		<TabBar active="stats" />
	</view>
</template>

<script>
	import TabBar from '@/components/TabBar.vue'
	import SystemCapsule from '@/components/SystemCapsule.vue'
	import { state, TAGS } from '@/store/todo.js'

	export default {
		components: { TabBar, SystemCapsule },
		data() {
			return {
				state,
				TAGS,
				chartMode: 'week'
			}
		},
		computed: {
			stats() {
				const all = state.tasks
				const completed = all.filter(t => t.completed).length
				const pending = all.filter(t => !t.completed).length
				const rate = all.length > 0 ? Math.round((completed / all.length) * 100) : 0

				// 按标签分组统计
				const byTag = {}
				TAGS.forEach(tag => {
					const tagTasks = all.filter(t => t.tag === tag.name)
					const tagDone = tagTasks.filter(t => t.completed).length
					byTag[tag.name] = {
						total: tagTasks.length,
						done: tagDone,
						rate: tagTasks.length > 0 ? Math.round((tagDone / tagTasks.length) * 100) : 0,
						color: tag.color,
						bg: tag.bg
					}
				})

				// 按星期统计（最近7天）
				const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
				const weekData = []
				const today = new Date()
				for (let i = 6; i >= 0; i--) {
					const d = new Date(today)
					d.setDate(d.getDate() - i)
					const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
					const count = all.filter(t => t.date === dateStr && t.completed).length
					const dayIdx = (d.getDay() + 6) % 7
					weekData.push({ count, label: weekLabels[dayIdx], isToday: i === 0 })
				}
				const maxWeek = Math.max.apply(null, weekData.map(w => w.count).concat([1]))

				return { total: all.length, completed, pending, rate, byTag, weekData, maxWeek }
			},
			ringDashArray() {
				const r = 56
				const circumference = 2 * Math.PI * r
				const filled = (this.stats.rate / 100) * circumference
				return filled + ' ' + circumference
			}
		},
		onShow() {
			// 数据自动响应
		},
		methods: {
			setChartMode(mode) {
				this.chartMode = mode
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: #1A1A1E;
		padding-bottom: 200rpx;
	}

	/* 顶部标题 */
	.page-header {
		padding: 40rpx 32rpx 24rpx;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
	}
	.page-header__left {
		flex: 1;
	}
	.page-title {
		font-size: 48rpx;
		font-weight: 700;
		color: #F5F5F7;
		line-height: 1.3;
		display: block;
	}
	.page-subtitle {
		font-size: 26rpx;
		color: #A1A1AA;
		margin-top: 8rpx;
		display: block;
	}

	/* 通用卡片 */
	.card {
		margin: 0 32rpx 28rpx;
		background: #222226;
		border-radius: 28rpx;
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.25);
	}

	/* 环形图 */
	.ring-card {
		padding: 48rpx 32rpx 40rpx;
		text-align: center;
	}
	.ring-chart-wrapper {
		position: relative;
		display: inline-block;
	}
	.ring-chart-label {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
	}
	.percent-value {
		font-size: 56rpx;
		font-weight: 700;
		color: #F5F5F7;
		line-height: 1;
		display: block;
	}
	.percent-text {
		font-size: 24rpx;
		color: #A1A1AA;
		margin-top: 4rpx;
		display: block;
	}

	/* 非H5环形图兜底 */
	.ring-fallback {
		width: 280rpx;
		height: 280rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ring-inner {
		width: 224rpx;
		height: 224rpx;
		border-radius: 50%;
		background: #222226;
	}

	/* 环形图统计 */
	.ring-stats {
		display: flex;
		justify-content: center;
		gap: 64rpx;
		margin-top: 40rpx;
	}
	.ring-stat-item {
		display: flex;
		align-items: center;
		gap: 12rpx;
	}
	.stat-num {
		font-size: 34rpx;
		font-weight: 700;
	}
	.stat-num.completed {
		color: #34D399;
	}
	.stat-num.pending {
		color: #F87171;
	}
	.stat-label {
		font-size: 26rpx;
		color: #A1A1AA;
	}

	/* 柱状图 */
	.bar-card {
		padding: 32rpx;
	}
	.bar-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 32rpx;
	}
	.bar-title {
		font-size: 30rpx;
		font-weight: 600;
		color: #F5F5F7;
	}
	.bar-tab-switch {
		display: flex;
		background: #2A2A2F;
		border-radius: 12rpx;
		padding: 4rpx;
	}
	.tab-btn {
		font-size: 22rpx;
		font-weight: 500;
		color: #63636E;
		padding: 8rpx 20rpx;
		border-radius: 8rpx;
		transition: all 0.2s;
	}
	.tab-btn.active {
		background: #34D399;
		color: #1A1A1E;
	}
	.bar-chart-area {
		height: 240rpx;
		display: flex;
		align-items: flex-end;
		padding: 0 8rpx;
	}
	.bar-columns {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		width: 100%;
		height: 100%;
	}
	.bar-col {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		gap: 12rpx;
	}
	.bar {
		width: 40rpx;
		border-radius: 8rpx 8rpx 0 0;
		background: #34D399;
		opacity: 0.55;
		min-height: 8rpx;
		transition: height 0.3s;
	}
	.bar-col.today .bar {
		opacity: 1;
		box-shadow: 0 0 16rpx rgba(52, 211, 153, 0.4);
	}
	.bar-day-label {
		font-size: 20rpx;
		color: #63636E;
		margin-top: 8rpx;
	}
	.bar-col.today .bar-day-label {
		color: #34D399;
		font-weight: 600;
	}

	/* 分类完成 */
	.category-card {
		padding: 32rpx;
	}
	.card-label-bold {
		font-size: 30rpx;
		font-weight: 600;
		color: #F5F5F7;
		margin-bottom: 32rpx;
		display: block;
	}
	.category-item {
		margin-bottom: 32rpx;
	}
	.category-item:last-child {
		margin-bottom: 0;
	}
	.category-item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12rpx;
	}
	.cat-name {
		font-size: 28rpx;
		font-weight: 500;
		color: #F5F5F7;
	}
	.cat-count {
		font-size: 24rpx;
		color: #A1A1AA;
	}
	.progress-track {
		width: 100%;
		height: 12rpx;
		background: #2A2A2F;
		border-radius: 6rpx;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: #34D399;
		border-radius: 6rpx;
		transition: width 0.3s;
	}

	/* 归档入口 */
	.archive-entry {
		padding: 16rpx 32rpx 32rpx;
		text-align: center;
	}
	.archive-link {
		font-size: 26rpx;
		color: #63636E;
	}
</style>
