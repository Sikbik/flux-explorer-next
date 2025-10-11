"use client";

import { Transaction } from "@/types/flux-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Calendar,
  Database,
  Coins,
  ArrowDownUp,
  ArrowDown,
  ArrowUp
} from "lucide-react";

interface TransactionOverviewProps {
  transaction: Transaction;
}

export function TransactionOverview({ transaction }: TransactionOverviewProps) {
  const isCoinbase = transaction.vin.length > 0 && (!transaction.vin[0].txid || transaction.vin[0].txid === undefined);
  const timestamp = transaction.time || transaction.blocktime;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Confirmations */}
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="Confirmations"
            value={transaction.confirmations.toLocaleString()}
            description={transaction.confirmations === 0 ? "Unconfirmed" : "Confirmed"}
          />

          {/* Timestamp */}
          {timestamp && (
            <StatCard
              icon={<Calendar className="h-5 w-5" />}
              label="Timestamp"
              value={format(new Date(timestamp * 1000), "PPp")}
              description={format(new Date(timestamp * 1000), "yyyy-MM-dd HH:mm:ss")}
            />
          )}

          {/* Size */}
          <StatCard
            icon={<Database className="h-5 w-5" />}
            label="Size"
            value={`${transaction.size.toLocaleString()} bytes`}
            description={`${(transaction.size / 1024).toFixed(2)} KB`}
          />

          {/* Fee */}
          {!isCoinbase && (
            <StatCard
              icon={<Coins className="h-5 w-5" />}
              label="Fee"
              value={`${transaction.fees.toFixed(8)} FLUX`}
              description={`Fee rate: ${(transaction.fees / transaction.size * 100000000).toFixed(2)} sat/byte`}
            />
          )}

          {/* Total Input */}
          <StatCard
            icon={<ArrowDown className="h-5 w-5 text-red-500" />}
            label={isCoinbase ? "Block Reward" : "Total Input"}
            value={`${isCoinbase ? transaction.valueOut.toFixed(8) : (transaction.valueIn !== null && transaction.valueIn !== undefined ? transaction.valueIn.toFixed(8) : '0.00000000')} FLUX`}
            description={`${transaction.vin.length} input${transaction.vin.length !== 1 ? 's' : ''}`}
          />

          {/* Total Output */}
          <StatCard
            icon={<ArrowUp className="h-5 w-5 text-green-500" />}
            label="Total Output"
            value={`${transaction.valueOut !== null && transaction.valueOut !== undefined ? transaction.valueOut.toFixed(8) : '0.00000000'} FLUX`}
            description={`${transaction.vout.length} output${transaction.vout.length !== 1 ? 's' : ''}`}
          />

          {/* Lock Time */}
          {transaction.locktime > 0 && (
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Lock Time"
              value={transaction.locktime.toLocaleString()}
              description={
                transaction.locktime < 500000000
                  ? "Block height"
                  : format(new Date(transaction.locktime * 1000), "PPp")
              }
            />
          )}

          {/* Version */}
          <StatCard
            icon={<ArrowDownUp className="h-5 w-5" />}
            label="Version"
            value={transaction.version.toString()}
            description="Transaction version"
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}

function StatCard({ icon, label, value, description }: StatCardProps) {
  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-card">
      <div className="flex-shrink-0 mt-1 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold truncate mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{description}</p>
      </div>
    </div>
  );
}
