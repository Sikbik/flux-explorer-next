/**
 * Rich List Data Types (copied from explorer)
 */

export interface RichListAddress {
  rank: number;
  address: string;
  balance: number;
  percentage: number;
  txCount: number;
}

export interface RichListData {
  lastUpdate: string; // ISO 8601 timestamp
  lastBlockHeight: number;
  totalSupply: number;
  totalAddresses: number;
  addresses: RichListAddress[];
}

export interface RichListMetadata {
  lastUpdate: string;
  lastBlockHeight: number;
  totalSupply: number;
  totalAddresses: number;
  scanDuration: number; // milliseconds
}

/**
 * Blockbook API response types
 */

export interface BlockbookBlock {
  hash: string;
  height: number;
  time?: number;
  txCount?: number;
  txs?: Array<{ txid: string }>;
}

export interface BlockbookTransaction {
  txid: string;
  vin?: Array<{
    addresses?: string[];
    value?: string;
    coinbase?: string;
  }>;
  vout?: Array<{
    addresses?: string[];
    value?: string;
  }>;
}

export interface BlockbookAddress {
  address: string;
  balance?: string;
  totalReceived?: string;
  totalSent?: string;
  txs?: number;
}

export interface BlockbookStatus {
  blockbook: {
    bestHeight: number;
    inSync: boolean;
  };
  backend: {
    blocks: number;
  };
}

/**
 * Internal scanner state
 */

export interface ScanState {
  lastScannedBlock: number;
  addressBalances: Map<string, number>;
  addressTxCounts: Map<string, number>;
  totalSupply: number;
}
