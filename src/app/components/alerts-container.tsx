'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Alert, AlertNotificationPayload } from '@/types/alert';
import AlertTable from '@/app/components/ui/alert-table';

interface AlertTableEntry {
    alert_id: number;
    alert_type: string;
    severity: string;
    offender_ip: string;
    reason: string;
    explanation: string;
    created_at: string;
}


interface AlertsContainerProps {
    maxAlertsToShow?: number;
}

const AlertsContainer: React.FC<AlertsContainerProps> = ({
    maxAlertsToShow = 50,
}) => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
    const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    const mapSeverityToString = (severityValue?: number | null): string => {
        if (severityValue === null || typeof severityValue === 'undefined') return "Unknown";
        if (severityValue >= 2) return "Critical";
        if (severityValue === 1) return "Warning";
        return "Unknown";
    };

    const fetchInitialAlerts = async () => {
        setIsLoadingInitial(true);
        setError(null);
        console.log("AlertsContainer: Attempting to fetch initial alerts...");
        try {
            const response = await fetch('/api/alerts-stream/initial');
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (jsonParseError) {
                    throw new Error(`Server responded with ${response.status}: ${response.statusText}. Response was not valid JSON.`);
                }
                throw new Error(errorData.error || `Failed to fetch initial alerts: ${response.statusText}`);
            }
            const initialAlerts: Alert[] = await response.json();
            setAlerts(initialAlerts.slice(0, maxAlertsToShow));
            setConnectionStatus('Initial alerts loaded. Connecting to real-time stream...');
            console.log("AlertsContainer: Initial alerts fetched successfully:", initialAlerts.length);
        } catch (err: any) {
            console.error('AlertsContainer: Error fetching initial alerts:', err);
            setError(`Failed to load initial alerts: ${err.message}`);
            setConnectionStatus('Error loading initial alerts.');
        } finally {
            setIsLoadingInitial(false);
        }
    };

    useEffect(() => {
        fetchInitialAlerts();
        const sseUrl = '/api/alerts-stream';
        let es: EventSource | null = null;

        const connectToSSE = () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            // Corrected SSE endpoint for alerts
            console.log("AlertsContainer: Attempting to connect to SSE at", sseUrl);
            es = new EventSource(sseUrl);
            eventSourceRef.current = es;

            es.onopen = () => {
                setConnectionStatus('Connected to real-time alerts stream.');
                setError(null);
                console.log('AlertsContainer: SSE connection opened to', sseUrl);
            };

            es.addEventListener('connected', (event) => {
                try {
                    const data = JSON.parse((event as MessageEvent).data);
                    console.log('AlertsContainer: SSE "connected" event received:', data.message);
                } catch (e) {
                    console.error('AlertsContainer: Error parsing "connected" event data:', e);
                }
            });

            es.onmessage = (event: MessageEvent) => {
                try {
                    const notification: AlertNotificationPayload = JSON.parse(event.data);
                    console.log('AlertsContainer: Received alert update:', notification); // Can be noisy

                    if (notification.table !== 'alerts' || notification.action !== 'INSERT') {
                        console.warn('AlertsContainer: Received unexpected notification:', notification);
                        return;
                    }

                    const newAlertEntry: Alert = notification.data;

                    setAlerts(prevAlerts => {
                        let updatedAlerts = [...prevAlerts];
                        if (!prevAlerts.find(alert => alert.alert_id === newAlertEntry.alert_id)) {
                            updatedAlerts = [newAlertEntry, ...prevAlerts];
                        }
                        return updatedAlerts.slice(0, maxAlertsToShow);
                    });
                } catch (e) {
                    console.error('AlertsContainer: Error parsing SSE message or updating state:', e, 'Raw data:', event.data);
                    setError('Error processing incoming alert data.');
                }
            };

            es.onerror = (errorEvent) => {
                console.error('AlertsContainer: SSE EventSource failed:', errorEvent);
                const target = errorEvent.target as EventSource;
                if (target.readyState === EventSource.CLOSED) {
                    setConnectionStatus('SSE Disconnected. Server closed connection.');
                    setError('SSE Connection closed. May require refresh or login.');
                } else {
                    setConnectionStatus('SSE Connection error. Browser will attempt to reconnect...');
                    setError('SSE Connection issue, retrying...');
                }
                if (target.readyState === EventSource.CLOSED && eventSourceRef.current === target) {
                    eventSourceRef.current = null;
                }
            };
        };

        if (!isLoadingInitial) {
            connectToSSE();
        }

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                console.log('AlertsContainer: SSE connection closed on component unmount/effect cleanup.');
                eventSourceRef.current = null;
            }
        };
    }, [maxAlertsToShow, isLoadingInitial]);

    // Map raw Alert data to the AlertTableEntry structure expected by AlertTable
    const tableData: AlertTableEntry[] = alerts.map(alert => ({
        alert_id: alert.alert_id,
        alert_type: alert.alert_type || "N/A",
        severity: mapSeverityToString(alert.severity), // Map number to string
        offender_ip: alert.offender_ip || "N/A",
        reason: alert.reason || "No reason provided",
        explanation: alert.explanation || "No explanation provided",
        created_at: typeof alert.created_at === 'string' ? alert.created_at : new Date(alert.created_at || Date.now()).toISOString(),
    }));

    return (
        <Card className="border border-gray-300">
            <CardHeader>
                <CardTitle>Real-time Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
                {(!isLoadingInitial && alerts.length === 0 && !error) && <p>No alerts to display.</p>}
                {(isLoadingInitial || alerts.length > 0) && <AlertTable data={tableData} />}
            </CardContent>
        </Card>
    );
};

export default AlertsContainer;