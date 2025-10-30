<template>
  <div class="popup-surface">
    <div class="container">
    <header>
      <h1 id="modeTitle" class="clickable-title">Tagging</h1>
    </header>
    <main>
      <div class="mode-stack">
        <TaggingMode :class="{ active: mode === 'tagging' }" />
        <TaggedMode :class="{ active: mode === 'tagged' }" />
      </div>

      <div class="debug-section">
        <h3>调试工具</h3>
        <div class="debug-buttons">
          <button id="clearCacheBtn" class="btn btn-danger">清空本地缓存</button>
          <button id="debugStorageBtn" class="btn btn-primary">查看存储状态</button>
          <button id="cleanupTagsBtn" class="btn btn-primary">清理未使用标签</button>
        </div>
      </div>
    </main>
    <footer>
      <p>版本 1.0.0 | GameplayTag System</p>
    </footer>
    </div>
  </div>
  
  
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { initializePopup } from './popup'
import TaggingMode from './components/TaggingMode.vue'
import TaggedMode from './components/TaggedMode.vue'

const mode = ref<'tagging' | 'tagged'>('tagging')

const handleModeChanged = (e: Event) => {
  const detail = (e as CustomEvent).detail as 'tagging' | 'tagged'
  if (detail === 'tagging' || detail === 'tagged') {
    mode.value = detail
  }
}

onMounted(() => {
  window.addEventListener('app:mode-changed', handleModeChanged as EventListener)
  initializePopup()
})

onBeforeUnmount(() => {
  window.removeEventListener('app:mode-changed', handleModeChanged as EventListener)
})
</script>

<style scoped>
/* 组件自身不添加样式，布局与动效在全局 popup.css 控制 */
</style>
