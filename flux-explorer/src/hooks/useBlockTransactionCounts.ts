import { useState, useEffect } from 'react';
import { Block, Transaction } from '@/types/flux-api';
import { FluxNodeTransaction, isFluxNodeTransaction } from '@/lib/flux-tx-parser';
import { FluxAPI } from '@/lib/api/client';
import { getApiConfig } from '@/lib/api/config';

export interface TransactionCounts {
  coinbase: number;
  transfer: number;
  cumulus: number;
  nimbus: number;
  stratus: number;
  starting: number;
  unknown: number;
  totalFluxSent: number; // Total FLUX transferred in all transactions
}

export interface CategorizedTransaction {
  txid: string;
  type: 'coinbase' | 'transfer' | 'cumulus' | 'nimbus' | 'stratus' | 'starting' | 'unknown';
  index: number;
}

// Module-level cache for block data
let cachedBlockHash: string | null = null;
let cachedCounts: TransactionCounts | null = null;
let cachedTransactions: CategorizedTransaction[] | null = null;
let cachedFullTransactions: (Transaction | null)[] | null = null; // Cache full transaction objects
let fetchPromise: Promise<void> | null = null;

export function useBlockTransactionCounts(block: Block) {
  const [counts, setCounts] = useState<TransactionCounts>({
    coinbase: 0,
    transfer: 0,
    cumulus: 0,
    nimbus: 0,
    stratus: 0,
    starting: 0,
    unknown: 0,
    totalFluxSent: 0,
  });
  const [categorizedTxs, setCategorizedTxs] = useState<CategorizedTransaction[]>([]);
  const [fullTransactions, setFullTransactions] = useState<(Transaction | null)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we have cached data for this block, use it immediately
    if (cachedBlockHash === block.hash && cachedCounts && cachedTransactions && cachedFullTransactions) {
      setCounts(cachedCounts);
      setCategorizedTxs(cachedTransactions);
      setFullTransactions(cachedFullTransactions);
      setLoading(false);
      return;
    }

    // If there's already a fetch in progress for this block, wait for it
    if (fetchPromise && cachedBlockHash === block.hash) {
      fetchPromise.then(() => {
        if (cachedCounts && cachedTransactions && cachedFullTransactions) {
          setCounts(cachedCounts);
          setCategorizedTxs(cachedTransactions);
          setFullTransactions(cachedFullTransactions);
          setLoading(false);
        }
      });
      return;
    }

    const categorizeTransactions = async () => {
      setLoading(true);

      //  Fetch transactions with FluxAPI.getTransaction() which includes tier detection
      // This properly handles FluxNode tier determination by fetching collateral transactions
      const config = getApiConfig();
      const batchSize = Math.min(config.batchSize, 50);
      const allTxData: (Transaction | null)[] = [];

      for (let i = 0; i < block.tx.length; i += batchSize) {
        const batchTxids = block.tx.slice(i, i + batchSize);
        const batchPromises = batchTxids.map(txid =>
          FluxAPI.getTransaction(txid).catch(() => null)
        );

        const batchResults = await Promise.all(batchPromises);
        allTxData.push(...batchResults);

        // Add throttle delay between batches (except for the last batch)
        if (i + batchSize < block.tx.length) {
          await new Promise(resolve => setTimeout(resolve, config.throttleDelay));
        }
      }

      const categorized: CategorizedTransaction[] = [];
      const newCounts: TransactionCounts = {
        coinbase: 0,
        transfer: 0,
        cumulus: 0,
        nimbus: 0,
        stratus: 0,
        starting: 0,
        unknown: 0,
        totalFluxSent: 0,
      };

      allTxData.forEach((tx, idx) => {
        const txid = block.tx[idx];
        if (!tx) {
          categorized.push({ txid, type: 'transfer', index: idx });
          newCounts.transfer++;
          return;
        }

        // Add to total FLUX sent (valueOut from each transaction)
        newCounts.totalFluxSent += tx.valueOut || 0;

        // First transaction is always coinbase
        if (idx === 0) {
          categorized.push({ txid, type: 'coinbase', index: idx });
          newCounts.coinbase++;
        } else if (isFluxNodeTransaction(tx)) {
          const fluxTx = tx as Transaction & Partial<FluxNodeTransaction>;
          const tier = fluxTx.benchmarkTier?.toUpperCase();
          const isStarting = fluxTx.type?.toLowerCase().includes('starting');

          if (tier === 'CUMULUS') {
            categorized.push({ txid, type: 'cumulus', index: idx });
            newCounts.cumulus++;
          } else if (tier === 'NIMBUS') {
            categorized.push({ txid, type: 'nimbus', index: idx });
            newCounts.nimbus++;
          } else if (tier === 'STRATUS') {
            categorized.push({ txid, type: 'stratus', index: idx });
            newCounts.stratus++;
          } else if (isStarting || !tier || tier === 'UNKNOWN') {
            categorized.push({ txid, type: 'starting', index: idx });
            newCounts.starting++;
          } else {
            categorized.push({ txid, type: 'unknown', index: idx });
            newCounts.unknown++;
          }
        } else {
          categorized.push({ txid, type: 'transfer', index: idx });
          newCounts.transfer++;
        }
      });

      // Cache the results
      cachedBlockHash = block.hash;
      cachedCounts = newCounts;
      cachedTransactions = categorized;
      cachedFullTransactions = allTxData; // Cache the full transaction objects

      setCategorizedTxs(categorized);
      setCounts(newCounts);
      setFullTransactions(allTxData);
      setLoading(false);
    };

    // Store the promise so other components can wait for it
    fetchPromise = categorizeTransactions();
    fetchPromise.finally(() => {
      fetchPromise = null;
    });
  }, [block.tx, block.hash]);

  return { counts, categorizedTxs, fullTransactions, loading };
}
