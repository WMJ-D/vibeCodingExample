# 中后台管理示例系统

一个基于 Vue 3、Vite、Element Plus 构建的中后台管理示例项目，内置常见管理后台页面、文件预览、地图可视化、配置编辑器、浏览器插件示例、WebRTC P2P 文件互传与局域网视频查看、AI 知识库智能体等功能。

## 项目定位

本项目适合作为中后台管理系统原型、前端功能演示项目或业务后台二次开发基础。项目重点覆盖以下能力：

- 标准后台布局、路由、菜单与登录拦截
- 用户、角色、菜单、组织、参数等系统管理页面
- 表单、表格、分页、搜索、新增、编辑、删除等后台高频交互
- 文件本地预览能力
- ECharts 数据看板展示
- AntV L7 地图行政边界可视化
- Cesium 三维地图可视化与路径漫游
- Chrome 浏览器插件示例
- WebRTC P2P 局域网文件传输
- WebRTC P2P 局域网视频查看
- AI 知识库智能体（文档管理、检索、对话、总结）
- 外部配置编辑器 iframe 集成

## 技术栈

| 类别 | 技术 | 说明 |
| --- | --- | --- |
| 前端框架 | Vue 3 | Composition API (`<script setup>`) 为主 |
| 构建工具 | Vite | 开发与构建，HMR |
| UI 框架 | Element Plus | 组件库 + 中文语言包 |
| 路由 | Vue Router | Hash 模式 |
| 图表 | ECharts | 数据大屏可视化 |
| 地图 2D | @antv/l7 + @antv/l7-maps | 行政边界可视化（高德底图） |
| 地图 3D | zondy SDK + Cesium | 三维地图、模型加载、漫游 |
| 文件预览 | @flyfish-group/file-viewer3 | 多格式文件预览（可选） |
| Office 解析 | mammoth + word-extractor + officeparser | 文档内容提取 |
| CSS 预处理 | Sass-embedded | SCSS，全局注入 Element Plus 主题变量 |
| 后端框架 | Express | 知识库 API 服务 |
| 浏览器 P2P | WebRTC | 局域网文件传输与视频推流 |
| 浏览器插件 | Chrome Extension | Manifest V3 扩展示例 |

## 目录结构

```text
vibeCodingExample/
├─ README.md
└─ file-preview-demo/
   ├─ chrome-extension/            # Chrome 扩展（书签 & 标签页助手）
   ├─ public/
   │  └─ chrome-extension/         # 可被前端访问/下载的插件资源
   ├─ server/                      # 知识库后端服务（Express）
   │  ├─ index.js                  #   服务入口，路由定义
   │  ├─ documentService.js        #   文档服务：扫描、检索、总结、对话
   │  ├─ vectorIndex.js            #   向量索引：本地哈希 + 余弦相似度
   │  ├─ llmService.js             #   LLM 调用：OpenAI 兼容 API
   │  ├─ storage.js                #   JSON 文件存储
   │  └─ data/                     #   数据目录（运行时生成）
   ├─ src/
   │  ├─ components/               # 通用演示组件
   │  │  ├─ FilePreview.vue        #   多类型文件预览
   │  │  ├─ ListPage.vue           #   标准 CRUD 列表页
   │  │  └─ ChartDashboard.vue     #   数据大屏（ECharts 多图表）
   │  ├─ composables/              # 组合式逻辑
   │  │  ├─ useBookmarkParser.js   #   书签解析
   │  │  ├─ useBookmarkStore.js    #   书签状态管理
   │  │  └─ useExtensionDownload.js #  Chrome 扩展打包下载
   │  ├─ layout/
   │  │  └─ AdminLayout.vue        # 后台整体布局
   │  ├─ router/
   │  │  └─ index.js               # 路由配置 + 登录拦截守卫
   │  ├─ styles/                   # 全局样式与 Element Plus 主题定制
   │  └─ views/                    # 业务页面
   │     ├─ agent/                 #   知识库智能体
   │     ├─ config/                #   配置编辑器集成
   │     ├─ dashboard/             #   首页仪表盘
   │     ├─ demo/                  #   P2P 文件互传、局域网视频、Cesium 三维地图
   │     ├─ log/                   #   操作日志、登录日志
   │     ├─ login/                 #   登录页
   │     ├─ system/                #   用户、角色、菜单、组织、参数管理
   │     └─ MyMap.vue              #   L7 地图可视化页面
   ├─ index.html
   ├─ package.json
   ├─ vite.config.js
   ├─ ARCHITECTURE.md              # 代码架构文档
   └─ PROJECT_STRUCTURE.md         # 项目结构说明
```

