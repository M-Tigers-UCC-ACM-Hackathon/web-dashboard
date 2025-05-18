'use client';

import React from 'react';
import BaseChart from '@/app/components/ui/base-chart';
import BarChartComponent, { BarChartDataPoint } from '../ui/bar-chart';

interface TopOffenderChartProps {
    theme?: string;
}

function TopOffenderChart({ theme }: TopOffenderChartProps) {
    return (
        <BaseChart<BarChartDataPoint>
            title="Top 3 IPs by Request Volume"
            endpoint="/api/charts/alerts/top-offenders"
            theme={theme}
            chartComponent={BarChartComponent}
            emptyMessage="No IP data available."
        />
    );
}

export default TopOffenderChart;