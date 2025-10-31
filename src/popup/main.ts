import { createApp } from 'vue'
import App from './App.vue'
import { loadInitialAppMode } from './popup'
import { loadInitialAppConfig } from '../config'

void (async () => {
  const [initialMode, config] = await Promise.all([
    loadInitialAppMode(),
    loadInitialAppConfig()
  ])

  createApp(App, { initialMode, config }).mount('#app')
})()



