/**
 * React Query hook for calculating average block time
 */

import { useQuery } from "@tanstack/react-query";
import { BlockbookAPI } from "../blockbook-client";

/**
 * Calculate average block time from recent blocks
 * @param sampleSize - Number of recent blocks to sample (default: 100)
 * @returns Average time between blocks in seconds
 */
async function calculateAverageBlockTime(sampleSize: number = 100): Promise<number> {
  try {
    // Get current block height
    const status = await BlockbookAPI.getStatus();
    const currentHeight = status.info.blocks;

    // Fetch sample of recent blocks
    const startHeight = currentHeight;
    const endHeight = currentHeight - sampleSize;

    // Fetch first and last block to calculate average
    const [startBlock, endBlock] = await Promise.all([
      BlockbookAPI.getBlock(startHeight),
      BlockbookAPI.getBlock(endHeight),
    ]);

    // Calculate time difference
    const timeDiff = startBlock.time - endBlock.time;
    const blockDiff = startHeight - endHeight;

    // Calculate average (in seconds)
    const averageBlockTime = timeDiff / blockDiff;

    return averageBlockTime;
  } catch (error) {
    console.error("Failed to calculate average block time:", error);
    // Return target block time (120 seconds) as fallback
    return 120;
  }
}

/**
 * Hook to fetch and calculate average block time
 * Samples last 100 blocks by default
 */
export function useAverageBlockTime(sampleSize: number = 100) {
  return useQuery({
    queryKey: ["average-block-time", sampleSize],
    queryFn: () => calculateAverageBlockTime(sampleSize),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}
