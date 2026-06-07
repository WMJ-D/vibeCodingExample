# file-preview-demo 代码架构文档

> 生成日期：2026-05-23 | 项目版本：1.0.0

---

## 1. 项目概述

**file-preview-demo** 是一个基于 Vue 3 + Vite + Element Plus 构建的后台管理系统 Demo，采用纯前端架构，所有数据均为模拟数据。项目涵盖登录鉴权、系统管理（用户/角色/菜单/组织/参数）、日志管理、文件预览示例、列表页示例和数据大屏可视化等典型后台功能。

---

## 2. 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 前端框架 | Vue 3 | ^3.4.0 | Composition API (`<script setup>`) 为主 |
| 构建工具 | Vite | ^5.0.0 | 开发/构建，HMR |
| UI 框架 | Element Plus | ^2.8.0 | 组件库 + 中文语言包 |
| 图标 | @element-plus/icons-vue | ^2.3.0 | 全局注册所有图标组件 |
| 路由 | Vue Router | ^4.6.4 | Hash 模式 (`createWebHashHistory`) |
| 图表 | ECharts | ^6.0.0 | 数据大屏可视化 |
| CSS 预处理 | Sass-embedded | ^1.98.0 | SCSS，全局注入 Element Plus 主题变量 |
| Vue 编译 | @vitejs/plugin-vue | ^5.0.0 | Vite Vue SFC 编译 |

---

## 3. 目录结构

```
file-preview-demo/
├── index.html                         # 入口 HTML（<div id="app"> + Vite 模块入口）
├── package.json                       # 项目元信息 + 依赖声明
├── vite.config.js                     # Vite 配置：别名、SCSS 全局注入、开发服务器
├── package-lock.json                  # 依赖锁文件
├── PROJECT_STRUCTURE.md               # 项目结构说明（已有文档）
│
└── src/
    ├── main.js                        # 应用入口：创建 Vue 实例，注册插件
    ├── App.vue                        # 根组件：仅包含 <router-view />，全局基础样式
    │
    ├── router/
    │   └── index.js                   # 路由配置 + 登录拦截守卫
    │
    ├── layout/
    │   └── AdminLayout.vue            # 后台布局：侧边栏 + 顶栏 + 内容区
    │
    ├── components/                    # 功能示例组件
    │   ├── FilePreview.vue            # 多类型文件预览（拖拽上传 + 浏览器端预览）
    │   ├── ListPage.vue               # 标准 CRUD 列表页（搜索 + 表格 + 分页 + 弹窗）
    │   └── ChartDashboard.vue         # 数据大屏（ECharts 多图表 + 统计卡片 + TopN）
    │
    ├── views/                         # 业务视图
    │   ├── login/
    │   │   └── Login.vue              # 登录页（表单验证 + Mock 登录）
    │   ├── dashboard/
    │   │   └── Dashboard.vue          # 首页仪表盘（统计卡片 + 系统信息）
    │   ├── system/                    # 系统管理模块
    │   │   ├── UserManage.vue         # 用户管理（CRUD + 状态开关 + 密码重置）
    │   │   ├── RoleManage.vue         # 角色管理（CRUD + 权限分配树）
    │   │   ├── MenuManage.vue         # 菜单管理（树形表格 + 三种类型：M/C/F）
    │   │   ├── OrgManage.vue          # 组织管理（树形表格 + 展开/折叠）
    │   │   └── ParamManage.vue        # 参数管理（键值对 + 系统/自定义分类）
    │   ├── log/                       # 日志模块
    │   │   ├── OperationLog.vue       # 操作日志（批量删除 + 导出 + 时间范围筛选）
    │   │   └── LoginLog.vue           # 登录日志（IP/地点/浏览器/OS + 批量删除）
    │   └── config/
    │       └── ConfigEditor.vue       # 配置编辑器（iframe 嵌入外部页面）
    │
    └── styles/                        # 样式
        ├── index.scss                 # 全局样式（已注释，当前未生效）
        └── element/
            ├── index.scss             # Element Plus 主题定制（命名空间 ep，主色 green）
            └── dark.scss              # 暗色模式变量（主色 #589ef8）
```

