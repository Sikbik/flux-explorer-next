/**
 * Rich List Data Types
 *
 * Shared types for rich list data structure used by both scanner and explorer
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
