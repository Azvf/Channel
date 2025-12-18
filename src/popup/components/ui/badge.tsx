import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/popup/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--c-action)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--bg-surface-glass)] text-[var(--color-text-primary)] hover:bg-[var(--bg-surface-glass-hover)]",
        secondary:
          "border-transparent bg-[var(--bg-surface-glass-active)] text-[var(--color-text-primary)] hover:bg-[var(--bg-surface-glass-hover)]",
        destructive:
          "border-transparent bg-[var(--color-destructive)] text-white hover:bg-[var(--color-destructive)]/80",
        outline: "text-[var(--color-text-primary)] border-[var(--border-glass-moderate)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

