import { useState, useRef, useEffect } from "react";
import { DELAY } from "../../design-tokens/animation";
import type { LucideIcon } from "lucide-react";

export interface ExpandableSwitcherOption {
  value: string;
  icon: LucideIcon;
  option: string; // 用于 CSS 动画的选项标识符，通常是 "1", "2", "3" 等
}

interface ExpandableSwitcherProps {
  options: ExpandableSwitcherOption[];
  value: string;
  onChange: (value: string) => void;
  name: string; // input 的 name 属性
  legend?: string; // legend 文本，默认为空
  filterId?: string; // SVG 滤镜的 ID，默认为 "switcher"
  containerClassName?: string; // 容器类名，默认为 "theme-switcher-container"
  fieldsetClassName?: string; // fieldset 类名，默认为 "switcher theme-switcher-expanded"
}

export function ExpandableSwitcher({
  options,
  value,
  onChange,
  name,
  legend = "",
  filterId = "switcher",
  containerClassName = "theme-switcher-container",
  fieldsetClassName = "switcher theme-switcher-expanded",
}: ExpandableSwitcherProps) {
  const [previousValue, setPreviousValue] = useState(
    options.find((opt) => opt.value === value)?.option || options[0]?.option || "1"
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getCurrentOption = () => {
    return options.find((opt) => opt.value === value)?.option || options[0]?.option || "1";
  };

  const handleValueChange = (newValue: string) => {
    // 立即更新 previousValue 以触发滑块动画
    setPreviousValue(getCurrentOption());
    // 调用 onChange 回调
    onChange(newValue);
    // 展开状态下切换值时，保持展开状态，不自动关闭
    // 用户可以继续选择其他选项，或者点击 backdrop 关闭
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleMouseLeave = () => {
    // 使用统一的延迟常量，避免魔法数字
    closeTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      closeTimerRef.current = null;
    }, DELAY.INSTANT * 1000);
  };

  const handleMouseEnter = () => {
    // 如果鼠标移回，取消关闭定时器
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  return (
    <div className={containerClassName} data-expanded={isExpanded}>
      {/* Backdrop 现在将通过 CSS 控制，而不是 React 条件渲染 */}
      <div
        className="theme-switcher-backdrop"
        onClick={() => setIsExpanded(false)}
      />

      {/* Fieldset 是唯一的显示元素 */}
      <fieldset
        className={fieldsetClassName}
        data-previous={previousValue}
        aria-hidden={!isExpanded}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      >
        {legend && <legend className="switcher__legend">{legend}</legend>}

        {options.map((item) => {
          const isActive = value === item.value;
          const IconComponent = item.icon;
          return (
            <label
              key={item.value}
              className="switcher__option"
              // 关键：只有当"未展开"时，点击才有效
              onClick={!isExpanded ? () => setIsExpanded(true) : undefined}
              style={{
                // 当未展开时，只允许激活的图标响应（为了 cursor）
                pointerEvents: !isExpanded && !isActive ? "none" : "auto",
                cursor: !isExpanded ? "pointer" : isExpanded ? "pointer" : "default",
              }}
            >
              <input
                className="switcher__input"
                type="radio"
                name={name}
                value={item.value}
                data-option={item.option}
                checked={isActive}
                onChange={(e) => handleValueChange(e.target.value)}
                // 当未展开时，禁用 input 功能
                disabled={!isExpanded}
              />
              {/* Tokenized Color */}
              <IconComponent
                className="switcher__icon"
                style={{ color: "var(--color-text-primary)" }}
                strokeWidth={1.5}
              />
            </label>
          );
        })}

        <svg className="switcher__filter" aria-hidden="true">
          <defs>
            <filter
              id={filterId}
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






