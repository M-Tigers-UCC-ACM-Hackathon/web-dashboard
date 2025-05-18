import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { NginxLog } from '@/types/nginx-log';

export async function GET() {
    try {
        const result = await pool.query<NginxLog>(
            'SELECT id, ip, log_time, method, path, http_ver, status, bytes, user_agent FROM public.nginx_logs ORDER BY log_time DESC LIMIT 100'
        );

        const logs = result.rows.map(log => ({
            ...log,
            log_time: new Date(log.log_time).toISOString(),
        }));

        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('API Initial Logs: Error fetching data:', error);
        let clientErrorMessage = 'Failed to fetch initial logs from database.';
        if (error.code === '42501') { // Permission denied
            clientErrorMessage = 'Database permission denied for fetching logs.';
        } else if (error.message.includes('certificate')) {
            clientErrorMessage = 'Database SSL certificate issue.';
        }
        return NextResponse.json({ error: clientErrorMessage, detailsForServerLog: error.message }, { status: 500 });
    }
}