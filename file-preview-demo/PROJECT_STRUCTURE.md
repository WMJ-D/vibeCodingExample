# file-preview-demo 项目结构

## 项目概览

基于 **Vue 3 + Vite + Element Plus** 的后台管理系统。

## 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue | ^3.4.0 | 前端框架 |
| Vite | ^5.0.0 | 构建工具 |
| Element Plus | ^2.8.0 | UI 组件库 |
| Vue Router | ^4.6.4 | 路由（Hash 模式） |
| @element-plus/icons-vue | ^2.3.0 | 图标库 |

## 目录结构

```
file-preview-demo/
├── index.html                    # 入口 HTML
├── package.json                  # 项目配置
├── vite.config.js                # Vite 配置（@ 别名指向 src）
└── src/
    ├── main.js                   # 应用入口，注册 ElementPlus + 图标 + 路由
    ├── App.vue                   # 根组件，仅包含 <router-view />
    ├── router/
    │   └── index.js              # 路由配置 + 登录拦截守卫
    ├── layout/
    │   └── AdminLayout.vue       # 后台整体布局（侧边栏 + 顶栏 + 内容区）
    ├── views/
    │   ├── login/
    │   │   └── Login.vue         # 登录页
    │   ├── dashboard/
    │   │   └── Dashboard.vue     # 首页/仪表盘
    │   ├── system/               # 系统管理模块
    │   │   ├── UserManage.vue    #   用户管理
    │   │   ├── RoleManage.vue    #   角色管理
    │   │   ├── MenuManage.vue    #   菜单管理
    │   │   ├── OrgManage.vue     #   组织管理
    │   │   └── ParamManage.vue   #   参数管理
    │   └── log/                  # 日志模块
    │       ├── OperationLog.vue  #   操作日志
    │       └── LoginLog.vue      #   登录日志
    └── components/               # 示例/演示组件
        ├── FilePreview.vue       # 文件预览示例
        ├── ListPage.vue          # 列表页示例
        └── ChartDashboard.vue    # 数据大屏（图表展示）示例
```

## 路由结构

| 路径 | 组件 | 说明 |
|------|------|------|
| `/login` | `Login.vue` | 登录页（无需鉴权） |
| `/` → `/dashboard` | `AdminLayout` 包裹 | 默认重定向到首页 |
| `/dashboard` | `Dashboard.vue` | 首页 |
| `/system/user` | `UserManage.vue` | 用户管理 |
| `/system/role` | `RoleManage.vue` | 角色管理 |
| `/system/menu` | `MenuManage.vue` | 菜单管理 |
| `/system/org` | `OrgManage.vue` | 组织管理 |
| `/system/param` | `ParamManage.vue` | 参数管理 |
| `/log/operation` | `OperationLog.vue` | 操作日志 |
| `/log/login` | `LoginLog.vue` | 登录日志 |
| `/demo/file-preview` | `FilePreview.vue` | 文件预览演示 |
| `/demo/list-page` | `ListPage.vue` | 列表页演示 |
| `/demo/chart-dashboard` | `ChartDashboard.vue` | 数据大屏（图表展示）演示 |

## 关键逻辑

- **登录拦截**：路由守卫检查 `localStorage` 中的 `admin_token`，未登录时跳转到 `/login`。
- **布局**：除登录页外，所有页面都嵌套在 `AdminLayout.vue` 布局组件内。
- **路由模式**：使用 Hash 模式（`createWebHashHistory`）。
