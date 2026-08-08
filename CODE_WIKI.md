# Code Wiki — 工作区项目结构化文档

> 生成日期：2026-08-08  
> 覆盖范围：`/workspace` 下全部子项目

---

## 0. 工作区总览

本工作区是一个**多项目仓库**，包含 1 个主项目与 3 个独立子项目：

| 项目 | 目录 | 类型 | 技术栈 | 端口 |
| --- | --- | --- | --- | --- |
| **file-preview-demo** | `file-preview-demo/` | 中后台管理系统 + 双后端 + 浏览器扩展 | Vue 3 + Vite + Element Plus；Express 5 + MySQL；Express 4 + JSON | 前端 5173 / admin 8788 / 知识库 8787 |
| **liquid-glass-studio** | `liquid-glass-studio/` | 电影感品牌官网展示页 | React 19 + Vite + TS + Tailwind + framer-motion | dev 默认 |
| **lumora-focus** | `lumora-focus/` | 多页面品牌展示集合（3 站点） | React 19 + Vite + TS + Tailwind + gsap + lucide-react | dev 默认 |
| **todo-app-hbuilderx** | `todo-app-hbuilderx/` | 多端待办清单应用 | uni-app + Vue 3（HBuilderX） | — |

四个项目相互独立、无依赖关系，各自有独立的 `package.json`（todo-app 除外，依赖 HBuilderX）或 manifest。

```
workspace/
├── README.md                      # 工作区说明（主项目 file-preview-demo 视角）
├── file-preview-demo/             # ⭐ 主项目
│   ├── admin-server/              #   后台管理后端（Express5 + MySQL + JWT + RBAC）
│   ├── server/                    #   知识库 RAG 后端（Express4 + JSON + 本地向量检索）
│   ├── chrome-extension/          #   Chrome MV3 扩展（书签 & 标签页助手）
│   ├── public/                    #   静态资源（含可下载的扩展副本）
│   ├── src/                       #   Vue 3 前端源码
│   ├── index.html                 #   前端入口（异步加载 Cesium）
│   ├── vite.config.js
│   └── package.json
├── liquid-glass-studio/           # React 品牌官网
├── lumora-focus/                  # React 多站点品牌集合
└── todo-app-hbuilderx/            # uni-app 多端待办应用
```

---

# 第一部分 · file-preview-demo（主项目）

## 1. 项目概述

`file-preview-demo` 是一个功能覆盖完整的中后台管理系统示例，采用 **Vue 3 前端 + 两套独立后端 + Chrome 扩展** 的架构：

