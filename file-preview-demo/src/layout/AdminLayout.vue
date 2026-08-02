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
          <MenuItem
            v-for="menu in menus"
            :key="menu.id || menu.path"
            :menu="menu"
          />
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
                <span style="margin-left: 6px">{{ displayName }}</span>
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
import { useStore } from 'vuex'
import { useSessionHeartbeat } from '@/composables/useSessionHeartbeat'
import MenuItem from './MenuItem.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const isCollapse = ref(false)

useSessionHeartbeat()

const menus = computed(() => store.state.menus)
const displayName = computed(() => store.state.user?.nickname || store.state.user?.username || '管理员')
const activeMenu = computed(() => route.path)
const breadcrumbs = computed(() => route.matched.filter(r => r.meta?.title))

async function handleCommand(cmd) {
  if (cmd !== 'logout') return

  try {
    await store.dispatch('logout', router)
  } finally {
    router.replace('/login')
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
