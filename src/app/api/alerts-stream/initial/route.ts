import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import type { Alert } from '@/types/alert';


export async function GET() {
    try {
        const result = await pool.query<Alert>(
            'SELECT alert_id, alert_type, severity, offender_ip, reason, explanation, created_at FROM public.alerts ORDER BY created_at DESC LIMIT 50'
        );

        const alerts = result.rows.map(alert => ({
            ...alert,
            created_at: new Date(alert.created_at as string | Date).toISOString(),
        }));

        return NextResponse.json(alerts);
    } catch (error: any) {
        console.error('API Initial Alerts: Error fetching data:', error);
        let clientErrorMessage = 'Failed to fetch initial alerts from database.';
        if (error.code === '42501') clientErrorMessage = 'Database permission denied for fetching alerts.';
        else if (error.message.includes('certificate')) clientErrorMessage = 'Database SSL certificate issue.';
        return NextResponse.json({ error: clientErrorMessage, detailsForServerLog: error.message }, { status: 500 });
    }
}