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

interface PortfolioPatternPieChartProps {
  occupancyRate?: number;
  residentialCount?: number;
  commercialCount?: number;
  totalProperties?: number;
  className?: string;
}

export function PortfolioPatternPieChart({
  occupancyRate = 100,
  residentialCount = 0,
  commercialCount = 0,
  totalProperties = 1,
  className,
}: PortfolioPatternPieChartProps) {
  const vacantRate = Math.max(0, 100 - occupancyRate);

  const chartData = [
    {
      name: "occupied",
      value: occupancyRate,
      fill: "url(#portfolio-occupied-pattern)",
    },
    {
      name: "residential",
      value: residentialCount || 1,
      fill: "var(--color-residential)",
    },
    {
      name: "commercial",
      value: commercialCount > 0 ? commercialCount : 0.5,
      fill: "url(#portfolio-commercial-pattern)",
    },
    ...(vacantRate > 0
      ? [
          {
            name: "vacant",
            value: vacantRate,
            fill: "var(--color-vacant)",
          },
        ]
      : []),
  ];

  const chartConfig = {
    value: { label: "Assets" },
    occupied: { label: "Occupied Leases", color: "var(--primary)" },
    residential: { label: "Residential", color: "var(--chart-2)" },
    commercial: { label: "Commercial", color: "var(--chart-3)" },
    vacant: { label: "Vacant Units", color: "var(--destructive)" },
  } satisfies ChartConfig;

  return (
    <Card className={`w-full border-border/60 bg-card shadow-sm rounded-3xl ${className || ""}`}>
      <CardHeader className="items-start pb-0">
        <CardTitle className="text-lg font-bold text-foreground">Asset & Occupancy Mix</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {totalProperties} Total Managed Property Assets
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[260px]"
        >
          <PieChart accessibilityLayer>
            <defs>
              <pattern
                id="portfolio-occupied-pattern"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
              >
                <rect
                  width="6"
                  height="6"
                  fill="var(--primary)"
                  opacity="0.3"
                />
                <path
                  d="M0,6 L6,0 M-2,2 L2,-2 M4,8 L8,4"
                  stroke="var(--primary)"
                  strokeWidth="1.5"
                  opacity="0.9"
                />
              </pattern>
              <pattern
                id="portfolio-commercial-pattern"
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
                  className="min-w-40 gap-2.5"
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
                        {typeof value === "number" ? value.toLocaleString() : value}
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
              dataKey="value"
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
export default PortfolioPatternPieChart;
