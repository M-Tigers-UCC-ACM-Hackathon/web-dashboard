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
// 'use client';

// import React, { useState, useEffect, useRef } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { 
//   flexRender,
//   getCoreRowModel,
//   getFilteredRowModel,
//   getSortedRowModel,
//   useReactTable,
//   FilterFn,
//   SortingState,
//   ColumnDef,
//   PaginationState,
//   getPaginationRowModel
// } from '@tanstack/react-table';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { ArrowUpDown, ChevronLeft, ChevronRight, Filter, Search, X } from 'lucide-react';
// import type { NginxLog, NginxLogNotificationPayload } from '@/types/nginx-log';

// interface LogsContainerProps {
//   maxLogsToShow?: number;
// }

// interface LogTableData {
//   id: number;
//   ip: string;
//   timestamp: string;
//   method: string;
//   path: string;
//   http_version: string;
//   status: number;
//   bytes: number;
//   browser: string;
// }

// const LogsContainer: React.FC<LogsContainerProps> = ({
//   maxLogsToShow = 50,
// }) => {
//   const [logs, setLogs] = useState<NginxLog[]>([]);
//   const [connectionStatus, setConnectionStatus] = useState<string>('Initializing...');
//   const [error, setError] = useState<string | null>(null);
//   const eventSourceRef = useRef<EventSource | null>(null);
//   const [isLoadingInitial, setIsLoadingInitial] = useState<boolean>(true);
//   const [sorting, setSorting] = useState<SortingState>([]);
//   const [showFilters, setShowFilters] = useState<boolean>(false);
//   const [columnFilters, setColumnFilters] = useState<any[]>([]);

//   // Add pagination state
//   const [pagination, setPagination] = useState<PaginationState>({
//     pageIndex: 0,
//     pageSize: 5, // Show 5 rows per page
//   });
//   // Add your existing event source and log fetching code here...
//   const fetchInitialLogs = async () => {
//             setIsLoadingInitial(true);
//             setError(null); // Clear previous errors
//             console.log("Attempting to fetch initial logs...");
//             try {
//                 const response = await fetch('/api/nginx-log-stream/initial');
//                 if (!response.ok) {
//                     let errorData;
//                     try {
//                         errorData = await response.json();
//                     } catch (jsonParseError) {
//                         // If response is not JSON (e.g., HTML error page)
//                         throw new Error(`Server responded with ${response.status}: ${response.statusText}. Response was not valid JSON.`);
//                     }
//                     throw new Error(errorData.error || `Failed to fetch initial logs: ${response.statusText}`);
//                 }
//                 const initialLogs: NginxLog[] = await response.json();
//                 setLogs(initialLogs.slice(0, maxLogsToShow));
//                 setConnectionStatus('Initial logs loaded. Connecting to real-time stream...');
//                 console.log("Initial logs fetched successfully:", initialLogs.length);
//             } catch (err: any) {
//                 console.error('Error fetching initial logs (useEffect):', err);
//                 setError(`Failed to load initial logs: ${err.message}`);
//                 setConnectionStatus('Error loading initial logs.');
//             } finally {
//                 setIsLoadingInitial(false);
//             }
//         };
    
//         useEffect(() => {
//             fetchInitialLogs();
//             const sseUrl = '/api/nginx-log-stream';
//             let es: EventSource | null = null;
    
//             const connect = () => {
//                 if (eventSourceRef.current) {
//                     eventSourceRef.current.close();
//                 }
    
//                 es = new EventSource(sseUrl);
//                 eventSourceRef.current = es;
//                 // setConnectionStatus('Connecting to real-time log stream...');
//                 setError(null);
    
//                 es.onopen = () => {
//                     setConnectionStatus('Connected to real-time log stream.');
//                     setError(null);
//                     console.log('SSE connection opened to', sseUrl);
//                 };
    
//                 es.addEventListener('connected', (event) => {
//                     try {
//                         const data = JSON.parse((event as MessageEvent).data);
//                         console.log('SSE "connected" event received:', data.message);
//                     } catch (e) {
//                         console.error('Error parsing "connected" event data:', e);
//                     }
//                 });
    
