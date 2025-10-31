<template>
  <div
    id="taggedMode"
    class="mode-panel mode-panel--tagged layout-box layout-box--vertical"
    data-slot="mode.tagged"
    style="--layout-box-gap: var(--layout-gap-lg);"
  >
    <section
      class="module module--tagged module--with-surface layout-size-box"
      data-slot="mode.tagged.module"
      style="min-height: var(--layout-module-min-height); max-height: var(--layout-module-max-height); overflow: auto;"
    >
      <div class="module__surface" data-element="surface"></div>
      <div
        class="module__content layout-box layout-box--vertical"
        data-slot="mode.tagged.content"
        style="--layout-box-gap: var(--layout-gap-lg);"
      >
        <div
          class="tag-section layout-box layout-box--vertical"
          data-slot="tagged.section"
          style="--layout-box-gap: var(--layout-gap-md);"
        >
          <div
            class="tag-filter layout-box layout-box--vertical"
            data-slot="tagged.filter"
            style="--layout-box-gap: var(--layout-gap-sm);"
          >
            <div
              class="input-group layout-size-box"
              data-slot="tagged.filter.input-group"
            >
              <div
                id="tagFilterChipBox"
                class="chip-input layout-size-box"
                data-slot="tagged.filter.chip-input"
                style="flex-grow: 1; flex-basis: 0%;"
              >
                <input
                  id="tagFilterInput"
                  class="tag-input"
                  type="text"
                  placeholder="输入标签名称进行筛选"
                />
                <div id="tagFilterDropdown" class="autocomplete-dropdown"></div>
              </div>
            </div>
          </div>

          <div
            class="filtered-pages layout-box layout-box--vertical"
            data-slot="tagged.results"
            style="--layout-box-gap: var(--layout-gap-sm);"
          >
            <div id="filteredPagesList" class="pages-list"></div>
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
