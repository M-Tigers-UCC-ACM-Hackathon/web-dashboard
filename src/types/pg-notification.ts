interface NotificationPayload {
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    table: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new_data?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    old_data?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    id?: any;
}