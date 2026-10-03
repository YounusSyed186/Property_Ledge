import * as React from "react"
import Link from "next/link"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { ArrowRight, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        primary:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        accent:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        soft:
          "bg-primary/10 text-primary hover:bg-primary/20",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        icon:
          "p-0 rounded-xl border border-border text-muted hover:text-foreground hover:bg-surface-subtle",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link"
  | "accent"
  | "soft"
  | "icon"

export type ButtonSize = "default" | "sm" | "md" | "lg" | "icon"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  href?: string
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  withArrow?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      href,
      loading = false,
      leftIcon,
      rightIcon,
      withArrow = false,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const content = (
      <>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="mr-2 shrink-0">{leftIcon}</span>
        )}
        {children}
        {withArrow && (
          <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
        )}
        {rightIcon && <span className="ml-2 shrink-0">{rightIcon}</span>}
      </>
    )

    if (href) {
      return (
        <Link
          href={href}
          className={cn(
            buttonVariants({ variant, size, className }),
            disabled && "pointer-events-none opacity-50",
          )}
          aria-disabled={disabled}
        >
          {content}
        </Link>
      )
    }

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {content}
      </button>
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
