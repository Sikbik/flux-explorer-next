"use client";

import { useState } from "react";
import { AddressInfo, Transaction, TransactionOutput, TransactionInput } from "@/types/flux-api";
import { useAddressTransactions } from "@/lib/api/hooks/useAddress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  History,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface AddressTransactionsProps {
  addressInfo: AddressInfo;
}

const ITEMS_PER_PAGE = 25;
const MAX_TRANSACTIONS_PER_FILE = 50000; // Split large exports into 50k transaction files
const API_REQUEST_DELAY_MS = 100; // 100ms delay between API requests to prevent flooding

export function AddressTransactions({ addressInfo }: AddressTransactionsProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const from = currentPage * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE;

  const { data: txData, isLoading } = useAddressTransactions(
    [addressInfo.addrStr],
    { from, to }
  );

  const transactions = txData?.items || [];
  const totalPages = txData?.pagesTotal || 0;
  const totalTransactions = (txData && 'totalItems' in txData ? (txData.totalItems as number) : undefined) || addressInfo.txApperances || 0;

  const handleExportCSV = async () => {
    if (!transactions.length) return;

    // Validate total transactions (safety check)
    const safeTotal = Math.max(0, totalTransactions);
    if (safeTotal === 0) return;

    // Calculate number of files needed
    const numFiles = Math.ceil(safeTotal / MAX_TRANSACTIONS_PER_FILE);
    const willSplit = numFiles > 1;

    // Show warning for large exports
    if (safeTotal > 1000) {
      const message = willSplit
        ? `This will export ${safeTotal.toLocaleString()} transactions split into ${numFiles} files (${MAX_TRANSACTIONS_PER_FILE.toLocaleString()} transactions each). This may take a while. Continue?`
        : `This will export ${safeTotal.toLocaleString()} transactions. This may take a while. Continue?`;

      const confirmed = window.confirm(message);
      if (!confirmed) return;
    }

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Preparing export...");

    try {
      // For small number of transactions, use current page only
      if (safeTotal <= ITEMS_PER_PAGE) {
        setExportStatus("Generating CSV...");
        exportTransactionsToCSV(transactions, 1, 1);
        return;
      }

      // For large number of transactions, fetch all in batches
      const { InsightAPI } = await import("@/lib/api/client");
      const batchSize = 100; // Fetch 100 transactions at a time

      // Process each file segment
      for (let fileNum = 0; fileNum < numFiles; fileNum++) {
        // Check if user cancelled
        if (controller.signal.aborted) {
          throw new Error("Export cancelled by user");
        }

        const fileStart = fileNum * MAX_TRANSACTIONS_PER_FILE;
        const fileEnd = Math.min(fileStart + MAX_TRANSACTIONS_PER_FILE, safeTotal);
        const fileTransactions: Transaction[] = [];

        setExportStatus(`Processing file ${fileNum + 1} of ${numFiles}...`);

        // Fetch transactions for this file segment
        for (let offset = fileStart; offset < fileEnd; offset += batchSize) {
          // Check if user cancelled
          if (controller.signal.aborted) {
            throw new Error("Export cancelled by user");
          }

          const fetchedCount = Math.min(offset + batchSize, safeTotal);
          const progressPercent = Math.round((fetchedCount / safeTotal) * 100);

          setExportProgress(progressPercent);
          setExportStatus(`Fetching transactions: ${fetchedCount.toLocaleString()} / ${safeTotal.toLocaleString()} (File ${fileNum + 1}/${numFiles})`);

          const data = await InsightAPI.getAddressTransactions(
            [addressInfo.addrStr],
            { from: offset, to: offset + batchSize }
          );

          if (data.items) {
            fileTransactions.push(...data.items);
          }

          // Rate limiting: Add delay between requests (except last one in file)
          if (offset + batchSize < fileEnd) {
            await new Promise(resolve => setTimeout(resolve, API_REQUEST_DELAY_MS));
          }
        }

        // Generate CSV for this file segment
        setExportStatus(`Generating CSV file ${fileNum + 1} of ${numFiles}...`);
        exportTransactionsToCSV(fileTransactions, fileNum + 1, numFiles);

        // Small delay between files
        if (fileNum < numFiles - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setExportStatus("Export complete!");
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error("Export failed:", error);
      if (error instanceof Error && error.message === "Export cancelled by user") {
        alert("Export cancelled.");
      } else {
        alert("Failed to export transactions. Please try again.");
      }
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportStatus("");
      setAbortController(null);
    }
  };

  const exportTransactionsToCSV = (txs: Transaction[], fileNum: number = 1, totalFiles: number = 1) => {
    if (!txs.length) return;

    // Universal CSV format for crypto tax software
    // Compatible with: Koinly, CoinTracker, CryptoTaxCalculator, TokenTax
    const headers = [
      "Date",
      "Type",
      "Amount",
      "Currency",
      "TxHash",
      "Block Height",
      "Confirmations",
      "From Address",
      "To Address",
      "Notes",
    ];

    // CSV Rows
    const rows = txs.map((tx) => {
      const date = tx.time ? new Date(tx.time * 1000) : new Date();
      const isReceived = tx.vout.some((out: TransactionOutput) =>
        out.scriptPubKey.addresses?.includes(addressInfo.addrStr)
      );
      const isSent = tx.vin.some((input: TransactionInput) => input.addr === addressInfo.addrStr);

      // Calculate amounts for this address
      let receivedAmount = 0;
      let sentAmount = 0;
      const toAddresses: string[] = [];
      const fromAddresses: string[] = [];

      if (isReceived) {
        tx.vout.forEach((out: TransactionOutput) => {
          if (out.scriptPubKey.addresses?.includes(addressInfo.addrStr)) {
            const value = parseFloat(out.value);
            // Validate: skip NaN, Infinity, and negative values
            if (isFinite(value) && value >= 0) {
              receivedAmount += value;
            }
          }
        });
      }

      if (isSent) {
        tx.vin.forEach((input: TransactionInput) => {
          if (input.addr === addressInfo.addrStr) {
            // Validate: skip NaN, Infinity, and negative values
            if (isFinite(input.value) && input.value >= 0) {
              sentAmount += input.value;
            }
          }
        });
      }

      // Collect ALL input addresses (for determining source of received funds)
      tx.vin.forEach((input: TransactionInput) => {
        if (input.addr && !fromAddresses.includes(input.addr) && input.addr !== addressInfo.addrStr) {
          fromAddresses.push(input.addr);
        }
      });

      // Get unique to addresses (excluding current address)
      tx.vout.forEach((out: TransactionOutput) => {
        out.scriptPubKey.addresses?.forEach((addr) => {
          if (!toAddresses.includes(addr) && addr !== addressInfo.addrStr) {
            toAddresses.push(addr);
          }
        });
      });

      const netAmount = receivedAmount - sentAmount;

      // Determine transaction type and amount to record
      let txType: string;
      let amount: number;
      let notes = "";
      let fromAddr = "";
      let toAddr = "";

      // Simplified logic: just Receive or Send based on net amount
      if (netAmount > 0) {
        // Net positive = Received money
        txType = "Receive";
        amount = netAmount;
        fromAddr = fromAddresses.length > 0 ? fromAddresses[0] : "Coinbase";
        toAddr = addressInfo.addrStr;

        // Add helpful note for FluxNode rewards
        if (fromAddr === "Coinbase") {
          if (amount === 2.8125) {
            notes = "FluxNode Reward - CUMULUS";
          } else if (amount === 4.6875) {
            notes = "FluxNode Reward - NIMBUS";
          } else if (amount === 11.25) {
            notes = "FluxNode Reward - STRATUS";
          } else {
            notes = "Block Reward";
          }
        }
      } else if (netAmount < 0) {
        // Net negative = Sent money (includes change transactions)
        txType = "Send";
        amount = Math.abs(netAmount);
        fromAddr = addressInfo.addrStr;
        toAddr = toAddresses.length > 0 ? toAddresses[0] : "";
      } else {
        // Net zero = No economic impact (likely dust or self-transfer)
        txType = "Send";
        amount = 0;
        notes = "No net change";
        fromAddr = addressInfo.addrStr;
        toAddr = addressInfo.addrStr;
      }

      return [
        format(date, "yyyy-MM-dd HH:mm:ss"),
        txType,
        amount.toFixed(8),
        "FLUX",
        tx.txid,
        tx.blockheight || "Pending",
        tx.confirmations.toString(),
        fromAddr,
        toAddr,
        notes || "", // Leave empty if no specific note
      ];
    });

    // Helper function to properly escape CSV cells (RFC 4180 + Formula Injection Prevention)
    const escapeCSVCell = (cell: string | number): string => {
      const strCell = String(cell);

      // Prevent CSV Formula Injection: escape cells starting with = + - @ (Excel formula triggers)
      const startsWithDangerousChar = /^[=+\-@]/.test(strCell);
      let escapedCell = startsWithDangerousChar ? `'${strCell}` : strCell;

      // RFC 4180: Escape double quotes by doubling them
      escapedCell = escapedCell.replace(/"/g, '""');

      // RFC 4180: Wrap in quotes if contains comma, newline, or quote
      if (escapedCell.includes(',') || escapedCell.includes('\n') || escapedCell.includes('"') || startsWithDangerousChar) {
        return `"${escapedCell}"`;
      }

      return escapedCell;
    };

    // Create CSV content with proper escaping
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCSVCell).join(",")),
    ].join("\n");

    // Download with proper filename
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Generate filename: add part number if multiple files
    const filename = totalFiles > 1
      ? `flux-address-${addressInfo.addrStr}-part${fileNum}of${totalFiles}.csv`
      : `flux-address-${addressInfo.addrStr}.csv`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    if (!transactions.length) return;

    // Show warning for large exports
    if (totalTransactions > 1000) {
      const confirmed = window.confirm(
        `This will export ${totalTransactions.toLocaleString()} transactions. This may take a while. Continue?`
      );
      if (!confirmed) return;
    }

    setIsExporting(true);

    try {
      let exportData: Transaction[] = transactions;

      // For large number of transactions, fetch all in batches
      if (totalTransactions > ITEMS_PER_PAGE) {
        const { InsightAPI } = await import("@/lib/api/client");
        const allTransactions: Transaction[] = [];
        const batchSize = 100;
        const totalBatches = Math.ceil(totalTransactions / batchSize);
        let currentBatch = 0;

        for (let offset = 0; offset < totalTransactions; offset += batchSize) {
          currentBatch++;
          console.log(`Fetching batch ${currentBatch}/${totalBatches}...`);

          const data = await InsightAPI.getAddressTransactions(
            [addressInfo.addrStr],
            { from: offset, to: offset + batchSize }
          );

          if (data.items) {
            allTransactions.push(...data.items);
          }
        }

        exportData = allTransactions;
      }

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flux-address-${addressInfo.addrStr.slice(0, 8)}-transactions.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export transactions. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!transactions.length || isExporting}
              className="gap-2"
              title="Export CSV for tax reporting (compatible with Koinly, CoinTracker, etc.)"
            >
              <Download className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportJSON}
              disabled={!transactions.length || isExporting}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              {isExporting ? "Exporting..." : "Export JSON"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {addressInfo.txApperances.toLocaleString()} total transaction
          {addressInfo.txApperances !== 1 ? "s" : ""}
          {addressInfo.unconfirmedTxApperances > 0 &&
            ` (${addressInfo.unconfirmedTxApperances} pending)`}
        </p>
      </CardHeader>
      <CardContent>
        {/* Export Progress Bar */}
        {isExporting && exportStatus && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm gap-4">
                <span className="font-medium flex-1">{exportStatus}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">{exportProgress}%</span>
                  {abortController && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => abortController.abort()}
                      className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                      title="Cancel export"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <History className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mt-4">No transactions found</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Confirmations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const date = tx.time ? new Date(tx.time * 1000) : new Date();
                    const isReceived = tx.vout.some((out: TransactionOutput) =>
                      out.scriptPubKey.addresses?.includes(addressInfo.addrStr)
                    );
                    const isSent = tx.vin.some((input: TransactionInput) => input.addr === addressInfo.addrStr);

                    // Calculate the actual amount for THIS address
                    let amount = 0;
                    if (isReceived) {
                      tx.vout.forEach((out: TransactionOutput) => {
                        if (out.scriptPubKey.addresses?.includes(addressInfo.addrStr)) {
                          amount += parseFloat(out.value);
                        }
                      });
                    }
                    if (isSent) {
                      tx.vin.forEach((input: TransactionInput) => {
                        if (input.addr === addressInfo.addrStr) {
                          amount -= input.value;
                        }
                      });
                    }

                    return (
                      <TableRow key={tx.txid}>
                        <TableCell className="font-mono text-xs">
                          {format(date, "yyyy-MM-dd HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <a
                            href={`/tx/${tx.txid}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {tx.txid.slice(0, 16)}...
                          </a>
                        </TableCell>
                        <TableCell>
                          {isReceived && isSent && Math.abs(amount) < 0.00001 ? (
                            <Badge variant="outline" className="gap-1">
                              <ArrowUpCircle className="h-3 w-3" />
                              Self
                            </Badge>
                          ) : amount > 0 ? (
                            <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                              <ArrowDownCircle className="h-3 w-3" />
                              Received
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
                              <ArrowUpCircle className="h-3 w-3" />
                              Sent
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {amount > 0 ? '+' : ''}{amount.toFixed(8)} FLUX
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.confirmations === 0 ? (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" />
                              Pending
                            </Badge>
                          ) : (
                            <span className="text-sm">{tx.confirmations}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {transactions.map((tx) => {
                const date = tx.time ? new Date(tx.time * 1000) : new Date();
                const isReceived = tx.vout.some((out: TransactionOutput) =>
                  out.scriptPubKey.addresses?.includes(addressInfo.addrStr)
                );
                const isSent = tx.vin.some((input: TransactionInput) => input.addr === addressInfo.addrStr);

                // Calculate the actual amount for THIS address
                let amount = 0;
                if (isReceived) {
                  tx.vout.forEach((out: TransactionOutput) => {
                    if (out.scriptPubKey.addresses?.includes(addressInfo.addrStr)) {
                      amount += parseFloat(out.value);
                    }
                  });
                }
                if (isSent) {
                  tx.vin.forEach((input: TransactionInput) => {
                    if (input.addr === addressInfo.addrStr) {
                      amount -= input.value;
                    }
                  });
                }

                return (
                  <div key={tx.txid} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(date, "MMM d, yyyy HH:mm")}
                      </span>
                      {isReceived && isSent && Math.abs(amount) < 0.00001 ? (
                        <Badge variant="outline" className="gap-1">
                          <ArrowUpCircle className="h-3 w-3" />
                          Self
                        </Badge>
                      ) : amount > 0 ? (
                        <Badge variant="outline" className="gap-1 border-green-500 text-green-600">
                          <ArrowDownCircle className="h-3 w-3" />
                          Received
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-red-500 text-red-600">
                          <ArrowUpCircle className="h-3 w-3" />
                          Sent
                        </Badge>
                      )}
                    </div>
                    <a
                      href={`/tx/${tx.txid}`}
                      className="block font-mono text-xs text-primary hover:underline truncate"
                    >
                      {tx.txid}
                    </a>
                    <div className="flex items-center justify-between pt-2">
                      <span className="font-mono text-sm font-semibold">
                        {amount > 0 ? '+' : ''}{amount.toFixed(8)} FLUX
                      </span>
                      {tx.confirmations === 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {tx.confirmations} confirms
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col gap-4 mt-6 pt-4 border-t">
                {/* Page info and jump controls */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Jump to:</span>
                    <input
                      type="number"
                      min="1"
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const pageNum = parseInt(pageInput);
                          if (pageNum >= 1 && pageNum <= totalPages) {
                            setCurrentPage(pageNum - 1);
                            setPageInput("");
                          }
                        }
                      }}
                      placeholder="Page"
                      className="w-20 px-2 py-1 text-sm border rounded-md bg-background"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const pageNum = parseInt(pageInput);
                        if (pageNum >= 1 && pageNum <= totalPages) {
                          setCurrentPage(pageNum - 1);
                          setPageInput("");
                        }
                      }}
                      disabled={!pageInput || parseInt(pageInput) < 1 || parseInt(pageInput) > totalPages}
                    >
                      Go
                    </Button>
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(0)}
                      disabled={currentPage === 0}
                      title="First page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                      disabled={currentPage === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={currentPage >= totalPages - 1}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages - 1)}
                      disabled={currentPage >= totalPages - 1}
                      title="Last page"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
