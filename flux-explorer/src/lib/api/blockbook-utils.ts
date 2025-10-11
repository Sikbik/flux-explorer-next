/**
 * Blockbook API Utilities
 *
 * Conversion utilities for Blockbook API responses
 */

import type { Transaction, Block, BlockSummary, AddressInfo } from "@/types/flux-api";

// Blockbook response types
interface BlockbookTransactionVin {
  txid?: string;
  vout?: number;
  sequence?: number;
  n?: number;
  scriptSig?: { hex: string; asm: string };
  addresses?: string[];
  value?: string;
  coinbase?: string;
}

interface BlockbookTransactionVout {
  value?: string;
  n: number;
  hex?: string;
  asm?: string;
  addresses?: string[];
  spentTxId?: string;
  spentIndex?: number;
  spentHeight?: number;
}

interface BlockbookTransaction {
  txid: string;
  version?: number;
  lockTime?: number;
  vin?: BlockbookTransactionVin[];
  vout?: BlockbookTransactionVout[];
  blockHash?: string;
  blockHeight?: number;
  confirmations?: number;
  blockTime?: number;
  value?: string;
  size?: number;
  valueIn?: string;
  fees?: string;
}

interface BlockbookBlock {
  hash: string;
  size?: number;
  height: number;
  version?: number;
  merkleRoot?: string;
  txs?: Array<{ txid: string; vout?: BlockbookTransactionVout[] }>;
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

interface BlockbookAddress {
  address: string;
  balance?: string;
  totalReceived?: string;
  totalSent?: string;
  unconfirmedBalance?: string;
  unconfirmedTxs?: number;
  txs?: number;
  transactions?: Array<{ txid: string }>;
}

/**
 * Convert satoshis (as string) to FLUX
 * Blockbook returns values as satoshi strings
 */
export function satoshisToFlux(satoshis: string | number): number {
  const value = typeof satoshis === 'string' ? parseInt(satoshis) : satoshis;
  return value / 100000000;
}

/**
 * Convert FLUX to satoshis (as string)
 */
export function fluxToSatoshis(flux: number): string {
  return Math.floor(flux * 100000000).toString();
}

/**
 * Parse difficulty from string to number
 * Blockbook returns difficulty as string
 */
export function parseDifficulty(difficulty: string): number {
  return parseFloat(difficulty);
}

/**
 * Convert Blockbook transaction to our Transaction type
 */
export function convertBlockbookTransaction(bbTx: BlockbookTransaction): Transaction {
  return {
    txid: bbTx.txid,
    version: bbTx.version || 0,
    locktime: bbTx.lockTime || 0,
    vin: bbTx.vin?.map((input: BlockbookTransactionVin) => ({
      txid: input.txid || '',
      vout: input.vout || 0,
      sequence: input.sequence || 0,
      n: input.n || 0,
      scriptSig: input.scriptSig || { hex: '', asm: '' },
      addr: input.addresses?.[0],
      valueSat: input.value ? parseInt(input.value) : 0,
      value: input.value ? satoshisToFlux(input.value) : 0,
      coinbase: input.coinbase,
    })) || [],
    vout: bbTx.vout?.map((output: BlockbookTransactionVout) => ({
      value: (output.value ? satoshisToFlux(output.value) : 0).toString(),
      n: output.n,
      scriptPubKey: {
        hex: output.hex || '',
        asm: output.asm || '',
        addresses: output.addresses,
        type: 'unknown',
      },
      spentTxId: output.spentTxId,
      spentIndex: output.spentIndex,
      spentHeight: output.spentHeight,
    })) || [],
    blockhash: bbTx.blockHash,
    blockheight: bbTx.blockHeight,
    confirmations: bbTx.confirmations || 0,
    time: bbTx.blockTime || 0,
    blocktime: bbTx.blockTime || 0,
    valueOut: bbTx.value ? satoshisToFlux(bbTx.value) : 0,
    size: bbTx.size || 0,
    valueIn: bbTx.valueIn ? satoshisToFlux(bbTx.valueIn) : 0,
    fees: bbTx.fees ? satoshisToFlux(bbTx.fees) : 0,
  };
}

/**
 * Convert Blockbook block to our Block type
 */
export function convertBlockbookBlock(bbBlock: BlockbookBlock): Block {
  return {
    hash: bbBlock.hash,
    size: bbBlock.size || 0,
    height: bbBlock.height,
    version: bbBlock.version || 0,
    merkleroot: bbBlock.merkleRoot || '',
    tx: bbBlock.txs?.map((tx: { txid: string }) => tx.txid) || [],
    time: bbBlock.time || 0,
    nonce: bbBlock.nonce || '0',
    bits: bbBlock.bits || '',
    difficulty: parseDifficulty(bbBlock.difficulty),
    chainwork: bbBlock.chainWork || '',
    confirmations: bbBlock.confirmations || 0,
    previousblockhash: bbBlock.previousBlockHash,
    nextblockhash: bbBlock.nextBlockHash,
    reward: bbBlock.reward ? satoshisToFlux(bbBlock.reward) : 0,
    isMainChain: true,
  };
}

/**
 * Convert Blockbook block summary to our BlockSummary type
 */
export function convertBlockbookBlockSummary(bbBlock: BlockbookBlock): BlockSummary {
  return {
    height: bbBlock.height,
    hash: bbBlock.hash,
    time: bbBlock.time || 0,
    txlength: bbBlock.txCount || 0,
    size: bbBlock.size || 0,
  };
}

/**
 * Convert Blockbook address to our Address type
 */
export function convertBlockbookAddress(bbAddr: BlockbookAddress): AddressInfo {
  return {
    addrStr: bbAddr.address,
    balance: satoshisToFlux(bbAddr.balance || '0'),
    balanceSat: parseInt(bbAddr.balance || '0'),
    totalReceived: satoshisToFlux(bbAddr.totalReceived || '0'),
    totalReceivedSat: parseInt(bbAddr.totalReceived || '0'),
    totalSent: satoshisToFlux(bbAddr.totalSent || '0'),
    totalSentSat: parseInt(bbAddr.totalSent || '0'),
    unconfirmedBalance: satoshisToFlux(bbAddr.unconfirmedBalance || '0'),
    unconfirmedBalanceSat: parseInt(bbAddr.unconfirmedBalance || '0'),
    unconfirmedTxApperances: bbAddr.unconfirmedTxs || 0,
    txApperances: bbAddr.txs || 0,
    transactions: bbAddr.transactions?.map((tx: { txid: string }) => tx.txid) || [],
  };
}
