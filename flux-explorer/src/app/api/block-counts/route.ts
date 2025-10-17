import { NextRequest, NextResponse } from "next/server";
import { FluxAPI } from "@/lib/api/client";
import { isFluxNodeTransaction, FluxNodeTransaction, parseFluxNodeTransaction } from "@/lib/flux-tx-parser";
import { getApiConfig } from "@/lib/api/config";
import { convertBlockbookTransaction } from "@/lib/api/blockbook-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BlockCount {
  hash: string;
  height: number;
  regularTxCount: number;
  nodeConfirmationCount: number;
}

// In-memory cache for block counts
// WARNING: Recent blocks can change due to chain reorgs/orphans!
// Only cache blocks with sufficient confirmations
const blockCountsCache = new Map<string, { data: BlockCount; cachedAt: number; confirmations: number }>();
const CACHE_MAX_SIZE = 1000; // Keep last 1000 blocks in cache
const MIN_CONFIRMATIONS_TO_CACHE = 100; // Only cache blocks with 100+ confirmations (safe from reorgs)
const RECENT_BLOCK_CACHE_TTL = 60000; // Recent blocks (<100 conf): cache for 1 minute only

/**
 * Validate block hash format (64 hex characters)
 */
function isValidBlockHash(hash: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Sanitize hash input to prevent injection
 */
function sanitizeHash(hash: string): string {
  return hash.trim().toLowerCase().replace(/[^a-f0-9]/g, '');
}

/**
 * API endpoint to get transaction counts for multiple blocks
 * Optimized to run on server-side to reduce client API calls
 *
 * Query params:
 * - hashes: comma-separated list of block hashes
 *
 * Example: /api/block-counts?hashes=hash1,hash2,hash3
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hashesParam = searchParams.get("hashes");

    if (!hashesParam) {
      return NextResponse.json(
        { error: "Missing 'hashes' query parameter" },
        { status: 400 }
      );
    }

    // Sanitize and validate input
    const rawHashes = hashesParam.split(",").filter(Boolean);
    const hashes: string[] = [];

    for (const rawHash of rawHashes) {
      const sanitized = sanitizeHash(rawHash);
      if (!isValidBlockHash(sanitized)) {
        return NextResponse.json(
          { error: `Invalid block hash format: ${rawHash.substring(0, 20)}...` },
          { status: 400 }
        );
      }
      hashes.push(sanitized);
    }

    if (hashes.length === 0) {
      return NextResponse.json(
        { error: "No valid hashes provided" },
        { status: 400 }
      );
    }

    if (hashes.length > 20) {
      return NextResponse.json(
        { error: "Maximum 20 hashes allowed per request" },
        { status: 400 }
      );
    }

    // Check cache first, only fetch uncached blocks
    const cachedResults: BlockCount[] = [];
    const uncachedHashes: string[] = [];
    const now = Date.now();

    for (const hash of hashes) {
      const cached = blockCountsCache.get(hash);
      if (cached) {
        // Check if cache entry is still valid
        const isOldBlock = cached.confirmations >= MIN_CONFIRMATIONS_TO_CACHE;
        const isRecentAndFresh = cached.confirmations < MIN_CONFIRMATIONS_TO_CACHE &&
                                  (now - cached.cachedAt) < RECENT_BLOCK_CACHE_TTL;

        if (isOldBlock || isRecentAndFresh) {
          // Cache is valid
          cachedResults.push(cached.data);
        } else {
          // Cache expired for recent block, re-fetch
          uncachedHashes.push(hash);
          blockCountsCache.delete(hash); // Remove stale entry
        }
      } else {
        uncachedHashes.push(hash);
      }
    }

    // Fetch all uncached blocks in parallel
    const blockPromises = uncachedHashes.map(async (hash) => {
      try {
        // Fetch block WITH full transaction details in one API call
        // This is MUCH faster than fetching block + each transaction separately
        const { block, transactions: txs } = await FluxAPI.getBlockWithTransactions(hash);

        if (!block.tx || block.tx.length === 0) {
          return {
            hash,
            height: block.height,
            regularTxCount: 0,
            nodeConfirmationCount: 0,
          };
        }

        // Blockbook may return full transaction objects or just IDs
        // If we got full transaction objects, use them directly
        const hasFullTxData = txs && txs.length > 0 && txs[0].vin !== undefined;

        type TxType = { vin?: unknown[]; vout?: unknown[] };
        let transactions: TxType[] = [];

        if (hasFullTxData) {
          // We have full transaction data from the block response - use it directly!
          // But we need to convert AND parse them for FluxNode data
          transactions = txs.map(tx => {
            const converted = convertBlockbookTransaction(tx);

            // Parse FluxNode data if transaction has hex
            if (tx.hex && isFluxNodeTransaction(converted)) {
              const fluxData = parseFluxNodeTransaction(tx.hex);
              if (fluxData) {
                return { ...converted, ...fluxData };
              }
            }

            return converted;
          }) as TxType[];
        } else {
          // Fallback: Blockbook didn't include full tx data, fetch individually
          const config = getApiConfig();
          const batchSize = Math.min(config.batchSize, 50);

          for (let i = 0; i < block.tx.length; i += batchSize) {
            const batchTxids = block.tx.slice(i, i + batchSize);
            const batchPromises = batchTxids.map(txid =>
              FluxAPI.getTransaction(txid).catch(() => null)
            );

            const batchResults = await Promise.all(batchPromises);
            transactions.push(...(batchResults.filter(tx => tx !== null) as TxType[]));

            if (i + batchSize < block.tx.length) {
              await new Promise(resolve => setTimeout(resolve, config.throttleDelay));
            }
          }
        }

        // Count regular vs node confirmation transactions with tier breakdown
        let regularCount = 0;
        let nodeCount = 0;
        const tierCounts = {
          cumulus: 0,
          nimbus: 0,
          stratus: 0,
          starting: 0,
          unknown: 0,
        };

        transactions.forEach((tx, idx) => {
          if (!tx) return;

          // First transaction is always coinbase (counted as regular)
          if (idx === 0) {
            regularCount++;
            return;
          }

          if (isFluxNodeTransaction(tx)) {
            nodeCount++;

            // Categorize by tier
            const fluxTx = tx as unknown as FluxNodeTransaction;
            const tier = fluxTx.benchmarkTier?.toUpperCase();
            const isStarting = fluxTx.type?.toLowerCase().includes('starting');

            if (tier === 'CUMULUS') {
              tierCounts.cumulus++;
            } else if (tier === 'NIMBUS') {
              tierCounts.nimbus++;
            } else if (tier === 'STRATUS') {
              tierCounts.stratus++;
            } else if (isStarting || !tier || tier === 'UNKNOWN') {
              tierCounts.starting++;
            } else {
              tierCounts.unknown++;
            }
          } else {
            regularCount++;
          }
        });

        const result = {
          hash,
          height: block.height,
          regularTxCount: regularCount,
          nodeConfirmationCount: nodeCount,
          tierCounts,
        };

        // Cache the result with metadata
        // Recent blocks (<100 conf): cache briefly (can change due to reorgs)
        // Old blocks (100+ conf): cache permanently (safe from reorgs)
        blockCountsCache.set(hash, {
          data: result,
          cachedAt: Date.now(),
          confirmations: block.confirmations,
        });

        // Limit cache size by removing oldest entries (FIFO)
        if (blockCountsCache.size > CACHE_MAX_SIZE) {
          const firstKey = blockCountsCache.keys().next().value;
          if (firstKey) blockCountsCache.delete(firstKey);
        }

        return result;
      } catch (error) {
        // Silently handle errors during Blockbook sync
        // These are expected when Blockbook hasn't indexed older blocks yet
        if (error && typeof error === 'object' && 'statusCode' in error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 500 || statusCode === 404) {
            // Block not indexed yet - this is normal during sync
            return null;
          }
        }
        // Log unexpected errors
        console.warn(`Failed to fetch counts for block ${hash.substring(0, 16)}...: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
      }
    });

    const newResults = await Promise.all(blockPromises);

    // Filter out failed requests
    const successfulNewResults = newResults.filter((r): r is BlockCount => r !== null);

    // Combine cached and newly fetched results
    const allResults = [...cachedResults, ...successfulNewResults];

    return NextResponse.json({
      blocks: allResults,
    });
  } catch (error) {
    console.error("Error in block-counts API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
