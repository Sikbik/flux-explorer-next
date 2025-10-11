/**
 * Insight API Hooks - Barrel Export
 *
 * Exports all React Query hooks for easy importing
 */

// Block hooks
export {
  useBlock,
  useRawBlock,
  useBlockIndex,
  useLatestBlocks,
  blockKeys,
} from "./useBlocks";

// Transaction hooks
export {
  useTransaction,
  useRawTransaction,
  useTransactions,
  transactionKeys,
} from "./useTransactions";

// Address hooks
export {
  useAddress,
  useAddressBalance,
  useAddressTotalReceived,
  useAddressTotalSent,
  useAddressUnconfirmedBalance,
  useAddressUtxos,
  useAddressTransactions,
  addressKeys,
} from "./useAddress";

// Network hooks
export {
  useNetworkStatus,
  useSyncStatus,
  useBlockchainStats,
  useSupply,
  useEstimateFee,
  networkKeys,
} from "./useNetwork";
