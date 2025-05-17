import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { NginxLog } from '@/types/nginx-log';
import fs from 'fs';
import path from 'path'; // If reading CA cert from file

// --- Environment Variable Checks & Pool Setup ---
const PG_HOST = process.env.PG_HOST;
const PG_PORT = process.env.PG_PORT;
const PG_USER = process.env.PG_USER;
const PG_PASSWORD = process.env.PG_PASSWORD;
const PG_DATABASE = process.env.PG_DATABASE;

const PG_SSL_CA_PATH = process.env.PG_SSL_CA_PATH;
let caCertContent: string | undefined;
if (PG_SSL_CA_PATH) {
    try {
        const fullCaPath = path.resolve(process.cwd(), PG_SSL_CA_PATH);
        if (fs.existsSync(fullCaPath)) {
            caCertContent = fs.readFileSync(fullCaPath, 'utf-8');
        } else {
            console.error(`API Initial Logs: CA cert file not found at: ${fullCaPath}`);
        }
    } catch (error) {
        console.error(`API Initial Logs: Error reading CA cert file:`, error);
    }
}


if (!PG_HOST || !PG_PORT || !PG_USER || !PG_DATABASE) {
    console.error("API Initial Logs: Missing core PG environment variables.");
}
if (process.env.NODE_ENV === 'production' && !caCertContent) {
    console.error("CRITICAL API Initial Logs: CA Certificate (PG_SSL_CA_CONTENT or from PG_SSL_CA_PATH) is not set in a production-like environment.");
}

const pgPool = new Pool({
    host: PG_HOST,
    port: parseInt(PG_PORT!, 10),
    user: PG_USER,
    password: PG_PASSWORD,
    database: PG_DATABASE,
    ssl: { rejectUnauthorized: true, ca: caCertContent },
});


export async function GET() {
    if (!pgPool || !PG_HOST) {
        console.error("API Initial Logs: Database pool not initialized or missing config.");
        return NextResponse.json({ error: 'Server configuration error for database.' }, { status: 500 });
    }

    try {
        // console.log(`API Initial Logs: Querying as user: ${pgPool.options.user}`); // For debugging user
        const result = await pgPool.query<NginxLog>(
            'SELECT id, ip, log_time, method, path, http_ver, status, bytes, user_agent FROM public.nginx_logs ORDER BY log_time DESC LIMIT 100'
        );

        // Ensure log_time is consistently a string (ISO format)
        const logs = result.rows.map(log => ({
            ...log,
            log_time: new Date(log.log_time).toISOString(),
        }));

        return NextResponse.json(logs); // Reverse for chronological display (oldest of batch first)
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