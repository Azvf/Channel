import { applyThemeToBody } from '../theme';

describe('applyThemeToBody', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.body.removeAttribute('data-theme-no-transition');
  });

  it('应用 dark 主题时写入正确的 CSS 变量', () => {
    const setPropertySpy = jest.spyOn(CSSStyleDeclaration.prototype, 'setProperty');

    applyThemeToBody('dark');

    expect(setPropertySpy).toHaveBeenCalledWith('--c-bg', '#1b1b1d', 'important');
    expect(setPropertySpy).toHaveBeenCalledWith('--c-action', '#03d5ff', 'important');

    setPropertySpy.mockRestore();
  });
});


