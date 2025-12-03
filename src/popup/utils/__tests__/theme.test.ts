import { applyThemeToBody } from '../theme';

describe('applyThemeToBody', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.removeAttribute('data-theme-no-transition');
  });

  it('应用 dark 主题时写入正确的 CSS 变量', () => {
    const setPropertySpy = jest.spyOn(CSSStyleDeclaration.prototype, 'setProperty');

    applyThemeToBody('dark');

    expect(setPropertySpy).toHaveBeenCalledWith('--bg-page', expect.any(String), 'important');
    expect(setPropertySpy).toHaveBeenCalledWith('--color-action', expect.any(String), 'important');

    setPropertySpy.mockRestore();
  });
});


