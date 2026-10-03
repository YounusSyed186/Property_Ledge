"use client";

import React from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { ChevronUp, Receipt, Wrench, Building, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface ExpenseBudgetItem {
  name: string;
  amount: number;
}

export interface ExpenseBudgetTrackerCardProps {
  currentSpend?: number;
  annualBudget?: number;
  recentAllocations?: ExpenseBudgetItem[];
  onRecordExpense?: () => void;
  className?: string;
}

export function ExpenseBudgetTrackerCard({
  currentSpend = 14250,
  annualBudget = 32000,
  recentAllocations = [
    { name: "Emergency Plumbing Repair", amount: 680 },
    { name: "Annual Building Insurance Premium", amount: 2450 },
    { name: "Quarterly Strata Levy", amount: 1890 },
  ],
  onRecordExpense,
  className,
}: ExpenseBudgetTrackerCardProps) {
  const progressPercentage = Math.min((currentSpend / (annualBudget || 1)) * 100, 100);

  const animatedSpend = useSpring(0, {
    damping: 40,
    stiffness: 300,
  });

  const displaySpend = useTransform(animatedSpend, (value) =>
    Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );

  React.useEffect(() => {
    animatedSpend.set(currentSpend);
  }, [currentSpend, animatedSpend]);

  return (
    <div
      className={cn(
        "w-full rounded-3xl bg-card p-6 text-card-foreground shadow-sm",
        "flex flex-col gap-6 border border-border/70",
        className
      )}
    >
      {/* Card Header */}
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Operating Outgoings</h2>
            <p className="text-sm text-muted-foreground">FY26 Spend vs Annual Budget</p>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronUp className="h-5 w-5" />
        </button>
      </header>

      {/* Main Expense Display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tracking-tighter mb-1 text-primary">$</span>
          <motion.p className="text-5xl font-bold tracking-tighter tabular-nums">
            {displaySpend}
          </motion.p>
          <p className="mb-1.5 text-muted-foreground font-medium text-sm">
            of ${annualBudget.toLocaleString()}
          </p>
          <p className="mb-1.5 ml-auto font-semibold text-xs text-primary/90">
            {progressPercentage.toFixed(0)}% Utilized
          </p>
        </div>
        {/* Progress Bar */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-primary/10">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1.3, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Recent Allocations List */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-sm">Major Outgoing Allocations</h3>
        <ul className="flex flex-col gap-2.5">
          {recentAllocations.map((item, index) => (
            <li key={index} className="flex justify-between items-center text-sm">
              <p className="text-muted-foreground truncate mr-2">{item.name}</p>
              <p className="font-medium tabular-nums shrink-0">
                ${item.amount.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <Button
        onClick={onRecordExpense}
        className="w-full rounded-2xl py-6 text-base font-semibold"
      >
        + Record Expense Transaction
      </Button>
    </div>
  );
}
export default ExpenseBudgetTrackerCard;
