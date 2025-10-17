/**
 * Flux Blockchain API Client
 * Type-safe client for interacting with the Flux blockchain via Blockbook API.
 */

import { BlockbookAPI, BlockbookAPIError } from "./blockbook-client";
import type {
  Block,
  BlockSummary,
  Transaction,
  AddressInfo,
  NetworkStatus,
  SyncStatus,
  BlockchainStats,
} from "@/types/flux-api";

/**
 * Custom error class for Flux API errors
 */
export class FluxAPIError extends BlockbookAPIError {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message, statusCode, response);
    this.name = "FluxAPIError";
  }
}

/**
 * Flux API Client
 * Main interface for blockchain data access
 */
export class FluxAPI {
  /**
   * Fetch a block by hash or height
   * @param hashOrHeight - Block hash (string) or height (number)
   * @returns Block data
   */
  static async getBlock(hashOrHeight: string | number): Promise<Block> {
    return BlockbookAPI.getBlock(hashOrHeight);
  }

  /**
   * Fetch a block with full transaction details included
   * More efficient than fetching block + each transaction separately
   * @param hashOrHeight - Block hash (string) or height (number)
   * @returns Block and transactions
   */
  static async getBlockWithTransactions(hashOrHeight: string | number) {
    return BlockbookAPI.getBlockWithTransactions(hashOrHeight);
  }

  /**
   * Fetch raw block data
   * @param hashOrHeight - Block hash (string) or height (number)
   * @returns Raw block hex string
   */
  static async getRawBlock(_hashOrHeight: string | number): Promise<{ rawblock: string }> {
    // Blockbook doesn't support raw blocks, return empty
    return { rawblock: '' };
  }

  /**
   * Fetch block index/summary
   * @param height - Block height
   * @returns Block summary
   */
  static async getBlockIndex(height: number): Promise<BlockSummary> {
    return BlockbookAPI.getBlockIndex(height);
  }

  /**
   * Get block hash by height
   * @param height - Block height
   * @returns Block hash
   */
  static async getBlockHash(height: number): Promise<string> {
    return BlockbookAPI.getBlockHash(height);
  }

  /**
   * Fetch latest blocks
   * @param limit - Number of blocks to fetch (default: 10)
   * @returns Array of block summaries
   */
  static async getLatestBlocks(limit: number = 10): Promise<BlockSummary[]> {
    return BlockbookAPI.getLatestBlocks(limit);
  }

  /**
   * Fetch a transaction by ID
   * @param txid - Transaction ID
   * @returns Transaction data
   */
  static async getTransaction(txid: string): Promise<Transaction> {
    return BlockbookAPI.getTransaction(txid);
  }

  /**
   * Fetch raw transaction data
   * @param txid - Transaction ID
   * @returns Raw transaction hex string
   */
  static async getRawTransaction(txid: string): Promise<{ rawtx: string }> {
    return BlockbookAPI.getRawTransaction(txid);
  }

  /**
   * Fetch address information
   * @param address - Flux address
   * @returns Address information including balance and transaction count
   */
  static async getAddress(address: string): Promise<AddressInfo> {
    return BlockbookAPI.getAddress(address);
  }

  /**
   * Fetch address balance
   * @param address - Flux address
   * @returns Balance in FLUX
   */
  static async getAddressBalance(address: string): Promise<number> {
    return BlockbookAPI.getAddressBalance(address);
  }

  /**
   * Fetch address total received
   * @param address - Flux address
   * @returns Total received in FLUX
   */
  static async getAddressTotalReceived(address: string): Promise<number> {
    return BlockbookAPI.getAddressTotalReceived(address);
  }

  /**
   * Fetch address total sent
   * @param address - Flux address
   * @returns Total sent in FLUX
   */
  static async getAddressTotalSent(address: string): Promise<number> {
    return BlockbookAPI.getAddressTotalSent(address);
  }

  /**
   * Fetch address unconfirmed balance
   * @param address - Flux address
   * @returns Unconfirmed balance in FLUX
   */
  static async getAddressUnconfirmedBalance(address: string): Promise<number> {
    return BlockbookAPI.getAddressUnconfirmedBalance(address);
  }

  /**
   * Fetch address UTXOs (Unspent Transaction Outputs)
   * @param address - Flux address
   * @returns Array of UTXOs
   */
  static async getAddressUtxos(address: string): Promise<Array<{
    txid: string;
    vout: number;
    value: string;
    height?: number;
    confirmations?: number;
  }>> {
    return BlockbookAPI.getAddressUtxos(address);
  }

  /**
   * Fetch transactions for multiple addresses
   * @param addresses - Array of Flux addresses
   * @param params - Query parameters:
   *   - from: Starting transaction index (for pagination)
   *   - to: Ending transaction index (for pagination)
   *   - fromBlock: Starting block height (for date filtering)
   *   - toBlock: Ending block height (for date filtering)
   * @returns Paginated transaction list
   */
  static async getAddressTransactions(
    addresses: string[],
    params?: { from?: number; to?: number; fromBlock?: number; toBlock?: number }
  ): Promise<{ totalItems: number; from: number; to: number; fromIndex: number; toIndex: number; items: Transaction[]; pagesTotal: number }> {
    return BlockbookAPI.getAddressTransactions(addresses, params);
  }

  /**
   * Fetch network status
   * @returns Network status and info
   */
  static async getStatus(): Promise<NetworkStatus> {
    return BlockbookAPI.getStatus();
  }

  /**
   * Fetch sync status
   * @returns Sync status
   */
  static async getSyncStatus(): Promise<SyncStatus> {
    const result = await BlockbookAPI.getSyncStatus();
    return {
      status: result.status as "syncing" | "synced" | "error",
      blockChainHeight: result.blockChainHeight,
      syncPercentage: result.syncPercentage,
      height: result.height,
      type: result.type,
    };
  }

  /**
   * Fetch blockchain statistics
   * @param days - Number of days to get stats for
   * @returns Blockchain statistics
   */
  static async getStats(_days?: number): Promise<BlockchainStats> {
    // Blockbook doesn't provide stats, return empty values
    return {
      avgBlockSize: 0,
      avgTransactionPerBlock: 0,
      avgTransactionValue: 0,
      blocks: 0,
      height: 0,
      totalFees: 0,
      totalTransactions: 0,
      totalVolume: 0,
    };
  }

  /**
   * Fetch current supply
   * @returns Current FLUX supply
   */
  static async getSupply(): Promise<number> {
    return BlockbookAPI.getSupply();
  }

  /**
   * Estimate fee for transaction
   * @param nbBlocks - Number of blocks
   * @returns Estimated fee per KB
   */
  static async estimateFee(nbBlocks: number = 2): Promise<number> {
    return BlockbookAPI.estimateFee(nbBlocks);
  }
}
