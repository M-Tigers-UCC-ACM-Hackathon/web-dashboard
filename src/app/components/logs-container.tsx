'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import type { NginxLog, NginxLogNotificationPayload } from '@/types/nginx-log';
import LogsTable from '@/app/components/ui/logs-table';

interface LogsContainerProps {
    maxLogsToShow?: number;
}

const LogsContainer: React.FC<LogsContainerProps> = ({
    maxLogsToShow = 50,
}) => {
    const [logs, setLogs] = useState<NginxLog[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);

    const fetchInitialLogs = async () => {
        setIsLoadingInitial(true);
        setError(null); // Clear previous errors
        console.log("Attempting to fetch initial logs...");
        try {
            const response = await fetch('/api/nginx-log-stream/initial');
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonParseError) {
                    // If response is not JSON (e.g., HTML error page)
                    throw new Error(`Server responded with ${response.status}: ${response.statusText}. Response was not valid JSON.`);
                }
                throw new Error(errorData.error || `Failed to fetch initial logs: ${response.statusText}`);
            }
            const initialLogs: NginxLog[] = await response.json();
            setLogs(initialLogs.slice(0, maxLogsToShow));
            setConnectionStatus('Initial logs loaded. Connecting to real-time stream...');
            console.log("Initial logs fetched successfully:", initialLogs.length);
        } catch (err: any) {
            console.error('Error fetching initial logs (useEffect):', err);
            setError(`Failed to load initial logs: ${err.message}`);
            setConnectionStatus('Error loading initial logs.');
        } finally {
            setIsLoadingInitial(false);
        }
    };

    useEffect(() => {
        fetchInitialLogs();
        const sseUrl = '/api/nginx-log-stream';
        let es: EventSource | null = null;

        const connect = () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            es = new EventSource(sseUrl);
            eventSourceRef.current = es;
            // setConnectionStatus('Connecting to real-time log stream...');
            setError(null);

            es.onopen = () => {
                setConnectionStatus('Connected to real-time log stream.');
                setError(null);
                console.log('SSE connection opened to', sseUrl);
            };

            es.addEventListener('connected', (event) => {
                try {
                    const data = JSON.parse((event as MessageEvent).data);
                    console.log('SSE "connected" event received:', data.message);
                } catch (e) {
                    console.error('Error parsing "connected" event data:', e);
                }
            });

            es.onmessage = (event: MessageEvent) => {
                try {
                    const notification: NginxLogNotificationPayload = JSON.parse(event.data);
                    // console.log('Received Nginx log update:', notification); // Can be noisy

                    if (notification.table !== 'nginx_logs') {
                        console.warn('Received notification for unexpected table:', notification.table);
                        return;
                    }

                    setLogs(prevLogs => {
                        let updatedLogs = [...prevLogs];
                        // The 'data' field in NginxLogNotificationPayload should be an NginxLog object
                        const newLogEntry: NginxLog = notification.data;

                        if (notification.action === 'INSERT') {
                            updatedLogs = [newLogEntry, ...prevLogs];
                        } else if (notification.action === 'UPDATE') {
                            const index = updatedLogs.findIndex(log => log.id === newLogEntry.id);
                            if (index !== -1) {
                                updatedLogs[index] = newLogEntry;
                            } else {
                                updatedLogs = [newLogEntry, ...prevLogs]; // Add if not found (treat as new)
                            }
                        }

                        return updatedLogs.slice(0, maxLogsToShow);
                    });
                } catch (e) {
                    console.error('Error parsing SSE message or updating state:', e, 'Raw data:', event.data);
                    setError('Error processing incoming log data.');
                }
            };

            es.onerror = (errorEvent) => {
                console.error('EventSource failed:', errorEvent);
                const target = errorEvent.target as EventSource;

                if (target.readyState === EventSource.CLOSED) {
                    setConnectionStatus('Disconnected. Server closed connection (e.g., auth issue or planned shutdown).');
                    setError('Connection closed by server. Please check authentication or try refreshing.');
                    // No automatic reconnect here by default for EventSource.CLOSED
                } else {
                    // EventSource.CONNECTING (0) or EventSource.OPEN (1) but error occurred
                    // The browser will attempt to reconnect automatically for network errors.
                    setConnectionStatus('Connection error. Attempting to reconnect...');
                    setError('Connection issue, retrying...');
                }
                // Clean up the old ref if it's truly closed and won't retry
                if (target.readyState === EventSource.CLOSED && eventSourceRef.current === target) {
                    eventSourceRef.current = null;
                }
            };
        };

        connect(); // Initial connection attempt

        // Cleanup function: Close the connection when the component unmounts
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                console.log('SSE connection closed on component unmount.');
                eventSourceRef.current = null;
            }
        };
    }, [maxLogsToShow]);


    const tableData = logs.map(log => ({
        id: log.id,
        ip: log.ip,
        timestamp: typeof log.log_time === 'string' ? log.log_time : log.log_time.toISOString(),
        method: log.method || "-", // Provide default if LogsTable expects non-null
        path: log.path || "-",     // Provide default
        http_version: log.http_ver || "-", // Map http_ver to http_version
        status: log.status || 0,   // Provide default
        bytes: log.bytes || 0,     // Provide default
        browser: log.user_agent || "-", // Map user_agent to browser
        // 'type' and 'message' from LogEntry are not in NginxLog,
        // so they would be handled within LogsTable or be undefined.
        // If you derive 'type' in LogsTable, that's fine.
    }));


    return (
        <Card className="border border-gray-300">
            <CardHeader>
                <CardTitle>Display Logs</CardTitle>
            </CardHeader>
            <CardContent>
                <LogsTable data={tableData} />
            </CardContent>
        </Card>
    );
};

export default LogsContainer;