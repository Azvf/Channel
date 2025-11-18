type MessageListener = (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void;

const messageListeners: MessageListener[] = [];

function fireMessage(message: any, sendResponse: (response: any) => void) {
  for (const listener of messageListeners) {
    const result = listener(message, {}, sendResponse);
    // 如果返回 true，表示异步处理，需要等待
    if (result === true) {
      // 给异步处理一些时间
      return;
    }
  }
}

describe('Content Script 消息处理', () => {
  beforeEach(async () => {
    jest.resetModules();
    messageListeners.length = 0;

    const globalAny = global as any;
    if (!globalAny.chrome) {
      globalAny.chrome = {};
    }

    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      href: 'https://example.com',
      hostname: 'example.com',
    };

    globalAny.chrome.runtime = {
      onMessage: {
        addListener: jest.fn((listener) => {
          messageListeners.push(listener);
        }),
      },
    };

    document.title = '';
    document.body.innerHTML = '';

    // 动态导入 content 脚本以注册消息监听器
    await import('../content');
    
    // 等待 DOM 初始化完成
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  it('处理 getPageInfo 消息并返回页面信息', async () => {
    document.title = 'My Test Page';
    document.body.innerHTML = '<div>Some content here</div><img alt="test" /><a href="/">link</a>';

    const sendResponse = jest.fn();

    fireMessage({ action: 'getPageInfo' }, sendResponse);

    // 等待异步处理完成
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          title: 'My Test Page',
          url: expect.any(String),
          domain: expect.any(String),
        }),
      }),
    );
  });

  it('处理 highlightText 消息并在 DOM 中高亮文本', async () => {
    document.body.innerHTML = '<div>Hello World</div>';

    const sendResponse = jest.fn();

    fireMessage({ action: 'highlightText', text: 'World' }, sendResponse);

    // 等待异步处理完成
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(document.body.innerHTML).toContain('<mark');
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('World'),
      }),
    );
  });
});