## 核心功能说明

### 1. 后台基础框架

系统采用典型中后台布局，包含登录页、侧边菜单、顶部区域、内容区与路由页面。

- 登录页：提供基础登录入口，用户名密码默认填充 `admin / 123456`。
- 路由拦截：未登录访问业务页面时会跳转到登录页。
- 路由模式：Hash 模式（`createWebHashHistory`），兼容性好，无需服务端配置。
- 动态标题：根据路由 `meta.title` 自动设置浏览器标题。
- 主题定制：Element Plus 命名空间 `ep`，主色调 `green`，支持暗色模式变量。
- 菜单页面：覆盖首页、系统管理、日志管理、演示功能、配置编辑器等模块。

### 2. 系统管理模块

系统管理模块包含以下页面，均遵循统一 CRUD 模式（搜索 + 表格 + 分页 + 弹窗表单）：

- 用户管理：用户名/手机号查询、状态即时切换、密码重置、角色选择、组织归属
- 角色管理：CRUD + 权限分配树（`el-tree` 多选）
- 菜单管理：树形表格，支持三种菜单类型（目录 M / 菜单 C / 按钮 F）
- 组织管理：树形表格，支持指定上级组织、展开/折叠
- 参数管理：键值对管理，系统内置(Y) / 自定义(N) 分类

### 3. 日志管理

- 操作日志：批量删除、导出、时间范围筛选、操作类型彩色标签
- 登录日志：登录地点/浏览器/OS/状态、批量删除、导出

### 4. 文件预览功能

文件预览页面支持用户在浏览器中选择本地文件并直接预览，不需要上传到服务器。

当前支持：

- 图片预览（支持预览大图）
- 视频预览
- 音频预览
- PDF 预览
- 文本类文件预览
- JSON、Markdown、HTML、CSS、JavaScript、Vue、Python、Java、C/C++、Go、Rust 等常见文本文件识别
- 文件名、类型、大小展示

### 5. 地图功能

#### L7 行政边界可视化

基于 AntV L7 与高德底图实现行政边界可视化展示：

- 行政区块填色展示、边界线高亮、未定边界虚线标识
- 墙体效果图层
- 图例开关控制图层显隐
- 点击行政区块查看名称与编号

#### Cesium 三维地图

基于 zondy SDK + Cesium 的三维地图可视化：

- 多图层控制：天地图影像/矢量、建筑模型、省区图层、体积云、热力图、点标注、行政区划线
- 路径漫游：开始/暂停/停止，支持循环动画
- 动态圆特效跟随漫游位置

### 6. Chrome 浏览器插件

项目包含 Chrome 浏览器插件示例（Manifest V3），位于 `chrome-extension` 与 `public/chrome-extension` 目录。

插件能力：

- 读取浏览器书签树、获取当前标签页列表
- 通过 content script 注入数据到管理后台页面
- 支持 popup 弹窗查看书签和标签页
- 权限：`bookmarks`、`tabs`、`scripting`

### 7. 书签解析功能

项目包含书签解析相关组合式逻辑与示例数据，可处理浏览器导出的 HTML 书签文件：

- 解析浏览器书签 HTML，转换为前端数据结构
- 提供书签状态管理逻辑
- 可与插件能力结合，扩展为书签导入、整理、预览等功能

### 8. P2P 局域网文件互传

基于 WebRTC DataChannel 实现浏览器之间的 P2P 文件传输：

- 浏览器与浏览器直连，文件数据不经过业务服务器
- 支持任意类型文件、文件拖拽选择、多文件待发送队列
- 文件分片传输（16KB/片）、传输进度展示
- 手动复制 Offer / Answer 完成信令交换
- 发送与接收历史记录，接收完成后可保存下载

### 9. P2P 局域网视频查看

基于 WebRTC MediaStream 实现 A 端摄像头视频推送到 B 端浏览器查看：

- A 端打开摄像头，B 端实时查看
- 本地/远程双画面预览
- 手动信令交换，支持连接状态展示与重置

### 10. 数据大屏

数据大屏页面基于 ECharts 展示图表能力，包含 4 个图表实例：

