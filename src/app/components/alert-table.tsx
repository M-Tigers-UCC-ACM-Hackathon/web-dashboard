"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

interface AlertEntry {
  alert_id: number;
  alert_type: string;
  severity: string;
  offender_ip: string;
  reason: string;
  explanation: string;
  created_at: string;
}

interface AlertTableProps {
  data: AlertEntry[];
}

export default function AlertTable({ data }: AlertTableProps) {
  const [page, setPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const itemsPerPage = 3;
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const paginatedData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getBadgeColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "critical":
        return "bg-red-500 hover:bg-red-600";
      case "warning":
        return "bg-amber-500 hover:bg-amber-600";
      case "info":
        return "bg-blue-500 hover:bg-blue-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const handleCheckboxChange = (alertId: number) => {
    setSelectedRows((prev) =>
      prev.includes(alertId) ? prev.filter((rowId) => rowId !== alertId) : [...prev, alertId]
    );
  };

  const handleExpandToggle = (alertId: number) => {
    setExpandedRows((prev) =>
      prev.includes(alertId) ? prev.filter((rowId) => rowId !== alertId) : [...prev, alertId]
    );
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="rounded-md border border-gray-300">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-gray-200 dark:border-gray-800">
                {/* <TableHead className="w-12"></TableHead> */}
                <TableHead className="w-12"></TableHead>
                <TableHead className="font-medium">Severity</TableHead>
                <TableHead className="font-medium">Alert ID</TableHead>
                <TableHead className="font-medium">Alert Type</TableHead>
                <TableHead className="font-medium">Offender IP</TableHead>
                <TableHead className="font-medium">Reason</TableHead>
                <TableHead className="font-medium">Explanation</TableHead>
                <TableHead className="font-medium">Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((alert) => (
                <>
                  <TableRow key={alert.alert_id} className="border-b border-gray-100 dark:border-gray-800">
                    {/* <TableCell> */}
                      {/* <Checkbox
                        checked={selectedRows.includes(alert.alert_id)}
                        onCheckedChange={() => handleCheckboxChange(alert.alert_id)}
                        className="border-2 border-gray-400 bg-white rounded"
                      /> */}
                    {/* </TableCell> */}
                    <TableCell className="text-left">
                      <button
                        onClick={() => handleExpandToggle(alert.alert_id)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedRows.includes(alert.alert_id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge className={getBadgeColor(alert.severity)}>{alert.severity}</Badge>
                    </TableCell>
                    <TableCell>{alert.alert_id}</TableCell>
                    <TableCell>{alert.alert_type}</TableCell>
                    <TableCell>{alert.offender_ip}</TableCell>
                    <TableCell className="max-w-[150px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate">{truncateText(alert.reason)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{alert.reason}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="block truncate">{truncateText(alert.explanation)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{alert.explanation}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{formatDate(alert.created_at)}</TableCell>
                  </TableRow>
                  {expandedRows.includes(alert.alert_id) && (
                    <TableRow className="border-b border-gray-100 dark:border-gray-800">
                      <TableCell colSpan={2}></TableCell>
                      <TableCell colSpan={8} className="bg-gray-50 dark:bg-gray-800">
                        <div className="p-4">
                          <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                            <div className="font-medium">Severity:</div>
                            <div>
                              <Badge className={getBadgeColor(alert.severity)}>{alert.severity}</Badge>
                            </div>
                            <div className="font-medium">Alert ID:</div>
                            <div>{alert.alert_id}</div>
                            <div className="font-medium">Alert Type:</div>
                            <div>{alert.alert_type}</div>
                            <div className="font-medium">Offender IP:</div>
                            <div>{alert.offender_ip}</div>
                            <div className="font-medium">Reason:</div>
                            <div>{alert.reason}</div>
                            <div className="font-medium">Explanation:</div>
                            <div>{alert.explanation}</div>
                            <div className="font-medium">Created At:</div>
                            <div>{formatDate(alert.created_at)}</div>
                            <div className="font-medium">Selected:</div>
                            <div>{selectedRows.includes(alert.alert_id) ? "Yes" : "No"}</div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
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
      </div>
    </TooltipProvider>
  );
}