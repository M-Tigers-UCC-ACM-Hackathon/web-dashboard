"use client";

import { Line } from "react-chartjs-2";
import { ChartData, ChartOptions } from "chart.js";

interface StackedAreaChartProps {
  data: { time: string; methods: { [key: string]: number } }[];
  theme?: string;
}

const StackedAreaChartComponent: React.FC<StackedAreaChartProps> = ({ data, theme = "light" }) => {
  const methodTypes = Array.from(
    new Set(data.flatMap((entry) => Object.keys(entry.methods)))
  );

  const chartData: ChartData<"line"> = {
    labels: data.map((entry) => entry.time),
    datasets: methodTypes.map((method) => ({
      label: method || "Unknown", // Handle empty method as "Unknown"
      data: data.map((entry) => entry.methods[method] || 0),
      backgroundColor: getColor(method, theme),
      borderColor: getColor(method, theme, true),
      borderWidth: 1,
      fill: true, // Enable stacking
    })),
  };

  const chartOptions: ChartOptions<"line"> = {
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        stacked: true, // Stack the areas
        title: { display: true, text: "Requests" },
        grid: { color: theme === "dark" ? "#444" : "#ddd" },
      },
      x: {
        title: { display: true, text: "Time" },
        grid: { display: false },
      },
    },
    plugins: {
      legend: { position: "top", labels: { color: theme === "dark" ? "#fff" : "#000" } },
      title: {
        display: true,
        text: "HTTP Methods Over Time",
        color: theme === "dark" ? "#fff" : "#000",
      },
    },
  };

  return <Line data={chartData} options={chartOptions} />;
};

// Helper to assign colors based on method
const getColor = (method: string, theme: string, border = false): string => {
  const colors: { [key: string]: string } = {
    GET: theme === "dark" ? "rgba(75, 192, 192, 0.6)" : "rgba(54, 162, 235, 0.6)",
    POST: theme === "dark" ? "rgba(255, 99, 132, 0.6)" : "rgba(255, 99, 132, 0.6)",
    "300": theme === "dark" ? "rgba(255, 206, 86, 0.6)" : "rgba(255, 206, 86, 0.6)",
    Unknown: theme === "dark" ? "rgba(153, 102, 255, 0.6)" : "rgba(153, 102, 255, 0.6)",
  };
  const color = colors[method] || "rgba(128, 128, 128, 0.6)";
  if (border) return color.replace("0.6", "1"); // Increase opacity for border
  return color;
};

export default StackedAreaChartComponent;