---

## 4. 架构设计

### 4.1 层级架构

```
┌────────────────────────────────────────────────────┐
│                    入口层                           │
│  index.html → main.js → App.vue                    │
│  main.js 负责：创建 app、注册 ElementPlus/图标/路由  │
├────────────────────────────────────────────────────┤
│                    路由层                           │
│  Hash 路由 + 全局前置守卫 (beforeEach)              │
│  /login（公共）| /（AdminLayout 包裹的子路由）       │
├────────────────────────────────────────────────────┤
│                    布局层                           │
│  AdminLayout.vue — 侧边栏 + 顶栏（面包屑+用户下拉）+ │
│  <router-view /> 内容区                             │
├────────────────────────────────────────────────────┤
│                    视图层                           │
│  views/           components/                       │
│  ├─ login/        ├─ FilePreview.vue                │
│  ├─ dashboard/    ├─ ListPage.vue                   │
│  ├─ system/       └─ ChartDashboard.vue             │
│  ├─ log/                                             │
│  └─ config/                                          │
├────────────────────────────────────────────────────┤
│                    基础层                           │
│  Vue 3 + Element Plus + ECharts + Vue Router        │
│  SCSS 主题变量注入                                   │
└────────────────────────────────────────────────────┘
```

### 4.2 启动流程

```
1. index.html 加载 → <script type="module" src="/src/main.js">
2. main.js 执行：
   a. createApp(App) 创建 Vue 应用
   b. 遍历 @element-plus/icons-vue，全局注册所有图标组件
   c. app.use(ElementPlus, { locale: zh }) 注册 Element Plus（中文）
   d. app.use(router) 注册路由
   e. app.mount('#app') 挂载到 DOM
3. Vue Router 初始化 → Hash 路由匹配
4. beforeEach 守卫触发：
   - 无 token + 非 /login → 跳转 /login
   - 有 token 或 /login → 放行，设置 document.title
5. 根组件 App.vue 渲染 → <router-view /> 根据当前路由渲染对应组件
```

### 4.3 路由设计

| 路径 | 组件 | meta.title | 说明 |
|------|------|-----------|------|
| `/login` | Login.vue | 登录 | 无需鉴权 |
| `/` → 重定向 `/dashboard` | AdminLayout | — | 布局容器 |
| `/dashboard` | Dashboard.vue | 首页 | 统计卡片 |
| `/system/user` | UserManage.vue | 用户管理 | CRUD |
| `/system/role` | RoleManage.vue | 角色管理 | 含权限分配 |
| `/system/menu` | MenuManage.vue | 菜单管理 | 树形三级 |
| `/system/org` | OrgManage.vue | 组织管理 | 树形 |
| `/system/param` | ParamManage.vue | 参数管理 | 键值对 |
| `/log/operation` | OperationLog.vue | 操作日志 | 批量操作 |
| `/log/login` | LoginLog.vue | 登录日志 | 登录审计 |
| `/demo/file-preview` | FilePreview.vue | 文件预览 | 功能示例 |
| `/demo/list-page` | ListPage.vue | 列表示例 | 功能示例 |
| `/demo/chart-dashboard` | ChartDashboard.vue | 数据大屏 | 图表展示 |
| `/config/editor` | ConfigEditor.vue | 配置编辑器 | iframe |

- 路由模式：**Hash**（`createWebHashHistory`），兼容性好，无需服务端配置
- 所有 AdminLayout 子路由使用**懒加载**（`() => import(...)`），按需分割 chunk

### 4.4 鉴权机制

```
路由守卫 (router.beforeEach)
    │
    ├─ to.path === '/login' ──→ 直接放行（设置 title）
    │
    └─ to.path !== '/login'
        │
        ├─ localStorage 中有 admin_token ──→ 放行
        │
        └─ 无 token ──→ next('/login') 强制跳转登录页
```

