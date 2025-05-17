import { Client, ClientConfig } from 'pg';
import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { NginxLogNotificationPayload } from '@/types/nginx-log';

// --- Environment Variable Loading ---
const PG_HOST = process.env.PG_HOST;
const PG_PORT_STR = process.env.PG_PORT;
const PG_USER = process.env.PG_USER;
const PG_PASSWORD = process.env.PG_PASSWORD;
const PG_DATABASE = process.env.PG_DATABASE;
const PG_SSL_CA_PATH = process.env.PG_SSL_CA_PATH;
const PG_CHANNEL_ALERTS = process.env.PG_CHANNEL_ALERTS;
const PG_CHANNEL_LOGS = process.env.PG_CHANNEL_LOGS;

// Validate essential environment variables
const requiredEnvVars = {
    PG_HOST,
    PG_PORT_STR,
    PG_USER,
    PG_PASSWORD,
    PG_DATABASE,
    PG_SSL_CA_PATH,
    PG_CHANNEL_ALERTS,
    PG_CHANNEL_LOGS,
};

let allVarsPresent = true;
for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value) {
        console.warn(`Postgres Listener: Environment variable ${key} is not set.`);
        allVarsPresent = false;
    }
}

let caCertContent: string | undefined;
if (allVarsPresent && PG_SSL_CA_PATH) {
    try {
        // Resolve the path relative to the project root (process.cwd())
        const fullCaPath = path.resolve(process.cwd(), PG_SSL_CA_PATH);
        if (fs.existsSync(fullCaPath)) {
            caCertContent = fs.readFileSync(fullCaPath, 'utf-8');
        } else {
            console.warn(`Postgres Listener: CA certificate file not found at path: ${fullCaPath}. Full path resolved from PG_SSL_CA_PATH="${PG_SSL_CA_PATH}".`);
            allVarsPresent = false;
        }
    } catch (error) {
        console.error(`Postgres Listener: Error reading CA certificate file from ${PG_SSL_CA_PATH}:`, error);
        allVarsPresent = false;
    }
}

let pgClient: Client | null = null;
const notificationEmitter = new EventEmitter();
let reconnectTimeout: NodeJS.Timeout | null = null;
const RECONNECT_DELAY_MS = 5000;

async function connectAndListen(): Promise<void> {
    if (!allVarsPresent || !caCertContent) {
        console.warn('Postgres Listener: Missing required environment variables or CA cert content. Cannot connect.');
        return;
    }

    if (pgClient && (pgClient as any)._connected) {
        console.log('Postgres Listener: Already connected and listening.');
        return;
    }

    console.log('Postgres Listener: Attempting to connect...');

    const pgPort = parseInt(PG_PORT_STR!, 10);
    if (isNaN(pgPort)) {
        console.error('Postgres Listener: Invalid PG_PORT. Must be a number.');
        return;
    }

    const clientConfig: ClientConfig = {
        host: PG_HOST,
        port: pgPort,
        user: PG_USER,
        password: PG_PASSWORD,
        database: PG_DATABASE,
        ssl: {
            rejectUnauthorized: true,
            ca: caCertContent,
        },
    };

    pgClient = new Client(clientConfig);

    try {
        await pgClient.connect();
        console.log('Postgres Listener: Successfully connected.');
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
        }

        pgClient.on('notification', (msg) => {
            if (!msg.channel || !msg.payload) {
                console.warn('Postgres Listener: Received incomplete PG Notification:', msg);
                return;
            }
            console.log('Postgres Listener: Received PG Notification:', msg.channel, msg.payload);

            if (msg.channel === PG_CHANNEL_LOGS) {
                try {
                    const payloadData: NginxLogNotificationPayload = JSON.parse(msg.payload);
                    notificationEmitter.emit('new_nginx_log', payloadData);
                } catch (e) {
                    console.error('Postgres Listener: Error parsing notification payload:', e, 'Raw payload:', msg.payload);
                    notificationEmitter.emit('new_nginx_log_error', { error: e, rawPayload: msg.payload });
                }
            }
        });

        await pgClient.query(`LISTEN ${PG_CHANNEL_LOGS}`);
        console.log(`Postgres Listener: Listening on channel: ${PG_CHANNEL_LOGS}`);


        pgClient.on('error', (err: Error) => {
            console.error('Postgres Listener: Client error:', err);
        });

        pgClient.on('end', () => {
            console.log('Postgres Listener: Client disconnected.');
            if (pgClient) {
                pgClient.removeAllListeners();
            }
            pgClient = null;
            if (!reconnectTimeout && allVarsPresent && caCertContent) {
                console.log(`Postgres Listener: Attempting to reconnect in ${RECONNECT_DELAY_MS / 1000}s...`);
                reconnectTimeout = setTimeout(connectAndListen, RECONNECT_DELAY_MS);
            }
        });

    } catch (err) {
        console.error('Postgres Listener: Failed to connect or listen:', err);
        if (pgClient) {
            pgClient.end().catch(e => console.error("Postgres Listener: Error ending pgClient on connect fail", e));
        }
        pgClient = null;
        if (!reconnectTimeout && allVarsPresent && caCertContent) {
            console.log(`Postgres Listener: Attempting to reconnect (after failure) in ${RECONNECT_DELAY_MS / 1000}s...`);
            reconnectTimeout = setTimeout(connectAndListen, RECONNECT_DELAY_MS);
        }
    }
}

// Initialize connection attempt when this module is loaded
if (process.env.NODE_ENV !== 'test' && allVarsPresent && caCertContent) {
    connectAndListen().catch(err => {
        console.error("Postgres Listener: Initial connection attempt failed:", err);
    });
} else if (process.env.NODE_ENV !== 'test' && (!allVarsPresent || !caCertContent)) {
    console.log("Postgres Listener: Will not attempt initial connection due to missing environment variables or CA cert content.");
}


interface TypedEventEmitter extends EventEmitter {
    on(event: 'new_nginx_log', listener: (data: NotificationPayload) => void): this;
    on(event: 'new_nginx_log_error', listener: (data: { error: unknown; rawPayload: string }) => void): this;
    emit(event: 'new_nginx_log', data: NotificationPayload): boolean;
    emit(event: 'new_nginx_log_error', data: { error: unknown; rawPayload: string }): boolean;
}

export const typedNotificationEmitter: TypedEventEmitter = notificationEmitter;