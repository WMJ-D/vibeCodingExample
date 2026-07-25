<template>
  <el-sub-menu v-if="children.length" :index="menuIndex">
    <template #title>
      <el-icon v-if="menu.icon"><component :is="menu.icon" /></el-icon>
      <span>{{ menu.menuName }}</span>
    </template>
    <MenuItem v-for="child in children" :key="child.id || child.path" :menu="child" />
  </el-sub-menu>
  <el-menu-item v-else-if="menu.menuType === 'C' && menu.path" :index="menuIndex">
    <el-icon v-if="menu.icon"><component :is="menu.icon" /></el-icon>
    <template #title>{{ menu.menuName }}</template>
  </el-menu-item>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  menu: {
    type: Object,
    required: true,
  },
})

const children = computed(() => (props.menu.children || []).filter(item =>
  item.menuType !== 'F' && Number(item.visible) !== 0 && Number(item.status) !== 0
))
const menuIndex = computed(() => props.menu.path || `menu-${props.menu.id}`)
</script>
