<template>
  <div id="taggedMode" class="mode-panel">
    <div class="tag-section">
      <div class="tag-filter">
        <div class="input-group">
          <div id="tagFilterChipBox" class="chip-input">
            <input type="text" id="tagFilterInput" placeholder="输入标签名称进行筛选" class="tag-input" />
            <div id="tagFilterDropdown" class="autocomplete-dropdown"></div>
          </div>
        </div>
      </div>
      <div class="filtered-pages">
        <div id="filteredPagesList" class="pages-list"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 纯展示组件，逻辑在 popup.ts 绑定到固定 id
</script>

<style scoped>
/* 样式使用全局 popup.css */
</style>


