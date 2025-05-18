// import { NextResponse } from 'next/server';
// import pool from '@/lib/db';

// interface ChartDataPoint {
//     time: string;
//     current: number;
//     previous: number;
// }

// export async function GET() {
//     try {
//         const query = `
//             WITH hourly_alerts AS (
//                 SELECT
//                     -- Extract hour of the day (0-23) for grouping across different days
//                     EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') AS hour_of_day,
//                     -- Determine if the alert falls into the 'current' or 'previous' 24-hour window
//                     CASE
//                         WHEN created_at >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours') THEN 'current'
//                         WHEN created_at >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours') AND created_at < (NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours') THEN 'previous'
//                         ELSE NULL -- Exclude data older than 48 hours
//                     END AS period_indicator,
//                     COUNT(*) AS alert_count
//                 FROM
//                     public.alerts
//                 WHERE
//                     created_at >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours') -- Only consider data from the last 48 hours
//                 GROUP BY
//                     hour_of_day, period_indicator
//             )
//             SELECT
//                 ha.hour_of_day,
//                 ha.period_indicator,
//                 ha.alert_count
//             FROM
//                 hourly_alerts ha
//             WHERE
//                 ha.period_indicator IS NOT NULL -- Ensure we only get 'current' or 'previous'
//             ORDER BY
//                 ha.hour_of_day, ha.period_indicator;
//         `;

//         const result = await pool.query<{ hour_of_day: number, period_indicator: 'current' | 'previous', alert_count: string }>(query);

//         const chartData: ChartDataPoint[] = Array.from({ length: 24 }, (_, i) => {
//             const hourString = i.toString().padStart(2, '0') + ":00";
//             return {
//                 time: hourString,
//                 current: 0,
//                 previous: 0,
//             };
//         });

//         // Populate chartData with results from the database
//         result.rows.forEach(row => {
//             const hourIndex = row.hour_of_day;
//             const count = parseInt(row.alert_count, 10);

//             if (chartData[hourIndex]) {
//                 if (row.period_indicator === 'current') {
//                     chartData[hourIndex].current = count;
//                 } else if (row.period_indicator === 'previous') {
//                     chartData[hourIndex].previous = count;
//                 }
//             }
//         });

//         return NextResponse.json(chartData);

//     } catch (error: any) {
//         console.error('API Alert Trend: Error fetching data:', error);
//         return NextResponse.json({ error: 'Failed to fetch alert trend data.', detailsForServerLog: error.message }, { status: 500 });
//     }
// }
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

interface ChartDataPoint {
    time: string;
    current: number;
    previous: number;
}

export async function GET(request: Request) {
    try {
        // Get URL parameters for flexible time windows
        const { searchParams } = new URL(request.url);

        // Determine if we should use time shifting for demo/prototype mode
        const useTimeShift = searchParams.get('timeShift') !== 'false';

        // Allow configuring the time field to use (log_time vs created_at)
        const timeField = searchParams.get('timeField') || 'log_time';

        console.log(`Alert Trend API: Using ${useTimeShift ? 'prototype' : 'realtime'} mode with ${timeField} field`);

        // Initialize variables
        let query;

        if (useTimeShift) {
            // Time shifting for prototype mode - use a single query with CTEs
            query = `
                WITH time_reference AS (
                    SELECT MAX(${timeField}) as max_time FROM public.alerts
                ),
                time_windows AS (
                    SELECT 
                        max_time,
                        (max_time - INTERVAL '24 hours') as day_ago,
                        (max_time - INTERVAL '48 hours') as two_days_ago
                    FROM time_reference
                ),
                hourly_alerts AS (
                    SELECT
                        EXTRACT(HOUR FROM ${timeField} AT TIME ZONE 'UTC') AS hour_of_day,
                        CASE
                            WHEN ${timeField} >= (SELECT day_ago FROM time_windows) THEN 'current'
                            WHEN ${timeField} >= (SELECT two_days_ago FROM time_windows) 
                                 AND ${timeField} < (SELECT day_ago FROM time_windows) THEN 'previous'
                            ELSE NULL
                        END AS period_indicator,
                        COUNT(*) AS alert_count
                    FROM
                        public.alerts
                    WHERE
                        ${timeField} >= (SELECT two_days_ago FROM time_windows)
                    GROUP BY
                        hour_of_day, period_indicator
                )
                SELECT
                    hour_of_day,
                    period_indicator,
                    alert_count
                FROM
                    hourly_alerts
                WHERE
                    period_indicator IS NOT NULL
                ORDER BY
                    hour_of_day, period_indicator;
            `;
        } else {
            // Real-time mode - use current time as reference
            query = `
                WITH hourly_alerts AS (
                    SELECT
                        EXTRACT(HOUR FROM ${timeField} AT TIME ZONE 'UTC') AS hour_of_day,
                        CASE
                            WHEN ${timeField} >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours') THEN 'current'
                            WHEN ${timeField} >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours') 
                                 AND ${timeField} < (NOW() AT TIME ZONE 'UTC' - INTERVAL '24 hours') THEN 'previous'
                            ELSE NULL
                        END AS period_indicator,
                        COUNT(*) AS alert_count
                    FROM
                        public.alerts
                    WHERE
                        ${timeField} >= (NOW() AT TIME ZONE 'UTC' - INTERVAL '48 hours')
                    GROUP BY
                        hour_of_day, period_indicator
                )
                SELECT
                    hour_of_day,
                    period_indicator,
                    alert_count
                FROM
                    hourly_alerts
                WHERE
                    period_indicator IS NOT NULL
                ORDER BY
                    hour_of_day, period_indicator;
            `;
        }

        // Log the query for debugging
        console.log('Running query:', query.replace(/\s+/g, ' ').trim());

        // Execute the query
        const result = await pool.query<{
            hour_of_day: number,
            period_indicator: 'current' | 'previous',
            alert_count: string
        }>(query);

        console.log(`Query returned ${result.rowCount} rows`);

        // Create the data structure with zeros for all hours
        const chartData: ChartDataPoint[] = Array.from({ length: 24 }, (_, i) => {
            const hourString = i.toString().padStart(2, '0') + ":00";
            return {
                time: hourString,
                current: 0,
                previous: 0,
            };
        });

        // Populate chartData with results
        result.rows.forEach(row => {
            const hourIndex = parseInt(row.hour_of_day.toString(), 10);
            const count = parseInt(row.alert_count, 10);

            if (chartData[hourIndex]) {
                if (row.period_indicator === 'current') {
                    chartData[hourIndex].current = count;
                } else if (row.period_indicator === 'previous') {
                    chartData[hourIndex].previous = count;
                }
            }
        });

        // Store metadata in console but return just the chart data array to maintain
        // compatibility with existing frontend
        console.log('Metadata:', {
            mode: useTimeShift ? 'prototype' : 'realtime',
            timeField,
            totalRows: result.rowCount,
        });

        // Return just the chartData array as before
        return NextResponse.json(chartData);

    } catch (error: any) {
        console.error('API Alert Trend: Error fetching data:', error);

        // Provide more detailed error info for debugging
        const errorDetails = {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            position: error.position,
        };

        console.error('Error details:', JSON.stringify(errorDetails, null, 2));

        // Return error response that matches the original format
        return NextResponse.json({ error: 'Failed to fetch alert trend data.' }, { status: 500 });
    }
}