- 登录成功时写入 `localStorage.setItem('admin_token', 'mock-token-' + Date.now())`
- 登出时 `localStorage.removeItem('admin_token')` 并 `router.push('/login')`
- **无后端验证**，token 仅作为本地模拟标识

### 4.5 组件树

```
App.vue
└── <router-view />
    ├── Login.vue                           （路径 /login）
    │
    └── AdminLayout.vue                     （路径 /）
        ├── el-aside（侧边栏）
        │   ├── logo 区域
        │   └── el-menu（菜单导航）
        │       ├── el-menu-item → /dashboard（首页）
        │       ├── el-sub-menu → /system（系统管理）
        │       │   ├── /system/user
        │       │   ├── /system/role
        │       │   ├── /system/menu
        │       │   ├── /system/org
        │       │   └── /system/param
        │       ├── el-sub-menu → /log（日志管理）
        │       │   ├── /log/operation
        │       │   └── /log/login
        │       └── el-sub-menu → /demo（功能示例）
        │           ├── /demo/file-preview
        │           ├── /demo/list-page
        │           └── /demo/chart-dashboard
        │
        └── el-container（右侧区域）
            ├── el-header（顶栏）
            │   ├── 折叠按钮（isCollapse 切换）
            │   ├── el-breadcrumb（面包屑，基于 route.matched）
            │   └── el-dropdown（用户菜单 → 退出登录）
            │
            └── el-main（内容区）
                └── <router-view />         （子路由组件渲染）
                    ├── Dashboard.vue
                    ├── UserManage.vue
                    ├── RoleManage.vue
                    ├── MenuManage.vue
                    ├── OrgManage.vue
                    ├── ParamManage.vue
                    ├── OperationLog.vue
                    ├── LoginLog.vue
                    ├── FilePreview.vue
                    ├── ListPage.vue
                    ├── ChartDashboard.vue
                    └── ConfigEditor.vue
```

---

## 5. 核心模块分析

### 5.1 入口与配置 (`main.js` + `vite.config.js`)

**main.js 关键点：**
- 全局注册所有 Element Plus 图标（`for...of Object.entries(ElementPlusIconsVue)`），模板中可直接使用图标组件名
- Element Plus 启用中文语言包（`zh-cn.mjs`）
- `@/styles/index.scss` 已注释，全局样式当前在 `App.vue` 的 `<style>` 中定义

**vite.config.js 关键点：**
- `@` 别名指向 `src` 目录
- 开发服务器监听 `0.0.0.0:5173`（局域网可访问）
- SCSS 全局注入：`@use "@/styles/element/index.scss" as *;` 在每个 SFC 的 `<style lang="scss">` 中自动可用
- 主题定制：自定义 Element Plus 命名空间为 `ep`，主色调为 `green`

### 5.2 布局组件 (`AdminLayout.vue`)

| 区域 | 实现 | 关键状态 |
|------|------|---------|
| 侧边栏 | `el-aside`，宽度 220px/64px 可折叠 | `isCollapse` (ref) |
| 菜单 | `el-menu` 带 `router` 属性，自动根据路由高亮 | `activeMenu` = `route.path` |
| 面包屑 | `el-breadcrumb`，动态渲染 | `route.matched.filter(r => r.meta?.title)` |
| 顶栏 | `el-header`，折叠按钮 + 用户下拉 | 退出登录 `handleCommand` |

- 侧边栏使用 `collapse-transition="false"` 禁用折叠动画（避免抖动）
- 菜单**硬编码**在模板中，与路由配置独立维护（潜在不一致风险）

### 5.3 登录模块 (`Login.vue`)

- 表单验证：`el-form` + `rules`（用户名/密码必填）
- 登录逻辑：`setTimeout(500)` 模拟异步 → `localStorage.setItem('admin_token', ...)` → `router.push('/dashboard')`
- 视觉：渐变背景 + 白色卡片，支持回车键提交
- 用户名密码默认填充 `admin / 123456`（演示便利）

### 5.4 系统管理模块（CRUD 模式）

所有系统管理视图（UserManage / RoleManage / MenuManage / OrgManage / ParamManage）遵循**统一的 CRUD 模式**：

