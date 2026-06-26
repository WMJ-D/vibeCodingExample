<template>
  <div class="admin-layout">
    <el-container style="height: 100vh">
      <!-- 侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
        <div class="logo">
          <el-icon :size="24"><Setting /></el-icon>
          <span v-show="!isCollapse" class="logo-text">后台管理</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :collapse-transition="false"
          router
          background-color="#0d1c13"
          text-color="#93b89f"
          active-text-color="#2ee68a"
        >
          <el-menu-item index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <template #title>首页</template>
          </el-menu-item>

          <el-menu-item index="/my-map">
            <el-icon><Location /></el-icon>
            <template #title>我的地图</template>
          </el-menu-item>

          <el-sub-menu index="/system">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/system/user">
              <el-icon><User /></el-icon>
              <template #title>用户管理</template>
            </el-menu-item>
            <el-menu-item index="/system/role">
              <el-icon><UserFilled /></el-icon>
              <template #title>角色管理</template>
            </el-menu-item>
            <el-menu-item index="/system/menu">
              <el-icon><Menu /></el-icon>
              <template #title>菜单管理</template>
            </el-menu-item>
            <el-menu-item index="/system/org">
              <el-icon><OfficeBuilding /></el-icon>
              <template #title>组织管理</template>
            </el-menu-item>
            <el-menu-item index="/system/param">
              <el-icon><Operation /></el-icon>
              <template #title>参数管理</template>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="/log">
            <template #title>
              <el-icon><Document /></el-icon>
              <span>日志管理</span>
            </template>
            <el-menu-item index="/log/operation">
              <el-icon><Document /></el-icon>
              <template #title>操作日志</template>
            </el-menu-item>
            <el-menu-item index="/log/login">
              <el-icon><Key /></el-icon>
              <template #title>登录日志</template>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="/demo">
            <template #title>
              <el-icon><Monitor /></el-icon>
              <span>功能示例</span>
            </template>
            <el-menu-item index="/demo/file-preview">
              <el-icon><Picture /></el-icon>
              <template #title>文件预览</template>
            </el-menu-item>
            <el-menu-item index="/demo/list-page">
              <el-icon><List /></el-icon>
              <template #title>列表示例</template>
            </el-menu-item>
            <el-menu-item index="/demo/chart-dashboard">
              <el-icon><PieChart /></el-icon>
              <template #title>数据大屏</template>
            </el-menu-item>
            <el-menu-item index="/demo/lan-transfer">
              <el-icon><Connection /></el-icon>
              <template #title>局域网互传</template>
            </el-menu-item>
            <el-menu-item index="/demo/lan-video">
              <el-icon><VideoCamera /></el-icon>
              <template #title>局域网视频</template>
            </el-menu-item>
            <el-menu-item index="/demo/my-cesium">
              <el-icon><Location /></el-icon>
              <template #title>我的 Cesium</template>
            </el-menu-item>
            <el-menu-item index="/demo/angry-birds">
              <el-icon><Promotion /></el-icon>
              <template #title>愤怒的小鸟</template>
            </el-menu-item>
            <el-menu-item index="/demo/vr-demo">
              <el-icon><VideoCamera /></el-icon>
              <template #title>VR演示</template>
            </el-menu-item>
            <el-menu-item index="/demo/minecraft">
              <el-icon><Box /></el-icon>
              <template #title>我的世界</template>
            </el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="/agent">
            <template #title>
              <el-icon><Cpu /></el-icon>
              <span>智能体应用</span>
            </template>
            <el-menu-item index="/agent/knowledge">
              <el-icon><ChatDotRound /></el-icon>
              <template #title>知识库智能体</template>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <!-- 右侧内容 -->
      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
              <component :is="isCollapse ? 'Expand' : 'Fold'" />
            </el-icon>
            <el-breadcrumb separator="/">
              <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
                {{ item.meta?.title }}
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-dropdown @command="handleCommand">
              <span class="user-info">
                <el-icon><UserFilled /></el-icon>
                <span style="margin-left: 6px">管理员</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-header>

        <el-main class="main-content">
          <router-view v-slot="{ Component, route }">
            <keep-alive>
              <component
                :is="Component"
                v-if="route.meta.keepAlive"
                :key="route.name || route.path"
              />
            </keep-alive>
            <component
              :is="Component"
              v-if="!route.meta.keepAlive"
              :key="route.name || route.path"
            />
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isCollapse = ref(false)

const activeMenu = computed(() => route.path)
const breadcrumbs = computed(() => route.matched.filter(r => r.meta?.title))

function handleCommand(cmd) {
  if (cmd === 'logout') {
    localStorage.removeItem('admin_token')
    router.push('/login')
  }
}
</script>

<style scoped lang="scss">
.admin-layout {
  height: 100vh;
}
.aside {
  background-color: #0d1c13;
  overflow-y: auto;
  transition: width 0.3s;
}
.aside::-webkit-scrollbar {
  width: 6px;
}
.aside::-webkit-scrollbar-track {
  background: #07120c;
}
.aside::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #1f8f58;
}
.aside::-webkit-scrollbar-thumb:hover {
  background: #2ee68a;
}
.logo {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  background-color: #07120c;
  border-bottom: 1px solid #173f2a;
  gap: 8px;
}
.logo-text {
  white-space: nowrap;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #0d1c13;
  border-bottom: 1px solid #173f2a;
  padding: 0 20px;
  height: 50px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #93b89f;
}
.collapse-btn:hover {
  color: #2ee68a;
}
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #d7ffe7;
}
.main-content {
  background: #07120c;
  padding: 20px;
  overflow-y: auto;
}

:deep(.el-menu) {
  border-right-color: #173f2a;
}

:deep(.el-menu-item.is-active) {
  background-color: #102817;
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: #102817;
  color: #2ee68a;
}

:deep(.el-breadcrumb__inner),
:deep(.el-breadcrumb__separator) {
  color: #93b89f;
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #d7ffe7;
}
</style>
