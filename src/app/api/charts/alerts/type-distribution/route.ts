import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { DonutChartDataPoint } from '@/app/components/ui/donut-chart';

interface AlertTypeCountFromDB {
    alert_type: string | null;
    count: string;
}

export async function GET() {
    try {
        const query = `
            SELECT
                COALESCE(alert_type, 'Unknown') AS alert_type, -- Group NULL types as 'Unknown'
                COUNT(*) AS count
            FROM
                public.alerts
            GROUP BY
                COALESCE(alert_type, 'Unknown')
            ORDER BY
                count DESC; -- Optionally order by count or alert_type
        `;

        const result = await pool.query<AlertTypeCountFromDB>(query);

        const chartData: DonutChartDataPoint[] = result.rows.map(row => ({
            type: row.alert_type || 'Unknown',
            value: parseInt(row.count, 10),
        }));

        return NextResponse.json(chartData);

    } catch (error: any) {
        console.error('API Alert Distribution: Error fetching data:', error);
        return NextResponse.json({ error: 'Failed to fetch alert distribution data.', detailsForServerLog: error.message }, { status: 500 });
    }
}