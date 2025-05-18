'use client';

import React from 'react';
import BaseChart from '@/app/components/ui/base-chart';
import LineChartComponent from '@/app/components/ui/line-chart';

interface ChartDataPoint {
    time: string;
    current: number;
    previous: number;
}

interface AlertTrendChartProps {
    theme?: string;
}

function AlertTrendChart({ theme }: AlertTrendChartProps) {
    return (
        <BaseChart<ChartDataPoint>
            title="Hourly Alert Trend (Last 24 Hours)"
            endpoint="/api/charts/alerts/trend"
            theme={theme}
            chartComponent={LineChartComponent}
            emptyMessage="No trend data available."
        />
    );
}

export default AlertTrendChart;