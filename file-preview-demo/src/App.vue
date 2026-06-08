<!--
 * @Author: WangMingJun 2351405492@qq.com
 * @Date: 2026-03-13 14:48:29
 * @LastEditors: WangMingJun 2351405492@qq.com
 * @LastEditTime: 2026-03-23 16:11:09
 * @FilePath: \file-preview-demo\src\App.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <router-view v-slot="{ Component, route }">
    <keep-alive>
      <component
        :is="Component"
        v-if="route.meta.keepAlive"
        :key="route.name || route.path"
      />
    </keep-alive>
    <component
      :is="Component"
      v-if="!route.meta.keepAlive"
      :key="route.name || route.path"
    />
  </router-view>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  background-color: #07120c;
}

#app {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