//                 es.onmessage = (event: MessageEvent) => {
//                     try {
//                         const notification: NginxLogNotificationPayload = JSON.parse(event.data);
//                         // console.log('Received Nginx log update:', notification); // Can be noisy
    
//                         if (notification.table !== 'nginx_logs') {
//                             console.warn('Received notification for unexpected table:', notification.table);
//                             return;
//                         }
    
//                         setLogs(prevLogs => {
//                             let updatedLogs = [...prevLogs];
//                             // The 'data' field in NginxLogNotificationPayload should be an NginxLog object
//                             const newLogEntry: NginxLog = notification.data;
    
//                             if (notification.action === 'INSERT') {
//                                 updatedLogs = [newLogEntry, ...prevLogs];
//                             } else if (notification.action === 'UPDATE') {
//                                 const index = updatedLogs.findIndex(log => log.id === newLogEntry.id);
//                                 if (index !== -1) {
//                                     updatedLogs[index] = newLogEntry;
//                                 } else {
//                                     updatedLogs = [newLogEntry, ...prevLogs]; // Add if not found (treat as new)
//                                 }
//                             }
    
//                             return updatedLogs.slice(0, maxLogsToShow);
//                         });
//                     } catch (e) {
//                         console.error('Error parsing SSE message or updating state:', e, 'Raw data:', event.data);
//                         setError('Error processing incoming log data.');
//                     }
//                 };
    
//                 es.onerror = (errorEvent) => {
//                     console.error('EventSource failed:', errorEvent);
//                     const target = errorEvent.target as EventSource;
    
//                     if (target.readyState === EventSource.CLOSED) {
//                         setConnectionStatus('Disconnected. Server closed connection (e.g., auth issue or planned shutdown).');
//                         setError('Connection closed by server. Please check authentication or try refreshing.');
//                         // No automatic reconnect here by default for EventSource.CLOSED
//                     } else {
//                         // EventSource.CONNECTING (0) or EventSource.OPEN (1) but error occurred
//                         // The browser will attempt to reconnect automatically for network errors.
//                         setConnectionStatus('Connection error. Attempting to reconnect...');
//                         setError('Connection issue, retrying...');
//                     }
//                     // Clean up the old ref if it's truly closed and won't retry
//                     if (target.readyState === EventSource.CLOSED && eventSourceRef.current === target) {
//                         eventSourceRef.current = null;
//                     }
//                 };
//             };
    
//             connect(); // Initial connection attempt
    
//             // Cleanup function: Close the connection when the component unmounts
//             return () => {
//                 if (eventSourceRef.current) {
//                     eventSourceRef.current.close();
//                     console.log('SSE connection closed on component unmount.');
//                     eventSourceRef.current = null;
//                 }
//             };
//         }, [maxLogsToShow]);
    
//   // Define table columns with sorting and filtering
//   const columns: ColumnDef<LogTableData>[] = [
//     {
//       accessorKey: 'ip',
//       header: ({ column }) => (
//         <div className="flex items-center">
//           <Button
//             variant="ghost"
//             onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
//             className="-ml-3 h-8 data-[state=open]:bg-accent"
//           >
//             IP Address
//             <ArrowUpDown className="ml-2 h-3 w-3" />
//           </Button>
//         </div>
//       ),
//     },
//     {
//       accessorKey: 'timestamp',
//       header: ({ column }) => (
//         <div className="flex items-center">
//           <Button
//             variant="ghost"
//             onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
//             className="-ml-3 h-8 data-[state=open]:bg-accent"
//           >
//             Timestamp
//             <ArrowUpDown className="ml-2 h-3 w-3" />
//           </Button>
//         </div>
//       ),
//       cell: ({ row }) => {
//         return new Date(row.getValue('timestamp')).toLocaleString();
//       },
//     },
//     {
//       accessorKey: 'method',
//       header: "Method",
//     },
//     {
//       accessorKey: 'path',
//       header: "Path",
//       cell: ({ row }) => {
//         const path = row.getValue('path') as string;
//         return <div className="max-w-[200px] truncate">{path}</div>;
//       }
//     },
//     {
//       accessorKey: 'status',
//       header: ({ column }) => (
//         <div className="flex items-center">
//           <Button
//             variant="ghost"
//             onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
//             className="-ml-3 h-8 data-[state=open]:bg-accent"
//           >
//             Status
//             <ArrowUpDown className="ml-2 h-3 w-3" />
//           </Button>
//         </div>
//       ),
//       cell: ({ row }) => {
//         const status = row.getValue('status') as number;
//         return (
//           <div className={`font-medium ${
//             status >= 400 ? 'text-red-500' : 
//             status >= 300 ? 'text-amber-500' :
//             'text-green-500'
//           }`}>
//             {status}
//           </div>
//         );
//       }
//     },
//     {
//       accessorKey: 'browser',
//       header: "Browser",
//     },
//   ];

