export interface Alert {
    alert_id: number;
    alert_type?: string | null;
    severity?: number | null;
    offender_ip?: string | null;
    reason?: string | null;
    explanation?: string | null;
    created_at?: string | Date;
}

export interface AlertNotificationPayload {
    action: 'INSERT';
    table: 'alerts';
    data: Alert;
}