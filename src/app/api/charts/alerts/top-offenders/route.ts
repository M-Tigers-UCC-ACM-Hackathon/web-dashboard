import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { BarChartDataPoint } from '@/app/components/ui/bar-chart';

interface OffenderIpCountFromDB {
    offender_ip: string;       // offender_ip is inet, will be string here
    count: string;             // count(*) returns bigint, often as string by pg driver
}

export async function GET() {
    try {
        const query = `
            SELECT
                offender_ip::TEXT AS offender_ip, -- Cast inet to TEXT for easier handling as string
                COUNT(*) AS count
            FROM
                public.alerts
            WHERE
                offender_ip IS NOT NULL -- Exclude alerts where offender_ip is NULL
            GROUP BY
                offender_ip
            ORDER BY
                count DESC
            LIMIT 3; -- Get only the top 3 offenders
        `;

        const result = await pool.query<OffenderIpCountFromDB>(query);

        const chartData: BarChartDataPoint[] = result.rows.map(row => ({
            label: row.offender_ip,
            value: parseInt(row.count, 10),
        }));

        // If you need to provide data in a format directly consumable by Chart.js
        // (e.g., separate labels and data arrays), you can transform it further:
        // const labels = chartData.map(item => item.label);
        // const values = chartData.map(item => item.value);
        // return NextResponse.json({ labels, datasets: [{ label: 'Alert Count', data: values, backgroundColor: 'rgba(59, 130, 246, 0.5)' }] });

        return NextResponse.json(chartData); // Returning array of {label, value} objects

    } catch (error: any) {
        console.error('API Top Offenders: Error fetching data:', error);
        return NextResponse.json({ error: 'Failed to fetch top offender data.', detailsForServerLog: error.message }, { status: 500 });
    }
}