"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export interface BarChartDataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  theme?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
}

const chartConfig = {
  requests: {
    label: "Request Volume",
    theme: {
      light: "var(--chart-1)",
      dark: "var(--chart-1)",
    }
  },
};

const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  theme = "light",
  xAxisLabel = "Category",
  yAxisLabel = "Value"
}) => {
  const { theme: resolvedTheme } = useTheme();

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("w-full h-full p-2", resolvedTheme === "dark" ? "bg-gray-800" : "bg-white")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, left: 10, bottom: 35 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}
          />
          <XAxis
            dataKey="label"
            stroke={resolvedTheme === "dark" ? "#d1d5db" : "#4b5563"}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            label={{
              value: xAxisLabel,
              position: "bottom",
              offset: 0,
              fill: resolvedTheme === "dark" ? "#e5e7eb" : "#1f2937",
              fontSize: 14,
              fontWeight: 500,
            }}
          />
          <YAxis
            dataKey="value"
            stroke={resolvedTheme === "dark" ? "#d1d5db" : "#4b5563"}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: "insideLeft",
              offset: 10,
              fill: resolvedTheme === "dark" ? "#e5e7eb" : "#1f2937",
              fontSize: 14,
              fontWeight: 500,
            }}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                className={resolvedTheme === "dark" ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}
              />
            }
            cursor={false}
          />
          <Bar
            dataKey="value"
            name={data[0]?.label || "Value"}
            fill={`var(--chart-1)`}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default BarChartComponent;