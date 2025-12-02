import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
// 引入 Vanilla Extract 生成的 CSS（必须在 index.css 之前）
// 注意：虽然源文件是 .css.ts，但 Vite 会处理它，就像引入普通 .css 一样
// 必须在 index.css 之前导入，确保主题变量在语义化变量之前定义
import '../design-tokens/theme.css';
// 引入主样式文件（包含 tokens.css 和其他样式）
import './index.css';
import App from './App';
import { loadAppInitialState, loadAppInitialStateSync } from '../services/appInitService';
import { applyThemeToBody } from './utils/theme';
import { AppProvider } from './context/AppContext';
import { ModalRegistryProvider } from './context/ModalRegistryContext';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, chromeStoragePersister } from '../lib/queryClient';
import { storageService, STORAGE_KEYS } from '../services/storageService';
import type { TaggedPage, PageCollection, TagsCollection } from '../shared/types/gameplayTag';

// 仅在开发环境懒加载 DevTools
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import('@tanstack/react-query-devtools/build/modern/production.js').then(
    (d) => ({ default: d.ReactQueryDevtools }),
  ),
);

/**
 * 应用初始化
 * 在 React 渲染前加载所有状态，避免页面闪烁
 * 
 * 关键优化：在 React 挂载前预加载 PAGES 和 TAGS 数据，实现 < 100ms 首屏
 */
async function initializeApp() {
  // 先使用同步方式快速加载
  const syncState = loadAppInitialStateSync();
  
  // HTML 中的内联脚本已经设置了主题，这里只是作为备份确保一致
  if (document.body) {
    applyThemeToBody(syncState.theme, true);
  }
  
  // 并行加载：应用状态 + 关键数据（PAGES 和 TAGS）
  const [asyncState, preloadedPages, preloadedTags] = await Promise.all([
    loadAppInitialState(),
    // 预加载 PAGES 数据（L1 缓存）
    // 支持原子化存储：先尝试读取传统格式，如果失败再尝试原子化格式
    (async () => {
      try {
        // 先尝试传统格式
        const traditionalPages = await storageService.get<PageCollection>(STORAGE_KEYS.PAGES);
        if (traditionalPages && Object.keys(traditionalPages).length > 0) {
          return traditionalPages;
        }
      } catch (_error) {
        // 传统格式读取失败，尝试原子化格式
      }
      
      try {
        // 尝试原子化存储格式
        const pageIndex = await storageService.get<string[]>('page_index');
        if (pageIndex && pageIndex.length > 0) {
          const pagePromises = pageIndex.map(async (pageId) => {
            const atomicKey = `page::${pageId}`;
            return await storageService.get<TaggedPage>(atomicKey);
          });
          const pages = (await Promise.all(pagePromises)).filter((page): page is TaggedPage => page !== null);
          
          // 转换为 Collection 格式
          const pagesCollection: PageCollection = {};
          pages.forEach((page: TaggedPage) => {
            pagesCollection[page.id] = page;
          });
          return pagesCollection;
        }
      } catch (_error) {
        // 原子化格式也失败，返回空对象
      }
      
      return {} as PageCollection;
    })(),
    // 预加载 TAGS 数据（L1 缓存）
    storageService.get<TagsCollection>(STORAGE_KEYS.TAGS).catch(() => ({} as TagsCollection)),
  ]);
  
  // 如果异步加载的值不同，更新主题
  if (asyncState.theme !== syncState.theme) {
    applyThemeToBody(asyncState.theme, false);
  }
  
  // 返回最终状态（包含预加载数据）
  return {
    ...asyncState,
    preloadedPages,
    preloadedTags,
  };
}

// 初始化应用并渲染
initializeApp().then((initialState) => {
  // 在初始渲染完成后启用过渡效果
  requestAnimationFrame(() => {
    if (document.body) {
      // 移除过渡限制，添加 data-theme-ready 启用过渡
      document.body.removeAttribute('data-theme-no-transition');
      document.body.style.removeProperty('transition');
      document.body.setAttribute('data-theme-ready', 'true');
    }
  });

  // 检查是否为开发环境
  // @ts-ignore - import.meta.env 在构建时会被替换
  const isDev = import.meta.env?.DEV || process.env.NODE_ENV === 'development';
  
  // 提取预加载数据
  const { preloadedPages, preloadedTags, ...appState } = initialState;
  
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <PersistQueryClientProvider 
        client={queryClient} 
        persistOptions={{ persister: chromeStoragePersister }}
        onSuccess={() => {
          // 可选：缓存恢复完成后的回调
          console.log('Query cache restored from Chrome Storage');
        }}
      >
        <ModalRegistryProvider>
          <AppProvider 
            initialPages={preloadedPages || {}}
            initialTags={preloadedTags || {}}
          >
            <App initialState={appState} />
          </AppProvider>
        </ModalRegistryProvider>
        {/* 仅在开发环境显示 DevTools */}
        {isDev && (
          <Suspense fallback={null}>
            <ReactQueryDevtoolsProduction initialIsOpen={false} position="bottom" />
          </Suspense>
        )}
      </PersistQueryClientProvider>
    </React.StrictMode>
  );
});

