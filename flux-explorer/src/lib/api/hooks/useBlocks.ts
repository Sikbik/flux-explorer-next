/**
 * React Query Hooks for Block Operations
 *
 * Provides hooks for fetching and managing block data with
 * automatic caching, refetching, and error handling.
 */

import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { InsightAPI } from "../client";
import type { Block, BlockSummary } from "@/types/flux-api";

/**
 * Query keys for block operations
 */
export const blockKeys = {
  all: ["blocks"] as const,
  lists: () => [...blockKeys.all, "list"] as const,
  list: (limit: number) => [...blockKeys.lists(), { limit }] as const,
  details: () => [...blockKeys.all, "detail"] as const,
  detail: (hashOrHeight: string | number) => [...blockKeys.details(), hashOrHeight] as const,
  index: (height: number) => [...blockKeys.all, "index", height] as const,
  raw: (hashOrHeight: string | number) => [...blockKeys.all, "raw", hashOrHeight] as const,
};

/**
 * Hook to fetch a block by hash or height
 *
 * @param hashOrHeight - Block hash (string) or height (number)
 * @param options - React Query options
 * @returns Query result with block data
 *
 * @example
 * ```tsx
 * const { data: block, isLoading, error } = useBlock("00000000000000001234");
 * ```
 */
export function useBlock(
  hashOrHeight: string | number,
  options?: Omit<UseQueryOptions<Block, Error>, "queryKey" | "queryFn">
): UseQueryResult<Block, Error> {
  return useQuery<Block, Error>({
    queryKey: blockKeys.detail(hashOrHeight),
    queryFn: () => InsightAPI.getBlock(hashOrHeight),
    enabled: !!hashOrHeight,
    staleTime: 5 * 60 * 1000, // 5 minutes - blocks don't change
    ...options,
  });
}

/**
 * Hook to fetch raw block data
 *
 * @param hashOrHeight - Block hash (string) or height (number)
 * @param options - React Query options
 * @returns Query result with raw block hex
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useRawBlock(12345);
 * if (data) {
 *   console.log(data.rawblock);
 * }
 * ```
 */
export function useRawBlock(
  hashOrHeight: string | number,
  options?: Omit<UseQueryOptions<{ rawblock: string }, Error>, "queryKey" | "queryFn">
): UseQueryResult<{ rawblock: string }, Error> {
  return useQuery<{ rawblock: string }, Error>({
    queryKey: blockKeys.raw(hashOrHeight),
    queryFn: () => InsightAPI.getRawBlock(hashOrHeight),
    enabled: !!hashOrHeight,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch block index/summary by height
 *
 * @param height - Block height
 * @param options - React Query options
 * @returns Query result with block summary
 *
 * @example
 * ```tsx
 * const { data: blockSummary } = useBlockIndex(100000);
 * ```
 */
export function useBlockIndex(
  height: number,
  options?: Omit<UseQueryOptions<BlockSummary, Error>, "queryKey" | "queryFn">
): UseQueryResult<BlockSummary, Error> {
  return useQuery<BlockSummary, Error>({
    queryKey: blockKeys.index(height),
    queryFn: () => InsightAPI.getBlockIndex(height),
    enabled: height > 0,
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch latest blocks
 *
 * @param limit - Number of blocks to fetch (default: 10)
 * @param options - React Query options
 * @returns Query result with array of block summaries
 *
 * @example
 * ```tsx
 * const { data: blocks, isLoading } = useLatestBlocks(20);
 * ```
 */
export function useLatestBlocks(
  limit: number = 10,
  options?: Omit<UseQueryOptions<BlockSummary[], Error>, "queryKey" | "queryFn">
): UseQueryResult<BlockSummary[], Error> {
  return useQuery<BlockSummary[], Error>({
    queryKey: blockKeys.list(limit),
    queryFn: () => InsightAPI.getLatestBlocks(limit),
    staleTime: 5 * 1000, // 5 seconds - new blocks come frequently
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
    ...options,
  });
}
