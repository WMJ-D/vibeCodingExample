<template>
	<!-- H5端：直接渲染内联SVG -->
	<!-- #ifdef H5 -->
	<span class="icon-wrap" :style="{ width: size, height: size }">
		<svg v-if="name === 'calendar'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
			:stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round">
			<rect x="3" y="4" width="18" height="18" rx="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
		<svg v-else-if="name === 'bar-chart'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
			:stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round">
			<rect x="4" y="12" width="4" height="8" rx="1" />
			<rect x="10" y="8" width="4" height="12" rx="1" />
			<rect x="16" y="4" width="4" height="16" rx="1" />
		</svg>
		<svg v-else-if="name === 'plus'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
			:stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round">
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</svg>
		<svg v-else-if="name === 'back'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
			:stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="15 18 9 12 15 6" />
		</svg>
		<svg v-else-if="name === 'clock'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
			:stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round">
			<circle cx="12" cy="12" r="10" />
			<polyline points="12 6 12 12 16 14" />
		</svg>
		<svg v-else-if="name === 'check'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
			:stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="4 12 10 18 20 6" />
		</svg>
		<svg v-else-if="name === 'arrow-right'" :width="size" :height="size" viewBox="0 0 24 24" fill="none"
			:stroke="color" :stroke-width="strokeWidth" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="9 18 15 12 9 6" />
		</svg>
	</span>
	<!-- #endif -->

	<!-- 非H5端：使用文字兜底 -->
	<!-- #ifndef H5 -->
	<text class="icon-text" :style="{ fontSize: size, color }">{{ name === 'plus' ? '+' : '' }}</text>
	<!-- #endif -->
</template>

<script>
	export default {
		name: 'Icon',
		props: {
			name: { type: String, required: true },
			size: { type: String, default: '40rpx' },
			color: { type: String, default: 'currentColor' },
			strokeWidth: { type: String, default: '1.8' }
		}
	}
</script>

<style scoped>
	.icon-wrap {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
</style>
