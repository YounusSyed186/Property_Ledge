"use client";

import React, { CSSProperties } from "react";
import { Cell, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ExpenseCategoryPieChartProps {
  operationalAmount?: number;
  capitalAmount?: number;
  maintenanceAmount?: number;
  ratesAmount?: number;
  totalExpenses?: number;
  className?: string;
}

export function ExpenseCategoryPieChart({
  operationalAmount = 4500,
  capitalAmount = 1200,
  maintenanceAmount = 2800,
  ratesAmount = 1900,
  totalExpenses,
  className,
}: ExpenseCategoryPieChartProps) {
  const chartData = [
    { name: "maintenance", amount: maintenanceAmount, fill: "url(#expense-maintenance-pattern)" },
    { name: "operational", amount: operationalAmount, fill: "var(--color-operational)" },
    { name: "rates", amount: ratesAmount, fill: "url(#expense-rates-pattern)" },
    { name: "capital", amount: capitalAmount, fill: "var(--color-capital)" },
  ].filter((item) => item.amount > 0);

  const chartConfig = {
    amount: { label: "Expenses" },
    maintenance: { label: "Repairs & Maintenance", color: "var(--destructive)" },
    operational: { label: "Operating & Management", color: "var(--primary)" },
    rates: { label: "Council & Water Rates", color: "var(--chart-3)" },
    capital: { label: "Capital Works (G10)", color: "var(--chart-5)" },
  } satisfies ChartConfig;

  const total = totalExpenses || chartData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <Card className={`w-full border-border/60 bg-card text-card-foreground shadow-sm rounded-3xl ${className || ""}`}>
      <CardHeader className="items-start pb-0">
        <CardTitle className="text-lg font-bold text-foreground">Expense Distribution</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Total Outgoings
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart accessibilityLayer>
            <defs>
              <pattern
                id="expense-maintenance-pattern"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
              >
                <rect
                  width="6"
                  height="6"
                  fill="var(--destructive)"
                  opacity="0.3"
                />
                <path
                  d="M0,6 L6,0 M-2,2 L2,-2 M4,8 L8,4"
                  stroke="var(--destructive)"
                  strokeWidth="1.5"
                  opacity="0.9"
                />
              </pattern>
              <pattern
                id="expense-rates-pattern"
                patternUnits="userSpaceOnUse"
                width="5"
                height="5"
              >
                <rect
                  width="5"
                  height="5"
                  fill="var(--chart-3)"
                  opacity="0.2"
                />
                <circle
                  cx="2.5"
                  cy="2.5"
                  r="1.2"
                  fill="var(--chart-3)"
                  opacity="0.7"
                />
              </pattern>
            </defs>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="min-w-44 gap-2.5"
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="h-2.5 w-2.5 shrink-0 rounded-xs bg-(--color-bg)"
                          style={
                            {
                              "--color-bg": `var(--color-${name})`,
                            } as CSSProperties
                          }
                        />
                        <span className="text-muted-foreground text-xs">
                          {chartConfig[name as keyof typeof chartConfig]?.label || name}
                        </span>
                      </div>
                      <span className="text-foreground font-semibold tabular-nums text-xs">
                        ${Number(value).toLocaleString()}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-translate-y-1 text-xs"
            />
            <Pie
              data={chartData}
              dataKey="amount"
              nameKey="name"
              innerRadius={45}
              cornerRadius={5}
              paddingAngle={3}
              stroke="var(--background)"
              strokeWidth={3}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
export default ExpenseCategoryPieChart;
