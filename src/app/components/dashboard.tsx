"use client"

import { useState, useEffect } from "react"
import LineChartComponent from "./line-chart"
import DonutChartComponent from "./donut-chart"
import LogsTable from "./ui/logs-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMobile } from "@/app/hooks/use-mobile"
import { ThemeToggle } from "./theme-toggle"
import { useTheme } from "next-themes"
import BarChartComponent from "./bar-chart"
import StackedAreaChartComponent from "./stacked-area-chart"

interface AlertLogData {
    time: string;
    current: number;
    previous: number;
}

interface AlertTypeData {
    type: string;
    value: number;
}

interface LogData {
    id: number;
    ip: string;
    timestamp: string;
    method: string;
    path: string;
    http_version: string;
    status: number;
    bytes: number;
    browser: string;
}

interface TopIpData {
    ip: string;
    requests: number;
}

interface HttpMethodData {
    time: string;
    methods: { [key: string]: number };
}
import ParsedLogsContainer from "../containers/parsed-logs"

// Sample data for charts
const alertLogData = [
    { time: "Jan", current: 65, previous: 40 },
    { time: "Feb", current: 120, previous: 80 },
    { time: "Mar", current: 90, previous: 100 },
    { time: "Apr", current: 180, previous: 120 },
    { time: "May", current: 140, previous: 160 },
    { time: "Jun", current: 210, previous: 180 },
]

const alertTypeData = [
    { type: "Critical", value: 35 },
    { type: "Warning", value: 45 },
    { type: "Info", value: 20 },
]

const logsData = [
    {
        id: 1,
        ip: "20.171.26.170",
        timestamp: "2025-03-31T00:00:44+00:00",
        method: "300",
        path: "MGLNDD_34.77.148.68_80",
        http_version: "3.11",
        status: 400,
        bytes: 166,
        browser: "Chrome",
    },
    {
        id: 2,
        ip: "65.49.20.69",
        timestamp: "2025-03-31T00:05:29+00:00",
        method: "",
        path: "\\x16\\x03\\x01\\x00{\\x01\\x00\\x00w\\x03\\x03(\\x84\\xE0c\\xC46\\x0C\\xC0*\\xBF\\xB24\\xD9\\x89\\x5C~\\x8D\\x11\\x8F\\xC4",
        http_version: "",
        status: 400,
        bytes: 166,
        browser: "-",
    },
    {
        id: 3,
        ip: "43.153.74.75",
        timestamp: "2025-03-31T00:17:00+00:00",
        method: "GET",
        path: "/",
        http_version: "HTTP/1.1",
        status: 200,
        bytes: 1462,
        browser: "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
    },
]

export default function Dashboard() {
    const isMobile = useMobile()
    const [isClient, setIsClient] = useState(false)
    const { theme } = useTheme()
    const [topIpsData, setTopIpsData] = useState<TopIpData[]>([]);
    const [httpMethodsData, setHttpMethodsData] = useState<HttpMethodData[]>([]);

    useEffect(() => {
        setIsClient(true)

        const ipCounts: { [key: string]: number } = {};
        logsData.forEach((log) => {
            ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
        });

        const sortedIps = Object.entries(ipCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3);

        const data: TopIpData[] = sortedIps.map(([ip, requests]) => ({ ip, requests }));
        setTopIpsData(data);

        const methodData: { [key: string]: { [key: string]: number } } = {};
        logsData.forEach((log) => {
            // Extract time (truncate to minute for grouping)
            const time = new Date(log.timestamp).toISOString().slice(0, 16); // e.g., "2025-03-31T00:00"
            const method = log.method || "Unknown"; // Handle empty method as "Unknown"


            if (!methodData[time]) {
                methodData[time] = {};
            }
            methodData[time][method] = (methodData[time][method] || 0) + 1;
        });

        const formattedData: HttpMethodData[] = Object.entries(methodData).map(([time, methods]) => ({
            time,
            methods,
        }));
        setHttpMethodsData(formattedData);
    }, [])

    if (!isClient) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Alert Dashboard</h1>
                <ThemeToggle />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-gray-300">
                    <CardHeader>
                        <CardTitle>Total Alert Log Enter (Time)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <LineChartComponent data={alertLogData} theme={theme} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-gray-300">
                    <CardHeader>
                        <CardTitle>Alert Type Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] flex items-center justify-center">
                            <DonutChartComponent data={alertTypeData} theme={theme} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <ParsedLogsContainer />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border border-gray-300">
                    <CardHeader>
                        <CardTitle>Top 3 IPs by Request Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <BarChartComponent data={topIpsData} theme={theme} />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-gray-300 w-full">
                    <CardHeader>
                        <CardTitle>HTTP Methods Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <StackedAreaChartComponent data={httpMethodsData} theme={theme} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
