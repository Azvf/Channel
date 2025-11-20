/**
 * @jest-environment jsdom
 */
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

describe('Injected Script Logic', () => {
  let windowSpy: any;

  beforeEach(() => {
    // 模拟 window.postMessage
    windowSpy = jest.spyOn(window, 'postMessage');
    // 加载 injected script (通过 require 触发执行)
    jest.isolateModules(() => {
      require('../injected');
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 模拟发送消息给 injected script
  const sendToInjected = (action: string, data?: any) => {
    const event = new MessageEvent('message', {
      source: window, // 必须同源
      data: {
        type: 'EDGE_EXTENSION_INJECTED',
        action,
        data
      }
    });
    window.dispatchEvent(event);
  };

  it('getPageInfo: 应该响应并返回页面元数据', () => {
    document.title = 'Test Page';
    
    sendToInjected('getPageInfo');

    expect(windowSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'EDGE_EXTENSION_RESPONSE',
        action: 'getPageInfo',
        data: expect.objectContaining({
          title: 'Test Page',
          url: expect.any(String)
        })
      }),
      '*'
    );
  });

  it('highlightLinks: 应该修改 DOM 并返回结果', () => {
    document.body.innerHTML = '<a href="#">Link 1</a><a href="#">Link 2</a>';
    
    sendToInjected('highlightLinks');

    // 验证 DOM 变化
    const links = document.querySelectorAll('a');
    expect(links[0].style.border).toBe('2px solid red');
    
    // 验证响应消息
    expect(windowSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'highlightLinks',
        data: expect.stringContaining('已高亮 2 个链接')
      }),
      '*'
    );
  });

  it('addWatermark: 应该在 DOM 中添加水印元素', () => {
    sendToInjected('addWatermark', 'Confidential');

    // 验证 DOM
    const watermark = document.body.lastElementChild as HTMLElement;
    expect(watermark.textContent).toBe('Confidential');
    expect(watermark.style.position).toBe('fixed');
    expect(watermark.style.zIndex).toBe('9999');
  });
});

