/**
 * Flux Blockchain Scanner
 *
 * Scans the Flux blockchain to generate a rich list of addresses sorted by balance.
 * Uses incremental scanning to efficiently update the list without re-scanning the entire chain.
 * Now with dynamic configuration based on API type (local vs public).
 */

import * as fs from "fs/promises";
import * as path from "path";
import ky from "ky";
import type {
  RichListData,
  RichListAddress,
  ScanState,
  BlockbookBlock,
  BlockbookTransaction,
  BlockbookStatus,
} from "./types";
import { getScannerConfig, initializeConfig, getApiMode } from "./config";

// Initialize configuration on startup
initializeConfig();

const BLOCKBOOK_API_URL =
  process.env.BLOCKBOOK_API_URL || "http://fluxblockbook_explorertest2:9158/api/v2";
const DATA_DIR = process.env.DATA_DIR || "/data";
const STATE_FILE = path.join(DATA_DIR, "scan-state.json");
const RICH_LIST_FILE = path.join(DATA_DIR, "rich-list.json");
const MIN_BALANCE = parseFloat(process.env.MIN_BALANCE || "1"); // Only include addresses with >= 1 FLUX

// Get dynamic configuration values
const config = getScannerConfig();
const BATCH_SIZE = config.batchSize;
const CHECKPOINT_INTERVAL = config.checkpointInterval;
const THROTTLE_DELAY = config.throttleDelay;

console.log('[Scanner] Configuration loaded:');
console.log(`  - Mode: ${getApiMode().toUpperCase()}`);
console.log(`  - API URL: ${BLOCKBOOK_API_URL}`);
console.log(`  - Batch size: ${BATCH_SIZE} blocks`);
console.log(`  - Throttle delay: ${THROTTLE_DELAY}ms`);
console.log(`  - Checkpoint interval: ${CHECKPOINT_INTERVAL} blocks`);
console.log(`  - Timeout: ${config.timeout}ms`);
console.log(`  - Retry limit: ${config.retryLimit}`);

const apiClient = ky.create({
  prefixUrl: BLOCKBOOK_API_URL,
  timeout: config.timeout,
  retry: {
    limit: config.retryLimit,
    methods: ["get"],
    statusCodes: [408, 413, 429, 500, 502, 503, 504],
  },
});

/**
 * Convert satoshis to FLUX
 */
function satoshisToFlux(satoshis: string | number): number {
  const value = typeof satoshis === "string" ? parseInt(satoshis) : satoshis;
  return value / 100000000;
}

/**
 * Load scan state from disk
 */
async function loadScanState(): Promise<ScanState> {
  try {
    const data = await fs.readFile(STATE_FILE, "utf-8");
    const state = JSON.parse(data);

    return {
      lastScannedBlock: state.lastScannedBlock || 0,
      addressBalances: new Map(Object.entries(state.addressBalances || {})),
      addressTxCounts: new Map(Object.entries(state.addressTxCounts || {})),
      totalSupply: state.totalSupply || 0,
    };
  } catch (error) {
    console.log("No existing scan state found, starting fresh scan from genesis");
    return {
      lastScannedBlock: 0,
      addressBalances: new Map(),
      addressTxCounts: new Map(),
      totalSupply: 0,
    };
  }
}

/**
 * Save scan state to disk
 */
