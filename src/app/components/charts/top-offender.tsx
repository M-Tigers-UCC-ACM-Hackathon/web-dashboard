'use client';

import React from 'react';
import BaseChart from '@/app/components/ui/base-chart';
import BarChartComponent, { BarChartDataPoint } from '../ui/bar-chart';

interface TopOffenderChartProps {
    theme?: string;
}

function TopOffenderChart({ theme }: TopOffenderChartProps) {
    const chartComponent = React.useCallback((props: { data: BarChartDataPoint[] }) => {
        return (
            <BarChartComponent
                {...props}
                xAxisLabel="IP Addresses"
                yAxisLabel="Alert Count"
                theme={theme}
            />
        );
    }, [theme]);

    return (
        <BaseChart<BarChartDataPoint>
            title="Top 3 IPs by Alerts Generated"
            endpoint="/api/charts/alerts/top-offenders"
            theme={theme}
            chartComponent={chartComponent}
            emptyMessage="No IP data available."
        />
    );
}

export default TopOffenderChart;