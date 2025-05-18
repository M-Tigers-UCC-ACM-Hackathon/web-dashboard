"use client"

import React, { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { MapPin, ChevronRight, ChevronDown } from "lucide-react"
import LocationMap from "../location-map"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"

interface Location {
    lat: number
    lng: number
}

interface LogEntry {
    id: number
    ip: string
    timestamp: string
    method: string
    path: string
    http_version: string
    status: number
    bytes: number
    browser: string
    type?: string
    message?: string
}

interface LogsTableProps {
    data: LogEntry[]
}

export default function LogsTable({ data }: LogsTableProps) {
    const [page, setPage] = useState(1)
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
    const [selectedRows, setSelectedRows] = useState<number[]>([])
    const [expandedRows, setExpandedRows] = useState<number[]>([])

    const itemsPerPage = 10
    const totalPages = Math.ceil(data.length / itemsPerPage)

    const paginatedData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage)

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleString()
    }

    const getBadgeColor = (type: string | undefined) => {
        const inferredType = type || inferTypeFromStatus(selectedLog?.status)
        switch (inferredType) {
            case "Critical":
                return "bg-red-500 hover:bg-red-600"
            case "Warning":
                return "bg-amber-500 hover:bg-amber-600"
            case "Info":
                return "bg-blue-500 hover:bg-blue-600"
            default:
                return "bg-gray-500 hover:bg-gray-600"
        }
    }

    const inferTypeFromStatus = (status?: number) => {
        if (!status) return "Unknown"
        if (status >= 500) return "Critical"
        if (status >= 400) return "Warning"
        return "Info"
    }

    const truncateText = (text: string, maxLength: number = 50) => {
        if (text.length <= maxLength) return text
        return text.slice(0, maxLength) + "..."
    }

    const handleViewLocation = async (log: LogEntry) => {
        setSelectedLog(log)
        const mockLocation: Location = {
            lat: 37.7749,
            lng: -122.4194,
        }
        setSelectedLocation(mockLocation)
        setIsModalOpen(true)
    }

    const handleCheckboxChange = (id: number) => {
        setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        )
    }

    const handleExpandToggle = (id: number) => {
        setExpandedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
        )
    }

    return (
        <TooltipProvider>
            <div className="space-y-4">
                <div className="rounded-md border border-gray-300">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 border-gray-200 dark:border-gray-800">
                                {/* <TableHead className="w-12"></TableHead> */}
                                <TableHead className="w-12"></TableHead>
                                <TableHead className="font-medium">Type</TableHead>
                                <TableHead className="font-medium">ID</TableHead>
                                <TableHead className="font-medium">Status</TableHead>
                                <TableHead className="font-medium">IP</TableHead>
                                <TableHead className="font-medium">Log Time</TableHead>
                                <TableHead className="font-medium">Path</TableHead>
                                <TableHead className="font-medium">Method</TableHead>
                                <TableHead className="font-medium">HTTP-Ver</TableHead>
                                <TableHead className="font-medium">Bytes</TableHead>
                                <TableHead className="font-medium">Browser</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedData.map((log, idx) => (
                                <React.Fragment key={log.id}>
                                    <TableRow key={log.id} className="border-b border-gray-100 dark:border-gray-800">
                                        {/* <TableCell>
                                            <Checkbox
                                                checked={selectedRows.includes(log.id)}
                                                onCheckedChange={() => handleCheckboxChange(log.id)}
                                                className="border-2 border-gray-400 bg-white rounded"
                                            />
                                        </TableCell> */}
                                        <TableCell className="text-left">
                                            <button
                                                onClick={() => handleExpandToggle(log.id)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                {expandedRows.includes(log.id) ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </button>
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getBadgeColor(log.type || inferTypeFromStatus(log.status))}>
                                                {log.type || inferTypeFromStatus(log.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{log.id}</TableCell>
                                        <TableCell>{log.status}</TableCell>
                                        <TableCell>
                                            <button
                                                onClick={() => handleViewLocation(log)}
                                                className="flex items-center text-sm text-blue-500 hover:text-blue-700"
                                            >
                                                <MapPin className="h-4 w-4 mr-1" />
                                                {log.ip}
                                            </button>
                                        </TableCell>
                                        <TableCell>{formatDate(log.timestamp)}</TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="block truncate">{truncateText(log.path || "-", 50)}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>{log.path || "-"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell>{log.method || "-"}</TableCell>
                                        <TableCell>{log.http_version || "-"}</TableCell>
                                        <TableCell>{log.bytes}</TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="block truncate">{truncateText(log.browser || "-", 50)}</span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="md:break-all">{log.browser || "-"}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                    {expandedRows.includes(log.id) && (
                                        <TableRow className="border-b border-gray-100 dark:border-gray-800">
                                            <TableCell colSpan={2}></TableCell>
                                            <TableCell colSpan={10} className="bg-gray-50 dark:bg-gray-800">
                                                <div className="p-4">
                                                    {/* Reduced gap from gap-6 to gap-2 */}
                                                    <div className="grid grid-cols-[2fr_1fr] gap-2">
                                                        <div className="text-sm">
                                                            <div className="grid grid-cols-[120px_1fr] gap-2">
                                                                <div className="font-medium">Alert Type:</div>
                                                                <div>
                                                                    <Badge className={getBadgeColor(log.type || inferTypeFromStatus(log.status))}>
                                                                        {log.type || inferTypeFromStatus(log.status)}
                                                                    </Badge>
                                                                </div>
                                                                <div className="font-medium">ID:</div>
                                                                <div>{log.id}</div>
                                                                <div className="font-medium">Status:</div>
                                                                <div>{log.status}</div>
                                                                <div className="font-medium">IP:</div>
                                                                <div>{log.ip}</div>
                                                                <div className="font-medium">Timestamp:</div>
                                                                <div>{formatDate(log.timestamp)}</div>
                                                                <div className="font-medium">Path:</div>
                                                                <div>{log.path || "-"}</div>
                                                                <div className="font-medium">Method:</div>
                                                                <div>{log.method || "-"}</div>
                                                                <div className="font-medium">HTTP Version:</div>
                                                                <div>{log.http_version || "-"}</div>
                                                                <div className="font-medium">Bytes:</div>
                                                                <div>{log.bytes}</div>
                                                                <div className="font-medium">Browser:</div>
                                                                <div className="max-w-[50px] break-all">{log.browser || "-"}</div>
                                                                {/*<div className="font-medium">Selected:</div>*/}
                                                                {/*<div>{selectedRows.includes(log.id) ? "Yes" : "No"}</div>*/}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <img src="/images/temp-map.png" alt="Temporary Map"
                                                                className="w-full h-auto rounded" />
                                                            <div className="text-sm text-gray-700 mt-1 text-center">{log.ip}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {Array.from({ length: totalPages }).map((_, i) => (
                            <PaginationItem key={i}>
                                <PaginationLink onClick={() => setPage(i + 1)} isActive={page === i + 1}>
                                    {i + 1}
                                </PaginationLink>
                            </PaginationItem>
                        ))}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>

                {/* Location Modal */}
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>{selectedLog ? `Location: ${selectedLog.ip}` : "Location Details"}</DialogTitle>
                        </DialogHeader>
                        <div className=" w-full border border-gray-300 rounded-md">
                            {/*{selectedLocation && <LocationMap location={selectedLocation} />}*/}
                            <img src="/images/temp-map.png" alt="Temporary Map"
                            // className="w-full h-auto rounded"
                            />
                        </div>
                        {selectedLog && (
                            <div className="mt-4 text-sm">
                                {/* Reduced gap from gap-6 to gap-2 */}
                                <div className="grid grid-cols-[2fr_1fr] gap-2">
                                    <div className="grid grid-cols-[120px_1fr] gap-2">
                                        <div className="font-medium">Alert Type:</div>
                                        <div>
                                            <Badge className={getBadgeColor(selectedLog.type || inferTypeFromStatus(selectedLog.status))}>
                                                {selectedLog.type || inferTypeFromStatus(selectedLog.status)}
                                            </Badge>
                                        </div>
                                        <div className="font-medium">ID:</div>
                                        <div>{selectedLog.id}</div>
                                        <div className="font-medium">Status:</div>
                                        <div>{selectedLog.status}</div>
                                        <div className="font-medium">IP:</div>
                                        <div>{selectedLog.ip}</div>
                                        <div className="font-medium">Timestamp:</div>
                                        <div>{formatDate(selectedLog.timestamp)}</div>
                                        <div className="font-medium">Path:</div>
                                        <div>{selectedLog.path || "-"}</div>
                                        <div className="font-medium">Method:</div>
                                        <div>{selectedLog.method || "-"}</div>
                                        <div className="font-medium">HTTP Version:</div>
                                        <div>{selectedLog.http_version || "-"}</div>
                                        <div className="font-medium">Bytes:</div>
                                        <div>{selectedLog.bytes}</div>
                                        <div className="font-medium">Browser:</div>
                                        <div>{selectedLog.browser || "-"}</div>
                                        <div className="font-medium">Coordinates:</div>
                                        <div>
                                            {selectedLocation && `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}`}
                                        </div>
                                        <div className="font-medium">Selected:</div>
                                        <div>{selectedRows.includes(selectedLog.id) ? "Yes" : "No"}</div>
                                    </div>
                                    {/*<div>*/}
                                    {/*<img src="/images/temp-map.png" alt="Location Map" className="w-full h-auto rounded" />*/}
                                    {/*</div>*/}
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    )
}