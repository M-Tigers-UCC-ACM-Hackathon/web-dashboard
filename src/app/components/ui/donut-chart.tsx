"use client"

import { useRef, useEffect } from "react"
import { Chart, registerables } from "chart.js"

// Register Chart.js components
Chart.register(...registerables)

export interface DonutChartDataPoint {
    type: string
    value: number
}

interface DonutChartProps {
    data: DonutChartDataPoint[]
    theme?: string
}

export default function DonutChartComponent({ data, theme }: DonutChartProps) {
    const chartRef = useRef<HTMLCanvasElement | null>(null)
    const chartInstance = useRef<Chart | null>(null)

    useEffect(() => {
        if (!chartRef.current || !data || data.length === 0) {
            // If there's no data or ref, destroy any existing chart and exit
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }

        // Destroy existing chart before creating a new one
        if (chartInstance.current) {
            chartInstance.current.destroy()
        }

        const ctx = chartRef.current.getContext("2d")
        if (!ctx) return

        // --- Sort data by value in descending order to determine color ranking ---
        const sortedData = [...data].sort((a, b) => b.value - a.value);

        // Define ranked colors
        const rankedColors = [
            "rgb(239, 68, 68)",   // 1st biggest: red
            "rgb(245, 158, 11)",  // 2nd biggest: amber
            "rgb(59, 130, 246)",  // 3rd biggest: blue
        ];
        const defaultColor = "rgb(156, 163, 175)"; // gray for others

        const chartLabels = data.map((item) => item.type);
        const chartValues = data.map((item) => item.value);

        const backgroundColors = data.map((item) => {
            const rank = sortedData.findIndex(sortedItem => sortedItem.type === item.type && sortedItem.value === item.value);
            // Note: findIndex might not be perfect if types AND values can be identical for different conceptual items.
            // If type is unique, `findIndex(sortedItem => sortedItem.type === item.type)` is safer.
            // Assuming 'type' is unique enough for this purpose or a combination of type+value makes it unique in the original data.
            if (rank >= 0 && rank < rankedColors.length) {
                return rankedColors[rank];
            }
            return defaultColor;
        });


        const isDark = theme === "dark"
        const textColor = isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)"

        chartInstance.current = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: chartLabels, // Use original order for labels
                datasets: [
                    {
                        data: chartValues, // Use original order for values
                        backgroundColor: backgroundColors, // Colors assigned based on sorted rank
                        borderColor: isDark ? "rgb(30, 41, 59)" : "white", // Darker border for dark theme
                        borderWidth: 2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            color: textColor,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label || ""
                                const value = context.raw as number
                                const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0) as number
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${percentage}% (${value})`
                            },
                        },
                    },
                },
                cutout: "60%",
            },
        })

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy()
            }
        }
    }, [data, theme])

    return <canvas ref={chartRef} />
}