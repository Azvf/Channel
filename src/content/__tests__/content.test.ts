type MessageListener = (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void;

const messageListeners: MessageListener[] = [];

function fireMessage(message: any, sendResponse: (response: any) => void) {
  for (const listener of messageListeners) {
    listener(message, {}, sendResponse);
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

    globalAny.chrome.runtime = {
      onMessage: {
        addListener: jest.fn((listener) => {
          messageListeners.push(listener);
        }),
      },
    };

    document.title = '';
    document.body.innerHTML = '';

    await import('../content');
  });

  it('处理 getPageInfo 消息并返回页面信息', () => {
    document.title = 'My Test Page';
    document.body.innerHTML = '<div>Some content here</div><img alt="test" /><a href="/">link</a>';

    const sendResponse = jest.fn();

    fireMessage({ action: 'getPageInfo' }, sendResponse);

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

  it('处理 highlightText 消息并在 DOM 中高亮文本', () => {
    document.body.innerHTML = '<div>Hello World</div>';

    const sendResponse = jest.fn();

    fireMessage({ action: 'highlightText', text: 'World' }, sendResponse);

    expect(document.body.innerHTML).toContain('<mark');
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('World'),
      }),
    );
  });
});

