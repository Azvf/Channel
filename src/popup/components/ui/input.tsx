import * as React from "react"

import { cn } from "@/popup/utils/cn"

export interface InputProps extends React.ComponentProps<"input"> {
  icon?: React.ReactNode
  glass?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, glass, style, onFocus, onBlur, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    React.useImperativeHandle(ref, () => inputRef.current!)
    
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      if (glass && e.target) {
        e.target.style.background = 'var(--bg-surface-glass-active)'
        e.target.style.border = '1px solid var(--border-action-subtle)'
        e.target.style.boxShadow = `0 0 0 var(--focus-ring-width) var(--bg-action-subtle)`
      }
      onFocus?.(e)
    }
    
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (glass && e.target) {
        e.target.style.background = 'var(--bg-surface-glass-subtle)'
        e.target.style.border = '1px solid transparent'
        e.target.style.boxShadow = 'none'
      }
      onBlur?.(e)
    }
    
    const inputElement = (
      <input
        type={type}
        ref={inputRef}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-colors",
          glass && "bg-[var(--bg-surface-glass-subtle)] border-transparent rounded-[var(--radius-lg)] min-h-[var(--row-min-height)]",
          icon && "pl-[var(--space-10)]",
          className
        )}
        style={{
          ...(glass && {
            font: 'var(--font-body)',
            transition: 'background-color var(--transition-fast) var(--ease-smooth), border-color var(--transition-fast) var(--ease-smooth), box-shadow var(--transition-fast) var(--ease-smooth)',
          }),
          ...style,
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
    )
    
    if (icon) {
      return (
        <div className="relative w-full">
          <div
            className="absolute left-[var(--space-3)] top-1/2 -translate-y-1/2 flex items-center z-10 pointer-events-none"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {icon}
          </div>
          {inputElement}
        </div>
      )
    }
    
    return inputElement
  }
)
Input.displayName = "Input"

export { Input }
