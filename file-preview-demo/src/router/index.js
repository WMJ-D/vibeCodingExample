import { h } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'

import store from '@/store'

const pageModules = {
  ...import.meta.glob('../views/**/*.vue'),
  ...import.meta.glob('../components/**/*.vue'),
}

const constantRoutes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/Login.vue'),
    meta: { title: '登录', keepAlive: false },
  },
  {
    path: '/',
    name: 'AdminRoot',
    component: () => import('@/layout/AdminLayout.vue'),
    children: [],
  },
]

let removeRouteCallbacks = []

function normalizeComponentPath(component) {
  return String(component || '')
    .replace(/^@\//, '')
    .replace(/^src\//, '')
    .replace(/^\//, '')
}

function resolveComponent(component) {
  const normalized = normalizeComponentPath(component)
  return pageModules[`../${normalized}`]
}

function normalizeRoutePath(path, parentPath = '') {
  if (!path) return ''
  if (path.startsWith('/')) return path
  return `/${[parentPath, path].filter(Boolean).join('/')}`.replace(/\/{2,}/g, '/')
}

function menuTreeToRoutes(menus, parentPath = '') {
  const routes = []
  for (const menu of menus || []) {
    if (menu.menuType === 'F' || Number(menu.visible) === 0 || Number(menu.status) === 0) continue
    const menuPath = normalizeRoutePath(menu.path, parentPath)

    if (menu.menuType === 'C') {
      const component = resolveComponent(menu.component)
      if (component && menuPath) {
        routes.push({
          path: menuPath,
          name: menu.routeName || `MenuRoute${menu.id}`,
          component,
          meta: {
            title: menu.menuName,
            icon: menu.icon,
            keepAlive: Number(menu.keepAlive) !== 0,
            permission: menu.permission,
          },
        })
      } else {
        console.warn(`无法加载菜单组件：${menu.component || menu.menuName}`)
      }
    }

    routes.push(...menuTreeToRoutes(menu.children, menuPath || parentPath))
  }
  return routes
}

export function resetDynamicRoutes(routerInstance = router) {
  removeRouteCallbacks.forEach(remove => remove())
  removeRouteCallbacks = []
}

export function setupDynamicRoutes(routerInstance = router, menus = []) {
  resetDynamicRoutes(routerInstance)
  const routes = menuTreeToRoutes(menus)
  routes.forEach(route => {
    removeRouteCallbacks.push(routerInstance.addRoute('AdminRoot', route))
  })
  removeRouteCallbacks.push(routerInstance.addRoute({
    path: '/:pathMatch(.*)*',
    name: 'DynamicNotFound',
    component: {
      render: () => h('div', { style: 'padding: 48px; color: var(--theme-text-bright);' }, '页面不存在'),
    },
    meta: { title: '页面不存在', keepAlive: false },
  }))
  return routes
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes,
})

router.beforeEach(async (to, from, next) => {
  const token = store.state.token
  if (!token) {
    if (to.path === '/login') {
      next()
    } else {
      next({ path: '/login', query: { redirect: to.fullPath }, replace: true })
    }
    return
  }

  if (to.path === '/login' && store.state.routesLoaded) {
    next(store.getters.firstAccessiblePath)
    return
  }

  if (!store.state.routesLoaded) {
    try {
      await store.dispatch('bootstrap', router)
      const target = to.path === '/login' || to.path === '/'
        ? store.getters.firstAccessiblePath
        : to.fullPath
      next({ path: target, replace: true })
    } catch {
      await store.dispatch('reset', router)
      next({ path: '/login', query: to.path === '/login' ? {} : { redirect: to.fullPath }, replace: true })
    }
    return
  }

  if (to.path === '/') {
    next(store.getters.firstAccessiblePath)
    return
  }

  document.title = to.meta?.title ? `${to.meta.title} - 后台管理` : '后台管理'
  next()
})

router.afterEach(to => {
  document.title = to.meta?.title ? `${to.meta.title} - 后台管理` : '后台管理'
})

export default router
