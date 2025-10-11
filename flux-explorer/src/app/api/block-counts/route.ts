import { NextRequest, NextResponse } from "next/server";
import { InsightAPI } from "@/lib/api/client";
import { isFluxNodeTransaction, FluxNodeTransaction } from "@/lib/flux-tx-parser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BlockCount {
  hash: string;
  height: number;
  regularTxCount: number;
  nodeConfirmationCount: number;
}

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

    // Fetch all blocks in parallel
    const blockPromises = hashes.map(async (hash) => {
      try {
        // Fetch block details to get transaction IDs
        const block = await InsightAPI.getBlock(hash);

        if (!block.tx || block.tx.length === 0) {
          return {
            hash,
            height: block.height,
            regularTxCount: 0,
            nodeConfirmationCount: 0,
          };
        }

        // Fetch all transactions for this block in parallel
        const txPromises = block.tx.map((txid) =>
          InsightAPI.getTransaction(txid).catch(() => null)
        );
        const transactions = await Promise.all(txPromises);

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

        return {
          hash,
          height: block.height,
          regularTxCount: regularCount,
          nodeConfirmationCount: nodeCount,
          tierCounts,
        };
      } catch (error) {
        console.error(`Failed to fetch counts for block ${hash}:`, error);
        // Return null for failed blocks so we can filter them out
        return null;
      }
    });

    const results = await Promise.all(blockPromises);

    // Filter out failed requests
    const successfulResults = results.filter((r): r is BlockCount => r !== null);

    return NextResponse.json({
      blocks: successfulResults,
    });
  } catch (error) {
    console.error("Error in block-counts API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