async function saveScanState(state: ScanState): Promise<void> {
  const data = {
    lastScannedBlock: state.lastScannedBlock,
    addressBalances: Object.fromEntries(state.addressBalances),
    addressTxCounts: Object.fromEntries(state.addressTxCounts),
    totalSupply: state.totalSupply,
  };

  await fs.writeFile(STATE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Get current blockchain height
 */
async function getCurrentHeight(): Promise<number> {
  const status = await apiClient.get("api").json<BlockbookStatus>();
  return status.backend.blocks;
}

/**
 * Fetch a block with all transactions
 */
async function fetchBlock(height: number): Promise<BlockbookBlock & { txs: BlockbookTransaction[] }> {
  const block = await apiClient.get(`block/${height}`).json<BlockbookBlock>();

  // Fetch all transactions in the block
  const txPromises = (block.txs || []).map(async (tx) => {
    return apiClient.get(`tx/${tx.txid}`).json<BlockbookTransaction>();
  });

  const transactions = await Promise.all(txPromises);

  return {
    ...block,
    txs: transactions,
  };
}

/**
 * Process a single transaction and update balances
 */
function processTransaction(tx: BlockbookTransaction, state: ScanState): void {
  const addressDeltas = new Map<string, number>();

  // Process inputs (money being spent)
  if (tx.vin) {
    for (const input of tx.vin) {
      // Skip coinbase transactions (no inputs)
      if (input.coinbase) continue;

      if (input.addresses && input.value) {
        const amount = satoshisToFlux(input.value);
        for (const address of input.addresses) {
          const current = addressDeltas.get(address) || 0;
          addressDeltas.set(address, current - amount);

          // Increment tx count
          const txCount = state.addressTxCounts.get(address) || 0;
          state.addressTxCounts.set(address, txCount + 1);
        }
      }
    }
  }

  // Process outputs (money being received)
  if (tx.vout) {
    for (const output of tx.vout) {
      if (output.addresses && output.value) {
        const amount = satoshisToFlux(output.value);
        for (const address of output.addresses) {
          const current = addressDeltas.get(address) || 0;
          addressDeltas.set(address, current + amount);

          // Increment tx count if not already counted from inputs
          if (!addressDeltas.has(address) || addressDeltas.get(address)! >= 0) {
            const txCount = state.addressTxCounts.get(address) || 0;
            state.addressTxCounts.set(address, txCount + 1);
          }
        }
      }
    }
  }

  // Apply balance changes
  for (const [address, delta] of addressDeltas) {
    const currentBalance = state.addressBalances.get(address) || 0;
    const newBalance = currentBalance + delta;

    if (newBalance > 0) {
      state.addressBalances.set(address, newBalance);
    } else {
      // Remove addresses with zero or negative balance
      state.addressBalances.delete(address);
      state.addressTxCounts.delete(address);
    }
  }
}

/**
 * Process a single block and update state
 */
async function processBlock(height: number, state: ScanState): Promise<void> {
  const block = await fetchBlock(height);

  for (const tx of block.txs) {
    processTransaction(tx, state);
  }

  state.lastScannedBlock = height;
}

/**
 * Generate rich list from current state
 */
async function generateRichList(state: ScanState, currentHeight: number): Promise<RichListData> {
  const allAddresses = Array.from(state.addressBalances.entries());

  // Calculate total supply from every tracked address (before applying filters)
  const totalSupply = allAddresses.reduce((sum, [, balance]) => sum + balance, 0);

  // Filter addresses by minimum balance and sort by balance descending
  const sortedAddresses = allAddresses
    .filter(([_, balance]) => balance >= MIN_BALANCE)
    .sort((a, b) => b[1] - a[1]);

  // Build rich list with rankings
  const addresses: RichListAddress[] = sortedAddresses.map(([address, balance], index) => ({
    rank: index + 1,
    address,
    balance,
    percentage: totalSupply > 0 ? (balance / totalSupply) * 100 : 0,
    txCount: state.addressTxCounts.get(address) || 0,
  }));

  // Persist the full supply for future checkpoints/state persistence
  state.totalSupply = totalSupply;

  return {
    lastUpdate: new Date().toISOString(),
    lastBlockHeight: currentHeight,
    totalSupply,
    totalAddresses: addresses.length,
    addresses,
  };
}

/**
 * Main scan function
 */
export async function scanBlockchain(): Promise<void> {
  console.log("🔍 Starting blockchain scan...");
  const startTime = Date.now();

  try {
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Load existing state or start fresh
    const state = await loadScanState();
    console.log(`📂 Loaded state: last scanned block ${state.lastScannedBlock}`);

    // Get current blockchain height
    const currentHeight = await getCurrentHeight();
    console.log(`📊 Current blockchain height: ${currentHeight}`);

    if (state.lastScannedBlock >= currentHeight) {
      console.log("✅ Already up to date!");
      return;
    }

    const blocksToScan = currentHeight - state.lastScannedBlock;
    console.log(`🔄 Need to scan ${blocksToScan} blocks (${state.lastScannedBlock + 1} → ${currentHeight})`);

    // Scan blocks in batches
    let blocksProcessed = 0;
    for (let height = state.lastScannedBlock + 1; height <= currentHeight; height++) {
      try {
        await processBlock(height, state);
        blocksProcessed++;

        // Progress update
        if (blocksProcessed % 10 === 0) {
          const progress = ((height - state.lastScannedBlock) / blocksToScan) * 100;
          console.log(`⏳ Progress: ${progress.toFixed(2)}% (block ${height}/${currentHeight})`);
        }

        // Save checkpoint
        if (blocksProcessed % CHECKPOINT_INTERVAL === 0) {
          await saveScanState(state);
          console.log(`💾 Checkpoint saved at block ${height}`);
        }

        // Throttle to avoid overwhelming API (dynamic based on config)
        if (blocksProcessed % BATCH_SIZE === 0) {
          await new Promise((resolve) => setTimeout(resolve, THROTTLE_DELAY));
        }
      } catch (error) {
        console.error(`❌ Error processing block ${height}:`, error);
        // Save state before exiting
        await saveScanState(state);
        throw error;
      }
    }

    // Save final state
    await saveScanState(state);
    console.log("💾 Final state saved");

    // Generate and save rich list
    console.log("📝 Generating rich list...");
    const richList = await generateRichList(state, currentHeight);
    await fs.writeFile(RICH_LIST_FILE, JSON.stringify(richList, null, 2), "utf-8");
    console.log(`✅ Rich list saved: ${richList.totalAddresses} addresses with balance >= ${MIN_BALANCE} FLUX`);

    const duration = (Date.now() - startTime) / 1000;
    console.log(`⏱️  Scan completed in ${duration.toFixed(2)} seconds`);
  } catch (error) {
    console.error("❌ Scan failed:", error);
    throw error;
  }
}

// Run scan if executed directly
if (require.main === module) {
  scanBlockchain()
    .then(() => {
      console.log("✅ Scan completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Scan failed:", error);
      process.exit(1);
    });
}
