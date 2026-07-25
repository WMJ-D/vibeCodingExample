import { createStore } from 'vuex'

import { getMe, getMenus, login as loginRequest, logout as logoutRequest } from '@/api/auth'
import { getToken, removeToken, setToken } from '@/utils/token'

function identityState(user) {
  return {
    user: user || null,
    roles: (user?.roles || []).map(role => typeof role === 'string' ? role : role.roleKey),
    permissions: user?.permissions || [],
  }
}

const store = createStore({
  state: () => ({
    token: getToken(),
    user: null,
    roles: [],
    permissions: [],
    menus: [],
    dynamicRoutes: [],
    routesLoaded: false,
  }),
  getters: {
    firstAccessiblePath: state => {
      const findPath = menus => {
        for (const menu of menus || []) {
          if (menu.menuType === 'C' && menu.path) return menu.path
          const childPath = findPath(menu.children)
          if (childPath) return childPath
        }
        return ''
      }
      return findPath(state.menus) || '/'
    },
  },
  mutations: {
    SET_TOKEN(state, token) {
      state.token = token
    },
    SET_IDENTITY(state, user) {
      Object.assign(state, identityState(user))
    },
    SET_MENUS(state, menus) {
      state.menus = menus || []
    },
    SET_DYNAMIC_ROUTES(state, routes) {
      state.dynamicRoutes = routes || []
    },
    SET_ROUTES_LOADED(state, loaded) {
      state.routesLoaded = loaded
    },
    RESET_STATE(state) {
      state.token = null
      state.user = null
      state.roles = []
      state.permissions = []
      state.menus = []
      state.dynamicRoutes = []
      state.routesLoaded = false
    },
  },
  actions: {
    async login({ commit }, credentials) {
      const result = await loginRequest(credentials)
      if (!result?.token) throw new Error('登录响应中缺少令牌')
      setToken(result.token)
      commit('SET_TOKEN', result.token)
      commit('SET_IDENTITY', result.user)
      return result
    },
    async bootstrap({ state, commit }, router) {
      if (state.routesLoaded) return state.dynamicRoutes
      if (!state.token) throw new Error('缺少登录令牌')

      const [{ setupDynamicRoutes }, user, menus] = await Promise.all([
        import('@/router'),
        getMe(),
        getMenus(),
      ])
      commit('SET_IDENTITY', user)
      commit('SET_MENUS', menus)
      const routes = setupDynamicRoutes(router, menus)
      commit('SET_DYNAMIC_ROUTES', routes)
      commit('SET_ROUTES_LOADED', true)
      return routes
    },
    async logout({ dispatch }, router) {
      try {
        if (getToken()) await logoutRequest()
      } finally {
        await dispatch('reset', router)
      }
    },
    async reset({ commit }, router) {
      const { resetDynamicRoutes } = await import('@/router')
      resetDynamicRoutes(router)
      removeToken()
      commit('RESET_STATE')
    },
  },
})

export default store
