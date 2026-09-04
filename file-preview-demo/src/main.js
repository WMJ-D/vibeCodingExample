import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// ElementPlus中文
import zh from 'element-plus/dist/locale/zh-cn.mjs'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'
import store from './store'
import PermissionDirective from './directives/permission'
import FileViewer from '@flyfish-group/file-viewer3'
import './styles/index.scss'
import { initTheme } from './composables/useTheme'

const app = createApp(App)

// 恢复本地保存的主题（Trae/抖音系列/豆包系列）
initTheme()

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus, { locale: zh })
app.use(store)
app.use(PermissionDirective)
app.use(router)
app.use(FileViewer)
app.mount('#app')
// http://192.168.52.55:8081/repository/npm-public/