- 统计卡片（总销售额、订单数、用户数、转化率）
- 月度销售额趋势（柱状图/折线图可切换）
- 用户地域分布（环形饼图）
- 周订单趋势、用户活跃趋势
- 热门商品 TopN 表格

### 11. AI 知识库智能体

知识库智能体页面提供完整的文档管理与 AI 问答能力：

- 文件管理：支持 `.md/.pdf/.ppt/.pptx/.doc/.docx` 导入
- 知识搜索：关键词模式 + 语义模式，返回相关度评分
- AI 对话：支持"仅基于知识库"模式，流式输出（SSE）
- 智能总结：可选当前已选文件或整个知识库
- AI 配置：支持 OpenAI 兼容 API，可测试连接

后端服务（Express，端口 8787）提供 15 个 API 接口，支持文档索引、向量检索、LLM 调用。

### 12. 配置编辑器

配置编辑器页面通过 iframe 嵌入外部配置编辑器页面（`http://localhost:3000/config-editor.html`），适合接入低代码配置器、JSON 配置编辑器等独立工具。

## 路由页面

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | 登录 | 系统登录入口 |
| `/dashboard` | 首页 | 后台首页与概览 |
| `/system/user` | 用户管理 | 用户查询、新增、编辑、删除 |
| `/system/role` | 角色管理 | 角色维护 + 权限分配 |
| `/system/menu` | 菜单管理 | 树形三级菜单维护 |
| `/system/org` | 组织管理 | 组织结构维护 |
| `/system/param` | 参数管理 | 系统参数维护 |
| `/log/operation` | 操作日志 | 操作记录展示 |
| `/log/login` | 登录日志 | 登录记录展示 |
| `/my-map` | 我的地图 | AntV L7 行政边界可视化 |
| `/demo/file-preview` | 文件预览 | 本地文件预览 |
| `/demo/list-page` | 列表示例 | 标准 CRUD 页面模板 |
| `/demo/chart-dashboard` | 数据大屏 | ECharts 图表看板 |
| `/demo/lan-transfer` | 局域网互传 | WebRTC P2P 文件传输 |
| `/demo/lan-video` | 局域网视频 | WebRTC P2P 视频推流 |
| `/demo/my-cesium` | 我的 Cesium | 三维地图可视化 |
| `/agent/knowledge` | 知识库智能体 | AI 知识库管理与对话 |
| `/config/editor` | 配置编辑器 | iframe 集成外部配置器 |

## 安装与运行

进入项目目录：

```bash
cd vibeCodingExample/file-preview-demo
```

安装依赖：

```bash
npm install
```

启动前端开发环境：

```bash
npm run dev
```

启动知识库后端服务（可选）：

```bash
npm run server
```

构建生产包：

```bash
npm run build
```

预览生产构建：

```bash
npm run preview
```

## 开发说明

### 登录说明

项目包含简单登录拦截逻辑，业务页面会检查本地是否存在 `admin_token`。如果没有 token，会跳转到登录页。

### 地图说明

L7 地图页面依赖在线行政边界 GeoJSON 数据和高德地图底图。Cesium 三维地图部分图层依赖内网服务，外部访问可能受限。

### WebRTC 说明

P2P 文件互传与视频查看功能依赖浏览器 WebRTC 能力，建议使用新版 Chrome、Edge 等现代浏览器。当前采用手动复制 Offer / Answer 方式交换信令，适合演示与局域网场景。生产环境建议增加 WebSocket 信令服务、房间管理、连接鉴权等。

### 知识库智能体说明

知识库智能体后端默认端口 8787，可通过 `KNOWLEDGE_AGENT_PORT` 环境变量配置。需要配置 OpenAI 兼容 API 的 Base URL 和 Key 才能使用 AI 对话和总结功能。

## 浏览器兼容性

推荐环境：

- Chrome 最新版
- Edge 最新版
- 支持 WebRTC、FileReader、Blob、Clipboard API 的现代浏览器

## 项目特点

- 功能覆盖完整，包含后台管理、地图（2D+3D）、插件、文件、P2P、AI 智能体等多个方向
- 页面模块清晰，适合拆分复用
- 技术栈主流，便于二次开发
- 多数功能为纯前端实现，方便本地演示
- 代码结构直观，适合学习中后台项目组织方式
- 含详细架构文档（ARCHITECTURE.md），便于新人快速了解项目
