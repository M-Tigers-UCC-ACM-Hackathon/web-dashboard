"use client"

import { useRef, useEffect } from "react"
import { Chart, registerables } from "chart.js"
import { useMobile } from "@/app/hooks/use-mobile"

// Register Chart.js components
Chart.register(...registerables)

interface DataPoint {
    time: string
    current: number
    previous: number
}

interface LineChartProps {
    data: DataPoint[]
    theme?: string
}

export default function LineChartComponent({ data, theme }: LineChartProps) {
    const chartRef = useRef<HTMLCanvasElement | null>(null)
    const chartInstance = useRef<Chart | null>(null)
    const isMobile = useMobile()

    useEffect(() => {
        if (!chartRef.current) return

        // Destroy existing chart
        if (chartInstance.current) {
            chartInstance.current.destroy()
        }

        const ctx = chartRef.current.getContext("2d")
        if (!ctx) return

        const isDark = theme === "dark"
        const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"
        const textColor = isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)"

        chartInstance.current = new Chart(ctx, {
            type: "line",
            data: {
                labels: data.map((item) => item.time),
                datasets: [
                    {
                        label: "Current Period",
                        data: data.map((item) => item.current),
                        borderColor: "rgb(59, 130, 246)",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        tension: 0.3,
                        fill: false,
                    },
                    {
                        label: "Previous Period",
                        data: data.map((item) => item.previous),
                        borderColor: "rgb(209, 213, 219)",
                        backgroundColor: "rgba(209, 213, 219, 0.1)",
                        tension: 0.3,
                        fill: false,
                        borderDash: [5, 5],
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: isMobile ? "bottom" : "top",
                        labels: {
                            color: textColor,
                        },
                    },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                    },
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                        title: {
                            display: true,
                            text: "Time",
                            color: textColor,
                        },
                        ticks: {
                            color: textColor,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: gridColor,
                        },
                        title: {
                            display: true,
                            text: "Alert Count",
                            color: textColor,
                        },
                        ticks: {
                            color: textColor,
                        },
                    },
                },
                interaction: {
                    mode: "nearest",
                    axis: "x",
                    intersect: false,
                },
            },
        })

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy()
            }
        }
    }, [data, isMobile, theme])

    return <canvas ref={chartRef} />
}
