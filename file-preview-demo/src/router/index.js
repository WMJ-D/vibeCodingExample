/*
 * @Author: WangMingJun 2351405492@qq.com
 * @Date: 2026-03-23 15:36:15
 * @LastEditors: WangMingJun 2351405492@qq.com
 * @LastEditTime: 2026-06-07 19:34:59
 * @FilePath: \file-preview-demo\src\router\index.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'),
    meta: { title: '登录', keepAlive: false },
  },
  {
    path: '/my-map',
    name: 'MyMap',
    component: () => import('@/views/MyMap.vue'),
    meta: { title: '我的地图', icon: 'Location' },
  },
  {
    path: '/',
    component: () => import('@/layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/Dashboard.vue'),
        meta: { title: '首页', icon: 'HomeFilled' },
      },
      {
        path: 'system/user',
        name: 'UserManage',
        component: () => import('@/views/system/UserManage.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'system/role',
        name: 'RoleManage',
        component: () => import('@/views/system/RoleManage.vue'),
        meta: { title: '角色管理', icon: 'UserFilled' },
      },
      {
        path: 'system/menu',
        name: 'MenuManage',
        component: () => import('@/views/system/MenuManage.vue'),
        meta: { title: '菜单管理', icon: 'Menu' },
      },
      {
        path: 'system/org',
        name: 'OrgManage',
        component: () => import('@/views/system/OrgManage.vue'),
        meta: { title: '组织管理', icon: 'OfficeBuilding' },
      },
      {
        path: 'system/param',
        name: 'ParamManage',
        component: () => import('@/views/system/ParamManage.vue'),
        meta: { title: '参数管理', icon: 'Operation' },
      },
      {
        path: 'log/operation',
        name: 'OperationLog',
        component: () => import('@/views/log/OperationLog.vue'),
        meta: { title: '操作日志', icon: 'Document' },
      },
      {
        path: 'log/login',
        name: 'LoginLog',
        component: () => import('@/views/log/LoginLog.vue'),
        meta: { title: '登录日志', icon: 'Key' },
      },
      {
        path: 'demo/file-preview',
        name: 'FilePreview',
        component: () => import('@/components/FilePreview.vue'),
        meta: { title: '文件预览', icon: 'Picture' },
      },
      {
        path: 'demo/list-page',
        name: 'ListPage',
        component: () => import('@/components/ListPage.vue'),
        meta: { title: '列表示例', icon: 'List' },
      },
      {
        path: 'demo/chart-dashboard',
        name: 'ChartDashboard',
        component: () => import('@/components/ChartDashboard.vue'),
        meta: { title: '数据大屏', icon: 'PieChart' },
      },
      {
        path: 'demo/lan-transfer',
        name: 'LanTransfer',
        component: () => import('@/views/demo/LanTransfer.vue'),
        meta: { title: '局域网互传', icon: 'Connection' },
      },
      {
        path: 'demo/lan-video',
        name: 'LanVideo',
        component: () => import('@/views/demo/LanVideo.vue'),
        meta: { title: '局域网视频', icon: 'VideoCamera' },
      },
      {
        path: 'demo/my-cesium',
        name: 'MyCesium',
        component: () => import('@/views/demo/MyCesium.vue'),
        meta: { title: '我的 Cesium', icon: 'Location', keepAlive: false },
      },
      {
        path: 'demo/angry-birds',
        name: 'AngryBirds',
        component: () => import('@/views/demo/AngryBirds.vue'),
        meta: { title: '愤怒的小鸟', icon: 'Promotion', keepAlive: false },
      },
      {
        path: 'agent/knowledge',
        name: 'KnowledgeAgent',
        component: () => import('@/views/agent/KnowledgeAgent.vue'),
        meta: { title: '知识库智能体', icon: 'Cpu' },
      },
      {
        path: 'config/editor',
        name: 'ConfigEditor',
        component: () => import('@/views/config/ConfigEditor.vue'),
        meta: { title: '配置编辑器', icon: 'Setting' },
      },
    ],
  },
]

function applyDefaultRouteCache(routeList) {
  routeList.forEach(route => {
    if (route.name && route.meta?.keepAlive !== false) {
      route.meta = { ...route.meta, keepAlive: true }
    }
    if (route.children?.length) {
      applyDefaultRouteCache(route.children)
    }
  })
}

applyDefaultRouteCache(routes)

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 简单的登录拦截
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    document.title = to.meta?.title ? `${to.meta.title} - 后台管理` : '后台管理'
    next()
  }
})

export default router
