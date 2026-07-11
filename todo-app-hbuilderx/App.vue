<script>
	import { initStore } from './store/todo.js'

	export default {
		onLaunch: function() {
			// 初始化本地存储数据
			initStore()
		},
		onShow: function() {},
		onHide: function() {}
	}
</script>

<style>
	/* ===== 全局样式重置 ===== */
	/* 盒模型统一，避免 padding/border 撑破容器 */
	*, *::before, *::after {
		box-sizing: border-box;
	}

	page {
		background-color: #1A1A1E;
		color: #F5F5F7;
		font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', 'PingFang SC', 'Noto Sans SC', sans-serif;
		font-size: 30rpx;
		line-height: 1.5;
		-webkit-font-smoothing: antialiased;
	}

	/* 去除按钮默认样式 */
	button {
		padding: 0;
		margin: 0;
		background: none;
		border: none;
		line-height: normal;
	}
	button::after {
		border: none;
	}

	/* 文本节点默认继承对齐 */
	text {
		line-height: 1.4;
	}

	/* 隐藏滚动条 */
	::-webkit-scrollbar {
		display: none;
	}
</style>
