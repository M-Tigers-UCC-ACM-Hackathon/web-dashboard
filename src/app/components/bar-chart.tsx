"use client";

import { Bar } from "react-chartjs-2";
import { ChartData, ChartOptions } from "chart.js";
import { useTheme } from "next-themes";

interface BarChartProps {
  data: { ip: string; requests: number }[];
  theme?: string;
}

const BarChartComponent: React.FC<BarChartProps> = ({ data, theme = "light" }) => {
  const { theme: resolvedTheme } = useTheme();

  const chartData: ChartData<"bar"> = {
    labels: data.map((item) => item.ip),
    datasets: [
      {
        label: "Request Volume",
        data: data.map((item) => item.requests),
        backgroundColor: resolvedTheme === "dark" ? "rgba(75, 192, 192, 0.6)" : "rgba(54, 162, 235, 0.6)",
        borderColor: resolvedTheme === "dark" ? "rgba(75, 192, 192, 1)" : "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions: ChartOptions<"bar"> = {
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Requests" },
        grid: { color: resolvedTheme === "dark" ? "#444" : "#ddd" },
      },
      x: {
        grid: { display: false },
      },
    },
    plugins: {
      legend: { position: "top", labels: { color: resolvedTheme === "dark" ? "#fff" : "#000" } },
      title: {
        display: true,
        text: "Top 3 IPs by Request Volume",
        color: resolvedTheme === "dark" ? "#fff" : "#000",
      },
    },
  };

  return <Bar data={chartData} options={chartOptions} />;
};

export default BarChartComponent;