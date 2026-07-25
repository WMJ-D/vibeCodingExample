import store from '@/store'

function normalizePermissions(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}

export function hasPermission(value) {
  const requiredPermissions = normalizePermissions(value)
  if (!requiredPermissions.length) return true
  if (store.state.roles.includes('admin')) return true

  const grantedPermissions = new Set(store.state.permissions || [])
  return requiredPermissions.some(permission => grantedPermissions.has(permission))
}

function applyPermission(el, binding) {
  if (hasPermission(binding.value)) return
  el.remove()
}

export const permission = {
  mounted: applyPermission,
  updated: applyPermission,
}

export default {
  install(app) {
    app.directive('permission', permission)
  },
}
