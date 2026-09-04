<template>
  <div class="admin-layout">
    <el-container style="height: 100vh">
      <!-- 侧边栏 -->
      <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
        <div class="logo">
          <el-icon :size="24"><Setting /></el-icon>
          <span v-show="!isCollapse" class="logo-text">{{ systemName }}</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapse"
          :collapse-transition="false"
          router
          background-color="var(--theme-bg)"
          text-color="var(--theme-text-dim)"
          active-text-color="var(--theme-primary)"
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
            <el-popover placement="bottom-end" :width="272" trigger="click" popper-class="theme-popper">
              <template #reference>
                <span class="theme-entry" title="主题切换">
                  <el-icon :size="18"><Brush /></el-icon>
                </span>
              </template>
              <div class="theme-panel">
                <div v-for="group in themeGroups" :key="group.group" class="theme-group">
                  <div class="theme-group-title">{{ group.group }}</div>
                  <div
                    v-for="t in group.items"
                    :key="t.id"
                    class="theme-item"
                    :class="{ active: currentTheme === t.id }"
                    @click="applyTheme(t.id)"
                  >
                    <span class="theme-dot" :style="{ background: t.color }"></span>
                    <span class="theme-name">{{ t.name }}</span>
                    <el-icon v-if="currentTheme === t.id" class="theme-check"><Check /></el-icon>
                  </div>
                </div>
              </div>
            </el-popover>
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
import {
  ref,
  computed,
  onMounted
} from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { getSystemName } from '@/api/config'
import { useSessionHeartbeat } from '@/composables/useSessionHeartbeat'
import { useTheme } from '@/composables/useTheme'
import MenuItem from './MenuItem.vue'

const route = useRoute()
const router = useRouter()
const store = useStore()
const isCollapse = ref(false)

const { currentTheme, applyTheme, themeGroups } = useTheme()

useSessionHeartbeat()

const menus = computed(() => store.state.menus)
const systemName = ref('后台管理系统')
const displayName = computed(() => store.state.user?.nickname || store.state.user?.username || '管理员')
const activeMenu = computed(() => route.path)
const breadcrumbs = computed(() => route.matched.filter(r => r.meta?.title))

async function loadSystemName() {
  try {
    const result = await getSystemName()
    if (result?.name) systemName.value = result.name
  } catch {
    systemName.value = '后台管理系统'
  }
}

onMounted(loadSystemName)

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
  background-color: var(--theme-bg);
  overflow-y: auto;
  transition: width 0.3s;
}
.aside::-webkit-scrollbar {
  width: 6px;
}
.aside::-webkit-scrollbar-track {
  background: var(--theme-bg-deep);
}
.aside::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: var(--theme-primary-dim);
}
.aside::-webkit-scrollbar-thumb:hover {
  background: var(--theme-primary);
}
.logo {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--theme-text-bright);
  font-size: 18px;
  font-weight: bold;
  background-color: var(--theme-bg-deep);
  border-bottom: 1px solid var(--theme-border);
  gap: 8px;
}
.logo-text {
  white-space: nowrap;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--theme-bg);
  border-bottom: 1px solid var(--theme-border);
  padding: 0 20px;
  height: 50px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 18px;
}
.theme-entry {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--theme-text-dim);
  transition: color 0.2s;
}
.theme-entry:hover {
  color: var(--theme-primary);
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: var(--theme-text-dim);
}
.collapse-btn:hover {
  color: var(--theme-primary);
}
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--theme-text-bright);
}
.main-content {
  background: var(--theme-bg-deep);
  padding: 20px;
  overflow-y: auto;
}

:deep(.el-menu) {
  border-right-color: var(--theme-border);
}

:deep(.el-menu-item.is-active) {
  background-color: var(--theme-bg-hover);
}

:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background-color: var(--theme-bg-hover);
  color: var(--theme-primary);
}

:deep(.el-breadcrumb__inner),
:deep(.el-breadcrumb__separator) {
  color: var(--theme-text-dim);
}

:deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--theme-text-bright);
}
</style>

<!-- 主题切换弹层及全局浮层适配（teleport 到 body，需全局样式） -->
<style lang="scss">
// 主题切换弹层
.theme-popper.el-popover {
  background: var(--theme-bg) !important;
  border: 1px solid var(--theme-border) !important;

  .el-popper__arrow::before {
    background: var(--theme-bg);
    border-color: var(--theme-border);
  }
}

// 全部 Element 浮层（下拉菜单/选择器等）跟随主题
.el-popper.is-light {
  background: var(--theme-bg) !important;
  border: 1px solid var(--theme-border) !important;

  .el-popper__arrow::before {
    background: var(--theme-bg);
    border-color: var(--theme-border);
  }
}

.el-dropdown-menu__item {
  color: var(--theme-text-bright);

  &:not(.is-disabled):hover {
    background: var(--theme-bg-hover);
    color: var(--theme-primary);
  }
}

.theme-panel {
  .theme-group + .theme-group {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--theme-border);
  }
  .theme-group-title {
    font-size: 12px;
    color: var(--theme-text-dim);
    margin-bottom: 6px;
  }
  .theme-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.2s, border-color 0.2s;

    &:hover {
      background: var(--theme-bg-hover);
    }
    &.active {
      border-color: var(--theme-primary);
    }
  }
  .theme-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--theme-bg-hover);
  }
  .theme-name {
    flex: 1;
    font-size: 13px;
    color: var(--theme-text-bright);
  }
  .theme-check {
    color: var(--theme-primary);
  }
}
</style>
