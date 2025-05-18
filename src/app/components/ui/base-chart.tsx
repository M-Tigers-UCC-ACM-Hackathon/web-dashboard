'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';

interface ChartProps<T> {
    title: string;
    endpoint: string;
    theme?: string;
    chartComponent: React.ComponentType<{ data: T[]; theme?: string }>;
    emptyMessage?: string;
    refreshInterval?: number;
    dataParser?: (data: any) => T[];
}

function BaseChart<T>({
    title,
    endpoint,
    theme,
    chartComponent: ChartComponent,
    emptyMessage = "No data available.",
    refreshInterval = 300000, // 5 minutes default
    dataParser = (data) => data,
}: ChartProps<T>) {
    const [chartData, setChartData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(endpoint);
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (jsonParseError) {
                        throw new Error(`Server responded with ${response.status}: ${response.statusText}. Response not JSON.`);
                    }
                    throw new Error(errorData.error || `Failed to fetch data: ${response.statusText}`);
                }
                const rawData = await response.json();
                const parsedData = dataParser(rawData);
                setChartData(parsedData);
            } catch (err: any) {
                console.error(`Error fetching data from ${endpoint}:`, err);
                setError(err.message || "Failed to load data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        const intervalId = setInterval(fetchData, refreshInterval);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <Card className="border border-gray-300">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading && <p className="text-center">Loading chart data...</p>}
                {error && <p style={{ color: 'red' }} className="text-center">Error: {error}</p>}
                {!isLoading && !error && chartData.length === 0 && (
                    <p className="text-center">{emptyMessage}</p>
                )}
                {!isLoading && !error && chartData.length > 0 && (
                    <div className="h-[350px] flex items-center justify-center">
                        <ChartComponent data={chartData} theme={theme} />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default BaseChart;
