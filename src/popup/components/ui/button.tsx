import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, HTMLMotionProps } from "framer-motion"
import { SMOOTH_TRANSITION } from "../../utils/motion"

import { cn } from "@/popup/utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md text-sm font-medium",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-sm font-medium",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium",
        link: "text-primary underline-offset-4 hover:underline text-sm font-medium",
        glass: "bg-[var(--bg-surface-glass)] text-[var(--color-text-primary)] hover:text-[var(--color-text-action)] hover:scale-105 active:scale-[0.98] shadow-[var(--shadow-glass-button-inner)] transition-all border border-[var(--border-glass-subtle)] rounded-[var(--radius-xs)]",
        "glass-primary": "bg-[var(--bg-action-strong)] text-[var(--c-light)] hover:bg-[var(--bg-action-solid)] hover:scale-105 active:scale-[0.98] shadow-[var(--shadow-glass-button-inner)] transition-all rounded-[var(--radius-xs)]",
        "glass-destructive": "bg-[var(--bg-surface-glass)] text-[var(--color-text-primary)] hover:text-[var(--hover-color-destructive)] hover:scale-105 active:scale-[0.98] shadow-[var(--shadow-glass-button-inner)] transition-all border border-[var(--color-destructive)] rounded-[var(--radius-xs)]",
        // IconButton variants
        "icon-ghost": "bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-action)] hover:bg-[var(--bg-surface-glass-hover)] rounded-[var(--radius-xs)]",
        "icon-destructive": "bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--hover-color-destructive)] hover:bg-[var(--hover-bg-destructive)] rounded-[var(--radius-xs)]",
        "icon-hud": "bg-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-action)] hover:bg-[var(--bg-action-subtle)] rounded-[var(--radius-md)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-[var(--control-height-sm)] rounded-md px-3 text-[var(--font-small)]",
        lg: "h-[var(--control-height-lg)] rounded-md px-8 text-[var(--font-body)]",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-[var(--space-1_5)]",
        "icon-md": "h-10 w-10 p-[var(--space-2)]",
        "icon-lg": "h-12 w-12 p-[var(--space-2_5)]",
        fluid: "px-[1.2em] py-[0.6em] h-auto",
        md: "h-[var(--control-height-md)] px-[var(--space-5)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  icon?: React.ReactNode
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, icon, isLoading, children, disabled, style, ...props }, ref) => {
    const isDisabled = disabled || isLoading
    
    // Apply font styles for glass variants
    const glassVariants = ['glass', 'glass-primary', 'glass-destructive'] as const
    const isGlassVariant = variant && glassVariants.includes(variant as any)
    const buttonStyle = isGlassVariant ? {
      font: 'var(--font-label)',
      letterSpacing: '0.02em',
      ...style,
    } : style
    
    // Use Framer Motion for glass variants to maintain original interaction feel
    if (isGlassVariant && !asChild) {
      return (
        <motion.button
          ref={ref}
          className={cn(buttonVariants({ variant, size, className }))}
          disabled={isDisabled}
          style={buttonStyle as any}
          whileTap={!isDisabled ? { scale: 0.96 } : undefined}
          whileHover={!isDisabled && variant !== 'glass-primary' ? {
            backgroundColor: variant === 'glass-destructive' ? 'var(--hover-bg-destructive)' : undefined
          } : undefined}
          transition={SMOOTH_TRANSITION}
          {...(props as HTMLMotionProps<"button">)}
        >
          {isLoading ? (
            <span 
              className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
          ) : (
            <>
              {icon && <span className="flex items-center">{icon}</span>}
              {children}
            </>
          )}
        </motion.button>
      )
    }
    
    // Regular button for non-glass variants
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        style={buttonStyle}
        {...props}
      >
        {isLoading ? (
          <span 
            className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : (
          <>
            {icon && <span className="flex items-center">{icon}</span>}
            {children}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

// IconButton component for backward compatibility
export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'variant' | 'size'> {
  variant?: 'ghost' | 'destructive' | 'hud'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  hoverScale?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', icon, hoverScale, children, disabled, ...props }, ref) => {
    const variantMap = {
      ghost: 'icon-ghost',
      destructive: 'icon-destructive',
      hud: 'icon-hud',
    } as const
    
    const sizeMap = {
      sm: 'icon-sm',
      md: 'icon-md',
      lg: 'icon-lg',
    } as const
    
    // Use Framer Motion for IconButton to maintain original interaction feel
    return (
      <motion.button
        ref={ref}
        className={cn(
          buttonVariants({ variant: variantMap[variant], size: sizeMap[size], className }),
          hoverScale && "hover:scale-110 transition-transform"
        )}
        disabled={disabled}
        whileTap={!disabled ? { scale: 0.96 } : undefined}
        whileHover={!disabled && hoverScale ? { scale: 1.1 } : undefined}
        transition={SMOOTH_TRANSITION}
        {...(props as HTMLMotionProps<"button">)}
      >
        {icon || children}
      </motion.button>
    )
  }
)
IconButton.displayName = "IconButton"

export { Button, IconButton, buttonVariants }
