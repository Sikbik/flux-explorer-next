/**
 * API Route for 24-hour transaction count
 *
 * This server-side API route calculates the total transaction count
 * for the last 24 hours (720 blocks) efficiently using parallel fetching
 */

import { NextResponse } from "next/server";

// Cache the result for 5 minutes
let cachedData: {
  totalTransactions: number;
  regularTransactions: number;
  nodeConfirmations: number;
  blocks: number;
  timeRange: number;
  timestamp: number;
} | null = null;

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const BLOCKBOOK_API = "https://blockbookflux.app.runonflux.io/api/v2";

export async function GET() {
  try {
    // Return cached data if still valid
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        totalTransactions: cachedData.totalTransactions,
        regularTransactions: cachedData.regularTransactions,
        nodeConfirmations: cachedData.nodeConfirmations,
        blocks: cachedData.blocks,
        timeRange: cachedData.timeRange,
        cached: true,
      });
    }

    // Get current block height
    const statusResponse = await fetch(`${BLOCKBOOK_API}/api`);
    const statusData = await statusResponse.json();
    const currentHeight = statusData.backend.blocks;

    // Calculate 24 hours ago (720 blocks at 120 seconds per block)
    const targetBlocks = 720;
    const startHeight = currentHeight;
    const endHeight = Math.max(currentHeight - targetBlocks, 0);
    const blockCount = startHeight - endHeight;

    // Fetch blocks in large parallel batches for maximum speed
    const batchSize = 100; // Fetch 100 blocks at a time
    let totalTransactions = 0;
    let regularTransactions = 0;
    let nodeConfirmations = 0;
    const allPromises: Promise<{ total: number; regular: number; nodes: number }>[] = [];

    // Helper function to check if transaction is a FluxNode confirmation
    const isFluxNodeTx = (tx: { vin?: unknown[]; vout?: unknown[] }) => {
      return tx.vin && tx.vout && Array.isArray(tx.vin) && Array.isArray(tx.vout) && tx.vin.length === 0 && tx.vout.length === 0;
    };

    // Create all fetch promises upfront
    for (let height = endHeight; height <= startHeight; height++) {
      allPromises.push(
        fetch(`${BLOCKBOOK_API}/block/${height}`)
          .then(res => res.json())
          .then(block => {
            if (!block.txs || !Array.isArray(block.txs)) return { total: 0, regular: 0, nodes: 0 };
            const total = block.txs.length;
            const nodeTxs = block.txs.filter((tx: { vin?: unknown[]; vout?: unknown[] }) => isFluxNodeTx(tx));
            const nodes = nodeTxs.length;
            const regular = total - nodes;
            return { total, regular, nodes };
          })
          .catch(() => ({ total: 0, regular: 0, nodes: 0 })) // Gracefully handle errors
      );
    }

    // Execute in batches to avoid overwhelming the API
    for (let i = 0; i < allPromises.length; i += batchSize) {
      const batch = allPromises.slice(i, i + batchSize);
      const results = await Promise.all(batch);
      results.forEach(result => {
        totalTransactions += result.total;
        regularTransactions += result.regular;
        nodeConfirmations += result.nodes;
      });
    }

    // Get first and last block for time range
    const [firstBlock, lastBlock] = await Promise.all([
      fetch(`${BLOCKBOOK_API}/block/${startHeight}`).then(res => res.json()),
      fetch(`${BLOCKBOOK_API}/block/${endHeight}`).then(res => res.json()),
    ]);

    const timeRange = firstBlock.time - lastBlock.time;

    // Cache the result
    cachedData = {
      totalTransactions,
      regularTransactions,
      nodeConfirmations,
      blocks: blockCount,
      timeRange,
      timestamp: Date.now(),
    };

    return NextResponse.json({
      totalTransactions,
      regularTransactions,
      nodeConfirmations,
      blocks: blockCount,
      timeRange,
      cached: false,
    });
  } catch (error) {
    console.error("Failed to calculate 24h transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction data" },
      { status: 500 }
    );
  }
}
