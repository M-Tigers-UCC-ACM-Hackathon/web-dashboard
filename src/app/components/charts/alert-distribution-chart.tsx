'use client';

import React from 'react';
import BaseChart from '@/app/components/ui/base-chart';
import DonutChartComponent, { DonutChartDataPoint } from '@/app/components/ui/donut-chart';

interface AlertDistributionChartProps {
    theme?: string;
}

function AlertDistributionChart({ theme }: AlertDistributionChartProps) {
    return (
        <BaseChart<DonutChartDataPoint>
            title="Alert Type Distribution"
            endpoint="/api/charts/alerts/type-distribution"
            theme={theme}
            chartComponent={DonutChartComponent}
            emptyMessage="No alert distribution data available."
        />
    );
}

export default AlertDistributionChart;