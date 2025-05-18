import { NextResponse } from 'next/server';
import pool from '@/lib/db'; // Your shared database pool

export interface TableCountsData {
    nginxLogsCount: number;
    alertsCount: number;
}

interface CountResult {
    count: string; // count(*) returns bigint, which pg driver might return as string
}

export async function GET() {
    try {
        // --- Query for nginx_logs count ---
        const nginxLogsQuery = 'SELECT COUNT(*) AS count FROM public.nginx_logs;';
        const nginxLogsResult = await pool.query<CountResult>(nginxLogsQuery);
        const nginxLogsCount = parseInt(nginxLogsResult.rows[0]?.count || "0", 10);

        // --- Query for alerts count ---
        const alertsQuery = 'SELECT COUNT(*) AS count FROM public.alerts;';
        const alertsResult = await pool.query<CountResult>(alertsQuery);
        const alertsCount = parseInt(alertsResult.rows[0]?.count || "0", 10);

        const responseData: TableCountsData = {
            nginxLogsCount,
            alertsCount,
        };

        return NextResponse.json(responseData);

    } catch (error: any) {
        console.error('API Table Counts: Error fetching data:', error);
        return NextResponse.json({ error: 'Failed to fetch table row counts.', detailsForServerLog: error.message }, { status: 500 });
    }
}