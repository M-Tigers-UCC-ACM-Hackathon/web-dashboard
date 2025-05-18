'use client';

import React from 'react';
import BaseChart from '@/app/components/ui/base-chart';
import BarChartComponent, { BarChartDataPoint } from '../ui/bar-chart';

interface TopTargetedPathChartProps {
    theme?: string;
}

function TopTargetedPathsChart({ theme }: TopTargetedPathChartProps) {
    const chartComponent = React.useCallback((props: { data: BarChartDataPoint[] }) => {
        return (
            <BarChartComponent
                {...props}
                xAxisLabel="Paths"
                yAxisLabel="Request Count"
                theme={theme}
            />
        );
    }, [theme]);

    return (
        <BaseChart<BarChartDataPoint>
            title="Top Targeted Paths"
            endpoint="/api/charts/top-targeted-paths"
            theme={theme}
            chartComponent={chartComponent}
            emptyMessage="No path data available."
        />
    );
}

export default TopTargetedPathsChart;