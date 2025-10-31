<template>
  <div
    class="popup-surface"
    :data-mode="mode"
    :style="[boundsStyle, layoutStyle]"
  >
    <div
      class="container layout-box layout-box--vertical"
      data-slot="layout.container"
      style="--layout-box-gap: var(--layout-gap-lg);"
    >
      <header class="popup-header" data-slot="layout.header">
        <h1 id="modeTitle" class="clickable-title">{{ modeTitleText }}</h1>
      </header>

      <main
        class="popup-main layout-box layout-box--vertical"
        data-slot="layout.main"
        style="--layout-box-gap: var(--layout-gap-lg);"
      >
        <div class="mode-stack" data-slot="layout.mode-stack">
          <TaggingMode :class="{ active: mode === 'tagging' }" :data-active="mode === 'tagging'" />
          <TaggedMode :class="{ active: mode === 'tagged' }" :data-active="mode === 'tagged'" />
          <DebugMode :class="{ active: mode === 'debug' }" :data-active="mode === 'debug'" />
        </div>

        <section
          v-if="showDebugModule"
          class="module module--debug layout-size-box"
          data-slot="layout.debug-module"
          style="max-height: var(--layout-module-max-height); overflow: auto;"
        >
          <div class="module__content debug-section" data-slot="layout.debug-module.content">
            <h3>调试工具</h3>
            <div class="debug-buttons" data-slot="layout.debug-module.actions">
              <button id="toggleDebugModeBtn" class="btn btn-primary">切换调试页面</button>
              <button id="clearCacheBtn" class="btn btn-danger">清空本地缓存</button>
              <button id="debugStorageBtn" class="btn btn-primary">查看存储状态</button>
              <button id="cleanupTagsBtn" class="btn btn-primary">清理未使用标签</button>
            </div>
          </div>
        </section>
      </main>

      <footer class="popup-footer" data-slot="layout.footer">
        <p>版本 1.0.0 | GameplayTag System</p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { initializePopup } from './popup'
import type { AppMode } from './popup'
import TaggingMode from './components/TaggingMode.vue'
import TaggedMode from './components/TaggedMode.vue'
import DebugMode from './components/DebugMode.vue'
import type { AppConfig } from '../config'

type PopupMode = 'tagging' | 'tagged' | 'debug'

const props = defineProps<{ initialMode: PopupMode; config?: AppConfig }>()

const mode = ref<PopupMode>(props.initialMode)
const showDebugModule = ref(resolveDebugModuleState(props.config))

const layoutBounds = Object.freeze({
  minWidth: '396px',
  maxWidth: '396px',
  minHeight: '600px',
  maxHeight: '600px'
})

const modeLabels: Record<PopupMode, string> = {
  tagging: 'Tagging',
  tagged: 'Tagged',
  debug: 'Debug'
}

const modeTitleText = computed(() => modeLabels[mode.value])

const boundsStyle = computed(() => ({
  minWidth: layoutBounds.minWidth,
  maxWidth: layoutBounds.maxWidth,
  minHeight: layoutBounds.minHeight,
  maxHeight: layoutBounds.maxHeight,
  overflow: 'auto'
}))

const layoutStyle = computed(() => ({
  '--layout-min-width': layoutBounds.minWidth,
  '--layout-max-width': layoutBounds.maxWidth,
  '--layout-min-height': layoutBounds.minHeight,
  '--layout-max-height': layoutBounds.maxHeight
}))

const handleModeChanged = (e: Event) => {
  const detail = (e as CustomEvent<PopupMode>).detail
  if (detail === 'tagging' || detail === 'tagged' || detail === 'debug') {
    mode.value = detail
  }
}

onMounted(() => {
  showDebugModule.value = resolveDebugModuleState(props.config)
  window.addEventListener('app:mode-changed', handleModeChanged as EventListener)
  void initializePopup(mode.value as AppMode)
})

onBeforeUnmount(() => {
  window.removeEventListener('app:mode-changed', handleModeChanged as EventListener)
})

watch(
  () => props.config?.enableDebugModule,
  () => {
    showDebugModule.value = resolveDebugModuleState(props.config)
  }
)

function resolveDebugModuleState(config?: AppConfig): boolean {
  const attr = document.body.getAttribute('data-debug-module')
  if (attr !== null) {
    return attr !== 'false'
  }
  if (config) {
    return config.enableDebugModule
  }
  return true
}
</script>

<style scoped>
/* 组件自身不添加样式，布局与动效在全局 popup.css 控制 */
</style>
