"use client";

import { Transaction, TransactionInput, TransactionOutput } from "@/types/flux-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { ArrowRight, Coins, Lock, CheckCircle } from "lucide-react";

interface TransactionInputsOutputsProps {
  transaction: Transaction;
}

export function TransactionInputsOutputs({ transaction }: TransactionInputsOutputsProps) {
  const isCoinbase = transaction.vin.length > 0 && (!transaction.vin[0].txid || transaction.vin[0].txid === undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inputs & Outputs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] items-start">
          {/* INPUTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Inputs ({transaction.vin.length})
              </h3>
              {!isCoinbase && (
                <Badge variant="outline">{transaction.valueIn.toFixed(8)} FLUX</Badge>
              )}
            </div>

            {isCoinbase ? (
              <CoinbaseInput />
            ) : (
              transaction.vin.map((input, index) => (
                <InputCard key={`${input.txid}-${input.vout}`} input={input} index={index} />
              ))
            )}
          </div>

          {/* ARROW */}
          <div className="hidden lg:flex items-center justify-center py-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
              <ArrowRight className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* OUTPUTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Outputs ({transaction.vout.length})
              </h3>
              <Badge variant="outline">{transaction.valueOut.toFixed(8)} FLUX</Badge>
            </div>

            {transaction.vout.map((output, index) => (
              <OutputCard key={`${output.n}`} output={output} index={index} isCoinbase={isCoinbase} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CoinbaseInput() {
  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors border-primary/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Coins className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-base">Coinbase</div>
          <p className="text-xs text-muted-foreground">Newly Generated Coins</p>
        </div>
      </div>
      <div className="pt-3 border-t border-border/50">
        <p className="text-sm text-muted-foreground leading-relaxed">
          This is a coinbase transaction that generates new coins as a block reward for mining.
        </p>
      </div>
    </div>
  );
}

interface InputCardProps {
  input: TransactionInput;
  index: number;
}

function InputCard({ input, index }: InputCardProps) {
  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="space-y-2">
        {/* Index and Value */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary">#{index}</Badge>
          <span className="font-mono text-sm font-semibold">
            {input.value.toFixed(8)} FLUX
          </span>
        </div>

        {/* Address */}
        {input.addr && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">From Address</p>
            <div className="flex items-center gap-1">
              <a
                href={`/address/${input.addr}`}
                className="font-mono text-sm text-primary hover:underline truncate"
              >
                {input.addr}
              </a>
              <CopyButton text={input.addr} />
            </div>
          </div>
        )}

        {/* Previous Transaction */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Previous Output</p>
          <div className="flex items-center gap-1">
            <a
              href={`/tx/${input.txid}`}
              className="font-mono text-xs text-primary hover:underline truncate"
            >
              {input.txid}
            </a>
            <span className="text-xs text-muted-foreground">:{input.vout}</span>
            <CopyButton text={input.txid} />
          </div>
        </div>

        {/* Sequence */}
        {input.sequence !== 4294967295 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Sequence:</span>
            <span className="font-mono">{input.sequence}</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface OutputCardProps {
  output: TransactionOutput;
  index: number;
  isCoinbase?: boolean;
}

function OutputCard({ output, index, isCoinbase = false }: OutputCardProps) {
  const isSpent = output.spentTxId !== undefined;
  const addresses = output.scriptPubKey.addresses || [];

  // Tier detection for coinbase transactions
  const getTierInfo = (amount: number): { tier: string; colorClass: string } | null => {
    if (!isCoinbase) return null;

    if (amount >= 11.24 && amount <= 11.26) {
      return { tier: 'STRATUS', colorClass: 'bg-blue-500' };
    } else if (amount >= 4.68 && amount <= 4.69) {
      return { tier: 'NIMBUS', colorClass: 'bg-purple-500' };
    } else if (amount >= 2.81 && amount <= 2.82) {
      return { tier: 'CUMULUS', colorClass: 'bg-pink-500' };
    } else if (amount > 0) {
      return { tier: 'MINER', colorClass: 'bg-amber-500' };
    }

    return null;
  };

  const amount = parseFloat(output.value);
  const tierInfo = getTierInfo(amount);

  return (
    <div className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="space-y-2">
        {/* Index, Value, and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">#{index}</Badge>
            {isSpent ? (
              <Badge variant="outline" className="gap-1 text-xs">
                <CheckCircle className="h-3 w-3" />
                Spent
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs border-green-500 text-green-600">
                <Lock className="h-3 w-3" />
                UTXO
              </Badge>
            )}
            {/* Tier Badge for Coinbase Transactions */}
            {tierInfo && (
              <Badge className={`text-xs text-white ${tierInfo.colorClass}`}>
                {tierInfo.tier}
              </Badge>
            )}
          </div>
          <span className="font-mono text-sm font-semibold">
            {amount.toFixed(8)} FLUX
          </span>
        </div>

        {/* Address or OP_RETURN */}
        {addresses.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              {output.scriptPubKey.type === 'nulldata' || addresses[0]?.startsWith('OP_RETURN') ? 'OP_RETURN Data' : 'To Address'}
            </p>
            {addresses.map((addr) => {
              const isOpReturn = output.scriptPubKey.type === 'nulldata' || addr.startsWith('OP_RETURN');
              return (
                <div key={addr} className="flex items-center gap-1 mb-1">
                  {isOpReturn ? (
                    // OP_RETURN - not clickable
                    <>
                      <span className="font-mono text-sm text-muted-foreground truncate">
                        {addr}
                      </span>
                      <CopyButton text={addr} />
                    </>
                  ) : (
                    // Regular address - clickable
                    <>
                      <a
                        href={`/address/${addr}`}
                        className="font-mono text-sm text-primary hover:underline truncate"
                      >
                        {addr}
                      </a>
                      <CopyButton text={addr} />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Script Type */}
        {output.scriptPubKey.type && output.scriptPubKey.type !== 'unknown' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline" className="text-xs">
              {output.scriptPubKey.type}
            </Badge>
          </div>
        )}

        {/* Spent Information */}
        {isSpent && output.spentTxId && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Spent In</p>
            <div className="flex items-center gap-1">
              <a
                href={`/tx/${output.spentTxId}`}
                className="font-mono text-xs text-primary hover:underline truncate"
              >
                {output.spentTxId}
              </a>
              <CopyButton text={output.spentTxId} />
            </div>
            {output.spentHeight && (
              <p className="text-xs text-muted-foreground mt-1">
                Block: {output.spentHeight.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
