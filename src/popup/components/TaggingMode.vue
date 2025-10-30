<template>
  <div id="taggingMode" class="mode-panel">
    <div class="tag-section">
      <div class="tag-controls tag-controls-inline">
        <div class="input-group tag-input-flex">
          <input type="text" id="newTagName" placeholder="输入新标签名称" class="tag-input" />
          <div id="autocompleteDropdown" class="autocomplete-dropdown"></div>
        </div>
        <button id="createTagBtn" class="btn btn-primary btn-glass">Add</button>
      </div>
      <div class="current-tags">
        <div id="currentPageTitle" class="current-page-title"></div>
        <div id="currentPageTags" class="tag-list"></div>
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


