export interface NginxLog {
    id: number;                      // integer, not null
    ip: string;                      // inet, not null (string representation in JS/TS)
    log_time: string | Date;         // timestamp with time zone, not null (string from DB, can be Date object in app)
    method?: string | null;          // character varying, nullable
    path?: string | null;            // text, nullable
    http_ver?: string | null;        // character varying, nullable
    status?: number | null;          // integer, nullable
    bytes?: number | null;           // integer, nullable
    user_agent?: string | null;      // character varying, nullable
}

export interface NginxLogNotificationPayload extends NotificationPayload {
    action: 'INSERT';
    table: 'nginx_logs';
    data: NginxLog;
}