```
┌─────────────────────────────────────────────┐
│  搜索栏：el-form inline + 多条件筛选        │
│  → 搜索按钮：query.pageNum=1 → getList()    │
│  → 重置按钮：清空条件 → getList()           │
├─────────────────────────────────────────────┤
│  操作栏：新增按钮（+ 可选：批量/展开/导出）│
├─────────────────────────────────────────────┤
│  表格：el-table + 分页 + 列定义             │
│  → 操作列：编辑 / 删除 / （可选：重置/权限）│
├─────────────────────────────────────────────┤
│  弹窗：el-dialog                             │
│  → 新增模式：currentId=null, 默认表单       │
│  → 编辑模式：currentId=row.id, 回填数据     │
│  → 校验 → 模拟提交 → 提示 → 关闭 → 刷新列表 │
└─────────────────────────────────────────────┘
```

**各视图差异化特性：**

| 视图 | 特殊功能 |
|------|---------|
| UserManage | 状态列用 `el-switch` 即时切换；密码重置确认弹窗；用户名编辑时 disabled |
| RoleManage | 权限分配弹窗（`el-tree` 多选菜单树）；角色标识（roleKey）字段 |
| MenuManage | 树形表格（`tree-props`）；三种菜单类型 M/C/F；`refreshTable` + `nextTick` 实现展开/折叠重绘 |
| OrgManage | 树形表格 + 新增时可指定上级组织；`filteredData` 为 computed |
| ParamManage | 系统内置(Y)/自定义(N) 分类；键值对管理 |

### 5.5 日志模块

| 视图 | 特性 |
|------|------|
| OperationLog | 批量删除（`el-table` selection）；导出按钮；`el-date-picker` 时间范围筛选；操作类型彩色标签 |
| LoginLog | 登录地点/浏览器/OS/状态/提示信息；`el-date-picker`；批量删除 + 导出 |

### 5.6 功能示例组件

#### FilePreview.vue（文件预览）

```
工作流：
1. el-upload（drag + auto-upload=false）选择文件
2. handleFileChange(uploadFile) 获取 File 对象
3. previewType 计算属性根据 MIME type 和扩展名判断类型
4. 五种预览模式：
   ├── image  → URL.createObjectURL + el-image（支持预览大图）
   ├── video  → <video> 标签 + controls
   ├── audio  → <audio> 标签 + controls
   ├── pdf    → <embed> 直接渲染（浏览器内置 PDF 查看器）
   └── text   → FileReader.readAsText + <pre> 展示（暗色编辑器风格）
5. beforeUnmount 时 URL.revokeObjectURL 释放内存
```

- 编码风格：**Options API**（`export default { data, computed, methods }`），与其他组件的 `<script setup>` 不同
- 文本类型支持常见代码文件扩展名（.txt .md .json .log .xml .html .css .js .vue .py .java 等）

#### ListPage.vue（标准列表页）

- 完整 CRUD 示例：搜索栏 + 操作栏 + 表格 + 分页 + 新增/编辑弹窗
- 模拟 86 条数据，分页显示
- 使用 `ElMessageBox.confirm` 做删除二次确认
- 纯 Composition API（`<script setup>`）

#### ChartDashboard.vue（数据大屏）

```
布局结构：
┌──────────────────────────────────────┐
│ 顶栏：标题 + 时间范围选择 + 刷新按钮 │
├──────────────────────────────────────┤
│ 4 个统计卡片（el-row :gutter=20）    │
├────────────────────┬─────────────────┤
│ 主图表区 16/24     │ 饼图区 8/24     │
│ 月度销售额趋势     │ 用户地域分布     │
│ 柱状图/折线图切换  │ 环形饼图         │
├────────┬───────────┼─────────────────┤
│ 8/24   │ 8/24      │ 8/24            │
│ 周订单 │ 用户活跃  │ 热门商品 TopN    │
│ 柱状图 │ 面积折线  │ el-table 表格   │
└────────┴───────────┴─────────────────┘
```

