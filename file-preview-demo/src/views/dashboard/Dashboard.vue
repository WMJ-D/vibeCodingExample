<!--
 * @Author: WangMingJun 2351405492@qq.com
 * @Date: 2025-03-16 13:35:03
 * @LastEditors: WangMingJun 2351405492@qq.com
 * @LastEditTime: 2026-06-07 12:13:54
 * @Description: 首页仪表盘，含统计卡片、系统信息、浏览器书签展示
-->
<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <el-row :gutter="20">
      <el-col :span="6" v-for="item in stats" :key="item.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div>
              <div class="stat-value">{{ item.value }}</div>
              <div class="stat-title">{{ item.title }}</div>
            </div>
            <el-icon :size="48" :color="item.color"><component :is="item.icon" /></el-icon>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 系统信息 -->
    <el-card shadow="hover" style="margin-top: 20px">
      <template #header>
        <span>系统信息</span>
      </template>
      <el-descriptions :column="2" border>
        <el-descriptions-item label="系统名称">后台管理系统</el-descriptions-item>
        <el-descriptions-item label="版本号">1.0.0</el-descriptions-item>
        <el-descriptions-item label="技术栈">Vue3 + Element Plus + Vite</el-descriptions-item>
        <el-descriptions-item label="当前时间">{{ currentTime }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 浏览器书签展示 -->
    <el-card shadow="hover" class="bookmarks-card">
      <template #header>
        <div class="bookmarks-header">
          <div class="bookmarks-header__left">
            <span class="bookmarks-header__title">浏览器书签</span>
            <el-tag v-if="dataSource === 'extension'" type="success" size="small" effect="dark">扩展直连</el-tag>
            <el-tag v-else-if="dataSource === 'html'" type="info" size="small" effect="plain">HTML 导入</el-tag>
          </div>
          <div class="bookmarks-header__right">
            <el-input
              v-model="bookmarkKeyword"
              placeholder="搜索书签..."
              clearable
              class="bookmarks-header__search"
              :prefix-icon="Search"
            />
            <el-tooltip content="下载 Chrome 扩展" placement="top">
              <el-button :icon="Download" circle @click="downloadExtension" :loading="downloading" />
            </el-tooltip>
          </div>
        </div>
      </template>

      <!-- 加载状态 -->
      <div v-if="bookmarkLoading" class="bookmarks-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>正在加载书签...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!bookmarkTree.length" class="bookmarks-empty">暂无书签数据</div>

      <!-- 书签目录树 -->
      <div v-else class="bookmarks-tree">
        <!-- 一级直接书签（不属于任何子文件夹） -->
        <a
          v-for="bm in filteredTopBookmarks"
          :key="bm.url"
          :href="bm.url"
          target="_blank"
          rel="noopener noreferrer"
          class="bookmarks-item"
        >
          <img
            v-if="bm.icon"
            :src="bm.icon"
            class="bookmarks-item__icon"
            @error="handleIconError"
          />
          <el-icon v-else class="bookmarks-item__icon bookmarks-item__icon--default"><Link /></el-icon>
          <span class="bookmarks-item__title" :title="bm.title">{{ bm.title }}</span>
          <span class="bookmarks-item__url" :title="bm.url">{{ extractDomain(bm.url) }}</span>
        </a>

        <!-- 文件夹列表 -->
        <div v-if="filteredTopBookmarks.length && filteredFolders.length" class="bookmarks-divider"></div>
        <div v-for="folder in filteredFolders" :key="folder.name" class="bookmarks-folder">
          <!-- 文件夹标题，点击折叠/展开 -->
          <div
            class="bookmarks-folder__header"
            @click="toggleFolder(folder.name)"
          >
            <el-icon :class="['bookmarks-folder__arrow', { 'is-open': folderOpenMap[folder.name] }]">
              <ArrowRight />
            </el-icon>
            <el-icon class="bookmarks-folder__icon"><Folder /></el-icon>
            <span class="bookmarks-folder__name">{{ folder.name }}</span>
            <el-tag size="small" type="info" class="bookmarks-folder__count">
              {{ countBookmarks(folder) }}
            </el-tag>
          </div>

          <!-- 文件夹内容（书签 + 子文件夹） -->
          <div v-show="folderOpenMap[folder.name]" class="bookmarks-folder__body">
            <!-- 直接书签 -->
            <a
              v-for="bm in folder.bookmarks"
              :key="bm.url"
              :href="bm.url"
              target="_blank"
              rel="noopener noreferrer"
              class="bookmarks-item"
            >
              <img
                v-if="bm.icon"
                :src="bm.icon"
                class="bookmarks-item__icon"
                @error="handleIconError"
              />
              <el-icon v-else class="bookmarks-item__icon bookmarks-item__icon--default"><Link /></el-icon>
              <span class="bookmarks-item__title" :title="bm.title">{{ bm.title }}</span>
              <span class="bookmarks-item__url" :title="bm.url">{{ extractDomain(bm.url) }}</span>
            </a>

            <!-- 子文件夹递归渲染 -->
            <div
              v-for="sub in folder.children"
              :key="sub.name"
              class="bookmarks-subfolder"
            >
              <div
                class="bookmarks-folder__header bookmarks-folder__header--sub"
                @click="toggleFolder(sub.name)"
              >
                <el-icon :class="['bookmarks-folder__arrow', { 'is-open': folderOpenMap[sub.name] }]">
                  <ArrowRight />
                </el-icon>
                <el-icon class="bookmarks-folder__icon"><FolderOpened /></el-icon>
                <span class="bookmarks-folder__name">{{ sub.name }}</span>
                <el-tag size="small" type="info" class="bookmarks-folder__count">
                  {{ countBookmarks(sub) }}
                </el-tag>
              </div>
              <div v-show="folderOpenMap[sub.name]" class="bookmarks-folder__body bookmarks-folder__body--sub">
                <a
                  v-for="bm in sub.bookmarks"
                  :key="bm.url"
                  :href="bm.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="bookmarks-item"
                >
                  <img
                    v-if="bm.icon"
                    :src="bm.icon"
                    class="bookmarks-item__icon"
                    @error="handleIconError"
                  />
                  <el-icon v-else class="bookmarks-item__icon bookmarks-item__icon--default"><Link /></el-icon>
                  <span class="bookmarks-item__title" :title="bm.title">{{ bm.title }}</span>
                  <span class="bookmarks-item__url" :title="bm.url">{{ extractDomain(bm.url) }}</span>
                </a>
                <!-- 三级文件夹 -->
                <div
                  v-for="sub3 in sub.children"
                  :key="sub3.name"
                  class="bookmarks-subfolder"
                >
                  <div
                    class="bookmarks-folder__header bookmarks-folder__header--sub3"
                    @click="toggleFolder(sub3.name)"
                  >
                    <el-icon :class="['bookmarks-folder__arrow', { 'is-open': folderOpenMap[sub3.name] }]">
                      <ArrowRight />
                    </el-icon>
                    <el-icon class="bookmarks-folder__icon"><FolderOpened /></el-icon>
                    <span class="bookmarks-folder__name">{{ sub3.name }}</span>
                    <el-tag size="small" type="info" class="bookmarks-folder__count">
                      {{ countBookmarks(sub3) }}
                    </el-tag>
                  </div>
                  <div v-show="folderOpenMap[sub3.name]" class="bookmarks-folder__body bookmarks-folder__body--sub">
                    <a
                      v-for="bm in sub3.bookmarks"
                      :key="bm.url"
                      :href="bm.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="bookmarks-item"
                    >
                      <img
                        v-if="bm.icon"
                        :src="bm.icon"
                        class="bookmarks-item__icon"
                        @error="handleIconError"
                      />
                      <el-icon v-else class="bookmarks-item__icon bookmarks-item__icon--default"><Link /></el-icon>
                      <span class="bookmarks-item__title" :title="bm.title">{{ bm.title }}</span>
                      <span class="bookmarks-item__url" :title="bm.url">{{ extractDomain(bm.url) }}</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 当前标签页展示（仅扩展模式可用） -->
    <el-card v-if="openTabs.length" shadow="hover" class="tabs-card">
      <template #header>
        <div class="bookmarks-header">
          <div class="bookmarks-header__left">
            <span class="bookmarks-header__title">当前标签页</span>
            <el-tag type="warning" size="small" effect="dark">{{ openTabs.length }} 个</el-tag>
          </div>
        </div>
      </template>
      <div class="tabs-list">
        <a
          v-for="tab in openTabs"
          :key="tab.url + tab.windowId"
          :href="tab.url"
          target="_blank"
          rel="noopener noreferrer"
          class="bookmarks-item"
          :class="{ 'is-active': tab.active }"
        >
          <img
            v-if="tab.favIconUrl"
            :src="tab.favIconUrl"
            class="bookmarks-item__icon"
            @error="handleIconError"
          />
          <el-icon v-else class="bookmarks-item__icon bookmarks-item__icon--default"><Link /></el-icon>
          <span class="bookmarks-item__title" :title="tab.title">{{ tab.title }}</span>
          <span class="bookmarks-item__url" :title="tab.url">{{ extractDomain(tab.url) }}</span>
        </a>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { Search, Loading, ArrowRight, Folder, FolderOpened, Link, Download } from '@element-plus/icons-vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useBookmarkStore } from '@/composables/useBookmarkStore'
import { useExtensionDownload } from '@/composables/useExtensionDownload'

/* ---------- 统计卡片 ---------- */
const stats = [
  { title: '用户总数', value: '1,280', icon: 'User', color: '#2ee68a' },
  { title: '角色数量', value: '12', icon: 'UserFilled', color: '#67c23a' },
  { title: '菜单数量', value: '36', icon: 'Menu', color: '#e6a23c' },
  { title: '今日访问', value: '892', icon: 'View', color: '#f56c6c' },
]

/* ---------- 时钟 ---------- */
const currentTime = ref('')
let timer = null

function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN')
}

