import { useState, useRef } from "react";
import { Tags, Search } from "lucide-react";

interface TabSwitcherProps {
  activeTab: "tagging" | "tagged";
  onTabChange: (tab: "tagging" | "tagged") => void;
}

export function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  const getOptionFromTab = (tab: "tagging" | "tagged") => {
    return tab === "tagging" ? "1" : "2";
  };

  // Use ref to track the actual previous state before the change
  const previousTabRef = useRef(getOptionFromTab(activeTab));
  const [previousTab, setPreviousTab] = useState(getOptionFromTab(activeTab));

  const handleTabChange = (tab: "tagging" | "tagged") => {
    // Set previous to current before changing
    const currentOption = getOptionFromTab(activeTab);
    setPreviousTab(currentOption);
    previousTabRef.current = getOptionFromTab(tab);
    
    // Trigger the actual tab change
    onTabChange(tab);
  };

  // 提取通用样式
  const labelStyle: React.CSSProperties = {
    fontWeight: 500,
    font: 'var(--font-caption)', // Tokenized
    letterSpacing: '0.01em',
    color: 'var(--color-text-primary)' // Tokenized (was var(--c))
  };

  const iconStyle: React.CSSProperties = {
    color: 'var(--color-text-primary)' // Tokenized
  };

  return (
    <fieldset 
      className="switcher tab-switcher"
      data-previous={previousTab}
    >
      <legend className="switcher__legend">Choose a tab</legend>

      <label className="switcher__option">
        <input
          className="switcher__input"
          type="radio"
          name="tab"
          value="tagging"
          data-option="1"
          checked={activeTab === "tagging"}
          onChange={() => handleTabChange("tagging")}
        />
        <div className="switcher__icon-wrapper">
          <Tags className="switcher__icon icon-sm" style={iconStyle} strokeWidth={1.5} />
          <span className="switcher__label" style={labelStyle}>
            Tagging
          </span>
        </div>
      </label>

      <label className="switcher__option">
        <input
          className="switcher__input"
          type="radio"
          name="tab"
          value="tagged"
          data-option="2"
          checked={activeTab === "tagged"}
          onChange={() => handleTabChange("tagged")}
        />
        <div className="switcher__icon-wrapper">
          <Search className="switcher__icon icon-sm" style={iconStyle} strokeWidth={1.5} />
          <span className="switcher__label" style={labelStyle}>
            Search
          </span>
        </div>
      </label>

      <svg className="switcher__filter" aria-hidden="true">
        <defs>
          <filter
            id="tab-switcher"
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
  );
}
