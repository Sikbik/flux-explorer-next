"use client";

/**
 * Rich List Table Component
 *
 * Displays paginated table of rich addresses with balances
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, AlertCircle, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { RichListAddress } from "@/types/rich-list";

interface RichListResponse {
  lastUpdate: string;
  lastBlockHeight: number;
  totalSupply: number;
  totalAddresses: number;
  page: number;
  pageSize: number;
  totalPages: number;
  addresses: RichListAddress[];
}

export function RichListTable() {
  const [data, setData] = useState<RichListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;

  useEffect(() => {
    fetchRichList(currentPage);
  }, [currentPage]);

  const fetchRichList = async (page: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/rich-list?page=${page}&pageSize=${pageSize}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch rich list");
      }

      const richListData: RichListResponse = await response.json();
      setData(richListData);
    } catch (err) {
      console.error("Error fetching rich list:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load rich list"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: number): string => {
    return balance.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  };

  const formatPercentage = (percentage: number): string => {
    return percentage.toFixed(4) + "%";
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading rich list...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <Alert variant="destructive" className="max-w-2xl mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Metadata Info */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>Total Addresses</span>
          </div>
          <p className="text-2xl font-bold">
            {data.totalAddresses.toLocaleString()}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="text-sm text-muted-foreground mb-1">
            Total Supply
          </div>
          <p className="text-2xl font-bold">
            {formatBalance(data.totalSupply)} FLUX
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="text-sm text-muted-foreground mb-1">
            Last Updated
          </div>
          <p className="text-sm font-medium">
            Block #{data.lastBlockHeight.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDate(data.lastUpdate)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px] text-center">Rank</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Balance (FLUX)</TableHead>
                <TableHead className="text-right">% of Supply</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  Transactions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.addresses.map((address) => (
                <TableRow key={address.address} className="hover:bg-muted/30">
                  <TableCell className="text-center font-medium">
                    #{address.rank}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/address/${address.address}`}
                      className="font-mono text-sm hover:text-primary transition-colors"
                    >
                      <span className="hidden lg:inline">{address.address}</span>
                      <span className="lg:hidden">
                        {formatAddress(address.address)}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatBalance(address.balance)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {formatPercentage(address.percentage)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {address.txCount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Showing {((currentPage - 1) * pageSize + 1).toLocaleString()} -{" "}
          {Math.min(currentPage * pageSize, data.totalAddresses).toLocaleString()}{" "}
          of {data.totalAddresses.toLocaleString()} addresses
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1 px-3 py-1 text-sm">
            Page {currentPage} of {data.totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={currentPage === data.totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Loading overlay for page changes */}
      {loading && data && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4 bg-card p-6 rounded-lg border shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading page {currentPage}...</p>
          </div>
        </div>
      )}
    </div>
  );
}
