<template>
  <div
    id="taggingMode"
    class="mode-panel mode-panel--tagging layout-box layout-box--vertical"
    data-slot="mode.tagging"
    style="--layout-box-gap: var(--layout-gap-lg);"
  >
    <section
      class="module module--tagging module--with-surface layout-size-box"
      data-slot="mode.tagging.module"
      style="min-height: var(--layout-module-min-height); max-height: var(--layout-module-max-height); overflow: auto;"
    >
      <div class="module__surface" data-element="surface"></div>
      <div
        class="module__content layout-box layout-box--vertical"
        data-slot="mode.tagging.content"
        style="--layout-box-gap: var(--layout-gap-lg);"
      >
        <div
          class="tag-section layout-box layout-box--vertical"
          data-slot="tagging.section"
          style="--layout-box-gap: var(--layout-gap-md);"
        >
          <div
            class="tag-controls tag-controls-inline layout-box layout-box--horizontal"
            data-slot="tagging.controls"
            style="--layout-box-gap: var(--layout-gap-sm);"
          >
            <div
              class="input-group tag-input-flex layout-size-box"
              data-slot="tagging.controls.input"
              style="flex-grow: 1; flex-basis: 0%;"
            >
              <input
                id="newTagName"
                class="tag-input"
                type="text"
                placeholder="输入新标签名称"
              />
              <div id="autocompleteDropdown" class="autocomplete-dropdown"></div>
            </div>
            <button id="createTagBtn" class="btn btn-primary btn-glass">Add</button>
          </div>

          <div
            class="current-tags layout-box layout-box--vertical"
            data-slot="tagging.current"
            style="--layout-box-gap: var(--layout-gap-sm);"
          >
            <div id="currentPageTitle" class="current-page-title"></div>
            <div id="currentPageTags" class="tag-list"></div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// 纯展示组件，逻辑在 popup.ts 绑定到固定 id
</script>

<style scoped>
/* 布局样式由全局 popup.css 控制 */
</style>