- 4 个 ECharts 实例（mainChart / pieChart / weekChart / lineChart）
- 图表类型可通过 `el-radio-group` 在柱状图/折线图间切换（watch chartType）
- 双 Y 轴：销售额（左）+ 用户数（右，折线）
- 刷新按钮随机更新统计数据
- `window.addEventListener('resize')` 响应式调整图表大小
- 数字格式化：`formatNumber()` ≥10000 显示为"万"

---

## 6. 数据流

### 6.1 整体数据流方向

```
用户操作 → 视图组件（本地状态 ref/reactive）
    │
    ├── 模拟异步（setTimeout Promise）
    │       │
    │       └── 更新本地状态 → Vue 响应式 → 视图更新
    │
    └── 无全局状态管理（无 Vuex/Pinia）
```

### 6.2 状态管理模式

| 范围 | 机制 | 示例 |
|------|------|------|
| 组件内部 | `ref` / `reactive` / `computed` | 表格数据、表单、loading |
| 父子通信 | Props（路由 meta）+ Events | AdminLayout → 子路由（通过 router-view） |
| 跨组件共享 | `localStorage` | `admin_token`（登录态） |
| 路由参数 | `useRoute()` + `router.push()` | 页面跳转传参 |

### 6.3 典型数据流示例（用户管理 CRUD）

```
┌──────────────────┐
│   UserManage.vue  │
│                   │
│  query (reactive) │──→ getList() ──→ mockUsers.filter() ──→ tableData (ref)
│  pageNum/pageSize │                         │
│  username/phone   │                    total (ref) ←── filtered.length
│                   │
│  新增按钮 ──→ handleAdd() ──→ dialogVisible=true ──→ el-dialog 展示
│  编辑按钮 ──→ handleEdit(row) ──→ form 回填 ──→ el-dialog 展示
│  确定按钮 ──→ handleSubmit() ──→ 模拟提交 ──→ ElMessage.success ──→ getList()
│  删除按钮 ──→ handleDelete(row) ──→ ElMessageBox.confirm ──→ getList()
│  状态开关 ──→ handleStatusChange(row) ──→ ElMessage.success
│  密码重置 ──→ handleResetPwd(row) ──→ ElMessageBox.confirm
└──────────────────┘
```

---

## 7. 依赖关系

### 7.1 组件依赖图

```
main.js
├── vue (createApp)
├── element-plus (完整引入 + 中文)
├── @element-plus/icons-vue (全局注册所有图标)
├── ./App.vue
└── ./router
    └── vue-router (createRouter, createWebHashHistory)

App.vue → vue-router (<router-view />)

AdminLayout.vue
├── vue (ref, computed)
├── vue-router (useRoute, useRouter)
└── 子路由懒加载组件

Login.vue → vue (ref, reactive) + vue-router (useRouter) + element-plus (ElMessage)

Dashboard.vue → vue (ref, onMounted, onUnmounted)

FilePreview.vue → @element-plus/icons-vue (UploadFilled)

ListPage.vue → vue (ref, reactive, computed, nextTick, onMounted)
             → element-plus (ElMessage, ElMessageBox)
             → @element-plus/icons-vue (Search, Refresh, Plus, Edit, Delete)

ChartDashboard.vue → echarts (* as echarts)
                   → @element-plus/icons-vue

所有管理视图 → vue (ref, reactive, computed, nextTick, onMounted)
             → element-plus (ElMessage, ElMessageBox)
```

### 7.2 Element Plus 使用方式：全量引入

`main.js` 中 `app.use(ElementPlus)` 完整注册所有组件，非按需引入。样式通过 `import 'element-plus/dist/index.css'` 全量加载。

### 7.3 主题定制方式

SCSS 变量覆盖（`vite.config.js` → `css.preprocessorOptions.scss.additionalData`），每个 SFC 自动注入 `@/styles/element/index.scss`：
- 命名空间：`ep`（而非默认的 `el`）
- 主色调：`green`
- 暗色模式主色：`#589ef8`

---

## 8. 编码规范与模式

