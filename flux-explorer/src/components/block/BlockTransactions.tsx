"use client";

import { useState, useMemo } from "react";
import { Block, Transaction } from "@/types/flux-api";
import { FluxNodeTransaction, isFluxNodeTransaction } from "@/lib/flux-tx-parser";
import { useBlockTransactionCounts } from "@/hooks/useBlockTransactionCounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Server } from "lucide-react";

interface BlockTransactionsProps {
  block: Block;
}

const TRANSACTIONS_PER_PAGE = 10;

// Helper to get tier color
const getTierColor = (tier?: string) => {
  switch (tier?.toUpperCase()) {
    case 'CUMULUS':
      return 'text-pink-500 border-pink-500/20 bg-pink-500/10';
    case 'NIMBUS':
      return 'text-purple-500 border-purple-500/20 bg-purple-500/10';
    case 'STRATUS':
      return 'text-blue-500 border-blue-500/20 bg-blue-500/10';
    default:
      return 'text-gray-500 border-gray-500/20 bg-gray-500/10';
  }
};

export function BlockTransactions({ block }: BlockTransactionsProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Use the shared hook that fetches ALL transactions once and caches them
  const { counts, fullTransactions, loading } = useBlockTransactionCounts(block);

  // Calculate pagination
  const totalPages = Math.ceil(block.tx.length / TRANSACTIONS_PER_PAGE);
  const startIndex = (currentPage - 1) * TRANSACTIONS_PER_PAGE;
  const endIndex = startIndex + TRANSACTIONS_PER_PAGE;

  // Get transactions for current page from the cached full list
  const currentTxIds = block.tx.slice(startIndex, endIndex);
  const transactions = useMemo(() => {
    return currentTxIds.map((_, idx) => fullTransactions[startIndex + idx] || null);
  }, [currentTxIds, fullTransactions, startIndex]);

  // Convert counts to the format expected by the component
  const txCounts = useMemo(() => ({
    regular: counts.coinbase + counts.transfer,
    nodeConfirmations: counts.cumulus + counts.nimbus + counts.stratus + counts.starting + counts.unknown,
    tierCounts: {
      cumulus: counts.cumulus,
      nimbus: counts.nimbus,
      stratus: counts.stratus,
      starting: counts.starting,
      unknown: counts.unknown,
    },
  }), [counts]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Transactions
            <Badge variant="secondary">{txCounts.regular.toLocaleString()}</Badge>
            {txCounts.nodeConfirmations > 0 && (
              <div className="relative group">
                <Badge variant="outline" className="gap-1 cursor-help">
                  <Server className="h-3 w-3" />
                  {txCounts.nodeConfirmations.toLocaleString()}
                </Badge>
                {/* Hover tooltip */}
                <div className="absolute left-0 bottom-full mb-2 p-3 bg-card border rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[220px]">
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold mb-2">Node Confirmations</p>
                    {txCounts.tierCounts.cumulus > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-pink-500 font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                          CUMULUS
                        </span>
                        <span className="font-bold text-pink-500">
                          {txCounts.tierCounts.cumulus.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {txCounts.tierCounts.nimbus > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-purple-500 font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                          NIMBUS
                        </span>
                        <span className="font-bold text-purple-500">
                          {txCounts.tierCounts.nimbus.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {txCounts.tierCounts.stratus > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-blue-500 font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                          STRATUS
                        </span>
                        <span className="font-bold text-blue-500">
                          {txCounts.tierCounts.stratus.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {txCounts.tierCounts.starting > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-yellow-500 font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                          STARTING
                        </span>
                        <span className="font-bold text-yellow-500">
                          {txCounts.tierCounts.starting.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {txCounts.tierCounts.unknown > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-gray-400"></span>
                          UNKNOWN
                        </span>
                        <span className="font-bold text-gray-400">
                          {txCounts.tierCounts.unknown.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Arrow pointing down */}
                  <div className="absolute left-4 bottom-[-6px] w-3 h-3 bg-card border-r border-b rotate-45"></div>
                </div>
              </div>
            )}
          </CardTitle>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          // Loading skeletons
          Array.from({ length: currentTxIds.length }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          ))
        ) : (
          transactions.map((tx, index) => {
            const globalIndex = startIndex + index;
            const isCoinbase = globalIndex === 0;
            const txid = currentTxIds[index];

            // Safety check: skip if txid is undefined
            if (!txid) {
              return null;
            }

            if (!tx) {
              return (
                <div key={txid} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {globalIndex + 1}
                  </div>
                  <div className="flex-1">
                    <a href={`/tx/${txid}`} className="font-mono text-sm hover:text-primary truncate">
                      {txid}
                    </a>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/tx/${txid}`}>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              );
            }

            // Check if FluxNode transaction (0 inputs, 0 outputs)
            const isFluxNode = isFluxNodeTransaction(tx);
            const fluxTx = tx as Transaction & Partial<FluxNodeTransaction>;
            const isStarting = fluxTx.type?.toLowerCase().includes('starting');

            return (
              <div
                key={txid}
                className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {globalIndex + 1}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Transaction ID */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={`/tx/${txid}`}
                      className="font-mono text-sm hover:text-primary transition-colors truncate"
                    >
                      {txid.slice(0, 16)}...{txid.slice(-8)}
                    </a>
                    {isCoinbase && (
                      <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-500">
                        Coinbase
                      </Badge>
                    )}
                    {!isCoinbase && !isFluxNode && (
                      <Badge variant="outline" className="bg-orange-500/10 border-orange-500/20 text-orange-500">
                        TRANSFER
                      </Badge>
                    )}
                    {isFluxNode && (isStarting || !fluxTx.benchmarkTier) && (
                      <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500">
                        <Server className="h-3 w-3 mr-1" />
                        STARTING
                      </Badge>
                    )}
                    {isFluxNode && !isStarting && fluxTx.benchmarkTier && (
                      <Badge variant="outline" className={getTierColor(fluxTx.benchmarkTier)}>
                        <Server className="h-3 w-3 mr-1" />
                        {fluxTx.benchmarkTier}
                      </Badge>
                    )}
                  </div>

                  {/* Transaction Description */}
                  <div className="text-xs text-muted-foreground">
                    {isCoinbase ? (
                      <span>Block reward: {tx.valueOut.toFixed(8)} FLUX</span>
                    ) : isFluxNode && isStarting && fluxTx.ip ? (
                      <span>Starting a FluxNode at {fluxTx.ip}</span>
                    ) : isFluxNode && fluxTx.ip ? (
                      <span>Confirming {fluxTx.benchmarkTier || 'FluxNode'} at {fluxTx.ip}</span>
                    ) : isFluxNode ? (
                      <span>Starting a FluxNode (pending setup)</span>
                    ) : (
                      <div className="flex items-center gap-1">
                        {tx.vin[0]?.addr ? (
                          <a
                            href={`/address/${tx.vin[0].addr}`}
                            className="truncate max-w-[150px] hover:underline transition-colors"
                            title={tx.vin[0].addr}
                          >
                            {tx.vin[0].addr.slice(0, 8)}...{tx.vin[0].addr.slice(-6)}
                          </a>
                        ) : (
                          <span>New Coins</span>
                        )}
                        <ArrowRight className="h-3 w-3 flex-shrink-0" />
                        {tx.vout[0]?.scriptPubKey?.addresses?.[0] ? (
                          <a
                            href={`/address/${tx.vout[0].scriptPubKey.addresses[0]}`}
                            className="truncate max-w-[150px] hover:underline transition-colors"
                            title={tx.vout[0].scriptPubKey.addresses[0]}
                          >
                            {tx.vout[0].scriptPubKey.addresses[0].slice(0, 8)}...
                            {tx.vout[0].scriptPubKey.addresses[0].slice(-6)}
                          </a>
                        ) : (
                          <span>Unknown</span>
                        )}
                        <span className="ml-2 font-medium">{tx.valueOut.toFixed(4)} FLUX</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <CopyButton text={txid} />
                  <Button variant="ghost" size="icon" asChild>
                    <a href={`/tx/${txid}`}>
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
            </div>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-10"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
