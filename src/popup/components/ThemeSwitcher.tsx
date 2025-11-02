import { useState } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { applyThemeToBody } from "../utils/theme";
import { storageService, STORAGE_KEYS } from "../../services/storageService";

interface ThemeSwitcherProps {
  initialTheme: string;
}

export function ThemeSwitcher({ initialTheme }: ThemeSwitcherProps) {
  // 使用初始主题，避免主题闪烁
  const [theme, setTheme] = useState(initialTheme);
  const [previousTheme, setPreviousTheme] = useState("1");
  const [isExpanded, setIsExpanded] = useState(false);

  const handleThemeChange = async (newTheme: string) => {
    setPreviousTheme(getCurrentOption());
    setTheme(newTheme);
    await storageService.set(STORAGE_KEYS.THEME, newTheme);
    applyThemeToBody(newTheme);
    setIsExpanded(false);
  };

  const getCurrentOption = () => {
    if (theme === "light") return "1";
    if (theme === "dark") return "2";
    if (theme === "dim") return "3";
    return "1";
  };

  const getCurrentIcon = () => {
    if (theme === "light") return <Sun className="w-4 h-4" strokeWidth={1.5} />;
    if (theme === "dark") return <Moon className="w-4 h-4" strokeWidth={1.5} />;
    if (theme === "dim") return <Sparkles className="w-4 h-4" strokeWidth={1.5} />;
    return <Sun className="w-4 h-4" strokeWidth={1.5} />;
  };

  return (
    <div className="theme-switcher-container">
      {/* Collapsed button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="theme-switcher-trigger"
          aria-label="Change theme"
        >
          {getCurrentIcon()}
        </button>
      )}

      {/* Expanded switcher */}
      {isExpanded && (
        <>
          <div 
            className="theme-switcher-backdrop"
            onClick={() => setIsExpanded(false)}
          />
          <fieldset 
            className="switcher theme-switcher-expanded"
            data-previous={previousTheme}
            onClick={(e) => e.stopPropagation()}
          >
            <legend className="switcher__legend">Choose a theme</legend>

            <label className="switcher__option">
              <input
                className="switcher__input"
                type="radio"
                name="theme"
                value="light"
                data-option="1"
                checked={theme === "light"}
                onChange={(e) => handleThemeChange(e.target.value)}
              />
              <Sun className="switcher__icon" style={{ color: 'var(--c)' }} strokeWidth={1.5} />
            </label>

            <label className="switcher__option">
              <input
                className="switcher__input"
                type="radio"
                name="theme"
                value="dark"
                data-option="2"
                checked={theme === "dark"}
                onChange={(e) => handleThemeChange(e.target.value)}
              />
              <Moon className="switcher__icon" style={{ color: 'var(--c)' }} strokeWidth={1.5} />
            </label>

            <label className="switcher__option">
              <input
                className="switcher__input"
                type="radio"
                name="theme"
                value="dim"
                data-option="3"
                checked={theme === "dim"}
                onChange={(e) => handleThemeChange(e.target.value)}
              />
              <Sparkles className="switcher__icon" style={{ color: 'var(--c)' }} strokeWidth={1.5} />
            </label>

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
        </>
      )}
    </div>
  );
}
