// src/app/api/alerts/initial/route.ts
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { Alert } from '@/types/alert'; // Adjust path
import fs from 'fs'; // If reading CA cert from file
import path from 'path'; // If reading CA cert from file

// --- Environment Variable Checks & Pool Setup ---
const PG_HOST = process.env.PG_HOST;
const PG_PORT_STR = process.env.PG_PORT;
const PG_USER = process.env.PG_USER;
const PG_PASSWORD = process.env.PG_PASSWORD;
const PG_DATABASE = process.env.PG_DATABASE;

// Choose one SSL CA method:
// Option 1: CA Cert Content from Environment Variable
const PG_SSL_CA_CONTENT = process.env.PG_SSL_CA_CONTENT;
// Option 2: CA Cert Path from Environment Variable
// const PG_SSL_CA_PATH = process.env.PG_SSL_CA_PATH;
// let caCertFromFileContent: string | undefined;
// if (PG_SSL_CA_PATH) { /* ... file reading logic ... */ }

const finalCaCertContent = PG_SSL_CA_CONTENT; // || caCertFromFileContent;

if (!PG_HOST || !PG_PORT_STR || !PG_USER || !PG_DATABASE) {
    console.error("API Initial Alerts: Missing core PG environment variables.");
}
if (process.env.NODE_ENV === 'production' && !finalCaCertContent) {
    console.error("CRITICAL API Initial Alerts: CA Certificate not set in production.");
}

// --- Singleton Pattern for pgPool in Development ---
const GLOBAL_PG_API_POOL_ALERTS_KEY = Symbol.for('myapp.apiPgPool.initialAlerts');
interface GlobalWithPgAlertsPool {
    [GLOBAL_PG_API_POOL_ALERTS_KEY]?: Pool;
}
const customGlobalAlerts = globalThis as GlobalWithPgAlertsPool;

let pgAlertsPool: Pool;

if (process.env.NODE_ENV === 'production') {
    pgAlertsPool = new Pool({
        host: PG_HOST,
        port: parseInt(PG_PORT_STR || "5432"),
        user: PG_USER,
        password: PG_PASSWORD,
        database: PG_DATABASE,
        ssl: finalCaCertContent ? { rejectUnauthorized: true, ca: finalCaCertContent } : undefined, // Prod MUST have SSL
    });
} else { // Development
    if (!customGlobalAlerts[GLOBAL_PG_API_POOL_ALERTS_KEY]) {
        console.log("API Initial Alerts Pool (Dev): Creating new pool instance.");
        customGlobalAlerts[GLOBAL_PG_API_POOL_ALERTS_KEY] = new Pool({
            host: PG_HOST,
            port: parseInt(PG_PORT_STR || "5432"),
            user: PG_USER,
            password: PG_PASSWORD,
            database: PG_DATABASE,
            ssl: finalCaCertContent
                ? { rejectUnauthorized: true, ca: finalCaCertContent }
                : { rejectUnauthorized: false },
            max: 5,
        });
        if (!finalCaCertContent) {
            console.warn("API Initial Alerts Pool (Dev): PG_SSL_CA not provided, using rejectUnauthorized:false.");
        }
    } else {
        console.log("API Initial Alerts Pool (Dev): Reusing existing pool instance.");
    }
    pgAlertsPool = customGlobalAlerts[GLOBAL_PG_API_POOL_ALERTS_KEY]!;
}
// --- End Pool Setup ---

export async function GET() {
    if (!pgAlertsPool || !PG_HOST) {
        console.error("API Initial Alerts: Database pool not initialized or missing config.");
        return NextResponse.json({ error: 'Server configuration error for database.' }, { status: 500 });
    }

    try {
        // Fetch the last, e.g., 50 alerts, ordered by creation time
        const result = await pgAlertsPool.query<Alert>(
            'SELECT alert_id, alert_type, severity, offender_ip, reason, explanation, created_at FROM public.alerts ORDER BY created_at DESC LIMIT 50'
        );

        const alerts = result.rows.map(alert => ({
            ...alert,
            created_at: new Date(alert.created_at as string | Date).toISOString(), // Ensure ISO string
        }));

        return NextResponse.json(alerts); // Reverse for chronological display
    } catch (error: any) {
        console.error('API Initial Alerts: Error fetching data:', error);
        let clientErrorMessage = 'Failed to fetch initial alerts from database.';
        // Add more specific error messages based on error codes if needed
        if (error.code === '42501') clientErrorMessage = 'Database permission denied for fetching alerts.';
        else if (error.message.includes('certificate')) clientErrorMessage = 'Database SSL certificate issue.';
        return NextResponse.json({ error: clientErrorMessage, detailsForServerLog: error.message }, { status: 500 });
    }
}