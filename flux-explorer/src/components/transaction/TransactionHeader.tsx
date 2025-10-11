"use client";

import { Transaction } from "@/types/flux-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { FileText, CheckCircle2, Clock } from "lucide-react";

interface TransactionHeaderProps {
  transaction: Transaction;
}

export function TransactionHeader({ transaction }: TransactionHeaderProps) {
  const isCoinbase = transaction.vin.length > 0 && (!transaction.vin[0].txid || transaction.vin[0].txid === undefined);
  const isConfirmed = transaction.confirmations > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Transaction</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isCoinbase ? "Coinbase Transaction (Block Reward)" : "Standard Transaction"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConfirmed ? (
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Confirmed
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                Unconfirmed
              </Badge>
            )}
            {isCoinbase && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                Coinbase
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Transaction ID */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Transaction ID</p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md font-mono text-sm break-all">
              {transaction.txid}
              <CopyButton text={transaction.txid} />
            </div>
          </div>

          {/* Block Information */}
          {transaction.blockhash && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Block Hash</p>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <a
                    href={`/block/${transaction.blockhash}`}
                    className="font-mono text-sm text-primary hover:underline truncate"
                  >
                    {transaction.blockhash}
                  </a>
                  <CopyButton text={transaction.blockhash} />
                </div>
              </div>
              {transaction.blockheight !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Block Height</p>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                    <a
                      href={`/block/${transaction.blockheight}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {transaction.blockheight.toLocaleString()}
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
