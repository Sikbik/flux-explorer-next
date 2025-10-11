/**
 * React Query hook for fetching 24-hour transaction count
 */

import { useQuery } from "@tanstack/react-query";
import ky from "ky";

interface TransactionStats {
  totalTransactions: number;
  regularTransactions?: number;
  nodeConfirmations?: number;
  blocks: number;
  timeRange: number; // actual time range in seconds
}

/**
 * Fetch 24-hour transaction statistics from internal API route
 * The API route handles the heavy lifting of fetching all blocks server-side
 */
async function fetch24hTransactions(): Promise<TransactionStats> {
  try {
    const response = await ky.get("/api/transactions-24h").json<TransactionStats>();
    return response;
  } catch (error) {
    console.error("Failed to fetch 24h transactions:", error);
    return {
      totalTransactions: 0,
      blocks: 0,
      timeRange: 0,
    };
  }
}

/**
 * Hook to fetch 24-hour transaction statistics
 */
export function use24hTransactions() {
  return useQuery({
    queryKey: ["24h-transactions"],
    queryFn: () => fetch24hTransactions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
