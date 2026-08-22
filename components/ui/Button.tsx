import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  href?: string;
  withArrow?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  href,
  withArrow = false,
  children,
  className,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-300 rounded-lg group select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

  const sizeStyles = {
    sm: "text-xs px-3.5 py-1.5 h-8 gap-1.5",
    md: "text-sm px-5 py-2.5 h-11 gap-2",
    lg: "text-base px-6 py-3.5 h-13 gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-foreground text-background dark:bg-foreground dark:text-background hover:bg-foreground/90 shadow-sm hover:shadow-md",
    secondary:
      "bg-surface text-foreground border border-border hover:border-accent hover:bg-surface-subtle",
    outline:
      "border border-border text-foreground hover:border-accent hover:text-accent bg-transparent",
    ghost:
      "text-muted hover:text-foreground hover:bg-surface-subtle",
    accent:
      "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md",
  };

  const content = (
    <>
      <span>{children}</span>
      {withArrow && (
        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {content}
    </button>
  );
}
