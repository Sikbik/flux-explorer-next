"use client";

import { Block } from "@/types/flux-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Info, Server } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useBlockTransactionCounts } from "@/hooks/useBlockTransactionCounts";

interface BlockVisualProps {
  block: Block;
}

export function BlockVisual({ block }: BlockVisualProps) {
  // Use shared transaction counts hook
  const { counts: txCounts, categorizedTxs, loading } = useBlockTransactionCounts(block);

  // Calculate block fullness (assuming max block size of 2MB)
  const maxBlockSize = 2 * 1024 * 1024; // 2MB in bytes
  const blockFullness = (block.size / maxBlockSize) * 100;

  // Calculate transaction density
  const avgTxSize = block.size / block.tx.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Block Visualization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Block Fullness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Block Fullness</span>
            <span className="text-muted-foreground">
              {blockFullness.toFixed(2)}% of 2MB
            </span>
          </div>
          <Progress value={blockFullness} className="h-2" />
        </div>

        {/* Transaction Distribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Transaction Count</span>
            {loading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <div className="flex items-center gap-2">
                {(txCounts.coinbase + txCounts.transfer) > 0 && (
                  <span className="text-muted-foreground">
                    {(txCounts.coinbase + txCounts.transfer)} transaction{(txCounts.coinbase + txCounts.transfer) !== 1 ? 's' : ''}
                  </span>
                )}
                {(txCounts.cumulus + txCounts.nimbus + txCounts.stratus + txCounts.starting + txCounts.unknown) > 0 && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Server className="h-3 w-3" />
                    {(txCounts.cumulus + txCounts.nimbus + txCounts.stratus + txCounts.starting + txCounts.unknown)} node confirmations
                  </span>
                )}
              </div>
            )}
          </div>
          {loading ? (
            <div className="flex flex-wrap gap-0.5 min-h-[60px]">
              {Array.from({ length: block.tx.length }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-3 rounded-sm flex-shrink-0" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-0.5">
                {categorizedTxs.map((tx, i) => {
                  let bgColor = '';
                  let tooltipText = '';
                  let isFluxNode = false;

                  switch (tx.type) {
                    case 'coinbase':
                      bgColor = 'bg-green-500';
                      tooltipText = `Coinbase (Block Reward)`;
                      break;
                    case 'transfer':
                      bgColor = 'bg-orange-500';
                      tooltipText = `Transaction ${tx.index + 1}`;
                      break;
                    case 'cumulus':
                      bgColor = 'bg-pink-500';
                      tooltipText = `CUMULUS FluxNode ${tx.index + 1}`;
                      isFluxNode = true;
                      break;
                    case 'nimbus':
                      bgColor = 'bg-purple-500';
                      tooltipText = `NIMBUS FluxNode ${tx.index + 1}`;
                      isFluxNode = true;
                      break;
                    case 'stratus':
                      bgColor = 'bg-blue-600';
                      tooltipText = `STRATUS FluxNode ${tx.index + 1}`;
                      isFluxNode = true;
                      break;
                    case 'starting':
                      bgColor = 'bg-yellow-500';
                      tooltipText = `Starting FluxNode ${tx.index + 1}`;
                      isFluxNode = true;
                      break;
                    case 'unknown':
                      bgColor = 'bg-gray-500';
                      tooltipText = `Unknown FluxNode ${tx.index + 1}`;
                      isFluxNode = true;
                      break;
                  }

                  // Check if previous tx was not a FluxNode and current is (to add spacing)
                  const prevTx = i > 0 ? categorizedTxs[i - 1] : null;
                  const prevWasNotFluxNode = prevTx && !['cumulus', 'nimbus', 'stratus', 'starting', 'unknown'].includes(prevTx.type);
                  const shouldAddSpace = isFluxNode && prevWasNotFluxNode;

                  return (
                    <div
                      key={tx.txid}
                      className={`relative group h-3 w-3 rounded-sm ${bgColor} cursor-help transition-transform hover:scale-125 flex-shrink-0 ${shouldAddSpace ? 'ml-4' : ''}`}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
                        {tooltipText}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
                {txCounts.coinbase > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm bg-green-500"></div>
                    <span>Coinbase</span>
                  </div>
                )}
                {txCounts.transfer > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm bg-orange-500"></div>
                    <span>Transfers</span>
                  </div>
                )}
                {txCounts.cumulus > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm bg-pink-500"></div>
                    <span>Cumulus</span>
                  </div>
                )}
                {txCounts.nimbus > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm bg-purple-500"></div>
                    <span>Nimbus</span>
                  </div>
                )}
                {txCounts.stratus > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm bg-blue-600"></div>
                    <span>Stratus</span>
                  </div>
                )}
                {txCounts.starting > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm bg-yellow-500"></div>
                    <span>Starting</span>
                  </div>
                )}
                {txCounts.unknown > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-sm bg-gray-500"></div>
                    <span>Unknown</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Average Transaction Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Average Transaction Size</span>
            <span className="text-muted-foreground">
              {(avgTxSize / 1024).toFixed(2)} KB
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-8 rounded-md bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/20 flex items-center justify-center">
              <span className="text-xs font-medium">
                {avgTxSize.toFixed(0)} bytes
              </span>
            </div>
          </div>
        </div>

        {/* Block Metrics Summary */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Confirmations</div>
            <div className="text-lg font-bold">{block.confirmations.toLocaleString()}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Block Age</div>
            <div className="text-lg font-bold">
              {Math.floor((Date.now() - block.time * 1000) / 1000 / 60)} mins
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Total Size</div>
            <div className="text-lg font-bold">{(block.size / 1024).toFixed(2)} KB</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Value Transacted</div>
            {loading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-lg font-bold">{txCounts.totalFluxSent.toFixed(2)} FLUX</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
