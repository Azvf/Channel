import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
// 引入 Vanilla Extract 生成的 CSS（必须在 index.css 之前）
// 注意：直接导入 .css.ts 源文件，Vite 插件会拦截并输出 CSS
// 必须在 index.css 之前导入，确保主题变量在语义化变量之前定义
import '../design-tokens/theme.css.ts';
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

// Toast system
import { Toaster } from 'sonner';

/**
 * 注册 Houdini CSS Typed OM 属性
 * 
 * 启用颜色变量的硬件加速平滑过渡，使主题切换时颜色从"突变"变为"渐变"
 * 
 * 架构说明：
 * - 在 React 渲染前注册，确保主题切换时浏览器可以对颜色进行线性插值
 * - 只注册核心颜色变量，避免过度注册
 * - 提供降级支持：不支持 registerProperty 的浏览器会忽略此代码
 */
function registerCSSProperties() {
  // 检测浏览器是否支持 CSS.registerProperty
  if ('registerProperty' in CSS) {
    const colorProperties = [
      { name: '--c-bg' },
      { name: '--c-glass' },
      { name: '--c-content' },
      { name: '--c-action' },
    ];

    colorProperties.forEach(({ name }) => {
      try {
        CSS.registerProperty({
          name,
          syntax: '<color>',
          inherits: true,
          initialValue: 'transparent',
        });
      } catch (error) {
        // 静默失败：某些浏览器可能不支持特定语法，不影响功能
        console.warn(`Failed to register CSS property ${name}:`, error);
      }
    });
  }
}

/**
 * [Rendering Architect] 全局原生 Tooltip 禁用器
 * 
 * 原理：
 * 使用 MutationObserver 建立一个"DOM 卫士"。
 * 当任何元素试图通过 title 属性"走私"原生 Tooltip 时，
 * 卫士会立即拦截，将 title 偷渡为无障碍属性 aria-label，
 * 然后销毁原 title 属性。
 * 
 * 性能影响：
 * 极低。逻辑仅在 DOM 变更微任务中运行，且操作均为 O(1) 或 O(N_added_nodes)。
 */
function disableNativeTooltips() {
  // 核心处理器：处理单个节点
  const processNode = (node: Node) => {
    // 快速过滤：只处理元素节点
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    
    const el = node as HTMLElement;
    
    // 1. 检查自身
    if (el.hasAttribute('title')) {
      const title = el.getAttribute('title');
      if (title) {
        // [A11y] 关键：迁移语义到 aria-label，防止可访问性丢失
        // 仅在没有现成 aria-label 时迁移，避免覆盖更精确的描述
        if (!el.hasAttribute('aria-label') && !el.hasAttribute('aria-labelledby')) {
          el.setAttribute('aria-label', title);
        }
        // [Dev] 保留原始 title 数据供调试或自定义组件使用
        el.setAttribute('data-original-title', title);
        // [Render] 移除原生属性，物理阻断浏览器 Tooltip 渲染
        el.removeAttribute('title');
      }
    }

    // 2. 检查子树 (深度优先，但仅针对由于 innerHTML 或大块插入的情况)
    // 注意：querySelectorAll 在大型子树上可能昂贵，但在 Popup 场景下通常可控
    if (el.children.length > 0) {
      el.querySelectorAll('[title]').forEach(child => {
        const childEl = child as HTMLElement;
        const title = childEl.getAttribute('title');
        if (title) {
          if (!childEl.hasAttribute('aria-label') && !childEl.hasAttribute('aria-labelledby')) {
            childEl.setAttribute('aria-label', title);
          }
          childEl.setAttribute('data-original-title', title);
          childEl.removeAttribute('title');
        }
      });
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // 场景 A: 新元素被插入 (ChildList)
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(processNode);
      }
      // 场景 B: 现有元素的 title 属性发生了变化 (Attributes)
      else if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
        processNode(mutation.target);
      }
    }
  });

  // 1. 立即清理当前 DOM (防止脚本加载前的遗漏)
  if (typeof document !== 'undefined') {
    document.querySelectorAll('[title]').forEach(el => processNode(el));

    // 2. 启动卫士
    const target = document.body || document.documentElement;
    observer.observe(target, {
      childList: true, // 监听节点增删
      subtree: true,   // 监听整个子树
      attributes: true,// 监听属性变化
      attributeFilter: ['title'] // [Perf] 性能白名单：只关心 title 属性变化
    });
  }
}

// 在 React 挂载前立即执行，确保"零延迟"生效
disableNativeTooltips();

// 立即注册 CSS 属性（在 React 渲染前）
registerCSSProperties();

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
        <Toaster position="top-center" />
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

