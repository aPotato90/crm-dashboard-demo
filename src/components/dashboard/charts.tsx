"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatPercent,
} from "@/lib/crm/format";
import type {
  MonthlyRevenue,
  SourceSummary,
  StageSummary,
} from "@/lib/crm/metrics";

import { ChartCard } from "./chart-card";

// Chart colours come from validated CSS tokens (see globals.css), so light
// and dark themes each get their own steps. Recharts' default animation mode
// ("auto") already turns animation off for prefers-reduced-motion.

const revenueConfig = {
  value: { label: "Won revenue", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function RevenueChart({ data }: { data: MonthlyRevenue[] }) {
  const total = data.reduce((sum, month) => sum + month.value, 0);
  const best = data.reduce((a, b) => (b.value > a.value ? b : a), data[0]);
  return (
    <ChartCard
      className="lg:col-span-2"
      title="Revenue won per month"
      description={`Last 12 months · ${formatCurrency(total)} in total`}
      summary={`Bar chart of won revenue per month for the last 12 months, ${formatCurrency(total)} in total. The best month was ${best.fullLabel} with ${formatCurrency(best.value)}.`}
      table={{
        caption: "Won revenue per month, last 12 months",
        columns: ["Month", "Won revenue"],
        rows: data.map((m) => [m.fullLabel, formatCurrency(m.value)]),
      }}
    >
      <ChartContainer
        config={revenueConfig}
        className="aspect-auto h-64 w-full"
      >
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(value: number) => formatCurrencyCompact(value)}
          />
          <ChartTooltip
            cursor={{ fillOpacity: 0.6 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as MonthlyRevenue | undefined)
                    ?.fullLabel ?? ""
                }
                formatter={(value) => (
                  <span className="font-medium text-foreground tabular-nums">
                    {formatCurrency(Number(value))}
                  </span>
                )}
                hideIndicator
              />
            }
          />
          <Bar
            dataKey="value"
            fill="var(--color-value)"
            radius={[4, 4, 0, 0]}
            maxBarSize={24}
          />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

const ORDINAL = [
  "var(--chart-ordinal-1)",
  "var(--chart-ordinal-2)",
  "var(--chart-ordinal-3)",
  "var(--chart-ordinal-4)",
];

const stageConfig = {
  value: { label: "Pipeline value" },
} satisfies ChartConfig;

export function StageChart({ data }: { data: StageSummary[] }) {
  const total = data.reduce((sum, stage) => sum + stage.value, 0);
  const deals = data.reduce((sum, stage) => sum + stage.count, 0);
  const describe = (s: StageSummary) =>
    `${formatCurrencyCompact(s.value)} · ${s.count} ${s.count === 1 ? "deal" : "deals"}`;
  const labelled = data.map((s) => ({ ...s, labelText: describe(s) }));
  return (
    <ChartCard
      title="Pipeline by stage"
      description={`${deals} open deals · ${formatCurrency(total)}`}
      summary={`Horizontal bar chart of open pipeline value by stage: ${data
        .map((s) => `${s.label} ${formatCurrency(s.value)} in ${s.count} deals`)
        .join(", ")}.`}
      table={{
        caption: "Open pipeline by stage",
        columns: ["Stage", "Deals", "Value"],
        rows: data.map((s) => [s.label, s.count, formatCurrency(s.value)]),
      }}
    >
      <ChartContainer config={stageConfig} className="aspect-auto h-56 w-full">
        <BarChart
          data={labelled}
          layout="vertical"
          margin={{ top: 0, right: 112, left: 0, bottom: 0 }}
          accessibilityLayer={false}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={88}
          />
          <ChartTooltip
            cursor={{ fillOpacity: 0.6 }}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(_, __, item) => (
                  <span className="font-medium text-foreground tabular-nums">
                    {describe(item.payload as StageSummary)}
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((stage, i) => (
              <Cell key={stage.stage} fill={ORDINAL[i % ORDINAL.length]} />
            ))}
            <LabelList
              dataKey="labelText"
              position="right"
              offset={8}
              className="fill-muted-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

const SOURCE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function SourceChart({ data }: { data: SourceSummary[] }) {
  const total = data.reduce((sum, s) => sum + s.count, 0);
  // Colour follows the source (fixed order), never its rank.
  const colored = data.map((s, i) => ({ ...s, fill: SOURCE_COLORS[i] }));
  const config = Object.fromEntries(
    colored.map((s) => [s.source, { label: s.label, color: s.fill }]),
  ) satisfies ChartConfig;
  return (
    <ChartCard
      title="Leads by source"
      description={`Where your ${total} contacts came from`}
      summary={`Donut chart of contacts by source: ${data
        .map((s) => `${s.label} ${s.count} (${formatPercent(s.share)})`)
        .join(", ")}.`}
      table={{
        caption: "Contacts by lead source",
        columns: ["Source", "Contacts", "Share"],
        rows: data.map((s) => [s.label, s.count, formatPercent(s.share)]),
      }}
    >
      <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col">
        <ChartContainer
          config={config}
          className="aspect-square h-44 w-44 shrink-0"
        >
          <PieChart accessibilityLayer={false}>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  nameKey="source"
                  formatter={(value, _, item) => (
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        {(item.payload as SourceSummary).label}
                      </span>
                      <span className="font-medium text-foreground tabular-nums">
                        {String(value)}
                      </span>
                    </span>
                  )}
                />
              }
            />
            <Pie
              data={colored}
              dataKey="count"
              nameKey="source"
              innerRadius="62%"
              outerRadius="100%"
              stroke="var(--card)"
              strokeWidth={2}
            >
              {colored.map((s) => (
                <Cell key={s.source} fill={s.fill} />
              ))}
            </Pie>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-2xl font-semibold"
            >
              {total}
            </text>
          </PieChart>
        </ChartContainer>
        <ul className="w-full min-w-0 space-y-1.5 text-sm" aria-hidden>
          {colored.map((s) => (
            <li key={s.source} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: s.fill }}
              />
              <span className="flex-1 truncate">{s.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {s.count} · {formatPercent(s.share)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
