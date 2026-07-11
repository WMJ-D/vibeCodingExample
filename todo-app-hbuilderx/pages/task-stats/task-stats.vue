<template>
	<view class="page">
		<!-- 顶部标题 -->
		<view class="page-header">
			<view class="page-header__left">
				<text class="page-title">数据统计</text>
				<text class="page-subtitle">{{ subtitleText }}</text>
			</view>
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
					<view v-for="(item, i) in chartData" :key="i"
						class="bar-col" :class="{ today: item.isToday }">
						<text class="bar-count">{{ item.count }}</text>
						<view class="bar-wrapper">
							<view class="bar" :style="{ height: barHeight(item.count) + '%' }"></view>
						</view>
						<text class="bar-day-label">{{ item.label }}</text>
					</view>
				</view>
				<view class="bar-footer">
					<text class="bar-footer-text">每日完成任务数（共 {{ chartTotal }} 项）</text>
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
		<view class="archive-entry" @tap="goArchive">
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

				return { total: all.length, completed, pending, rate, byTag }
			},

			// ===== 周数据：最近7天 =====
			weekData() {
				const all = state.tasks
				const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
				const weekData = []
				const today = new Date()
				for (let i = 6; i >= 0; i--) {
					const d = new Date(today)
					d.setDate(today.getDate() - i)
					const dateStr = this.formatDate(d)
					const count = all.filter(t => t.date === dateStr && t.completed).length
					const dayIdx = (d.getDay() + 6) % 7
					weekData.push({ count, label: weekLabels[dayIdx], isToday: i === 0, dateStr })
				}
				return weekData
			},

			// ===== 月数据：最近30天（按周聚合为4个柱） =====
			monthData() {
				const all = state.tasks
				const today = new Date()
				const monthData = []

				for (let w = 3; w >= 0; w--) {
					const weekStart = new Date(today)
					weekStart.setDate(today.getDate() - (w * 7) - 6)
					const weekEnd = new Date(today)
					weekEnd.setDate(today.getDate() - w * 7)

					let count = 0
					for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
						const dateStr = this.formatDate(d)
						count += all.filter(t => t.date === dateStr && t.completed).length
					}

					const label = `${weekStart.getMonth() + 1}/${weekStart.getDate()}-${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
					monthData.push({ count, label, isToday: w === 0 })
				}
				return monthData
			},

			// ===== 当前图表数据（根据模式切换） =====
			chartData() {
				return this.chartMode === 'week' ? this.weekData : this.monthData
			},

			// ===== 图表最大值（用于归一化高度，最小基准=2） =====
			chartMax() {
				const counts = this.chartData.map(d => d.count)
				const maxVal = Math.max.apply(null, counts.concat([0]))
				return Math.max(maxVal, 2)
			},

			// ===== 图表总完成数 =====
			chartTotal() {
				return this.chartData.reduce((sum, d) => sum + d.count, 0)
			},

			// ===== 动态副标题 =====
			subtitleText() {
				if (this.chartMode === 'week') {
					const today = new Date()
					const start = new Date(today)
					start.setDate(today.getDate() - 6)
					return `本周概览 · ${this.formatShort(start)} - ${this.formatShort(today)}`
				} else {
					const today = new Date()
					const start = new Date(today)
					start.setDate(today.getDate() - 29)
					return `近30天概览 · ${this.formatShort(start)} - ${this.formatShort(today)}`
				}
			},

			ringDashArray() {
				const r = 56
				const circumference = 2 * Math.PI * r
				const filled = (this.stats.rate / 100) * circumference
				return filled + ' ' + circumference
			}
		},
		onShow() {
			// store 是全局响应式，数据自动更新
		},
		methods: {
			setChartMode(mode) {
				this.chartMode = mode
			},
			goArchive() {
				uni.navigateTo({ url: '/pages/archive/archive' })
			},
			barHeight(count) {
				if (count === 0) return 0
				return Math.max(Math.round((count / this.chartMax) * 100), count > 0 ? 8 : 0)
			},
			formatDate(d) {
				return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
			},
			formatShort(d) {
				return `${d.getMonth() + 1}.${d.getDate()}`
			}
		}
	}
</script>

<style scoped>
	.page {
		min-height: 100vh;
		background: #1A1A1E;
		/* 留足 TabBar + 安全区空间，避免归档入口被遮挡 */
		padding-bottom: calc(240rpx + env(safe-area-inset-bottom));
		padding-bottom: calc(240rpx + constant(safe-area-inset-bottom));
	}

	/* 顶部标题 - 加上顶部安全区 */
	.page-header {
		padding: calc(40rpx + env(safe-area-inset-top)) 32rpx 24rpx;
		padding: calc(40rpx + constant(safe-area-inset-top)) 32rpx 24rpx;
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
		margin: 0 32rpx 24rpx;
		background: #222226;
		border-radius: 28rpx;
		border: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 4rpx 24rpx rgba(0, 0, 0, 0.25);
	}

	/* 环形图 */
	.ring-card {
		padding: 40rpx 32rpx 36rpx;
		display: flex;
		align-items: center;
		gap: 32rpx;
	}
	.ring-chart-wrapper {
		position: relative;
		flex-shrink: 0;
		width: 140rpx;
		height: 140rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ring-fallback {
		width: 140rpx;
		height: 140rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.ring-inner {
		width: 100rpx;
		height: 100rpx;
		border-radius: 50%;
		background: #222226;
	}
	.ring-chart-label {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		width: 100%;
	}
	.percent-value {
		font-size: 36rpx;
		font-weight: 700;
		color: #34D399;
		display: block;
		line-height: 1;
	}
	.percent-text {
		font-size: 20rpx;
		color: #A1A1AA;
		margin-top: 4rpx;
		display: block;
	}
	.ring-stats {
		display: flex;
		gap: 40rpx;
		flex: 1;
		justify-content: center;
	}
	.ring-stat-item {
		text-align: center;
	}
	.stat-num {
		font-size: 40rpx;
		font-weight: 700;
		display: block;
		line-height: 1.2;
	}
	.stat-num.completed {
		color: #34D399;
	}
	.stat-num.pending {
		color: #F87171;
	}
	.stat-label {
		font-size: 22rpx;
		color: #A1A1AA;
		margin-top: 6rpx;
		display: block;
	}

	/* ===== 柱状图卡片 ===== */
	.bar-card {
		padding: 32rpx 28rpx 24rpx;
	}
	.bar-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 28rpx;
		padding: 0 4rpx;
	}
	.bar-title {
		font-size: 30rpx;
		font-weight: 600;
		color: #F5F5F7;
	}
	.bar-tab-switch {
		display: flex;
		background: #1A1A1E;
		border-radius: 12rpx;
		padding: 4rpx;
	}
	.tab-btn {
		padding: 10rpx 28rpx;
		border-radius: 10rpx;
		font-size: 24rpx;
		font-weight: 500;
		color: #63636E;
		transition: all 0.2s;
	}
	.tab-btn.active {
		background: #34D399;
		color: #1A1A1E;
		font-weight: 600;
	}

	.bar-chart-area {
		width: 100%;
	}
	.bar-columns {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		height: 280rpx;
		padding: 0 4rpx;
	}
	.bar-col {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		height: 100%;
		max-width: 100rpx;
		min-width: 0;
	}
	.bar-count {
		font-size: 22rpx;
		font-weight: 700;
		color: #34D399;
		margin-bottom: 8rpx;
		line-height: 1;
		/* 数字为 0 时变灰，避免视觉误导 */
		min-height: 22rpx;
	}
	.bar-wrapper {
		flex: 1;
		width: 100%;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		min-height: 4rpx;
	}
	.bar {
		width: 60%;
		min-height: 4rpx;
		background: linear-gradient(180deg, #34D399 0%, #2EB87B 100%);
		border-radius: 8rpx 8rpx 4rpx 4rpx;
		transition: height 0.4s ease;
	}
	.bar-col.today .bar {
		background: linear-gradient(180deg, #60A5FA 0%, #3B82F6 100%);
		box-shadow: 0 0 16rpx rgba(96, 165, 250, 0.35);
	}
	.bar-col.today .bar-count {
		color: #60A5FA;
	}
	.bar-day-label {
		font-size: 20rpx;
		color: #63636E;
		margin-top: 12rpx;
		white-space: nowrap;
		line-height: 1;
	}
	.bar-footer {
		text-align: center;
		margin-top: 20rpx;
		padding-top: 16rpx;
		border-top: 1px solid rgba(255, 255, 255, 0.04);
	}
	.bar-footer-text {
		font-size: 22rpx;
		color: #63636E;
	}

	/* 分类完成情况 */
	.category-card {
		padding: 32rpx 32rpx 36rpx;
	}
	.card-label-bold {
		font-size: 30rpx;
		font-weight: 600;
		color: #F5F5F7;
		display: block;
		margin-bottom: 28rpx;
	}
	.category-item {
		margin-bottom: 24rpx;
	}
	.category-item:last-child {
		margin-bottom: 0;
	}
	.category-item-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
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
		font-weight: 500;
	}
	.progress-track {
		height: 12rpx;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 9999rpx;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		border-radius: 9999rpx;
		background: #34D399;
		transition: width 0.4s ease;
	}

	/* 归档入口 - 卡片样式，醒目可见，底部留足 TabBar 空间 */
	.archive-entry {
		margin: 8rpx 32rpx 40rpx;
		background: #222226;
		border: 1px solid rgba(52, 211, 153, 0.2);
		border-radius: 24rpx;
		padding: 32rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
	}
	.archive-entry:active {
		opacity: 0.7;
		transform: scale(0.99);
	}
	.archive-link {
		font-size: 28rpx;
		color: #34D399;
		font-weight: 600;
	}
</style>