//   // Transform logs data for the table
//   const data = logs.map(log => ({
//     id: log.id,
//     ip: log.ip,
//     timestamp: typeof log.log_time === 'string' ? log.log_time : log.log_time.toISOString(),
//     method: log.method || "-",
//     path: log.path || "-",
//     http_version: log.http_ver || "-",
//     status: log.status || 0,
//     bytes: log.bytes || 0,
//     browser: log.user_agent || "-",
//   }));

//   // Initialize the table
//   const table = useReactTable({
//     data,
//     columns,
//     getCoreRowModel: getCoreRowModel(),
//     onSortingChange: setSorting,
//     getSortedRowModel: getSortedRowModel(),
//     onColumnFiltersChange: setColumnFilters,
//     getFilteredRowModel: getFilteredRowModel(),
//     getPaginationRowModel: getPaginationRowModel(),
//     onPaginationChange: setPagination,
//     state: {
//       sorting,
//       columnFilters,
//     },
//   });

//   return (
//     <Card className="border border-gray-300">
//       <CardHeader className="flex flex-row items-center justify-between">
//         <CardTitle>Display Logs</CardTitle>
//         <Button 
//           variant="outline" 
//           size="sm" 
//           onClick={() => setShowFilters(!showFilters)}
//         >
//           <Filter className="h-4 w-4 mr-2" />
//           {showFilters ? 'Hide Filters' : 'Show Filters'}
//         </Button>
//       </CardHeader>
//       <CardContent>
//         {showFilters && (
//           <div className="mb-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
//             <div className="text-sm font-medium mb-2">Filters</div>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//               <div className="space-y-2">
//                 <label className="text-xs">IP Address</label>
//                 <div className="flex">
//                   <Input
//                     placeholder="Filter by IP..."
//                     value={table.getColumn('ip')?.getFilterValue() as string ?? ''}
//                     onChange={(e) => table.getColumn('ip')?.setFilterValue(e.target.value)}
//                     className="text-sm"
//                   />
//                   {(table.getColumn('ip')?.getFilterValue() as string)?.length > 0 && (
//                     <Button 
//                       variant="ghost" 
//                       size="sm" 
//                       onClick={() => table.getColumn('ip')?.setFilterValue('')}
//                       className="ml-1"
//                     >
//                       <X className="h-4 w-4" />
//                     </Button>
//                   )}
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <label className="text-xs">Status Code</label>
//                 <div className="flex">
//                   <Input
//                     placeholder="Filter by status..."
//                     value={table.getColumn('status')?.getFilterValue() as string ?? ''}
//                     onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value)}
//                     className="text-sm"
//                   />
//                   {(table.getColumn('status')?.getFilterValue() as string)?.length > 0 && (
//                     <Button 
//                       variant="ghost" 
//                       size="sm" 
//                       onClick={() => table.getColumn('status')?.setFilterValue('')}
//                       className="ml-1"
//                     >
//                       <X className="h-4 w-4" />
//                     </Button>
//                   )}
//                 </div>
//               </div>
//               <div className="space-y-2">
//                 <label className="text-xs">Path</label>
//                 <div className="flex">
//                   <Input
//                     placeholder="Filter by path..."
//                     value={table.getColumn('path')?.getFilterValue() as string ?? ''}
//                     onChange={(e) => table.getColumn('path')?.setFilterValue(e.target.value)}
//                     className="text-sm"
//                   />
//                   {(table.getColumn('path')?.getFilterValue() as string)?.length > 0 && (
//                     <Button 
//                       variant="ghost" 
//                       size="sm" 
//                       onClick={() => table.getColumn('path')?.setFilterValue('')}
//                       className="ml-1"
//                     >
//                       <X className="h-4 w-4" />
//                     </Button>
//                   )}
//                 </div>
//               </div>
//             </div>
            
