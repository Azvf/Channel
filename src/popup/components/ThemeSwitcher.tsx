import { useState } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { applyThemeToBody } from "../utils/theme";
import { storageService, STORAGE_KEYS } from "../../services/storageService";

interface ThemeSwitcherProps {
  initialTheme: string;
}

// 定义主题选项以便于映射
const themeOptions = [
  { value: 'light', icon: Sun, option: '1' },
  { value: 'dark', icon: Moon, option: '2' },
  { value: 'dim', icon: Sparkles, option: '3' }
];

export function ThemeSwitcher({ initialTheme }: ThemeSwitcherProps) {
  const [theme, setTheme] = useState(initialTheme);
  const [previousTheme, setPreviousTheme] = useState("1");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleThemeChange = async (newTheme: string) => {
    // 立即更新状态以触发滑块动画
    setPreviousTheme(getCurrentOption());
    setTheme(newTheme);
    // 异步保存
    await storageService.set(STORAGE_KEYS.THEME, newTheme);
    applyThemeToBody(newTheme);
    
    // --- 关键修改 ---
    // 选择主题后自动关闭
    setIsExpanded(false); 
    // ---------------
  };

  const getCurrentOption = () => {
    return themeOptions.find(t => t.value === theme)?.option || "1";
  };

  return (
    // 1. 容器现在控制展开状态
    <div 
      className="theme-switcher-container" 
      data-expanded={isExpanded}
    >
      {/* 1. Backdrop 现在将通过 CSS 控制，而不是 React 条件渲染 */}
      <div 
        className="theme-switcher-backdrop"
        onClick={() => setIsExpanded(false)}
      />

      {/* 3. Fieldset 是唯一的显示元素 */}
      <fieldset 
        className="switcher theme-switcher-expanded"
        data-previous={previousTheme} 
        aria-hidden={!isExpanded}
        // 移除 pointerEvents 限制，允许 hover 效果
        // 点击行为由 label 的 pointerEvents 控制
      >
        <legend className="switcher__legend">Choose a theme</legend>

        {themeOptions.map(item => {
          const isActive = theme === item.value;
          const IconComponent = item.icon;
          return (
            <label 
              key={item.value}
              className="switcher__option"
              // 4. 关键：只有当"未展开"时，点击才有效
              onClick={!isExpanded ? () => setIsExpanded(true) : undefined}
              style={{
                // 5. 当未展开时，只允许激活的图标响应（为了 cursor）
                pointerEvents: !isExpanded && !isActive ? 'none' : 'auto',
                cursor: !isExpanded ? 'pointer' : (isExpanded ? 'pointer' : 'default')
              }}
            >
              <input
                className="switcher__input"
                type="radio"
                name="theme"
                value={item.value}
                data-option={item.option}
                checked={isActive}
                onChange={(e) => handleThemeChange(e.target.value)}
                // 7. 当未展开时，禁用 input 功能
                disabled={!isExpanded} 
              />
              <IconComponent className="switcher__icon" style={{ color: 'var(--c)' }} strokeWidth={1.5} />
            </label>
          );
        })}

        <svg className="switcher__filter" aria-hidden="true">
          <defs>
            <filter
              id="switcher"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
              filterUnits="objectBoundingBox"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.01 0.008"
                numOctaves="2"
                seed="4"
                result="turbulence"
              />
              <feComponentTransfer in="turbulence" result="mapped">
                <feFuncR type="gamma" amplitude="0.8" exponent="8" offset="0.5" />
                <feFuncG type="gamma" amplitude="0.4" exponent="8" offset="0.5" />
                <feFuncB type="gamma" amplitude="0" exponent="1" offset="0" />
              </feComponentTransfer>
              <feGaussianBlur in="mapped" stdDeviation="2.5" result="softMap" />
              <feSpecularLighting
                in="softMap"
                surfaceScale="1.5"
                specularConstant="1"
                specularExponent="120"
                lightingColor="white"
                result="specLight"
              >
                <fePointLight x="-100" y="-100" z="250" />
              </feSpecularLighting>
              <feComposite
                in="specLight"
                operator="arithmetic"
                k1="0"
                k2="0.5"
                k3="1"
                k4="0"
                result="litImage"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="softMap"
                scale="25"
                xChannelSelector="R"
                yChannelSelector="G"
                result="displaced"
              />
              <feComposite
                in="displaced"
                in2="litImage"
                operator="arithmetic"
                k1="0"
                k2="1"
                k3="0.08"
                k4="0"
              />
            </filter>
          </defs>
        </svg>
      </fieldset>
    </div>
  );
}