/* ---------- 书签状态（composable） ---------- */
const {
  bookmarkLoading,
  bookmarkKeyword,
  folderOpenMap,
  dataSource,
  openTabs,
  filteredTopBookmarks,
  filteredFolders,
  loadBookmarks,
  toggleFolder,
  countBookmarks,
  extractDomain,
  handleIconError,
  bookmarkTree
} = useBookmarkStore()

/* ---------- 扩展下载（composable） ---------- */
const { downloading, downloadExtension } = useExtensionDownload()

/* ---------- 生命周期 ---------- */
onMounted(() => {
  updateTime()
  timer = setInterval(updateTime, 1000)
  loadBookmarks()
})
onUnmounted(() => clearInterval(timer))
</script>

<style lang="scss" scoped>
/* ---------- 统计卡片 ---------- */
.stat-card {
  margin-bottom: 10px;
}

.stat-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.stat-title {
  font-size: 14px;
  color: #999;
  margin-top: 4px;
}

/* ---------- 书签区域 ---------- */
.bookmarks-card {
  margin-top: 20px;
}

.bookmarks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  &__left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    white-space: nowrap;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__search {
    max-width: 280px;
  }
}

.bookmarks-loading,
.bookmarks-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 0;
  color: #909399;
  font-size: 14px;
}

