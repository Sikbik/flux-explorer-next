/**
 * Blockbook API Client
 *
 * Client for interacting with Blockbook API v2
 * https://github.com/trezor/blockbook/blob/master/docs/api.md
 */

import ky from "ky";
import type {
  Block,
  BlockSummary,
  Transaction,
  AddressInfo,
  NetworkStatus,
} from "@/types/flux-api";
import {
  convertBlockbookTransaction,
  convertBlockbookBlock,
  convertBlockbookBlockSummary,
  convertBlockbookAddress,
  satoshisToFlux,
  parseDifficulty,
} from "./blockbook-utils";
import { parseFluxNodeTransaction, isFluxNodeTransaction, getTierFromCollateral } from "@/lib/flux-tx-parser";
import { getApiConfig } from "./config";

// Blockbook API response types
interface BlockbookApiResponse {
  blockbook: {
    bestHeight: number;
    inSync: boolean;
    mempoolSize?: number;
  };
  backend: {
    blocks: number;
    difficulty: string;
    mempool?: {
      size?: number;
      bytes?: number;
      usage?: number;
      maxmempool?: number;
      mempoolminfee?: number;
    };
    mempoolTxids?: string[];
  };
}

interface BlockbookBlockResponse {
  hash: string;
  size?: number;
  height: number;
  version?: number;
  merkleRoot?: string;
  txs?: Array<BlockbookTransactionResponse>; // Can include full transaction objects
  time?: number;
  nonce?: string;
  bits?: string;
  difficulty: string;
  chainWork?: string;
  confirmations?: number;
  previousBlockHash?: string;
  nextBlockHash?: string;
  reward?: string;
  txCount?: number;
}

interface BlockbookTransactionResponse {
  txid: string;
  version?: number;
  lockTime?: number;
  vin?: Array<{
    txid?: string;
    vout?: number;
    sequence?: number;
    n?: number;
    scriptSig?: { hex: string; asm: string };
    addresses?: string[];
    value?: string;
    coinbase?: string;
  }>;
  vout?: Array<{
    value?: string;
    n: number;
    hex?: string;
    asm?: string;
    addresses?: string[];
    spentTxId?: string;
    spentIndex?: number;
    spentHeight?: number;
  }>;
  blockHash?: string;
  blockHeight?: number;
  confirmations?: number;
  blockTime?: number;
  value?: string;
  size?: number;
  valueIn?: string;
  fees?: string;
  hex?: string;
}

interface BlockbookAddressResponse {
  address: string;
  balance?: string;
  totalReceived?: string;
  totalSent?: string;
  unconfirmedBalance?: string;
  unconfirmedTxs?: number;
  txs?: number;
  transactions?: BlockbookTransactionResponse[];
}

interface BlockbookBlockIndexResponse {
  blockHash: string;
}

interface BlockbookUtxoResponse {
  txid: string;
  vout: number;
  value: string;
  height?: number;
  confirmations?: number;
}

// Support both server-side and client-side API URL configuration
// Server-side (API routes): BLOCKBOOK_API_URL (runtime, for internal component communication)
// Client-side (browser): NEXT_PUBLIC_BLOCKBOOK_API_URL (build-time)
function getApiBaseUrl(): string {
  // Try local URL first (for server-side or when explicitly configured)
  const localUrl = process.env.BLOCKBOOK_API_URL ||
                   process.env.NEXT_PUBLIC_LOCAL_BLOCKBOOK_API_URL;

  // Public fallback URL
  const publicUrl = typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_BLOCKBOOK_API_URL
    : process.env.NEXT_PUBLIC_BLOCKBOOK_API_URL;

  return localUrl || publicUrl || "https://blockbookflux.app.runonflux.io/api/v2";
}

let currentApiBaseUrl = getApiBaseUrl();

/**
 * Create API client with dynamic configuration
 */
function createApiClient() {
  const config = getApiConfig();

  return ky.create({
    prefixUrl: currentApiBaseUrl,
    timeout: config.timeout,
    retry: {
      limit: config.retryLimit,
      methods: ["get"],
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
    },
  });
}

