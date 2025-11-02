import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Tag } from "./Tag";
import { ChevronDown } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}

export function TagInput({ 
  tags, 
  onTagsChange, 
  placeholder = "", 
  suggestions = [],
  className = "" 
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputValue && suggestions.length > 0) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(inputValue.toLowerCase()) && 
        !tags.includes(s)
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else if (!inputValue && suggestions.length > 0) {
      const filtered = suggestions.filter(s => !tags.includes(s));
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, suggestions, tags]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onTagsChange([...tags, trimmedTag]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      e.preventDefault();
      removeTag(tags.length - 1);
    }
  };

  const handleSelect = (suggestion: string) => {
    addTag(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input container with glass effect */}
      <div className="liquidGlass-wrapper relative">
        {/* Content layer */}
        <div className="liquidGlass-content">
          <div className="flex flex-wrap gap-2 items-center px-5 py-3 min-h-[3.2rem]">
            {tags.map((tag, index) => (
              <Tag 
                key={index} 
                label={tag} 
                onRemove={() => removeTag(index)}
                variant="input"
              />
            ))}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={tags.length === 0 ? placeholder : ""}
              className="flex-1 min-w-[140px] bg-transparent outline-none"
              style={{ 
                color: 'var(--c-content)',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: '0.9rem',
                fontWeight: 400,
                letterSpacing: '0.01em'
              }}
            />
            
            {/* Dropdown indicator */}
            {suggestions.length > 0 && (
              <button
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="p-1.5 rounded-full flex-shrink-0 transition-all"
                style={{ 
                  color: 'color-mix(in srgb, var(--c-content) 60%, transparent)',
                  background: showSuggestions ? 'color-mix(in srgb, var(--c-glass) 20%, transparent)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--c-action)';
                  if (!showSuggestions) {
                    e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 15%, transparent)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'color-mix(in srgb, var(--c-content) 60%, transparent)';
                  if (!showSuggestions) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dropdown suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-50">
          <div 
            className="liquidGlass-wrapper"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--c-bg) 85%, var(--c-glass) 15%)',
              backdropFilter: 'blur(16px) saturate(var(--saturation))',
              WebkitBackdropFilter: 'blur(16px) saturate(var(--saturation))'
            }}
          >
            {/* Content layer */}
            <div 
              className="liquidGlass-content"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--c-bg) 60%, transparent)'
              }}
            >
              <div className="max-h-[160px] overflow-y-auto py-2">
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelect(suggestion)}
                    className="w-full px-5 py-2.5 text-left transition-all rounded-lg mx-2"
                    style={{ 
                      color: 'var(--c-content)',
                      fontFamily: '"DM Sans", sans-serif',
                      fontSize: '0.9rem',
                      fontWeight: 400,
                      letterSpacing: '0.01em',
                      width: 'calc(100% - 1rem)',
                      background: 'transparent'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--c-glass) 20%, transparent)';
                      e.currentTarget.style.color = 'var(--c-action)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--c-content)';
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
