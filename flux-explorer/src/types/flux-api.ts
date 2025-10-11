/**
 * Flux Insight API Type Definitions
 * These types match the responses from the Flux insight-api service
 */

// ============================================================================
// Block Types
// ============================================================================

export interface Block {
  hash: string;
  size: number;
  height: number;
  version: number;
  merkleroot: string;
  tx: string[]; // Array of transaction IDs
  time: number;
  nonce: string;
  bits: string;
  difficulty: number;
  chainwork: string;
  confirmations: number;
  previousblockhash?: string;
  nextblockhash?: string;
  reward: number;
  isMainChain: boolean;
  poolInfo?: {
    poolName: string;
    url: string;
  };
  // FluxNode miner information (PoUW)
  miner?: string; // Wallet address of the miner
  nodeTier?: "CUMULUS" | "NIMBUS" | "STRATUS"; // FluxNode tier
}

export interface BlockSummary {
  hash: string;
  height: number;
  time: number;
  txlength: number;
  size: number;
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface TransactionInput {
  txid: string;
  vout: number;
  sequence: number;
  n: number;
  scriptSig: {
    hex: string;
    asm: string;
  };
  addr?: string;
  valueSat: number;
  value: number;
  doubleSpentTxID?: string;
}

export interface TransactionOutput {
  value: string;
  n: number;
  scriptPubKey: {
    hex: string;
    asm: string;
    addresses?: string[];
    type: string;
  };
  spentTxId?: string;
  spentIndex?: number;
  spentHeight?: number;
}

export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: TransactionInput[];
  vout: TransactionOutput[];
  blockhash?: string;
  blockheight?: number;
  confirmations: number;
  time?: number;
  blocktime?: number;
  valueOut: number;
  size: number;
  valueIn: number;
  fees: number;
}

// ============================================================================
// Address Types
// ============================================================================

export interface AddressTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: TransactionInput[];
  vout: TransactionOutput[];
  blockhash: string;
  blockheight: number;
  confirmations: number;
  time: number;
  blocktime: number;
  valueOut: number;
  size: number;
  valueIn: number;
  fees: number;
}

export interface AddressInfo {
  addrStr: string;
  balance: number;
  balanceSat: number;
  totalReceived: number;
  totalReceivedSat: number;
  totalSent: number;
  totalSentSat: number;
  unconfirmedBalance: number;
  unconfirmedBalanceSat: number;
  unconfirmedTxApperances: number;
  txApperances: number;
  transactions: string[]; // Array of transaction IDs
}

export interface AddressUTXO {
  address: string;
  txid: string;
  vout: number;
  scriptPubKey: string;
  amount: number;
  satoshis: number;
  height: number;
  confirmations: number;
}

// ============================================================================
// Network/Status Types
// ============================================================================

export interface NetworkStatus {
  info: {
    version: number;
    protocolversion: number;
    blocks: number;
    timeoffset: number;
    connections: number;
    proxy: string;
    difficulty: number;
    testnet: boolean;
    relayfee: number;
    errors: string;
    network: string;
  };
}

export interface SyncStatus {
  status: "syncing" | "synced" | "error";
  blockChainHeight: number;
  syncPercentage: number;
  height: number;
  error?: string;
  type: string;
}

// ============================================================================
// Statistics Types
// ============================================================================

export interface BlockchainStats {
  avgBlockSize: number;
  avgTransactionPerBlock: number;
  avgTransactionValue: number;
  blocks: number;
  height: number;
  totalFees: number;
  totalTransactions: number;
  totalVolume: number;
}

export interface Supply {
  supply: number;
}

// ============================================================================
// API Error Types
// ============================================================================

export interface ApiError {
  message: string;
  code?: number;
  details?: unknown;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginatedResponse<T> {
  pagesTotal: number;
  items: T[];
}

export interface QueryParams {
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}