- **前端**：Vue 3（`<script setup>`）+ Vite + Element Plus + Vuex，含登录鉴权、动态路由、用户/角色/菜单/组织/参数管理、日志与在线会话治理、文件预览、数据大屏、L7/Cesium 地图、WebRTC P2P、AI 知识库、AI 对话、Canvas 游戏、Three.js VR 等。
- **admin-server**：规范化企业管理后端（Express 5 + MySQL + JWT + RBAC + 操作日志 + 在线会话），提供 `/api/v1/*` 接口。
- **server/**：轻量知识库 RAG 后端（Express 4 + JSON 存储 + 本地哈希向量 + OpenAI 兼容 LLM），提供 `/api/*` 接口。
- **chrome-extension/**：Manifest V3 扩展，读取浏览器书签/标签页并注入管理后台页面。

## 2. 技术栈

### 2.1 前端

| 类别 | 技术 | 版本 | 用途 |
| --- | --- | --- | --- |
| 前端框架 | Vue 3 | ^3.4.0 | Composition API（`<script setup>`）为主 |
| 构建工具 | Vite | ^5.0.0 | 开发/构建，HMR |
| UI 框架 | Element Plus | ^2.8.0 | 全量引入 + 中文语言包 |
| 图标 | @element-plus/icons-vue | ^2.3.0 | 全局注册所有图标 |
| 路由 | Vue Router | ^4.6.4 | Hash 模式 + 动态路由 |
| 状态管理 | Vuex | ^4.1.0 | token/user/roles/permissions/menus/dynamicRoutes |
| 图表 | ECharts | ^6.0.0 | 数据大屏可视化 |
| 地图 2D | @antv/l7 + @antv/l7-maps | ^2.22.6 | 行政边界可视化（高德底图） |
| 地图 3D | Cesium + zondy WebClient | 外部引入（index.html） | 三维地图、模型、漫游 |
| 文件预览 | @flyfish-group/file-viewer3 | ^1.0.20 | 多格式预览（可选，未注册时降级） |
| 3D | three | ^0.184.0 | VRDemo 全景场景 |
| CSS 预处理 | sass-embedded | ^1.98.0 | SCSS，全局注入主题变量 |

### 2.2 admin-server 后端

| 类别 | 技术 | 用途 |
| --- | --- | --- |
| Web 框架 | Express 5.1 | ESM，路由装配 |
| 数据库 | MySQL（mysql2/promise） | 连接池，手写 SQL，无 ORM |
| 鉴权 | jsonwebtoken（JWT）+ 服务端会话表 | 双重校验，支持强退/失效 |
| 参数校验 | zod | schema 校验 |
| 安全 | helmet / cors / express-rate-limit | 响应头、跨域、登录限流 |
| 密码 | scrypt（Node crypto） | 盐 + 派生密钥，timingSafeEqual |
| 日志 | pino + pino-http | 结构化日志 + 请求日志 |
| 测试 | vitest + supertest | HTTP 契约 + mock 全链路 |

### 2.3 知识库 server 后端

| 类别 | 技术 | 用途 |
| --- | --- | --- |
| Web 框架 | Express 4（CommonJS） | 知识库 API |
| 文档解析 | mammoth / word-extractor / officeparser | docx / doc / pdf / pptx 文本抽取 |
| 向量检索 | 自研 FNV-1a 哈希向量 + 余弦相似度 | 本地降级；可选真实 Embedding |
| LLM | 内置 fetch（OpenAI 兼容 API） | 对话 / 总结 / Embedding，支持 SSE 流式 |
| 存储 | 本地 JSON 文件（原子写入） | knowledge-db.json / vector-index.json |

## 3. 目录结构

```
file-preview-demo/
├── index.html                         # 前端入口（异步加载 Cesium 资源）
├── vite.config.js                     # Vite 配置：别名 / 代理 / SCSS 注入
├── package.json
├── ARCHITECTURE.md                    # 旧架构文档（部分已过时）
│
├── admin-server/                      # ⭐ 后台管理后端
│   ├── server.js                      #   启动入口（DB 连通检查 + 优雅关闭）
│   ├── .env.example                   #   环境变量示例
│   ├── package.json
│   ├── sql/                           #   数据库 schema（3 个迁移脚本）
│   │   ├── 001_init_admin_schema.sql  #     建库建表 + 种子数据
│   │   ├── 002_add_operation_log_params.sql
│   │   └── 003_add_online_sessions.sql
│   ├── src/
│   │   ├── app.js                     #   Express 装配工厂
│   │   ├── config/{env.js,logger.js}  #   zod 配置校验 + pino
│   │   ├── db/index.js                #   MySQL 连接池 + 事务封装
│   │   ├── middleware/                #   auth / error / operation-log
│   │   ├── routes/                    #   auth / dashboard / logs / system / ai
│   │   ├── services/ai.js             #   AI 网关 SSE 转发
│   │   └── utils/                     #   data / password / response / security
│   ├── test/app.test.js               #   mock 全链路测试
│   └── tests/health.test.js           #   HTTP 契约测试
│
├── server/                            # ⭐ 知识库 RAG 后端
│   ├── index.js                       #   服务入口 + 路由
│   ├── documentService.js             #   文档扫描/分块/检索/总结/对话
│   ├── vectorIndex.js                 #   本地哈希向量 + 余弦相似度
│   ├── llmService.js                  #   OpenAI 兼容 LLM 调用
│   ├── storage.js                     #   JSON 文件原子存储
│   ├── data/                          #   运行时数据目录
│   ├── sql/001_init_admin_schema.sql  #   （管理后台用，与知识库无关）
│   ├── README.md
│   └── ALIYUN_BAILIAN.md              #   阿里云百炼 Embedding 集成说明
│
├── chrome-extension/                  # ⭐ Chrome MV3 扩展
│   ├── manifest.json
│   ├── background.js                  #   Service Worker
│   ├── content.js                     #   Content Script（postMessage 桥接）
│   ├── popup.html / popup.js          #   弹窗
│
├── public/chrome-extension/           #   扩展资源副本（供前端打包下载）
│
└── src/                               # ⭐ Vue 3 前端
    ├── main.js                        #   应用入口（注册插件）
    ├── App.vue                        #   根组件（keep-alive 路由出口）
    ├── router/index.js                #   动态路由 + 守卫
    ├── layout/                        #   AdminLayout / MenuItem
    ├── store/index.js                 #   Vuex（鉴权/身份/菜单/路由）
    ├── directives/permission.js       #   v-permission 指令
    ├── api/                           #   9 个 API 模块（admin-server）
    ├── utils/                         #   request / token / markdown
    ├── composables/                   #   bookmark×3 / extensionDownload / sessionHeartbeat
    ├── components/                    #   FilePreview / ListPage / ChartDashboard
    ├── views/                         #   业务视图
    │   ├── login/ dashboard/ system/ log/
    │   ├── agent/KnowledgeAgent.vue   #   知识库智能体（连 server/）
    │   ├── ai/chat.vue                #   AI 对话（连 admin-server）
    │   ├── config/ConfigEditor.vue    #   iframe 配置编辑器
    │   ├── demo/                      #   LanTransfer / LanVideo / MyCesium / AngryBirds / VRDemo
    │   └── MyMap.vue                  #   L7 行政边界
    └── styles/                        #   index.scss + element 主题
```

## 4. 整体架构

### 4.1 三层服务架构

```
┌─────────────────────────────────────────────────────────────┐
│                      浏览器（前端 5173）                      │
│   Vue 3 SPA  ──  Vuex(token/user/menus)  ──  v-permission   │
│      │                          │                            │
│      │ /api/v1/* (fetch 封装)   │ /api/* (直连 fetch)         │
│      │  走 vite 代理 → 8788      │  直连 8787                 │
├──────▼──────────────────────────▼───────────────────────────┤
│  admin-server (8788)            server/ 知识库 (8787)         │
│  Express5 + MySQL + JWT + RBAC  Express4 + JSON + RAG        │
│  用户/角色/菜单/组织/参数/       文档管理/向量检索/           │
│  日志/在线会话/Dashboard/AI网关  LLM 对话总结(SSE)            │
└─────────────────────────────────────────────────────────────┘
        ▲                                  ▲
        │ AI 网关 SSE 转发                  │ OpenAI 兼容 API
        └── aigateway.claudeoffice.com     └── 用户配置的 baseUrl
```

- 前端通过 `vite.config.js` 把 `/api` 代理到 `http://127.0.0.1:8788`（admin-server）。
- 知识库智能体页面 `KnowledgeAgent.vue` **直连** `http://127.0.0.1:8787/api`，不走代理。
- 两套后端端口相邻（8787/8788）、职责分离、互不依赖。

### 4.2 前端启动流程

```
1. index.html 加载 → 异步加载 Cesium 资源（内网）→ <script src="/src/main.js">
2. main.js：createApp(App) → 注册图标 → use(ElementPlus) → use(store)
            → use(PermissionDirective) → use(router) → use(FileViewer) → mount('#app')
3. Vue Router（Hash）初始化 → beforeEach 守卫：
   - 无 token → 跳 /login
   - 有 token 且路由未加载 → store.dispatch('bootstrap', router)
       → 并发拉 getMe() + getMenus() → 注册动态路由 → SET_ROUTES_LOADED
   - 失败 → reset + 跳 /login
4. App.vue：根据 route.meta.keepAlive 决定 keep-alive 包裹 → <router-view>
5. AdminLayout 渲染：侧边菜单（来自 store.menus）+ 顶栏 + 内容区
```

### 4.3 鉴权与权限模型

```
登录 Login.vue
  └─ store.dispatch('login') → POST /api/v1/auth/login → 拿 JWT token
  └─ store.dispatch('bootstrap') → GET /auth/me + /auth/menus → 注册动态路由

请求 request.js
  └─ 自动注入 Authorization: Bearer <token>
  └─ 401 → 清 token + 跳 #/login

后端 authenticate 中间件
  └─ jwt.verify → 解出 sub/username/roles/jti
  └─ 查 sys_user_session：校验状态(ACTIVE) + 未过期 + 未被踢
  └─ JWT + 服务端会话双重校验

权限控制 v-permission
  └─ admin 角色直接旁路
  └─ 其余按 store.permissions 权限码「任一匹配」
  └─ 不通过则 el.remove()

路由权限
  └─ 不做角色/权限码拦截，仅做「登录态 + 动态路由加载」
  └─ 菜单可见性由后端 getMenus() 控制（menuType C=页面 / F=按钮）
```

## 5. 前端核心模块

### 5.1 入口与构建

**[main.js](file:///workspace/file-preview-demo/src/main.js)**
- `createApp(App)` → 全局注册 Element Plus 图标 → `use(ElementPlus, {locale: zh})` → `use(store)`（Vuex）→ `use(PermissionDirective)` → `use(router)` → `use(FileViewer)`（@flyfish-group/file-viewer3）→ 引入全局样式 → `mount('#app')`。

**[vite.config.js](file:///workspace/file-preview-demo/vite.config.js)**
- `@` → `src` 别名；`server.host=0.0.0.0`、`port=5173`；`proxy['/api']` → `http://127.0.0.1:8788`（changeOrigin）。
- `css.preprocessorOptions.scss.additionalData`：全局注入 `@use "@/styles/element/index.scss" as *;`，使任意 SFC 的 `<style lang="scss">` 可直接用主题变量。

**[index.html](file:////workspace/file-preview-demo/index.html)**
- 内联 IIFE 异步加载 Cesium 资源（`Cesium.js` / `webclient-*.min.js` / `TDT-token.js`，来自内网 `10.10.130.72:8086`），暴露 `window.cesiumResourcesReady` Promise，供 MyCesium.vue 等待。

**[App.vue](file:///workspace/file-preview-demo/src/App.vue)**
- `<router-view v-slot>`，按 `route.meta.keepAlive` 决定是否 `<keep-alive>` 包裹；全局 reset + 深绿背景 `#07120c`。

### 5.2 路由系统 [router/index.js](file:///workspace/file-preview-demo/src/router/index.js)

- **模式**：Hash（`createWebHashHistory`）。
- **静态路由**：`/login`（无鉴权）、`/`（AdminRoot，动态路由父级）。
- **动态路由**（核心）：基于后端菜单树生成。
  - `pageModules = import.meta.glob('../views/**/*.vue') + '../components/**/*.vue'`。
  - `resolveComponent(component)`：标准化路径后映射到 `pageModules`。
  - `menuTreeToRoutes(menus, parentPath)`：递归生成路由；跳过 `menuType==='F'`（按钮）/ `visible===0` / `status===0`；`menuType==='C'` 才 push 路由，meta 含 `title/icon/keepAlive/permission`。
  - `setupDynamicRoutes(router, menus)`：先 `resetDynamicRoutes` 清旧 → `addRoute('AdminRoot', route)` → 追加 404 兜底。
- **守卫 `beforeEach`**：无 token 跳登录 → 已登录且未加载则 `bootstrap` → 失败 reset 跳登录 → `afterEach` 设置 `document.title`。

