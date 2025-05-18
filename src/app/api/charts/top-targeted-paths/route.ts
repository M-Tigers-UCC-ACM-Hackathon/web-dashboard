import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// This interface should match what your BarChartComponent (or other chart) expects
// if BaseChart's T is BarChartDataPoint, then this API should return that.
export interface TargetedPathDataPoint {
    label: string; // Represents the path
    value: number; // Represents the count of occurrences (flags)
}

interface PathCountFromDB {
    path: string | null;
    count: string; // count(*) returns bigint, often as string
}

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const topN = limitParam ? parseInt(limitParam, 10) : 5; // Default to top 5

    if (isNaN(topN) || topN <= 0) {
        return NextResponse.json({ error: 'Invalid limit parameter. Must be a positive integer.' }, { status: 400 });
    }

    try {
        const query = `
            SELECT
                COALESCE(path, 'Unknown Path') AS path,
                COUNT(*) AS count -- Counts rows where flag > 0 for each path
            FROM
                public.nginx_logs
            WHERE
                flag > 0 -- Only consider rows where flag is greater than 0
            GROUP BY
                COALESCE(path, 'Unknown Path')
            ORDER BY
                count DESC
            LIMIT $1; -- Use parameterized query for the limit
        `;

        const result = await pool.query<PathCountFromDB>(query, [topN]);

        const chartData: TargetedPathDataPoint[] = result.rows.map(row => ({
            label: row.path || 'Unknown Path',
            value: parseInt(row.count, 10),
        }));

        return NextResponse.json(chartData);

    } catch (error: any) {
        console.error('API Top Targeted Paths: Error fetching data:', error);
        return NextResponse.json({ error: 'Failed to fetch top targeted path data.', detailsForServerLog: error.message }, { status: 500 });
    }
}