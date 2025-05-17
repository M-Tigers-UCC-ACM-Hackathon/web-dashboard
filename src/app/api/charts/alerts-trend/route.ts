import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface ChartDataPoint {
    time: string;
    current: number;
    previous: number;
}

export async function GET() {
    try {
        const query = `
            WITH hourly_alerts AS (
                SELECT
                    -- Extract hour of the day (0-23) for grouping across different days
                    EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') AS hour_of_day,
                    -- Determine if the alert falls into the 'current' or 'previous' 24-hour window
                    CASE
                        WHEN created_at >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours') THEN 'current'
                        WHEN created_at >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours') AND created_at < (NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours') THEN 'previous'
                        ELSE NULL -- Exclude data older than 48 hours
                    END AS period_indicator,
                    COUNT(*) AS alert_count
                FROM
                    public.alerts
                WHERE
                    created_at >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours') -- Only consider data from the last 48 hours
                GROUP BY
                    hour_of_day, period_indicator
            )
            SELECT
                ha.hour_of_day,
                ha.period_indicator,
                ha.alert_count
            FROM
                hourly_alerts ha
            WHERE
                ha.period_indicator IS NOT NULL -- Ensure we only get 'current' or 'previous'
            ORDER BY
                ha.hour_of_day, ha.period_indicator;
        `;

        const result = await pool.query<{ hour_of_day: number, period_indicator: 'current' | 'previous', alert_count: string }>(query);

        const chartData: ChartDataPoint[] = Array.from({ length: 24 }, (_, i) => {
            const hourString = i.toString().padStart(2, '0') + ":00";
            return {
                time: hourString,
                current: 0,
                previous: 0,
            };
        });

        // Populate chartData with results from the database
        result.rows.forEach(row => {
            const hourIndex = row.hour_of_day;
            const count = parseInt(row.alert_count, 10);

            if (chartData[hourIndex]) {
                if (row.period_indicator === 'current') {
                    chartData[hourIndex].current = count;
                } else if (row.period_indicator === 'previous') {
                    chartData[hourIndex].previous = count;
                }
            }
        });

        return NextResponse.json(chartData);

    } catch (error: any) {
        console.error('API Alert Trend: Error fetching data:', error);
        return NextResponse.json({ error: 'Failed to fetch alert trend data.', detailsForServerLog: error.message }, { status: 500 });
    }
}