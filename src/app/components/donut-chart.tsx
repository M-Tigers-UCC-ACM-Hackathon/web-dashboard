"use client"

import { useRef, useEffect } from "react"
import { Chart, registerables } from "chart.js"

// Register Chart.js components
Chart.register(...registerables)

interface DataPoint {
    type: string
    value: number
}

interface DonutChartProps {
    data: DataPoint[]
    theme?: string
}

export default function DonutChartComponent({ data, theme }: DonutChartProps) {
    const chartRef = useRef<HTMLCanvasElement | null>(null)
    const chartInstance = useRef<Chart | null>(null)

    useEffect(() => {
        if (!chartRef.current) return

        // Destroy existing chart
        if (chartInstance.current) {
            chartInstance.current.destroy()
        }

        const ctx = chartRef.current.getContext("2d")
        if (!ctx) return

        // Define colors based on alert types
        const colors = {
            Critical: "rgb(239, 68, 68)", // red
            Warning: "rgb(245, 158, 11)", // amber
            Info: "rgb(59, 130, 246)", // blue
            default: "rgb(156, 163, 175)", // gray
        }

        const isDark = theme === "dark"
        const textColor = isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)"

        chartInstance.current = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: data.map((item) => item.type),
                datasets: [
                    {
                        data: data.map((item) => item.value),
                        backgroundColor: data.map((item) => colors[item.type as keyof typeof colors] || colors.default),
                        borderColor: "white",
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
                                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0) as number
                                const percentage = Math.round((value / total) * 100)
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
