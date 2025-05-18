'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';

import DonutChartComponent, { DonutChartDataPoint } from '@/app/components/ui/donut-chart';

interface AlertDistributionChartProps {
    theme?: string;
}

function AlertDistributionChart({ theme }: AlertDistributionChartProps) {
    const [chartData, setChartData] = useState<DonutChartDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDistributionData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/charts/alerts/type-distribution');
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (jsonParseError) {
                        throw new Error(`Server responded with ${response.status}: ${response.statusText}. Response not JSON.`);
                    }
                    throw new Error(errorData.error || `Failed to fetch alert distribution: ${response.statusText}`);
                }
                const data: DonutChartDataPoint[] = await response.json();
                setChartData(data);
            } catch (err: any) {
                console.error("AlertDistributionChart: Error fetching distribution data:", err);
                setError(err.message || "Failed to load distribution data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDistributionData();

        const intervalId = setInterval(fetchDistributionData, 60000 * 5); // Refetch every 15 minutes
        return () => clearInterval(intervalId); // Cleanup interval
    }, []);

    return (
        <Card className="border border-gray-300">
            <CardHeader>
                <CardTitle>Alert Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-center">Loading chart data...</p>}
                {error && <p style={{ color: 'red' }} className="text-center">Error: {error}</p>}
                {!isLoading && !error && chartData.length === 0 && <p className="text-center">No alert distribution data available.</p>}
                {!isLoading && !error && chartData.length > 0 && (
                    <div className="h-[300px] flex items-center justify-center">
                        <DonutChartComponent data={chartData} theme={theme} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default AlertDistributionChart;