// Initialize API client
let apiClient = createApiClient();

/**
 * Recreate API client with updated configuration
 * Called when API mode changes
 */
export function recreateApiClient(): void {
  apiClient = createApiClient();
  console.log('[Blockbook Client] API client recreated with base URL:', currentApiBaseUrl);
}

/**
 * Update the API base URL and rebuild the client if it changed
 */
export function setApiBaseUrl(newBaseUrl: string | undefined | null): void {
  if (!newBaseUrl || newBaseUrl === currentApiBaseUrl) {
    return;
  }

  currentApiBaseUrl = newBaseUrl;
  recreateApiClient();
}

// Listen for API endpoint changes (from health monitor)
if (typeof window !== 'undefined') {
  window.addEventListener('api-endpoint-changed', (event) => {
    const detail = (event as CustomEvent<{ endpoint?: { url?: string } }>).detail;
    if (detail?.endpoint?.url) {
      setApiBaseUrl(detail.endpoint.url);
    } else {
      recreateApiClient();
    }
  });
}

/**
 * Custom error class for Blockbook API errors
 */
export class BlockbookAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "BlockbookAPIError";
  }
}

function getStatusCode(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status;
  }
  return undefined;
}

/**
 * Blockbook API Client Class
 */
export class BlockbookAPI {
  /**
   * Fetch network status and info
   */
  static async getStatus(): Promise<NetworkStatus> {
    try {
      const response = await apiClient.get("api").json<BlockbookApiResponse>();

      return {
        info: {
          version: 0,
          protocolversion: 0,
          blocks: response.backend.blocks,
          timeoffset: 0,
          connections: 0,
          proxy: "",
          difficulty: parseDifficulty(response.backend.difficulty),
          testnet: false,
          relayfee: 0.00001,
          errors: "",
          network: "livenet",
        },
      };
    } catch (error) {
      throw new BlockbookAPIError(
        "Failed to fetch network status",
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch a block by hash or height
   */
  static async getBlock(hashOrHeight: string | number): Promise<Block> {
    try {
      const response = await apiClient.get(`block/${hashOrHeight}`).json<BlockbookBlockResponse>();
      return convertBlockbookBlock(response);
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch block ${hashOrHeight}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch a block with full transaction details included
   * This is more efficient than fetching block + each transaction separately
   */
  static async getBlockWithTransactions(hashOrHeight: string | number): Promise<{
    block: Block;
    transactions: BlockbookTransactionResponse[];
  }> {
    try {
      // Try to fetch block with transaction details
      const response = await apiClient.get(`block/${hashOrHeight}`).json<BlockbookBlockResponse>();

      return {
        block: convertBlockbookBlock(response),
        transactions: response.txs || [],
      };
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch block with transactions ${hashOrHeight}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch block index/summary by height
   */
  static async getBlockIndex(height: number): Promise<BlockSummary> {
    try {
      const response = await apiClient.get(`block/${height}`).json<BlockbookBlockResponse>();
      return convertBlockbookBlockSummary(response);
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch block index ${height}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Get block hash by height
   */
  static async getBlockHash(height: number): Promise<string> {
    try {
      const response = await apiClient.get(`block-index/${height}`).json<BlockbookBlockIndexResponse>();
      return response.blockHash;
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch block hash for height ${height}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch latest blocks
   * Uses batched fetching with throttling for better performance
   */
  static async getLatestBlocks(limit: number = 10): Promise<BlockSummary[]> {
    try {
      const config = getApiConfig();

      // Get current height first
      const statusResponse = await apiClient.get("api").json<BlockbookApiResponse>();
      const currentHeight = statusResponse.backend.blocks;

      // Fetch blocks starting from current height
      const blocks: BlockSummary[] = [];
      const batchSize = Math.min(config.batchSize, 20); // Use dynamic batch size, cap at 20

      for (let i = 0; i < limit; i += batchSize) {
        const startHeight = currentHeight - i;
        const endHeight = Math.max(currentHeight - i - batchSize + 1, 0);

        // Fetch individual blocks (Blockbook doesn't have bulk endpoint like Insight)
        const blockPromises = [];
        for (let h = startHeight; h >= endHeight && blocks.length < limit; h--) {
          blockPromises.push(
            apiClient
              .get(`block/${h}`)
              .json<BlockbookBlockResponse>()
              .then(convertBlockbookBlockSummary)
          );
        }

        const fetchedBlocks = await Promise.all(blockPromises);
        blocks.push(...fetchedBlocks);

        // Add throttle delay between batches (except for the last batch)
        if (blocks.length < limit && i + batchSize < limit) {
          await new Promise(resolve => setTimeout(resolve, config.throttleDelay));
        }

        if (blocks.length >= limit) break;
      }

      return blocks.slice(0, limit);
    } catch (error) {
      throw new BlockbookAPIError(
        "Failed to fetch latest blocks",
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch a transaction by ID
   *
   * Parses FluxNode-specific data from raw hex for confirmation/update transactions
   */
  static async getTransaction(txid: string): Promise<Transaction> {
    try {
      const response = await apiClient.get(`tx/${txid}`).json<BlockbookTransactionResponse>();
      const tx = convertBlockbookTransaction(response);

      // Check if this is a FluxNode transaction (0 inputs, 0 outputs)
      if (isFluxNodeTransaction(tx) && response.hex) {
        // Parse FluxNode data from raw hex
        const fluxNodeData = parseFluxNodeTransaction(response.hex);

        if (fluxNodeData && fluxNodeData.collateralOutputHash) {
          // Fetch the collateral transaction to determine tier
          try {
            const collateralTx = await apiClient
              .get(`tx/${fluxNodeData.collateralOutputHash}`)
              .json<BlockbookTransactionResponse>();

            // Get the output at the specified index
            const collateralOutput =
              collateralTx.vout?.[fluxNodeData.collateralOutputIndex ?? 0];

            if (collateralOutput?.value) {
              // Convert satoshis to FLUX and determine tier
              const collateralAmount = satoshisToFlux(
                parseInt(collateralOutput.value)
              );
              fluxNodeData.benchmarkTier = getTierFromCollateral(collateralAmount);
            }
          } catch (collateralError) {
            console.error("Failed to fetch collateral transaction:", collateralError);
            // Continue with undefined tier if we can't fetch collateral
          }

          // Merge FluxNode-specific fields
          return {
            ...tx,
            ...fluxNodeData,
          };
        }
      }

      return tx;
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch transaction ${txid}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch raw transaction hex data
   */
  static async getRawTransaction(txid: string): Promise<{ rawtx: string }> {
    try {
      const response = await apiClient.get(`tx-specific/${txid}`).json<{ hex?: string }>();
      // Blockbook returns raw hex in the "hex" field
      return {
        rawtx: response.hex || "",
      };
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch raw transaction ${txid}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch address information
   */
  static async getAddress(address: string): Promise<AddressInfo> {
    try {
      const response = await apiClient
        .get(`address/${address}`, {
          searchParams: {
            details: "txs",
            page: 1,
            pageSize: 1000,
          },
        })
        .json<BlockbookAddressResponse>();

      const converted = convertBlockbookAddress(response);

      // Note: converted.transactions already contains transaction IDs from convertBlockbookAddress
      // The response.transactions contains full transaction objects which we don't need here

      return converted;
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch address ${address}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch address balance
   */
  static async getAddressBalance(address: string): Promise<number> {
    try {
      const response = await apiClient.get(`address/${address}`).json<BlockbookAddressResponse>();
      return satoshisToFlux(response.balance || '0');
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch balance for ${address}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch address total received
   */
  static async getAddressTotalReceived(address: string): Promise<number> {
    try {
      const response = await apiClient.get(`address/${address}`).json<BlockbookAddressResponse>();
      return satoshisToFlux(response.totalReceived || '0');
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch total received for ${address}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch address total sent
   */
  static async getAddressTotalSent(address: string): Promise<number> {
    try {
      const response = await apiClient.get(`address/${address}`).json<BlockbookAddressResponse>();
      return satoshisToFlux(response.totalSent || '0');
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch total sent for ${address}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch address unconfirmed balance
   */
  static async getAddressUnconfirmedBalance(address: string): Promise<number> {
    try {
      const response = await apiClient.get(`address/${address}`).json<BlockbookAddressResponse>();
      return satoshisToFlux(response.unconfirmedBalance || '0');
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch unconfirmed balance for ${address}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch address UTXOs
   */
  static async getAddressUtxos(address: string): Promise<BlockbookUtxoResponse[]> {
    try {
      const response = await apiClient.get(`utxo/${address}`).json<BlockbookUtxoResponse[]>();
      return response || [];
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch UTXOs for ${address}`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch transactions for addresses with pagination and optional block height filtering
   *
   * @param addresses Array of addresses (only first is used)
   * @param params Pagination and filtering parameters:
   *   - from: Starting transaction index (for pagination)
   *   - to: Ending transaction index (for pagination)
   *   - fromBlock: Starting block height (for date filtering)
   *   - toBlock: Ending block height (for date filtering)
   */
  static async getAddressTransactions(
    addresses: string[],
    params?: { from?: number; to?: number; fromBlock?: number; toBlock?: number }
  ): Promise<{ totalItems: number; from: number; to: number; fromIndex: number; toIndex: number; items: Transaction[]; pagesTotal: number }> {
    try {
      // Blockbook API uses single address with pagination
      const address = addresses[0]; // Take first address

      // Calculate page from params
      const from = params?.from || 0;
      const to = params?.to || 25;
      const pageSize = to - from;
      const page = Math.floor(from / pageSize) + 1;

      // Build search params
      const searchParams: Record<string, string> = {
        details: "txs",
        page: page.toString(),
        pageSize: pageSize.toString(),
      };

      // Add block height filtering if provided
      if (params?.fromBlock !== undefined) {
        searchParams.from = params.fromBlock.toString();
      }
      if (params?.toBlock !== undefined) {
        searchParams.to = params.toBlock.toString();
      }

      const response = await apiClient
        .get(`address/${address}`, { searchParams })
        .json<BlockbookAddressResponse>();


      // Convert to expected format
      const items = response.transactions?.map((tx: BlockbookTransactionResponse) =>
        convertBlockbookTransaction(tx)
      ) || [];

      return {
        totalItems: response.txs || 0,
        from,
        to: Math.min(to, response.txs || 0),
        fromIndex: from,
        toIndex: Math.min(to, response.txs || 0),
        items,
        pagesTotal: Math.ceil((response.txs || 0) / pageSize),
      };
    } catch (error) {
      throw new BlockbookAPIError(
        `Failed to fetch transactions for addresses`,
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch sync status
   */
  static async getSyncStatus(): Promise<{ status: string; blockChainHeight: number; syncPercentage: number; height: number; type: string }> {
    try {
      const response = await apiClient.get("api").json<BlockbookApiResponse>();

      return {
        status: response.blockbook.inSync ? "synced" : "syncing",
        blockChainHeight: response.backend.blocks,
        syncPercentage: response.blockbook.inSync ? 100 : 0,
        height: response.blockbook.bestHeight,
        type: "blockbook node",
      };
    } catch (error) {
      throw new BlockbookAPIError(
        "Failed to fetch sync status",
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Fetch current FLUX supply
   */
  static async getSupply(): Promise<number> {
    try {
      // Blockbook doesn't provide supply directly
      // Would need to calculate from blocks or use different source
      return 0;
    } catch (error) {
      throw new BlockbookAPIError(
        "Failed to fetch supply",
        getStatusCode(error),
        error
      );
    }
  }

  /**
   * Estimate transaction fee
   */
  static async estimateFee(_nbBlocks: number = 2): Promise<number> {
    try {
      // Blockbook doesn't provide fee estimation
      // Return a default value
      return 0.00001;
    } catch (error) {
      throw new BlockbookAPIError(
        "Failed to estimate fee",
        getStatusCode(error),
        error
      );
    }
  }
}
