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

export function AddressTransactions({ addressInfo }: AddressTransactionsProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [pageInput, setPageInput] = useState("");
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [exportLimit, setExportLimit] = useState<number>(0); // 0 = export all
  const [showExportOptions, setShowExportOptions] = useState<'csv' | 'json' | null>(null);

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

    // Close export options panel
    setShowExportOptions(null);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Preparing export...");

    try {
      const { FluxAPI } = await import("@/lib/api/client");
      const { getApiConfig } = await import("@/lib/api/config");
      const config = getApiConfig();

      const safeTotal = Math.max(0, totalTransactions);

      // Determine how many transactions to export (0 = all, or user-specified limit)
      const txCountToExport = exportLimit > 0 ? Math.min(exportLimit, safeTotal) : safeTotal;

      // Show warning for large exports
      if (txCountToExport > 1000) {
        const message = `This will export ${txCountToExport.toLocaleString()} transaction${txCountToExport !== 1 ? 's' : ''}. This may take a while. Continue?`;
        const confirmed = window.confirm(message);
        if (!confirmed) {
          setIsExporting(false);
          setAbortController(null);
          return;
        }
      }

      const batchSize = config.batchSize; // Use dynamic batch size (1000 for local, 100 for public)
      const allTransactions: Transaction[] = [];

      // Fetch transactions (most recent first, limited by txCountToExport)
      for (let offset = 0; offset < txCountToExport; offset += batchSize) {
        // Check if user cancelled
        if (controller.signal.aborted) {
          throw new Error("Export cancelled by user");
        }

        const fetchedCount = Math.min(offset + batchSize, txCountToExport);
        const progressPercent = 10 + Math.round((fetchedCount / txCountToExport) * 70); // 10-80% is fetching

        setExportProgress(progressPercent);
        setExportStatus(`Fetching transactions: ${allTransactions.length.toLocaleString()} / ${txCountToExport.toLocaleString()}`);

        // Retry logic with exponential backoff for Blockbook timeouts/errors
        let retryCount = 0;
        const maxRetries = 3;
        let data;

        while (retryCount <= maxRetries) {
          try {
            data = await FluxAPI.getAddressTransactions(
              [addressInfo.addrStr],
              { from: offset, to: offset + batchSize }
            );
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            if (retryCount > maxRetries) {
              // Final retry failed, provide detailed error
              throw new Error(
                `Blockbook request failed after ${maxRetries} retries.\n` +
                `Offset: ${offset.toLocaleString()}\n` +
                `Progress: ${progressPercent}% (${allTransactions.length.toLocaleString()}/${txCountToExport.toLocaleString()})\n` +
                `Error: ${errorMsg}`
              );
            }

            // Exponential backoff: 500ms, 1s, 2s
            const retryDelay = 500 * Math.pow(2, retryCount - 1);
            console.warn(
              `[Export CSV] Blockbook retry ${retryCount}/${maxRetries} after ${retryDelay}ms ` +
              `(offset ${offset}, error: ${errorMsg})`
            );
            setExportStatus(
              `Retrying (${retryCount}/${maxRetries})... ` +
              `${allTransactions.length.toLocaleString()} / ${safeTotal.toLocaleString()}`
            );

            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

        if (data && data.items) {
          allTransactions.push(...data.items);
        }

        // Rate limiting: Add delay between requests (except last one)
        if (offset + batchSize < safeTotal) {
          await new Promise(resolve => setTimeout(resolve, config.throttleDelay));
        }
      }

      setExportProgress(85);
      setExportStatus(`Preparing ${allTransactions.length.toLocaleString()} transactions for export...`);

      // Split into files if needed
      const numFiles = Math.ceil(allTransactions.length / MAX_TRANSACTIONS_PER_FILE);

      for (let fileNum = 0; fileNum < numFiles; fileNum++) {
        const fileStart = fileNum * MAX_TRANSACTIONS_PER_FILE;
        const fileEnd = Math.min(fileStart + MAX_TRANSACTIONS_PER_FILE, allTransactions.length);
        const fileTransactions = allTransactions.slice(fileStart, fileEnd);

        const progressPercent = 85 + Math.round(((fileNum + 1) / numFiles) * 15); // Last 15% is generating files
        setExportProgress(progressPercent);
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

        // Handle multiple outputs (e.g., mining pool payouts)
        if (toAddresses.length > 1) {
          toAddr = `${toAddresses.length} recipients`;
          notes = `Split to ${toAddresses.length} addresses: ${toAddresses.slice(0, 3).join(', ')}${toAddresses.length > 3 ? '...' : ''}`;
        } else {
          toAddr = toAddresses.length > 0 ? toAddresses[0] : "";
        }
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

    // Close export options panel
    setShowExportOptions(null);

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus("Preparing export...");

    try {
      const { FluxAPI } = await import("@/lib/api/client");
      const { getApiConfig } = await import("@/lib/api/config");
      const config = getApiConfig();

      const safeTotal = Math.max(0, totalTransactions);

      // Determine how many transactions to export (0 = all, or user-specified limit)
      const txCountToExport = exportLimit > 0 ? Math.min(exportLimit, safeTotal) : safeTotal;

      // Show warning for large exports
      if (txCountToExport > 1000) {
        const message = `This will export ${txCountToExport.toLocaleString()} transactions. This may take a while. Continue?`;
        const confirmed = window.confirm(message);
        if (!confirmed) {
          setIsExporting(false);
          setAbortController(null);
          return;
        }
      }

      const batchSize = config.batchSize; // Use dynamic batch size (1000 for local, 100 for public)
      const allTransactions: Transaction[] = [];

      // Fetch transactions (most recent first, limited by txCountToExport)
      for (let offset = 0; offset < txCountToExport; offset += batchSize) {
        // Check if user cancelled
        if (controller.signal.aborted) {
          throw new Error("Export cancelled by user");
        }

        const fetchedCount = Math.min(offset + batchSize, txCountToExport);
        const progressPercent = 10 + Math.round((fetchedCount / txCountToExport) * 70); // 10-80% is fetching

        setExportProgress(progressPercent);
        setExportStatus(`Fetching transactions: ${allTransactions.length.toLocaleString()} / ${txCountToExport.toLocaleString()}`);

        // Retry logic with exponential backoff for Blockbook timeouts/errors
        let retryCount = 0;
        const maxRetries = 3;
        let data;

        while (retryCount <= maxRetries) {
          try {
            data = await FluxAPI.getAddressTransactions(
              [addressInfo.addrStr],
              { from: offset, to: offset + batchSize }
            );
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';

            if (retryCount > maxRetries) {
              // Final retry failed, provide detailed error
              throw new Error(
                `Blockbook request failed after ${maxRetries} retries.\n` +
                `Offset: ${offset.toLocaleString()}\n` +
                `Progress: ${progressPercent}% (${allTransactions.length.toLocaleString()}/${txCountToExport.toLocaleString()})\n` +
                `Error: ${errorMsg}`
              );
            }

            // Exponential backoff: 500ms, 1s, 2s
            const retryDelay = 500 * Math.pow(2, retryCount - 1);
            console.warn(
              `[Export JSON] Blockbook retry ${retryCount}/${maxRetries} after ${retryDelay}ms ` +
              `(offset ${offset}, error: ${errorMsg})`
            );
            setExportStatus(
              `Retrying (${retryCount}/${maxRetries})... ` +
              `${allTransactions.length.toLocaleString()} / ${safeTotal.toLocaleString()}`
            );

            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }

        if (data && data.items) {
          allTransactions.push(...data.items);
        }

        // Rate limiting: Add delay between requests (except last one)
        if (offset + batchSize < safeTotal) {
          await new Promise(resolve => setTimeout(resolve, config.throttleDelay));
        }
      }

      setExportProgress(85);
      setExportStatus(`Preparing ${allTransactions.length.toLocaleString()} transactions for export...`);

      // Split into files if needed
      const numFiles = Math.ceil(allTransactions.length / MAX_TRANSACTIONS_PER_FILE);

      for (let fileNum = 0; fileNum < numFiles; fileNum++) {
        const fileStart = fileNum * MAX_TRANSACTIONS_PER_FILE;
        const fileEnd = Math.min(fileStart + MAX_TRANSACTIONS_PER_FILE, allTransactions.length);
        const fileTransactions = allTransactions.slice(fileStart, fileEnd);

        const progressPercent = 85 + Math.round(((fileNum + 1) / numFiles) * 15); // Last 15% is generating files
        setExportProgress(progressPercent);
        setExportStatus(`Generating JSON file ${fileNum + 1} of ${numFiles}...`);

        exportTransactionsToJSON(fileTransactions, fileNum + 1, numFiles);

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

  const exportTransactionsToJSON = (txs: Transaction[], fileNum: number = 1, totalFiles: number = 1) => {
    if (!txs.length) return;

    // Enrich transactions with labels (same logic as CSV export)
    const enrichedTxs = txs.map((tx) => {
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

      // Determine transaction type and labels
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

        // Handle multiple outputs (e.g., mining pool payouts)
        if (toAddresses.length > 1) {
          toAddr = `${toAddresses.length} recipients`;
          notes = `Split to ${toAddresses.length} addresses: ${toAddresses.slice(0, 3).join(', ')}${toAddresses.length > 3 ? '...' : ''}`;
        } else {
          toAddr = toAddresses.length > 0 ? toAddresses[0] : "";
        }
      } else {
        // Net zero = No economic impact (likely dust or self-transfer)
        txType = "Send";
        amount = 0;
        notes = "No net change";
        fromAddr = addressInfo.addrStr;
        toAddr = addressInfo.addrStr;
      }

      // Return enriched transaction with labels
      return {
        // Original transaction data
        ...tx,
        // Enriched metadata
        metadata: {
          date: date.toISOString(),
          dateFormatted: format(date, "yyyy-MM-dd HH:mm:ss"),
          type: txType,
          amount: parseFloat(amount.toFixed(8)),
          netAmount: parseFloat(netAmount.toFixed(8)),
          receivedAmount: parseFloat(receivedAmount.toFixed(8)),
          sentAmount: parseFloat(sentAmount.toFixed(8)),
          currency: "FLUX",
          fromAddress: fromAddr,
          toAddress: toAddr,
          notes: notes || undefined,
          allFromAddresses: fromAddresses,
          allToAddresses: toAddresses,
          outputCount: tx.vout.length,
          inputCount: tx.vin.length,
          recipientCount: toAddresses.length,
        }
      };
    });

    const jsonContent = JSON.stringify(enrichedTxs, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Generate filename: add part number if multiple files
    const filename = totalFiles > 1
      ? `flux-address-${addressInfo.addrStr}-part${fileNum}of${totalFiles}.json`
      : `flux-address-${addressInfo.addrStr}.json`;

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
              onClick={() => setShowExportOptions(showExportOptions === 'csv' ? null : 'csv')}
              disabled={!transactions.length || isExporting}
              className="gap-2"
              title="Export CSV for tax reporting (compatible with Koinly, CoinTracker, etc.)"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportOptions(showExportOptions === 'json' ? null : 'json')}
              disabled={!transactions.length || isExporting}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Export JSON
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {addressInfo.txApperances.toLocaleString()} total transaction
          {addressInfo.txApperances !== 1 ? "s" : ""}
          {addressInfo.unconfirmedTxApperances > 0 &&
            ` (${addressInfo.unconfirmedTxApperances} pending)`}
        </p>

        {/* Export Options Panel */}
        {showExportOptions && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Number of transactions to export
                </label>
                <span className="text-sm text-muted-foreground">
                  {exportLimit === 0 ? 'All' : exportLimit.toLocaleString()} of {totalTransactions.toLocaleString()}
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max={totalTransactions}
                step={Math.max(1, Math.floor(totalTransactions / 100))}
                value={exportLimit}
                onChange={(e) => setExportLimit(parseInt(e.target.value))}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />

              {/* Quick selection buttons */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportLimit(100)}
                  disabled={totalTransactions < 100}
                >
                  Last 100
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportLimit(500)}
                  disabled={totalTransactions < 500}
                >
                  Last 500
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportLimit(1000)}
                  disabled={totalTransactions < 1000}
                >
                  Last 1,000
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportLimit(5000)}
                  disabled={totalTransactions < 5000}
                >
                  Last 5,000
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportLimit(0)}
                >
                  All
                </Button>
              </div>

              {/* Manual input */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Or enter exact amount:</label>
                <input
                  type="number"
                  min="1"
                  max={totalTransactions}
                  value={exportLimit === 0 ? '' : exportLimit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setExportLimit(isNaN(val) ? 0 : Math.min(val, totalTransactions));
                  }}
                  placeholder="All"
                  className="w-32 px-3 py-1.5 text-sm border rounded-md bg-background"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                variant="default"
                size="sm"
                onClick={showExportOptions === 'csv' ? handleExportCSV : handleExportJSON}
                className="gap-2"
              >
                {showExportOptions === 'csv' ? (
                  <>
                    <Download className="h-4 w-4" />
                    Export CSV
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Export JSON
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportOptions(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
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
