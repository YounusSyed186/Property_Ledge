"use client";

import React from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { ChevronUp, DollarSign, CalendarCheck, ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export interface LeaseRentTrackerCardProps {
  collectedRent?: number;
  expectedAnnualRent?: number;
  rentFrequency?: string;
  nextPaymentDate?: string;
  recentPayments?: Array<{ name: string; amount: number }>;
  onRecordPayment?: () => void;
  className?: string;
}

export function LeaseRentTrackerCard({
  collectedRent = 38400,
  expectedAnnualRent = 52000,
  rentFrequency = "Monthly",
  nextPaymentDate = "1st of next month",
  recentPayments = [
    { name: "Rent - October 2026", amount: 4333 },
    { name: "Rent - September 2026", amount: 4333 },
    { name: "Rent - August 2026", amount: 4333 },
  ],
  onRecordPayment,
  className,
}: LeaseRentTrackerCardProps) {
  const progressPercentage = Math.min((collectedRent / (expectedAnnualRent || 1)) * 100, 100);

  const animatedRent = useSpring(0, {
    damping: 40,
    stiffness: 300,
  });

  const displayRent = useTransform(animatedRent, (value) =>
    Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );

  React.useEffect(() => {
    animatedRent.set(collectedRent);
  }, [collectedRent, animatedRent]);

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
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg leading-tight">Rent Collection</h2>
            <p className="text-sm text-muted-foreground">Term Revenue Collection</p>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronUp className="h-5 w-5" />
        </button>
      </header>

      {/* Main Metric Display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold tracking-tighter mb-1 text-primary">$</span>
          <motion.p className="text-5xl font-bold tracking-tighter tabular-nums">
            {displayRent}
          </motion.p>
          <p className="mb-1.5 text-muted-foreground font-medium text-sm">
            of ${expectedAnnualRent.toLocaleString()}
          </p>
          <p className="mb-1.5 ml-auto font-semibold text-xs text-primary">
            {progressPercentage.toFixed(0)}% Collected
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

      {/* Payment Schedule Breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="font-semibold text-sm">Recent Rent Receipts</h3>
        <ul className="flex flex-col gap-2.5">
          {recentPayments.map((item, index) => (
            <li key={index} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2 truncate mr-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <p className="text-muted-foreground truncate">{item.name}</p>
              </div>
              <p className="font-medium tabular-nums shrink-0">
                ${item.amount.toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Button */}
      <Button
        onClick={onRecordPayment}
        className="w-full rounded-2xl py-6 text-base font-semibold"
      >
        + Record Rent Receipt
      </Button>
    </div>
  );
}
export default LeaseRentTrackerCard;
