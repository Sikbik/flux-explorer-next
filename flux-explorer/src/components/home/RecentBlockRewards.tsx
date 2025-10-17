"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pickaxe, Coins, ArrowRight } from "lucide-react";
import { FluxAPI } from "@/lib/api/client";
import { getApiConfig } from "@/lib/api/config";

// Tier detection based on reward amounts
const getTierFromReward = (amount: number): { tier: string; color: string } => {
  if (amount >= 11.24 && amount <= 11.26) {
    return { tier: 'STRATUS', color: 'bg-blue-500' };
  } else if (amount >= 4.68 && amount <= 4.69) {
    return { tier: 'NIMBUS', color: 'bg-purple-500' };
  } else if (amount >= 2.81 && amount <= 2.82) {
    return { tier: 'CUMULUS', color: 'bg-pink-500' };
  }
  return { tier: 'MINER', color: 'bg-yellow-500' };
};

export function RecentBlockRewards() {
  const config = getApiConfig();

  // Fetch latest block and its coinbase transaction
  const { data: blockData, isLoading } = useQuery({
    queryKey: ["recent-block-rewards"],
    queryFn: async () => {
      const status = await FluxAPI.getStatus();
      const latestHeight = status.info.blocks;
      const blockHash = await FluxAPI.getBlockHash(latestHeight);
      const block = await FluxAPI.getBlock(blockHash);

      // Get the coinbase transaction (first tx in block)
      const coinbaseTxid = block.tx[0];
      const coinbaseTx = await FluxAPI.getTransaction(coinbaseTxid);

      // Parse outputs to identify FluxNode rewards (filter out 0-value outputs)
      const rewards = coinbaseTx.vout
        .filter((output) => Number(output.value) > 0)
        .map((output) => {
          const amount = Number(output.value);
          const tierInfo = getTierFromReward(amount);
          return {
            address: output.scriptPubKey.addresses?.[0] || 'Unknown',
            amount,
            ...tierInfo,
          };
        });

      return {
        blockHeight: block.height,
        blockHash: block.hash,
        timestamp: block.time,
        rewards,
        totalReward: rewards.reduce((sum, r) => sum + r.amount, 0),
      };
    },
    refetchInterval: config.refetchInterval, // Use dynamic interval (3s local, 30s public)
    staleTime: Math.min(config.staleTime, 5000), // Max 5s stale time
  });

  // Keep animation running continuously
  // (animating state is always true for continuous animation)

  return (
    <Card className="overflow-hidden border-primary/5">
      <CardHeader className="bg-gradient-to-r from-yellow-500/10 to-transparent">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pickaxe className="h-5 w-5 text-yellow-500 animate-bounce" />
            Latest Block Rewards
          </div>
          <Link
            href={blockData ? `/block/${blockData.blockHash}` : '#'}
            className="text-sm font-normal text-primary hover:underline flex items-center gap-1"
          >
            View block
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-20 w-full" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ) : blockData ? (
          <div className="space-y-6">
            {/* Block Info */}
            <div>
              <Link
                href={`/block/${blockData.blockHash}`}
                className="text-2xl font-bold hover:text-primary transition-colors"
              >
                Block #{blockData.blockHeight.toLocaleString()}
              </Link>
              <p className="text-sm text-muted-foreground mt-1">
                Total Reward: {blockData.totalReward.toFixed(2)} FLUX
              </p>
            </div>

            {/* Reward Recipients */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                Block Reward Distribution
              </h4>
              {blockData.rewards.map((reward, i) => (
                <Link
                  key={i}
                  href={`/address/${reward.address}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-1 h-12 rounded-full ${reward.color}`} />
                    <div className="min-w-0">
                      <Badge variant="outline" className={`mb-1 ${reward.color.replace('bg-', 'text-')} border-${reward.color.replace('bg-', '')}/20 bg-${reward.color.replace('bg-', '')}/10`}>
                        {reward.tier}
                      </Badge>
                      <p className="text-xs font-mono truncate text-muted-foreground">
                        {reward.address.substring(0, 12)}...{reward.address.substring(reward.address.length - 8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    {reward.amount.toFixed(8)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            No block data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
