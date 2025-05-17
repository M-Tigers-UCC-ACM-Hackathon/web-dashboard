"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface BarChartProps {
  data: { ip: string; requests: number }[];
  theme?: string;
}

const chartConfig = {
  requests: {
    label: "Request Volume",
    color: "var(--chart-1)", // ShadCN chart color variable
  },
};

const BarChartComponent: React.FC<BarChartProps> = ({ data, theme = "light" }) => {
  const { theme: resolvedTheme } = useTheme();

  return (
    <ChartContainer
      config={chartConfig}
      className={cn("w-full h-full p-2", resolvedTheme === "dark" ? "bg-gray-800" : "bg-white")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={resolvedTheme === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"}
          />
          <XAxis
            dataKey="ip"
            stroke={resolvedTheme === "dark" ? "#d1d5db" : "#4b5563"}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            stroke={resolvedTheme === "dark" ? "#d1d5db" : "#4b5563"}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12 }}
            label={{
              value: "Requests",
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
            dataKey="requests"
            fill="var(--chart-1)" // Use ShadCN's chart color variable
            radius={[4, 4, 0, 0]} // Rounded top corners
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default BarChartComponent;