import { NextRequest, NextResponse } from 'next/server';
import { typedNotificationEmitter } from '@/lib/postgres-listener';
import type { AlertNotificationPayload } from '@/types/alert';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {


    const stream = new ReadableStream({
        start(controller) {
            console.log('SSE Alerts Stream: client connected.');

            const alertDataHandler = (data: AlertNotificationPayload) => {
                if (data.table === 'alerts' && data.action === 'INSERT') {
                    try {
                        const sseFormattedData = `data: ${JSON.stringify(data)}\n\n`;
                        controller.enqueue(new TextEncoder().encode(sseFormattedData));
                    } catch (e) {
                        console.error("SSE Alerts Stream: Error encoding alert data:", e);
                    }
                } else {
                    console.warn("SSE Alerts Stream: Received unexpected data structure or action:", data);
                }
            };

            const connectedEventHandler = () => {
                try {
                    const sseFormattedData = `event: connected\ndata: ${JSON.stringify({ message: "SSE Alerts connection established" })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(sseFormattedData));
                } catch (e) {
                    console.error("SSE Alerts Stream: Error encoding connected event:", e);
                }
            };

            // Listen to the specific event for new alerts from your postgres-listener
            // Ensure this event name ('new_alert_data') matches what postgres-listener.ts emits
            typedNotificationEmitter.on('new_alert_data', alertDataHandler);
            connectedEventHandler(); // Send connected event once

            // Clean up when the client disconnects
            request.signal.addEventListener('abort', () => {
                console.log('SSE Alerts Stream: client disconnected (abort signal).');
                typedNotificationEmitter.removeListener('new_alert_data', alertDataHandler);
                try {
                    if (controller.desiredSize !== null && controller.desiredSize > 0) {
                        controller.close();
                    }
                } catch (e) {
                    console.warn("SSE Alerts Stream: Error closing stream controller on abort:", e);
                }
            });
        },
        cancel(reason) {
            console.log('SSE Alerts Stream: stream cancelled by client.', reason);
            // typedNotificationEmitter.removeListener('new_alert_data', alertDataHandler); // Usually handled by 'abort'
        }
    });

    return new Response(stream, {
        status: 200,
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}