//             <div className="flex justify-end">
//               <Button 
//                 variant="outline" 
//                 size="sm" 
//                 onClick={() => {
//                   table.resetColumnFilters();
//                 }}
//               >
//                 Clear All Filters
//               </Button>
//             </div>
//             <div className="text-xs text-gray-500 dark:text-gray-400">
//               Displaying {table.getFilteredRowModel().rows.length} of {logs.length} logs
//             </div>
//           </div>
//         )}

//         <Table>
//           <TableHeader>
//             {table.getHeaderGroups().map((headerGroup) => (
//               <TableRow key={headerGroup.id}>
//                 {headerGroup.headers.map((header) => (
//                   <TableHead key={header.id}>
//                     {header.isPlaceholder
//                       ? null
//                       : flexRender(
//                           header.column.columnDef.header,
//                           header.getContext()
//                         ) as React.ReactNode}
//                   </TableHead>
//                 ))}
//               </TableRow>
//             ))}
//           </TableHeader>
//           <TableBody>
//             {table.getRowModel().rows?.length ? (
//               table.getRowModel().rows.map((row) => (
//                 <TableRow
//                   key={row.id}
//                   data-state={row.getIsSelected() && "selected"}
//                 >
//                   {row.getVisibleCells().map((cell) => (
//                     <TableCell key={cell.id}>
//                       {flexRender(cell.column.columnDef.cell, cell.getContext())}
//                     </TableCell>
//                   ))}
//                 </TableRow>
//               ))
//             ) : (
//               <TableRow>
//                 <TableCell colSpan={columns.length} className="h-24 text-center">
//                   No results.
//                 </TableCell>
//               </TableRow>
//             )}
//           </TableBody>
//         </Table>
//         <div className="flex items-center justify-between px-2 mt-4">
//           <div className="flex-1 text-sm text-muted-foreground">
//             Showing {table.getFilteredRowModel().rows.length > 0 
//               ? `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to ${Math.min(
//                   (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
//                   table.getFilteredRowModel().rows.length
//                 )}`
//               : '0'} of {table.getFilteredRowModel().rows.length} entries
//           </div>
//           <div className="flex items-center space-x-6 lg:space-x-8">
//             <div className="flex items-center space-x-2">
//               <p className="text-sm font-medium">Rows per page</p>
//               <select
//                 value={table.getState().pagination.pageSize}
//                 onChange={(e) => {
//                   table.setPageSize(Number(e.target.value));
//                 }}
//                 className="h-8 w-16 rounded-md border border-input bg-transparent px-2 py-1 text-sm"
//               >
//                 {[5, 10, 20, 50, 100].map((pageSize) => (
//                   <option key={pageSize} value={pageSize}>
//                     {pageSize}
//                   </option>
//                   ))}
//                   </select>
//                 </div>
//                 <div className="flex w-[100px] items-center justify-center text-sm font-medium">
//                   Page {table.getState().pagination.pageIndex + 1} of{" "}
//                   {table.getPageCount()}
//                 </div>
//                 <div className="flex items-center space-x-2">
//                   <Button
//                     variant="outline"
//                     className="h-8 w-8 p-0"
//                     onClick={() => table.previousPage()}
//                     disabled={!table.getCanPreviousPage()}
//                   >
//                     <span className="sr-only">Go to previous page</span>
//                     <ChevronLeft className="h-4 w-4" />
//                   </Button>
//                   <Button
//                     variant="outline"
//                     className="h-8 w-8 p-0"
//                     onClick={() => table.nextPage()}
//                     disabled={!table.getCanNextPage()}
//                   >
//                     <span className="sr-only">Go to next page</span>
//                     <ChevronRight className="h-4 w-4" />
//                   </Button>
//                 </div>
//                 </div>
//                 </div>
//       </CardContent>
//     </Card>
//   );
// };

// export default LogsContainer;