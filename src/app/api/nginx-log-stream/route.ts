import { NextRequest, NextResponse } from 'next/server';
import { typedNotificationEmitter } from '@/lib/postgres-listener';
import type { NginxLogNotificationPayload } from '@/types/nginx-log';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    // --- SSE Stream Logic ---
    const stream = new ReadableStream({
        start(controller) {
            console.log('SSE Logs Stream: client connected.');

            const dataHandler = (data: NotificationPayload) => {
                try {
                    const sseFormattedData = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(new TextEncoder().encode(sseFormattedData));
                } catch (e) {
                    console.error("SSE: Error encoding data for stream:", e);
                }
            };

            const connectedEventHandler = () => {
                try {
                    const sseFormattedData = `event: connected\ndata: ${JSON.stringify({ message: "SSE connection established" })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(sseFormattedData));
                } catch (e) {
                    console.error("SSE: Error encoding connected event:", e);
                }
            };

            // Listen to the specific event from your postgres-listener
            typedNotificationEmitter.on('new_nginx_log', dataHandler);
            connectedEventHandler(); // Send connected event once

            // Clean up when the client disconnects
            request.signal.addEventListener('abort', () => {
                console.log('SSE client disconnected (abort signal).');
                typedNotificationEmitter.removeListener('new_nginx_log', dataHandler);
                try {
                    if (controller.desiredSize !== null && controller.desiredSize > 0) {
                        controller.close();
                    }
                } catch (e) {
                    console.warn("SSE: Error closing stream controller on abort:", e);
                }
            });
        },
        cancel(reason) {
            console.log('SSE stream cancelled by client.', reason);
            // Ensure listener is removed here too, though 'abort' should cover most client disconnects.
            // typedNotificationEmitter.removeListener('new_nginx_log_data', dataHandler); // Might already be removed by abort
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