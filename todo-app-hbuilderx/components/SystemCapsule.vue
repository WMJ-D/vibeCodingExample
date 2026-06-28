<template>
	<view class="capsule">
		<view class="capsule__dots">
			<view class="dot"></view>
			<view class="dot"></view>
		</view>
		<view class="capsule__divider"></view>
		<view class="capsule__close">
			<view class="close-circle"></view>
		</view>
	</view>
</template>

<script>
	export default {
		name: 'SystemCapsule'
	}
</script>

<style scoped>
	.capsule {
		display: flex;
		align-items: center;
		gap: 6rpx;
		padding: 8rpx 20rpx;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 40rpx;
		border: 1px solid rgba(255, 255, 255, 0.1);
		height: 64rpx;
	}
	.capsule__dots {
		display: flex;
		gap: 6rpx;
		padding: 0 8rpx;
	}
	.dot {
		width: 8rpx;
		height: 8rpx;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
	}
	.capsule__divider {
		width: 2rpx;
		height: 20rpx;
		background: rgba(255, 255, 255, 0.1);
	}
	.capsule__close {
		padding: 0 8rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.close-circle {
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		border: 1.6rpx solid rgba(255, 255, 255, 0.5);
	}
</style>
