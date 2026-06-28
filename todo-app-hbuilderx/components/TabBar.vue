<template>
	<view class="tab-bar">
		<view class="tab-item" :class="{ active: active === 'home' }" @tap="goPage('home')">
			<!-- #ifdef H5 -->
			<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<rect x="3" y="4" width="18" height="18" rx="2" />
				<line x1="16" y1="2" x2="16" y2="6" />
				<line x1="8" y1="2" x2="8" y2="6" />
				<line x1="3" y1="10" x2="21" y2="10" />
			</svg>
			<!-- #endif -->
			<!-- #ifndef H5 -->
			<text class="tab-icon-text">📅</text>
			<!-- #endif -->
			<text class="tab-label">首页</text>
		</view>

		<view class="tab-item" :class="{ active: active === 'stats' }" @tap="goPage('stats')">
			<!-- #ifdef H5 -->
			<svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<rect x="4" y="12" width="4" height="8" rx="1" />
				<rect x="10" y="8" width="4" height="12" rx="1" />
				<rect x="16" y="4" width="4" height="16" rx="1" />
			</svg>
			<!-- #endif -->
			<!-- #ifndef H5 -->
			<text class="tab-icon-text">📊</text>
			<!-- #endif -->
			<text class="tab-label">统计</text>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'TabBar',
		props: {
			active: { type: String, default: 'home' }
		},
		methods: {
			goPage(page) {
				if (page === 'home') {
					uni.redirectTo({ url: '/pages/calendar-home/calendar-home' })
				} else if (page === 'stats') {
					uni.redirectTo({ url: '/pages/task-stats/task-stats' })
				}
			}
		}
	}
</script>

<style scoped>
	.tab-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 160rpx;
		background: #222226;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		justify-content: space-around;
		padding-bottom: 32rpx; /* 安全区 */
		z-index: 100;
	}
	.tab-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8rpx;
		color: #63636E;
		transition: color 0.2s;
	}
	.tab-item.active {
		color: #34D399;
	}
	/* #ifdef H5 */
	.tab-icon {
		width: 48rpx;
		height: 48rpx;
	}
	/* #endif */
	/* #ifndef H5 */
	.tab-icon-text {
		font-size: 48rpx;
		line-height: 48rpx;
	}
	/* #endif */
	.tab-label {
		font-size: 22rpx;
		font-weight: 500;
	}
</style>
