'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';
import LineChartComponent from '@/app/components/ui/line-chart';

interface ChartDataPoint {
    time: string;
    current: number;
    previous: number;
}

interface AlertTypeDistributionChartProps {
    theme?: string;
}

function AlertTypeDistributionChartProps({ theme }: AlertTypeDistributionChartProps) {
    const [alertLogData, setAlertLogData] = useState<ChartDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTrendData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/charts/alerts/trend');
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (jsonParseError) {
                        throw new Error(`Server responded with ${response.status}: ${response.statusText}. Response not JSON.`);
                    }
                    throw new Error(errorData.error || `Failed to fetch alert trend: ${response.statusText}`);
                }
                const data: ChartDataPoint[] = await response.json();
                setAlertLogData(data);
            } catch (err: any) {
                console.error("AlertTrendChart: Error fetching trend data:", err);
                setError(err.message || "Failed to load trend data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrendData();

        const intervalId = setInterval(fetchTrendData, 60000 * 5);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <Card className="border border-gray-300">
            <CardHeader>
                <CardTitle>Hourly Alert Trend (Last 24 Hours)</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && <p>Loading chart data...</p>}
                {error && <p style={{ color: 'red' }}>Error: {error}</p>}
                {!isLoading && !error && alertLogData.length === 0 && <p>No trend data available.</p>}
                {!isLoading && !error && alertLogData.length > 0 && (
                    <div className="h-[300px]">
                        <LineChartComponent data={alertLogData} theme={theme} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default AlertTypeDistributionChartProps;