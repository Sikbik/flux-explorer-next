import { useQuery, UseQueryResult } from "@tanstack/react-query";

export interface BlockCount {
  hash: string;
  height: number;
  regularTxCount: number;
  nodeConfirmationCount: number;
}

interface BlockCountsResponse {
  blocks: BlockCount[];
}

/**
 * Query keys for block counts
 */
export const blockCountKeys = {
  all: ["blockCounts"] as const,
  list: (hashes: string[]) => [...blockCountKeys.all, { hashes }] as const,
};

/**
 * Fetcher function for block counts
 */
const fetchBlockCounts = async (hashes: string[]): Promise<BlockCount[]> => {
  if (hashes.length === 0) {
    return [];
  }

  const hashesParam = hashes.map(h => encodeURIComponent(h)).join(",");
  const res = await fetch(`/api/block-counts?hashes=${hashesParam}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch block counts");
  }

  const data: BlockCountsResponse = await res.json();
  return data.blocks;
};

/**
 * Hook to fetch transaction counts for multiple blocks efficiently
 * Uses server-side API endpoint to minimize client-side API calls
 *
 * @param blockHashes - Array of block hashes to fetch counts for
 * @returns Query result with block counts
 *
 * @example
 * ```tsx
 * const { data: blockCounts, isLoading } = useBlockCounts(['hash1', 'hash2']);
 * ```
 */
export function useBlockCounts(
  blockHashes: string[]
): UseQueryResult<BlockCount[], Error> {
  return useQuery<BlockCount[], Error>({
    queryKey: blockCountKeys.list(blockHashes),
    queryFn: () => fetchBlockCounts(blockHashes),
    enabled: blockHashes.length > 0,
    staleTime: 10 * 1000, // Cache for 10 seconds
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