### 8.1 组件编写风格

| 风格 | 使用的文件 |
|------|-----------|
| `<script setup>` Composition API | AdminLayout, Dashboard, ListPage, ChartDashboard, Login, 所有 system/ 和 log/ 视图 |
| Options API (`export default { }`) | FilePreview.vue（唯一例外） |
| 纯模板（无逻辑） | ConfigEditor.vue |

### 8.2 常见模式

**CRUD 视图复用模式：**
```js
// 所有管理视图共享的变量命名
const loading = ref(false)           // 表格加载状态
const tableData = ref([])            // 表格数据
const total = ref(0)                 // 总条数
const query = reactive({ ... })      // 查询参数（含 pageNum/pageSize）
const dialogVisible = ref(false)     // 弹窗可见性
const submitLoading = ref(false)     // 提交按钮加载
const formRef = ref(null)            // 表单引用
const currentId = ref(null)          // 当前编辑 ID
const isEdit = computed(() => !!currentId.value)
const form = reactive({ ... })       // 表单数据
```

**模拟异步模式：**
```js
await new Promise(r => setTimeout(r, 300))  // 模拟网络延迟
// 后续处理 mockData
```

### 8.3 样式规范

- 全局样式：`App.vue` 中无 scoped 样式（reset + body 基础设置）
- 组件样式：全部使用 `scoped`，避免样式污染
- 页面容器统一类名：`.page-container { padding: 20px; background: #fff; border-radius: 4px; }`
- 布局使用 Element Plus 栅格系统（`el-row` / `el-col`）

---

## 9. 构建与部署

### 9.1 开发

```bash
npm run dev     # Vite 开发服务器 → http://localhost:5173
```

### 9.2 生产构建

```bash
npm run build   # vite build → dist/
npm run preview # vite preview → 本地预览构建产物
```

### 9.3 构建特性

- **路由懒加载**：所有页面组件通过 `() => import(...)` 动态导入，Vite 自动代码分割
- **Hash 路由**：无需服务端配置，适合静态部署
- **无环境变量**：项目未使用 `.env` 文件

---

## 10. 已知问题与改进建议

### 10.1 已知问题

1. **菜单硬编码**：`AdminLayout.vue` 中菜单与 `router/index.js` 独立维护，新增路由时需两处同步
2. **编码风格不一致**：`FilePreview.vue` 使用 Options API，其余组件使用 `<script setup>`
3. **全局样式未生效**：`src/styles/index.scss` 已在 `main.js` 中被注释，但其内容在 `vite.config.js` 中被注入（仅主题部分）
4. **ConfigEditor 依赖外部服务**：`ConfigEditor.vue` 通过 iframe 加载 `http://localhost:3000/config-editor.html`，无独立部署能力
5. **无错误处理**：所有模拟操作无 catch 错误处理分支
6. **OrgManage 树形搜索未实现**：`filteredData` 是 identity computed，搜索框实际不生效
7. **未使用 TypeScript**：项目为纯 JavaScript 项目

### 10.2 改进建议

1. 引入 Pinia 做全局状态管理（用户信息、菜单权限等）
2. 菜单配置统一由路由配置动态生成，消除硬编码
3. 统一使用 `<script setup>` 风格
4. 添加 TypeScript 类型约束
5. 按需引入 Element Plus 组件（`unplugin-element-plus`）减小打包体积
6. 添加错误边界和统一的错误处理机制
7. 增加环境变量配置支持（`.env.development` / `.env.production`）

---

## 11. 统计概览

| 指标 | 数值 |
|------|------|
| 源文件总数（不含 node_modules） | 19 |
| Vue SFC 组件 | 15 |
| JS 配置文件 | 4（main.js, router/index.js, vite.config.js, package.json） |
| SCSS 样式文件 | 3 |
| HTML 入口 | 1 |
| Markdown 文档 | 1（PROJECT_STRUCTURE.md） |
| 总代码行数（估算） | ~2500 行 |
| 路由数量 | 14 |
| ECharts 图表实例 | 4 |