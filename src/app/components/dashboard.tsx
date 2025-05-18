"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useMobile } from "@/app/hooks/use-mobile"
import { useTheme } from "next-themes"

import { ThemeToggle } from "@/app/components/theme-toggle"
import BarChartComponent from "@/app/components/ui/bar-chart"
import LogsContainer from "@/app/components/logs-container"
import AlertsContainer from "@/app/components/alerts-container"
import AlertTrendChart from "@/app/components/alert-trend-chart"
import AlertDistributionChart from "@/app/components/alert-distribution-chart"
import { Button } from "@/components/ui/button"
import Image from "next/image"

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

const alertData = [
    {
        alert_id: 1,
        alert_type: "High Traffic",
        severity: "Warning",
        offender_ip: "20.171.26.170",
        reason: "Excessive GET requests",
        explanation: "IP sent 100 requests in 5 minutes, exceeding threshold",
        created_at: "2025-05-17T20:00:00+05:30",
    },
    {
        alert_id: 2,
        alert_type: "Server Error",
        severity: "Critical",
        offender_ip: "65.49.20.69",
        reason: "Multiple 500 errors",
        explanation: "Server crashed due to overload",
        created_at: "2025-05-17T20:05:00+05:30",
    },
    {
        alert_id: 3,
        alert_type: "Unauthorized Access",
        severity: "Info",
        offender_ip: "43.153.74.75",
        reason: "Failed login attempt",
        explanation: "IP attempted login with invalid credentials",
        created_at: "2025-05-17T20:10:00+05:30",
    },
];

export default function Dashboard() {
    const isMobile = useMobile()
    const [isClient, setIsClient] = useState(false)
    const { theme } = useTheme()
    const [totalRequests, setTotalRequests] = useState<number | null>(null)
    const [totalAlerts, setTotalAlerts] = useState<number | null>(null)
    const [errorBursts, setErrorBursts] = useState<number | null>(null)
    const [ipSpikes, setIpSpikes] = useState<number | null>(null)
    const [behavioralDeviations, setBehavioralDeviations] = useState<number | null>(null)
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
            {/* <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Alert Dashboard</h1>
                <span>Total Requests: <strong>{totalRequests ?? "N/A"}</strong></span>
                <span>Total Alerts: <strong>{totalAlerts ?? "N/A"}</strong></span>
                <span>Error Bursts: <strong>{errorBursts ?? "N/A"}</strong></span>
                <span>IP Spikes: <strong>{ipSpikes ?? "N/A"}</strong></span>
                <span>Behavioral Deviations: <strong>{behavioralDeviations ?? "N/A"}</strong></span>
                <ThemeToggle />
            </div> */}
            <div className="flex flex-col lg:flex-row justify-between gap-4 lg:items-center">
                <h1 className="text-2xl font-bold">Alert Dashboard</h1>

                <div className="flex flex-wrap items-center gap-4">
                    <span>Total Requests: <strong>{totalRequests ?? "N/A"}</strong></span>
                    <span>Total Alerts: <strong>{totalAlerts ?? "N/A"}</strong></span>
                    <span>Error Bursts: <strong>{errorBursts ?? "N/A"}</strong></span>
                    <span>IP Spikes: <strong>{ipSpikes ?? "N/A"}</strong></span>
                    <span>Behavioral Deviations: <strong>{behavioralDeviations ?? "N/A"}</strong></span>
                </div>

                <div className="mt-2 lg:mt-0 flex flex-row items-start gap-2">
                    <Button
                        onClick={() => window.open('/report', '_blank')}
                        className="flex items-center gap-2"
                    >
                        <Image src="/ai-icon.svg" alt="AI Icon" width={20} height={20} />
                        Generate Incident Report
                    </Button>
                    <ThemeToggle />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AlertTrendChart theme={theme} />

                <AlertDistributionChart theme={theme} />
            </div>

            <AlertsContainer />

            <LogsContainer />

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
            </div>
        </div >
    )
}