### 5.3 布局 [layout/](file:///workspace/file-preview-demo/src/layout)

**[AdminLayout.vue](file:///workspace/file-preview-demo/src/layout/AdminLayout.vue)**
- `el-container` 嵌套：侧边栏（64/220px 可折叠，`el-menu` router 模式，菜单**来自 store.menus 动态渲染**）+ 顶栏（折叠按钮 + 面包屑 + 用户下拉退出）+ 内容区（`router-view` + `keep-alive`）。
- 关键状态：`isCollapse`、`menus=computed(store.state.menus)`、`displayName`、`activeMenu=route.path`、`breadcrumbs`。
- `useSessionHeartbeat()` 挂载时启动会话心跳；退出调 `store.dispatch('logout', router)`。

**[MenuItem.vue](file:///workspace/file-preview-demo/src/layout/MenuItem.vue)**
- 递归菜单组件，`props.menu`；过滤 `menuType==='F'`/`visible===0`/`status===0`；有子菜单 → `el-sub-menu` + 递归，无子菜单且 `menuType==='C'` → `el-menu-item`。

### 5.4 状态管理 [store/index.js](file:///workspace/file-preview-demo/src/store/index.js)

Vuex 4（`createStore`），非 Pinia。

| State | 说明 |
| --- | --- |
| `token` | 从 localStorage 读取 |
| `user` | 当前用户对象 |
| `roles` | 角色键数组（兼容字符串/对象） |
| `permissions` | 权限码数组 |
| `menus` | 菜单树 |
| `dynamicRoutes` | 动态路由表 |
| `routesLoaded` | 动态路由是否已加载 |

- **Getter `firstAccessiblePath`**：递归找首个 `menuType==='C' && path`，用于登录后默认跳转。
- **Actions**：
  - `login(credentials)` → `loginRequest` → 校验 token → `SET_TOKEN` + `SET_IDENTITY`。
  - `bootstrap(router)` → `Promise.all([getMe(), getMenus()])` → `SET_IDENTITY` + `SET_MENUS` + `setupDynamicRoutes` + `SET_ROUTES_LOADED`。
  - `logout(router)` → `logoutRequest`（finally 调 reset）。
  - `reset(router)` → `resetDynamicRoutes` + `removeToken` + `RESET_STATE`。

### 5.5 网络层 [utils/request.js](file:///workspace/file-preview-demo/src/utils/request.js)

基于原生 **fetch**（非 axios）。

- `BASE_URL = '/api/v1'`；`SUCCESS_CODES = {0, 200}`。
- `request(url, options)`：自动注入 `Authorization: Bearer <token>`；对象 body 自动 `JSON.stringify` + `Content-Type: application/json`；`FormData/Blob/string` 原样传。
- 401（非登录接口）→ 清 token + 跳 `#/login`；HTTP 非 2xx → 抛 `RequestError`；成功返回 `data` 字段。
- 导出 `get/post/put/patch/del`。

**[utils/token.js](file:///workspace/file-preview-demo/src/utils/token.js)**：`TOKEN_KEY='admin_token'`，`getToken/setToken/removeToken` 基于 localStorage。

**[utils/markdown.js](file:///workspace/file-preview-demo/src/utils/markdown.js)**：自研轻量 Markdown 渲染器（代码块/标题/列表/引用/行内格式），无第三方依赖，供 ai/chat 与 KnowledgeAgent 使用。

### 5.6 权限指令 [directives/permission.js](file:///workspace/file-preview-demo/src/directives/permission.js)

- 指令名 `v-permission`，用法 `v-permission="'user:add'"` 或 `v-permission="['user:add','user:edit']"`（数组=任一满足）。
- `hasPermission(value)`：admin 角色直接旁路；否则 `store.permissions` 建 Set 做「任意匹配」。
- `mounted/updated` 钩子：不通过则 `el.remove()`。同时导出 `hasPermission` 供 JS 调用。

### 5.7 API 模块 [api/](file:///workspace/file-preview-demo/src/api)

> 统一走 `request.js` 的 `/api/v1` 前缀（admin-server）。仅 `ai.js` 因流式需求独立实现。

| 模块 | 关键函数 | 接口（method path） |
| --- | --- | --- |
| [auth.js](file:///workspace/file-preview-demo/src/api/auth.js) | login/logout/getMe/getMenus/heartbeat | POST `/auth/login`、POST `/auth/logout`、GET `/auth/me`、GET `/auth/menus`、POST `/auth/heartbeat` |
| [dashboard.js](file:///workspace/file-preview-demo/src/api/dashboard.js) | getDashboardStatistics | GET `/dashboard/statistics` |
| [user.js](file:///workspace/file-preview-demo/src/api/user.js) | getUserList/getUser/createUser/updateUser/deleteUser/updateUserStatus/resetUserPassword/batchDeleteUsers | BASE `/system/users` |
| [role.js](file:///workspace/file-preview-demo/src/api/role.js) | getRoleList/createRole/updateRole/deleteRole/getRolePermissions/updateRolePermissions | BASE `/system/roles`；权限 `PUT /:id/menus` |
| [menu.js](file:///workspace/file-preview-demo/src/api/menu.js) | getMenuList/getMenuTree/createMenu/updateMenu/deleteMenu | BASE `/system/menus` |
| [org.js](file:///workspace/file-preview-demo/src/api/org.js) | getOrgList/getOrgTree/createOrg/updateOrg/deleteOrg | BASE `/system/orgs` |
| [param.js](file:///workspace/file-preview-demo/src/api/param.js) | getParamList/createParam/updateParam/deleteParam | BASE `/system/params` |
| [log.js](file:///workspace/file-preview-demo/src/api/log.js) | 操作日志/登录日志/在线会话 CRUD + 导出(blob) + 强退 + 清理 | `/logs/operation`、`/logs/login`、`/logs/online` |
| [ai.js](file:///workspace/file-preview-demo/src/api/ai.js) | streamChat | POST `/ai/chat/stream`（multipart，自实现 fetch 流式读取，绕过 request.js） |
| [index.js](file:///workspace/file-preview-demo/src/api/index.js) | 汇总导出 authApi/userApi/roleApi/menuApi/orgApi/paramApi/logApi | — |

### 5.8 Composables [composables/](file:///workspace/file-preview-demo/src/composables)

| Composable | 职责 | 关键点 |
| --- | --- | --- |
| [useBookmarkParser.js](file:////workspace/file-preview-demo/src/composables/useBookmarkParser.js) | 书签 HTML 解析纯函数 | `parseBookmarkHtml`（DOMParser 解析 Netscape 书签）、`filterTree`（递归关键字过滤）、`countBookmarks`、`extractDomain` |
| [useBookmarkStore.js](file:///workspace/file-preview-demo/src/composables/useBookmarkStore.js) | 书签状态管理 | 优先 Chrome 扩展直连（`postMessage EXT_GET_ALL`，1500ms 超时），失败降级 `fetch('/bookmarks.html')`；导出 `bookmarkTree/filteredFolders/openTabs` 等 |
| [useExtensionDownload.js](file:///workspace/file-preview-demo/src/composables/useExtensionDownload.js) | 扩展打包下载 | 并发 fetch `public/chrome-extension/` 5 文件 → **纯原生手写 ZIP**（STORE 模式 + CRC32）→ 触发下载 |
| [useSessionHeartbeat.js](file:///workspace/file-preview-demo/src/composables/useSessionHeartbeat.js) | 会话心跳保活 | 60s `setInterval` + `visibilitychange` 可见时立即发；错误静默；随布局生命周期启停 |

### 5.9 样式系统 [styles/](file:///workspace/file-preview-demo/src/styles)

- **主题定制**：SCSS `@forward` 覆盖 + CSS 变量 `:root` 覆盖双轨。
- **命名空间**：SCSS 层自定义 `ep`（但组件样式主要用 `--el-*` 变量，两者并存）。
- **主色**：`#2ee68a`（薄荷绿），整体深绿暗色基调（背景 `#07120c`）。
- **暗色模式**：`:root.dark` 类切换（element-plus dark css-vars + 自定义 light/dark 梯度反转）。
- 全局滚动条美化、nprogress 绿色进度条、Cesium 时间轴隐藏。

## 6. 业务视图与组件

### 6.1 通用组件 [components/](file:///workspace/file-preview-demo/src/components)

| 组件 | 职责 | 亮点 |
| --- | --- | --- |
| [FilePreview.vue](file:///workspace/file-preview-demo/src/components/FilePreview.vue) | 多类型文件预览（本地 file + 远程 url） | 动态探测全局 `FileViewer`，未注册降级到 image/video/audio/pdf/text；ObjectURL 卸载回收 |
| [ListPage.vue](file:///workspace/file-preview-demo/src/components/ListPage.vue) | 标准 CRUD 列表页模板 | 搜索+表格+分页+弹窗范式，Mock 演示版，真实接口处 TODO 占位 |
| [ChartDashboard.vue](file:///workspace/file-preview-demo/src/components/ChartDashboard.vue) | 数据大屏（ECharts） | 4 图表实例 + 统计卡片 + TopN 表格；自定义深绿主题；柱/折线切换 |

### 6.2 业务视图 [views/](file:///workspace/file-preview-demo/src/views)

| 视图 | 后端 | 核心功能 |
| --- | --- | --- |
| [login/Login.vue](file:///workspace/file-preview-demo/src/views/login/Login.vue) | admin-server | 表单校验 → store login + bootstrap → 回跳 redirect/firstAccessiblePath |
| [dashboard/Dashboard.vue](file:///workspace/file-preview-demo/src/views/dashboard/Dashboard.vue) | admin-server | 统计卡片 + 系统信息 + 浏览器书签树 + 扩展下载 |
| [system/UserManage.vue](file:///workspace/file-preview-demo/src/views/system/UserManage.vue) | admin-server | 用户 CRUD + 状态开关 + 重置密码 + 组织/多角色绑定；`v-permission` |
| [system/RoleManage.vue](file:///workspace/file-preview-demo/src/views/system/RoleManage.vue) | admin-server | 角色 CRUD + 权限分配树（check-strictly 避免回显错乱） |
| [system/MenuManage.vue](file:///workspace/file-preview-demo/src/views/system/MenuManage.vue) | admin-server | 树形表格，M/C/F 三类型，按类型动态显隐表单 |
| [system/OrgManage.vue](file:///workspace/file-preview-demo/src/views/system/OrgManage.vue) | admin-server | 组织树形管理 |
| [system/ParamManage.vue](file:///workspace/file-preview-demo/src/views/system/ParamManage.vue) | admin-server | 系统参数键值对（内置 Y/自定义 N） |
| [log/OperationLog.vue](file:///workspace/file-preview-demo/src/views/log/OperationLog.vue) | admin-server | 操作日志查询/批量删除/导出 CSV/详情弹窗 |
| [log/LoginLog.vue](file:///workspace/file-preview-demo/src/views/log/LoginLog.vue) | admin-server | 登录日志查询/删除/导出 |
| [log/OnlineUser.vue](file:///workspace/file-preview-demo/src/views/log/OnlineUser.vue) | admin-server | ⭐ 在线会话治理：当前会话双保险不可下线、30s 静默刷新、`onActivated/onDeactivated` 配合 keep-alive、清理过期会话量化反馈 |
| [agent/KnowledgeAgent.vue](file:///workspace/file-preview-demo/src/views/agent/KnowledgeAgent.vue) | 知识库 server | ⭐ 三栏 RAG 工作台：文件管理 + 搜索/对话/总结(Tab) + AI 配置；手写 SSE 流式（`/chat/stream`、`/knowledge/summary/stream`）；Mock→真实后端渐进增强；手写 Markdown 渲染 |
| [ai/chat.vue](file:///workspace/file-preview-demo/src/views/ai/chat.vue) | admin-server | ⭐ 通用 AI 对话：文字/图片/文件附件，`AbortController` 可中断流式，拖拽上传，Markdown 渲染 |
| [config/ConfigEditor.vue](file:///workspace/file-preview-demo/src/views/config/ConfigEditor.vue) | 无 | 纯 iframe 嵌入 `localhost:3000/config-editor.html` |
| [demo/LanTransfer.vue](file:///workspace/file-preview-demo/src/views/demo/LanTransfer.vue) | 无 | ⭐ WebRTC P2P 文件互传：手动 SDP 交换 + DataChannel 分片(256KB) + 背压控制 |
| [demo/LanVideo.vue](file:///workspace/file-preview-demo/src/views/demo/LanVideo.vue) | 无 | WebRTC P2P 视频推流（A 推 B 收 recvonly） |
| [demo/MyCesium.vue](file:///workspace/file-preview-demo/src/views/demo/MyCesium.vue) | 地图服务 | ⭐ Cesium 三维：10 图层开关 + 漫游动画 + 行政区点击高亮（自实现 pointInPolygon） |
| [demo/AngryBirds.vue](file:///workspace/file-preview-demo/src/views/demo/AngryBirds.vue) | 无 | ⭐ 纯 Canvas 2D 自研物理引擎游戏：事件驱动重力/堆叠支撑/材质相克/23 关/3 鸟技能/WebAudio |
| [demo/VRDemo.vue](file:///workspace/file-preview-demo/src/views/demo/VRDemo.vue) | 第三方文生图 | ⭐ Three.js + AI 文生图全景：5 种程序化场景 + Bloom 后处理 + VR 全屏 |
| [MyMap.vue](file:///workspace/file-preview-demo/src/views/MyMap.vue) | GeoJSON | L7 行政边界：一份数据拆三层（填色/边界/未定边界虚线）+ 墙体光效 + 图例控制 |

## 7. admin-server 后端详解

### 7.1 入口与配置

**[server.js](file:///workspace/file-preview-demo/admin-server/server.js)**：`start()` 先 `pool.query('SELECT 1')` 验 DB 连通再 `app.listen`；`shutdown()` 优雅关闭（`server.close` + `pool.end`）；监听 SIGINT/SIGTERM。

**[src/app.js](file:///workspace/file-preview-demo/admin-server/src/app.js)**：`createApp({appLogger})` 工厂（便于测试注入）；中间件顺序：pino-http → helmet → cors(凭证) → json(1mb) → urlencoded；`GET /health`（不经鉴权/日志）；路由挂载 `/api/v1/{auth,system,logs,ai,dashboard}`；末尾 notFound + errorHandler。

**[src/config/env.js](file:///workspace/file-preview-demo/admin-server/src/config/env.js)**：zod 校验，关键默认值：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| PORT | **8788** | 监听端口 |
| CORS_ORIGIN | http://localhost:5173 | 前端地址 |
| DB_HOST/PORT/USER/PASSWORD/NAME | 127.0.0.1/3306/root/空/file_preview_demo | MySQL |
| AI_GATEWAY_BASE_URL | https://aigateway.claudeoffice.com/v1 | AI 网关 |
| AI_MODEL | gpt-5.6-sol | 模型 |
| JWT_SECRET | development-secret...（≥32字符） | JWT 密钥 |
| JWT_EXPIRES_IN | 2h | Token 有效期 |

### 7.2 数据库层 [db/index.js](file:///workspace/file-preview-demo/admin-server/src/db/index.js)

- MySQL 连接池（`mysql.createPool`），时区 `+08:00`，`dateStrings:true`，typeCast 去 DATETIME 小数秒。
- 导出 `pool`、`getDb()/setDb(nextDb)`（测试注入 mock）、`withTransaction(work)`（getConnection → begin → work → commit，异常 rollback，finally release）。

### 7.3 中间件 [middleware/](file:///workspace/file-preview-demo/admin-server/src/middleware)

**[auth.js](file:///workspace/file-preview-demo/admin-server/src/middleware/auth.js)**
- `authenticate`：`jwt.verify` 解 `{sub,username,roles,jti}` → 查 `sys_user_session`（按 `session_id=jti AND user_id=sub`）→ 校验状态 ACTIVE / 未过期 / 未被 KICKED。**JWT + 服务端会话双重校验**，支持强退。
- `authorize(...permissions)`：admin 旁路；否则查「用户-角色-角色菜单-菜单权限」取权限集合，命中任一放行，否则 403。

**[error.js](file:///workspace/file-preview-demo/admin-server/src/middleware/error.js)**
- `AppError`（status/message/code/details）、`asyncHandler`、`notFound`、`errorHandler`（zod→400 VALIDATION_ERROR；ER_DUP_ENTRY→409 DUPLICATE_DATA；≥500 记日志且对外「服务器内部错误」）。

**[operation-log.js](file:///workspace/file-preview-demo/admin-server/src/middleware/operation-log.js)**
- 仅 POST/PUT/PATCH/DELETE 生效；traceId（`x-trace-id` 头或 randomUUID）；`captureResponseBody` 拦截 `res.json` 拿真实响应；`res.on('finish')` 落库 `sys_operation_log`（跳过未登录与 `/auth/`）；字段含 module（按路径推断中文）/operator/method/url/params(脱敏)/response(脱敏)/ip/status/duration_ms。

### 7.4 路由层 [routes/](file:///workspace/file-preview-demo/admin-server/src/routes)

| 路由文件 | 前缀 | 主要接口 |
| --- | --- | --- |
| [auth.js](file:///workspace/file-preview-demo/admin-server/src/routes/auth.js) | `/api/v1/auth` | `POST /login`（限流+scrypt+JWT+会话+登录日志）、`GET /me`、`GET /menus`（admin 全量/否则按角色）、`POST /heartbeat`、`POST /logout` |
| [dashboard.js](file:///workspace/file-preview-demo/admin-server/src/routes/dashboard.js) | `/api/v1/dashboard` | `GET /statistics`（user/role/menu/todayVisit 计数） |
| [logs.js](file:///workspace/file-preview-demo/admin-server/src/routes/logs.js) | `/api/v1/logs` | 操作日志 list/delete/export；在线会话 list/kick/batchKick/cleanExpired；登录日志 list/delete/export（CSV 导出限 10000） |
| [system.js](file:///workspace/file-preview-demo/admin-server/src/routes/system.js) | `/api/v1/system` | 用户/角色/菜单/组织/参数 CRUD + 角色权限分配 + 用户状态/重置密码；大量 zod + `authorize('system:xxx:yyy')` + `withTransaction` |
| [ai.js](file:///workspace/file-preview-demo/admin-server/src/routes/ai.js) | `/api/v1/ai` | `POST /chat/stream`（multipart，≤5文件/10MB/20MB/30条历史；`application/x-ndjson` 流，事件 start/thinking/delta/done/error；AbortController 取消） |

### 7.5 服务层 [services/ai.js](file:///workspace/file-preview-demo/admin-server/src/services/ai.js)

`streamAiCompletion({messages, signal, onDelta, onThinking})`：无 KEY→503；POST `${AI_GATEWAY_BASE_URL}/chat/completions`（`stream:true`、`reasoning_effort:'xhigh'`、固定 Markdown system message）；解析 SSE，`delta.reasoning_content`→onThinking，`delta.content`→onDelta；非流式 JSON 一次性 onDelta。**对接外部 AI 网关的 SSE 转发，不涉及知识库 RAG**。

### 7.6 工具层 [utils/](file:///workspace/file-preview-demo/admin-server/src/utils)

| 文件 | 关键函数 |
| --- | --- |
| [data.js](file:///workspace/file-preview-demo/admin-server/src/utils/data.js) | `formatDateTime`、`toCamelRow`（snake→camel）、`buildTree`、`pagination`（pageSize 1~100）、`placeholders` |
| [password.js](file:///workspace/file-preview-demo/admin-server/src/utils/password.js) | `hashPassword`/`verifyPassword`（**scrypt** + 16字节盐 + `timingSafeEqual`，格式 `scrypt$<saltHex>$<derivedHex>`） |
| [response.js](file:///workspace/file-preview-demo/admin-server/src/utils/response.js) | `ok(res,data,message)` → `{code:0,message,data}`；`page(res,list,total,...)` |
| [security.js](file:///workspace/file-preview-demo/admin-server/src/utils/security.js) | `maskSensitive`（password/token/secret→`******`）、`getClientIp`、`parseUserAgent` |

### 7.7 数据库 Schema [sql/](file:///workspace/file-preview-demo/admin-server/sql)

**[001_init_admin_schema.sql](file:///workspace/file-preview-demo/admin-server/sql/001_init_admin_schema.sql)**：utf8mb4、InnoDB、`DATETIME(3)`、统一审计字段 + 逻辑删除。10 张表：

| 表 | 说明 |
| --- | --- |
| `sys_org` | 组织（树，ancestors 祖级路径） |
| `sys_role` | 角色（role_key 唯一，data_scope 1-5） |
| `sys_user` | 用户（username/phone/email 唯一，password_hash，last_login_*） |
| `sys_menu` | 菜单/按钮（menu_type M/C/F，permission 唯一，path/component/route_name） |
| `sys_user_role` | 用户-角色（多对多，CASCADE） |
| `sys_role_menu` | 角色-菜单（多对多，CASCADE） |
| `sys_param` | 系统参数（param_key 唯一，value_type string/number/boolean/json） |
| `sys_operation_log` | 操作日志（trace_id，JSON params/response，duration_ms） |
| `sys_login_log` | 登录日志（browser/os/status/message） |
| `sys_user_session` | 在线会话（session_id=JWT jti，status ACTIVE/LOGOUT/KICKED/EXPIRED） |

种子数据：组织树、5 角色（admin/user/editor/auditor/guest）、超管 `admin/123456`（scrypt，重复执行不覆盖已改密码）、菜单树（含按钮权限如 `system:user:add`）、admin 全权限、12 条系统参数。

**[002](file:///workspace/file-preview-demo/admin-server/sql/002_add_operation_log_params.sql)** / **[003](file:///workspace/file-preview-demo/admin-server/sql/003_add_online_sessions.sql)**：幂等迁移，补 `sys_operation_log` 的 params/response 列、建 `sys_user_session` 表、追加在线用户菜单与权限。

### 7.8 测试

- [tests/health.test.js](file:///workspace/file-preview-demo/admin-server/tests/health.test.js)：HTTP 契约（/health、404、未带 token 一律 401）。
- [test/app.test.js](file:///workspace/file-preview-demo/admin-server/test/app.test.js)：`setDb(mockDb)` 注入，跑登录→me→menus 全链路、统计、心跳/登出后会话失效。

## 8. 知识库后端 server/ 详解

### 8.1 入口 [server/index.js](file:///workspace/file-preview-demo/server/index.js)

- 端口 **8787**（`KNOWLEDGE_AGENT_PORT` > `PORT` > 8787），监听 `127.0.0.1`。
- 中间件：`express.json({limit:'20mb'})` + 自定义 CORS + `asyncHandler` + 错误处理。
- SSE 辅助：`setupSse(res)`、`writeSse(res,event,data)`。

| 方法 | 路径 | 功能 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/knowledge/files` | 文件列表 |
| POST | `/api/knowledge/folder` | 设置目录并扫描索引 |
| POST | `/api/knowledge/refresh` | 重新扫描 |
| POST | `/api/knowledge/files/text` | 新增 Markdown 文档 |
| POST | `/api/knowledge/files/upload` | base64 上传文件 |
| DELETE | `/api/knowledge/files/:id` | 删除文件+索引 |
| GET/POST | `/api/knowledge/search` | 关键词/语义检索 |
| POST | `/api/knowledge/summary` | 非流式总结 |
| POST | `/api/knowledge/summary/stream` | **SSE 流式总结**（meta/token/done/error） |
| POST | `/api/chat` | 非流式对话 |
| POST | `/api/chat/stream` | **SSE 流式对话**（references/token/meta/done/error） |
| GET/PUT | `/api/config` | 查询/保存 AI 配置 |
| POST | `/api/config/test` | 测试 AI 连接 |

### 8.2 文档服务 [documentService.js](file:///workspace/file-preview-demo/server/documentService.js)

- 支持 `.md/.pdf/.ppt/.pptx/.doc/.docx`；`CHUNK_SIZE=900`，`CHUNK_OVERLAP=120`。
- `extractText`：按扩展名分流（md→readFile；docx→mammoth；doc→word-extractor；pdf/pptx→officeparser 带 120s 超时；ppt→读 buffer 抽 ASCII/UTF-16 字符串）。
- `scanFolder(folderPath)`：增量扫描（size + mtimeMs + extractorVersion 三字段判断变更，未变更复用分块）→ 抽取 → 分块（randomUUID chunkId）→ 写库 → 重建向量索引。
- `searchKnowledge(query, topK)`：配置远程 embedding→`requestEmbeddings`+`searchVectorIndex`；否则 `searchIndex`（本地哈希）。
- `chatWithKnowledge` / `streamChatWithKnowledge`：onlyKb 先检索命中，远程 chat→LLM，本地→规则文案/模拟流式切片。
- `summarizeKnowledge` / `streamSummaryKnowledge`：同理。
- `saveConfig`：embedding 配置变更时自动 `rebuildVectorIndex`。
- 路径安全：`isSubPath` 防路径穿越。

### 8.3 向量索引 [vectorIndex.js](file:///workspace/file-preview-demo/server/vectorIndex.js)

- **本地哈希向量**：FNV-1a 变种哈希（`hashToken`），`DIMENSION=256` 维累加 + L2 归一化。
- `tokenize`：小写化 + ASCII 词 + CJK 单字 + bigram shingles 提升语义。
- `cosineSimilarity`（向量已归一化，等价点积）。
- **支持真实 Embedding**：`buildIndexFromVectors(chunks, vectors, provider)`。
- 关键函数：`vectorize`、`buildIndex`、`buildIndexFromVectors`、`searchIndex`、`searchVectorIndex`。

### 8.4 LLM 服务 [llmService.js](file:///workspace/file-preview-demo/server/llmService.js)

OpenAI 兼容 API（baseUrl 末尾去斜杠拼 `/chat/completions` 与 `/embeddings`）。
- `hasRemoteChatConfig` / `hasRemoteEmbeddingConfig`：配置判断。
- `requestChatCompletion` / `requestChatCompletionStream`：对话（流式用 `readOpenAiStream` 解析 SSE）。
- `generateKnowledgeAnswer(Stream)` / `generateKnowledgeSummary(Stream)`：知识库问答/总结，`buildKnowledge*Messages` 拼 system+user。
- `requestEmbeddings`：批量（DashScope 自动加 `encoding_format:'float'`，按版本分批 10/25/100），`withRetry` 重试 2 次（429/5xx）。
- `isDashScopeCompatibleUrl`：阿里云百炼兼容判断。
- `testAiConfig`：chat + embedding 连通性测试。

### 8.5 存储 [storage.js](file:///workspace/file-preview-demo/server/storage.js)

- `dataDir = server/data/`；`knowledge-db.json`（folderPath/files/chunks/config）、`vector-index.json`。
- `readJson`（ENOENT 写 fallback）、`writeJson`（**原子写入**：tmp + rename）、`readDb/writeDb`（自动 updatedAt）。

## 9. Chrome 扩展 [chrome-extension/](file:///workspace/file-preview-demo/chrome-extension)

**[manifest.json](file:///workspace/file-preview-demo/chrome-extension/manifest.json)**：MV3，权限 `bookmarks/tabs/scripting`，host_permissions 仅 `localhost/127.0.0.1`，content script `document_idle` 注入。

**数据流（双向 postMessage 桥接）**：
```
前端页面 postMessage(EXT_GET_ALL)
  → content.js chrome.runtime.sendMessage(GET_ALL)
  → background.js chrome.bookmarks.getTree + chrome.tabs.query → flattenBookmarkTree
  → content.js postMessage(EXT_ALL_RESULT, {bookmarks, tabs})
  → 前端 useBookmarkStore 渲染
```
- [background.js](file:///workspace/file-preview-demo/chrome-extension/background.js)：`flattenBookmarkTree`（树拍平）、`getOpenTabs`，处理 GET_BOOKMARKS/GET_TABS/GET_ALL。
- [content.js](file:///workspace/file-preview-demo/chrome-extension/content.js)：监听 `EXT_*` 转 `chrome.runtime`，注入完成发 `EXT_READY`。
- [popup.js](file:///workspace/file-preview-demo/chrome-extension/popup.js)：点按钮 `chrome.scripting.executeScript` 向页面注入 `EXT_GET_ALL`。

## 10. 依赖关系

### 10.1 前端组件依赖

```
main.js → vue / element-plus / @element-plus/icons-vue / vuex / router / FileViewer
App.vue → vue-router
AdminLayout → store / useSessionHeartbeat / MenuItem（递归）
Login → store(login/bootstrap)
所有 system/ 与 log/ 视图 → @/api/* + element-plus(ElMessage/ElMessageBox) + v-permission
Dashboard → @/api/dashboard + useBookmarkStore + useExtensionDownload
KnowledgeAgent → 原生 fetch（直连 8787）+ 自研 markdown
ai/chat → @/api/ai(streamChat) + @/utils/markdown
MyMap → @antv/l7 + @antv/l7-maps
MyCesium → 全局 Cesium + zondy（index.html 引入）
AngryBirds → 纯 Canvas 2D + WebAudio
VRDemo → three + three/addons（OrbitControls/EffectComposer/UnrealBloomPass）
LanTransfer/LanVideo → WebRTC API
```

### 10.2 后端依赖

```
admin-server
  app.js → express5 / helmet / cors / pino-http / 各 routes
  routes → middleware(auth/error/operation-log) / utils / services/ai
  db → mysql2/promise 连接池
  services/ai → 外部 AI 网关（aigateway.claudeoffice.com）

server/（知识库）
  index.js → express4 / documentService
  documentService → fs / mammoth / word-extractor / officeparser / vectorIndex / llmService / storage
  vectorIndex → 纯算法（crypto 无依赖）
  llmService → fetch（OpenAI 兼容）
  storage → fs（JSON 原子写入）
```

### 10.3 前后端边界

| 前端模块 | 后端 | 说明 |
| --- | --- | --- |
| `@/api/*`（除 ai） | admin-server `/api/v1/*` | 走 request.js + vite 代理 |
| `@/api/ai` streamChat | admin-server `/api/v1/ai/chat/stream` | 自实现 fetch 流式 |
| KnowledgeAgent | 知识库 server `/api/*`（8787） | 直连，不走代理 |
| MyCesium/MyMap | 地图服务 + GeoJSON | fetch 边界数据 |
| VRDemo | 第三方文生图 | `trae-api-cn.mchost.guru` |

## 11. 运行方式

### 11.1 前端

```bash
cd file-preview-demo
npm install
npm run dev        # Vite 开发 → http://localhost:5173
npm run build      # 生产构建 → dist/
npm run preview    # 预览构建产物
```

### 11.2 admin-server 后端

```bash
cd file-preview-demo/admin-server
npm install
# 1. 准备 MySQL，执行 sql/ 下三个脚本初始化库表与种子数据
# 2. 复制 .env.example → .env，按需修改（端口/CORS/DB/JWT/AI）
npm run dev        # node --watch server.js（开发热重启）
npm start          # node server.js
npm test           # vitest run
```
默认 `admin / 123456` 登录。

### 11.3 知识库后端

```bash
cd file-preview-demo
npm run server     # node server/index.js → http://127.0.0.1:8787
# 可用 KNOWLEDGE_AGENT_PORT 环境变量改端口
# AI 对话/总结需在页面配置 OpenAI 兼容 API 的 baseUrl/apiKey/model
```

### 11.4 Chrome 扩展

- 开发：Chrome → `chrome://extensions` → 开发者模式 → 加载 `chrome-extension/` 目录。
- 或在前端 Dashboard 页点「下载扩展」按钮（`useExtensionDownload` 打包 zip）。
- 仅对 `localhost/127.0.0.1` 页面生效。

---

# 第二部分 · liquid-glass-studio

## 1. 项目定位
电影感数字工作室官网展示页（品牌 "Aperture Studio"），单页双屏滚动，主打精确排版、液态玻璃质感、framer-motion 动效。

## 2. 技术栈
React 19.1 + react-dom 19.1（StrictMode）｜Vite 8.1 + @vitejs/plugin-react 6｜TypeScript ~5.8.3（project references）｜Tailwind 3.4 + PostCSS + autoprefixer｜framer-motion 12.42｜字体 Instrument Serif + Barlow（Google Fonts）。无路由库、无状态库。

## 3. 目录结构
```
liquid-glass-studio/
├── index.html              # 预加载字体，theme-color 纯黑
├── vite.config.ts          # 仅 react 插件
├── tailwind.config.js      # 扩展字体族 font-heading/font-body
├── src/
│   ├── main.tsx            # createRoot + StrictMode
│   ├── App.tsx             # 单页主结构（hero + capabilities）
│   ├── index.css           # 液态玻璃 + 遮罩 + 动效降级
│   └── components/
│       ├── BlurText.tsx    # 逐词模糊入场
│       ├── FadingVideo.tsx # 视频淡入淡出循环
│       └── Icons.tsx       # 内联 SVG 图标集
```

## 4. 关键组件

| 组件 | 职责 | 关键实现 |
| --- | --- | --- |
| [App.tsx](file:///workspace/liquid-glass-studio/src/App.tsx) | 单页主结构 | 模块级常量数据；`useReducedMotion` 降级；`motionProps(delay)` 工厂；`#hero`（全屏视频+玻璃导航+BlurText 大标题）+ `#capabilities`（三列玻璃卡片 `whileInView` 逐卡入场） |
| [BlurText.tsx](file:///workspace/liquid-glass-studio/src/components/BlurText.tsx) | 逐词模糊入场 | `useInView` + `useReducedMotion`；按空格切词，每词 `motion.span` blur(10px)→0 + y 位移 + delay=index*0.1 |
| [FadingVideo.tsx](file:///workspace/liquid-glass-studio/src/components/FadingVideo.tsx) | 视频淡入淡出循环 | rAF 批量改 opacity；单源回放、多源轮播；结尾前 0.55s 提前淡出衔接 |
| [Icons.tsx](file:///workspace/liquid-glass-studio/src/components/Icons.tsx) | 内联 SVG 图标 | ArrowUpRight/Play/Clock/Globe/Image/Movie/Lightbulb，`currentColor` 继承 |

## 5. 亮点
- **液态玻璃**：`.liquid-glass` 用 `backdrop-filter: blur()` + `background-blend-mode` + `::before` mask-composite 描边光晕，无 UI 库依赖。
- **无障碍动效降级**：`useReducedMotion` + CSS `@media (prefers-reduced-motion)` 双保险。
- **零运行时依赖**（除 framer-motion/react）：图标全内联 SVG。

## 6. 运行
```bash
cd liquid-glass-studio
npm install
npm run dev        # vite 开发
npm run build      # tsc -b && vite build
npm run preview
```

---

# 第三部分 · lumora-focus

## 1. 项目定位
多页面品牌展示集合，含 3 个独立子站点（共享 SPA）：
- **Lumora**（`/`）：注意力保护产品落地页。
- **Foldcraft**（`/foldcraft`）：创意工作室品牌页。
- **MicroVisuals**（`/microvisuals`）：AI 创意工具页（视频帧捕获 + canvas 摆动回放 + 鼠标视差）。

## 2. 技术栈
React 19.1 + Vite 8.1 + TS ~5.8.3｜Tailwind 3.4（默认 borderRadius 改 9999px）｜gsap 3.13（命令式视差）｜lucide-react 0.468（图标）｜字体 Instrument Serif + Geist + Dirtyline。无路由库（`window.location.pathname` 手写分发）。

## 3. 目录结构
```
lumora-focus/
├── index.html
├── vite.config.ts
├── tailwind.config.js      # 扩展字体 + 默认圆角
├── src/
│   ├── main.tsx
│   ├── App.tsx             # 三页面组件 + pathname 分发
│   └── index.css           # 玻璃 + hero-tone 深浅切换 + keyframes
```
> 无独立 components 目录，所有 UI 内联在 App.tsx 三页面组件中。

## 4. 关键页面（[App.tsx](file:///workspace/lumora-focus/src/App.tsx)）

| 页面 | 关键状态 | 亮点 |
| --- | --- | --- |
| `LumoraPage` | activeVideo/isTransitioning/menuOpen/submitted/darkContent | 4 视频叠放 opacity 切换 + 1s 过渡锁；`.hero-tone.is-dark` 按视频明暗切文字色；邮件表单 |
| `FoldcraftPage` | mobileMenuOpen | 全屏视频 + `animate-[fadeSlideUp]` 逐项入场；跨站导航 |
| `MicroVisualsPage` | mounted/framesReady/framesRef | ⭐ `requestVideoFrameCallback` 逐帧 drawImage 到离屏 canvas 数组 → rAF 在 displayCanvas 来回摆动回放；gsap 鼠标视差带阻尼（0.06）+ 预放大 1.08 防露边 |

## 5. 亮点
- **视频帧捕获 + canvas 摆动回放**：动态静帧创意效果，优先 `requestVideoFrameCallback` 更精准。
- **hero-tone 深浅自适应**：按当前视频明暗切换整组文字色与玻璃描边。
- **gsap 命令式视差**：与 liquid-glass 的声明式 framer-motion 形成对比。

## 6. 运行
```bash
cd lumora-focus
npm install
npm run dev / npm run build / npm run preview
```

---

# 第四部分 · todo-app-hbuilderx

## 1. 项目定位
实用型待办清单多端应用（appid `__UNI__AF06707`），基于 uni-app + Vue 3，面向 H5/微信/支付宝/百度/头条小程序/5+App。主打日历视图待办管理、任务统计、归档管理。设计稿 375px（1px=2rpx）。

## 2. 技术栈
uni-app（HBuilderX 工程）+ Vue 3（`createSSRApp`）｜自研轻量 store（Vue3 `reactive` + `uni.storage`）｜原生 CSS + uni.scss 全局变量｜大量跨端条件编译（`#ifdef H5`/`#ifndef H5`）。无第三方 npm 依赖。

## 3. 目录结构
```
todo-app-hbuilderx/
├── manifest.json          # 多端配置（权限/版本/SDK）
├── pages.json             # 4 页注册 + custom 导航栏 + 暗色背景
├── main.js                # Vue2/Vue3 条件编译入口
├── App.vue                # onLaunch initStore + 全局样式
├── uni.scss               # 色系/圆角/阴影/字号 SCSS 变量
├── store/todo.js          # ⭐ 响应式状态 + storage 持久化 + CRUD/归档
├── components/
│   ├── TabBar.vue         # 自定义底部 Tab（H5 SVG / 非 H5 emoji）
│   ├── SystemCapsule.vue  # 仿微信胶囊（纯装饰）
│   └── Icon.vue           # 图标（H5 SVG / 非 H5 文字兜底）
└── pages/
    ├── calendar-home/     # 首页：日历 + 待办列表
    ├── add-task/          # 新建任务表单
    ├── task-stats/        # 数据统计
    └── archive/           # 归档管理
```

## 4. 状态管理 [store/todo.js](file:///workspace/todo-app-hbuilderx/store/todo.js)

`export const state = reactive({ tasks, archivedTasks, selectedDate, calendarMode })` 全局单例，各页面直接 `import { state }` 绑定 `data()` 即响应式。
- 持久化：`STORAGE_KEY='todo_app_tasks'`、`ARCHIVE_KEY='todo_app_archived'`，每次变更同步 `uni.setStorageSync`。
- 常量：`TAGS`（工作/生活/学习/健康/购物，各带 color+bg）、`PRIORITIES`（high/medium/low）。
- 方法：`addTask`/`toggleTask`/`deleteTask`/`setSelectedDate`/`setCalendarMode`；归档 `getCompletedTasks`/`getArchivedTasks`/`archiveTask`/`restoreTask`/`unarchiveTask`/`deleteArchivedTask`/`archiveAllCompleted`/`clearAllArchived`。

## 5. 关键页面

| 页面 | 职责 | 关键 computed/方法 |
| --- | --- | --- |
| [calendar-home](file:///workspace/todo-app-hbuilderx/pages/calendar-home/calendar-home.vue) | 日历 + 当日待办 | `calendarDays`（6行42格网格）、`weekDays`、`groupedTasks`（上午/下午分组）；`selectDay`/`prevMonth`/`nextMonth`/`goAddTask` |
| [add-task](file:///workspace/todo-app-hbuilderx/pages/add-task/add-task.vue) | 任务表单 | 标题/日期/时间/标签/优先级/提醒；`pickDate`/`pickTime`（H5 原生 input / 非 H5 showModal 手输）；`handleSave` 校验→addTask→navigateBack |
| [task-stats](file:///workspace/todo-app-hbuilderx/pages/task-stats/task-stats.vue) | 统计可视化 | `stats`（总数/完成率/byTag）、`weekData`/`monthData`；环形图（H5 SVG / 非 H5 conic-gradient）+ 柱状图（纯 CSS） |
| [archive](file:///workspace/todo-app-hbuilderx/pages/archive/archive.vue) | 归档管理 | 已完成/已归档双 Tab；恢复/归档/删除 + 批量；二次确认 |

## 6. 跨端兼容

| 差异点 | H5 | 非 H5 |
| --- | --- | --- |
| SVG 图标 | 内联 `<svg>` | emoji/文字兜底 |
| 日期/时间选择 | `<input type="date/time">` | `uni.showModal` 手输 |
| 环形图 | SVG `<circle>` + stroke-dasharray | `conic-gradient` |

## 7. 亮点
- 轻量自研 store（无 Vuex/Pinia）。
- 完整归档状态机：未完成→已完成→已归档→彻底删除。
- 纯 CSS/SVG 统计可视化，无图表库。
- `env(safe-area-inset-*)` + `constant()` 双写适配刘海屏。

## 8. 运行
工程无 package.json，依赖 HBuilderX：
- 运行：HBuilderX「运行 → 运行到浏览器/小程序模拟器/手机或模拟器」。
- 发行：HBuilderX「发行 → 网站-H5 / 小程序 / App 云打包」。

---

# 附录

## A. 各项目运行命令汇总

| 项目 | 安装 | 开发 | 构建 | 测试 |
| --- | --- | --- | --- | --- |
| file-preview-demo（前端） | `npm install` | `npm run dev` | `npm run build` | — |
| file-preview-demo（admin-server） | `cd admin-server && npm install` | `npm run dev` | — | `npm test` |
| file-preview-demo（知识库） | （同前端） | `npm run server` | — | — |
| liquid-glass-studio | `npm install` | `npm run dev` | `npm run build` | — |
| lumora-focus | `npm install` | `npm run dev` | `npm run build` | — |
| todo-app-hbuilderx | （HBuilderX） | HBuilderX 运行 | HBuilderX 发行 | — |

## B. 端口与默认凭据

| 服务 | 端口 | 备注 |
| --- | --- | --- |
| file-preview-demo 前端 | 5173 | vite dev，0.0.0.0 可局域网访问 |
| admin-server | 8788 | 默认账号 `admin / 123456` |
| 知识库 server | 8787 | 仅 127.0.0.1，无鉴权 |
| ConfigEditor iframe | 3000 | 外部 config-editor.html |

## C. 关键设计点与注意事项

1. **动态路由**：前端路由由后端菜单树驱动（`menuTreeToRoutes`），`menuType` C=页面/F=按钮，`component` 字段映射 `views/components` 目录；新增页面需在后端菜单表配置 `component` 路径。
2. **JWT + 服务端会话双校验**：admin-server 不只验 JWT，还查 `sys_user_session` 状态，支持强制下线/失效。
3. **权限双控制**：菜单可见性（后端）+ `v-permission`（前端按钮，admin 旁路）。
4. **两套后端职责分离**：admin-server（规范化企业管理，MySQL）与 server/（轻量 RAG，JSON）端口相邻但互不依赖；前端 `@/api/*` 走代理到 admin-server，KnowledgeAgent 直连 server/。
5. **知识库本地降级**：未配置 AI Key 时，对话/总结/检索全回退本地（哈希向量 + 规则文案 + 模拟流式），开箱可用。
6. **Cesium 依赖内网**：MyCesium 的中地大楼/湖北省图层 URL 指向内网 `10.10.130.72`，外部无法访问；Cesium 资源由 index.html 异步加载。
7. **WebRTC 手动信令**：LanTransfer/LanVideo 用手动复制粘贴 SDP，适合演示/局域网；生产应加 WebSocket 信令。
8. **知识库后端无鉴权**：server/ API 无身份验证，仅本地回环，勿直接暴露公网。
9. **编码风格**：前端统一 `<script setup>`；FilePreview 早期 Options API 已迁移为 setup；server/ 为 CommonJS，admin-server 为 ESM。
10. **uni-app 跨端降级**：todo-app 大量条件编译处理 H5 与小程序差异（SVG/选择器/图表）。

## D. 文档索引

| 文档 | 路径 | 说明 |
| --- | --- | --- |
| 工作区 README | [README.md](file:///workspace/README.md) | 主项目视角总览 |
| 旧架构文档 | [ARCHITECTURE.md](file:///workspace/file-preview-demo/ARCHITECTURE.md) | 部分已过时（未含 admin-server/动态路由/store） |
| 知识库后端说明 | [server/README.md](file:///workspace/file-preview-demo/server/README.md) | 知识库 API |
| 阿里云百炼 | [server/ALIYUN_BAILIAN.md](file:///workspace/file-preview-demo/server/ALIYUN_BAILIAN.md) | Embedding 集成 |
| Aperture 设计 | [liquid-glass-studio/DESIGN.md](file:///workspace/liquid-glass-studio/DESIGN.md) | 液态玻璃设计系统 |
| Lumora 设计 | [lumora-focus/DESIGN.md](file:///workspace/lumora-focus/DESIGN.md) | 三站点设计系统 |
| 待办技术文档 | [todo-app-hbuilderx/项目技术文档.md](file:///workspace/todo-app-hbuilderx/项目技术文档.md) | uni-app 待办应用 |
| **本 Code Wiki** | [CODE_WIKI.md](file:///workspace/CODE_WIKI.md) | 全工作区结构化文档 |