/* ---------- 文件夹 ---------- */
.bookmarks-folder {
  margin-bottom: 4px;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s;

    &:hover {
      background: #f5f7fa;
    }

    &--sub {
      padding-left: 28px;
    }

    &--sub3 {
      padding-left: 48px;
    }
  }

  &__arrow {
    font-size: 12px;
    color: #909399;
    transition: transform 0.2s;

    &.is-open {
      transform: rotate(90deg);
    }
  }

  &__icon {
    font-size: 18px;
    color: #e6a23c;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__count {
    flex-shrink: 0;
  }

  &__body {
    padding-left: 20px;
    border-left: 2px solid #ebeef5;
    margin-left: 18px;

    &--sub {
      margin-left: 36px;
    }
  }
}

/* ---------- 书签条目 ---------- */
.bookmarks-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  text-decoration: none;
  color: #606266;
  font-size: 13px;
  transition: background-color 0.15s, color 0.15s;

  &:hover {
    background: #eafdf4;
    color: #25b86e;
  }

  &__icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    object-fit: contain;

    &--default {
      font-size: 14px;
      color: #c0c4cc;
    }
  }

  &__title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__url {
    flex-shrink: 0;
    font-size: 11px;
    color: #b0b4bb;
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.bookmarks-subfolder {
  margin-top: 2px;
}

.bookmarks-divider {
  height: 1px;
  margin: 12px 0;
  background: #ebeef5;
}

/* ---------- 标签页卡片 ---------- */
.tabs-card {
  margin-top: 20px;
}

.tabs-list {
  display: grid;
  gap: 2px;
}

.bookmarks-item.is-active {
  background: #eafdf4;
  border-left: 3px solid #2ee68a;
}
</style>
