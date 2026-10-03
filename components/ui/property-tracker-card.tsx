"use client";

import * as React from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { ChevronUp, Building2, Wrench, ShieldCheck, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface ExpenseSuggestion {
  name: string;
  amount: number;
  category?: string;
}

export interface PropertyTrackerCardProps {
  icon?: React.ReactNode;
  title: string;
  subtitle: string;
  currentAmount: number;
  budgetAmount: number;
  currencyPrefix?: string;
  suggestions: ExpenseSuggestion[];
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const PropertyTrackerCard = React.forwardRef<
  HTMLDivElement,
  PropertyTrackerCardProps
>(
  (
    {
      className,
      icon = <Building2 className="h-6 w-6" />,
      title,
      subtitle,
      currentAmount,
      budgetAmount,
      currencyPrefix = "$",
      suggestions,
      actionLabel = "+ Record New Outgoing",
      onAction,
    },
    ref
  ) => {
    const progressPercentage = Math.min((currentAmount / (budgetAmount || 1)) * 100, 100);

    const animatedAmount = useSpring(0, {
      damping: 40,
      stiffness: 300,
    });

    const displayAmount = useTransform(animatedAmount, (value) =>
      Number(value).toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
    );

    React.useEffect(() => {
      animatedAmount.set(currentAmount);
    }, [currentAmount, animatedAmount]);

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-sm rounded-3xl bg-card p-6 text-card-foreground shadow-lg",
          "flex flex-col gap-6 border border-border",
          className
        )}
      >
        {/* Card Header */}
        <header className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              {icon}
            </div>
            <div>
              <h2 className="font-bold text-lg leading-snug">{title}</h2>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronUp className="h-5 w-5" />
          </button>
        </header>

        {/* Main Amount Display */}
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tighter mb-1 text-primary">{currencyPrefix}</span>
            <motion.p className="text-5xl font-bold tracking-tighter tabular-nums">
              {displayAmount}
            </motion.p>
            <p className="mb-1.5 text-muted-foreground font-medium text-sm">
              of {currencyPrefix}{budgetAmount.toLocaleString()}
            </p>
          </div>
          {/* Progress Bar */}
          <div className="h-3 w-full overflow-hidden rounded-full bg-primary/10">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Breakdown Items Section */}
        <div className="flex flex-col gap-3">
          <h3 className="font-semibold text-sm tracking-tight">Recent Allocations</h3>
          <ul className="flex flex-col gap-2.5">
            {suggestions.map((item, index) => (
              <li key={index} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                  <p className="text-muted-foreground">{item.name}</p>
                </div>
                <p className="font-semibold tabular-nums">
                  {currencyPrefix}{item.amount.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Button */}
        <Button
          onClick={onAction}
          className="w-full rounded-2xl py-6 text-base font-semibold"
        >
          {actionLabel}
        </Button>
      </div>
    );
  }
);

PropertyTrackerCard.displayName = "PropertyTrackerCard";

export { PropertyTrackerCard };
