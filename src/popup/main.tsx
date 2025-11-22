import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { loadAppInitialState, loadAppInitialStateSync } from '../services/appInitService';
import { applyThemeToBody } from './utils/theme';
import { AppProvider } from './context/AppContext';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, chromeStoragePersister } from '../lib/queryClient';

// 仅在开发环境懒加载 DevTools
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import('@tanstack/react-query-devtools/build/modern/production.js').then(
    (d) => ({ default: d.ReactQueryDevtools }),
  ),
);

/**
 * 应用初始化
 * 在 React 渲染前加载所有状态，避免页面闪烁
 */
async function initializeApp() {
  // 先使用同步方式快速加载
  const syncState = loadAppInitialStateSync();
  
  // HTML 中的内联脚本已经设置了主题，这里只是作为备份确保一致
  if (document.body) {
    applyThemeToBody(syncState.theme, true);
  }
  
  // 然后异步加载完整状态（chrome.storage），如果有更新则覆盖
  const asyncState = await loadAppInitialState();
  
  // 如果异步加载的值不同，更新主题
  if (asyncState.theme !== syncState.theme) {
    applyThemeToBody(asyncState.theme, false);
  }
  
  // 返回最终状态（优先使用异步加载的值）
  return asyncState;
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
        <AppProvider>
          <App initialState={initialState} />
        </AppProvider>
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

