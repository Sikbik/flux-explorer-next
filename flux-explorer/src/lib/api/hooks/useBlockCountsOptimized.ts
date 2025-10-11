import { useQueries, UseQueryResult } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";

export interface BlockCount {
  hash: string;
  height: number;
  regularTxCount: number;
  nodeConfirmationCount: number;
  tierCounts: {
    cumulus: number;
    nimbus: number;
    stratus: number;
    starting: number;
    unknown: number;
  };
}

interface BlockCountsResponse {
  blocks: BlockCount[];
}

/**
 * Query keys for individual block counts
 * Using individual hash as key allows React Query to cache per-block
 */
export const blockCountKeys = {
  all: ["blockCount"] as const,
  single: (hash: string) => [...blockCountKeys.all, hash] as const,
  batch: (hashes: string[]) => [...blockCountKeys.all, "batch", { hashes }] as const,
};

/**
 * Fetch counts for a single block (for individual queries)
 */
const fetchSingleBlockCount = async (hash: string): Promise<BlockCount> => {
  const res = await fetch(`/api/block-counts?hashes=${encodeURIComponent(hash)}`, {
    cache: "force-cache", // Allow browser caching for immutable block data
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch count for block ${hash}`);
  }

  const data: BlockCountsResponse = await res.json();
  if (data.blocks.length === 0) {
    throw new Error(`No data returned for block ${hash}`);
  }

  return data.blocks[0];
};

/**
 * Optimized hook to fetch transaction counts for multiple blocks
 *
 * Key optimization: Each block hash gets its own cache entry, so when
 * the Latest Blocks list updates with mostly the same blocks, we only
 * fetch counts for the NEW blocks.
 *
 * @param blockHashes - Array of block hashes
 * @returns Combined query result with all block counts
 *
 * @example
 * ```tsx
 * const { data: blockCounts, isLoading } = useBlockCountsOptimized(['hash1', 'hash2']);
 * // If hash1 is already cached, only hash2 will be fetched
 * ```
 */
export function useBlockCountsOptimized(blockHashes: string[]) {
  // Create individual queries for each block hash
  // React Query automatically dedupes and caches by queryKey
  const queries = useQueries({
    queries: blockHashes.map((hash) => ({
      queryKey: blockCountKeys.single(hash),
      queryFn: () => fetchSingleBlockCount(hash),
      staleTime: Infinity, // Block data is immutable once created
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: !!hash,
    })),
  });

  // Combine results from all queries
  const allLoading = queries.some((q) => q.isLoading);
  const anyError = queries.some((q) => q.error);
  const allData = queries
    .map((q) => q.data)
    .filter((data): data is BlockCount => data !== undefined);

  return {
    data: allData,
    isLoading: allLoading,
    error: anyError ? new Error("Failed to fetch some block counts") : undefined,
  };
}

/**
 * Alternative: Batch fetch with intelligent caching
 * Use this if you prefer to fetch in batches but still want smart caching
 */
export function useBlockCountsBatch(blockHashes: string[]): UseQueryResult<BlockCount[], Error> {
  return useQuery<BlockCount[], Error>({
    queryKey: blockCountKeys.batch(blockHashes),
    queryFn: async () => {
      const hashesParam = blockHashes.map(h => encodeURIComponent(h)).join(",");
      const res = await fetch(`/api/block-counts?hashes=${hashesParam}`, {
        cache: "force-cache",
      });

      if (!res.ok) {
        throw new Error("Failed to fetch block counts");
      }

      const data: BlockCountsResponse = await res.json();
      return data.blocks;
    },
    enabled: blockHashes.length > 0,
    staleTime: Infinity, // Block data never changes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
