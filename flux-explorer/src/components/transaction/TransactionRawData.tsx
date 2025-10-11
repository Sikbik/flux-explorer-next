"use client";

import { useState } from "react";
import { Transaction } from "@/types/flux-api";
import { useRawTransaction } from "@/lib/api/hooks/useTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Code, FileJson, Download } from "lucide-react";

interface TransactionRawDataProps {
  txid: string;
  transaction: Transaction;
}

export function TransactionRawData({ txid, transaction }: TransactionRawDataProps) {
  const { data: rawData } = useRawTransaction(txid);
  const [activeTab, setActiveTab] = useState("json");

  const handleDownloadJson = () => {
    const jsonStr = JSON.stringify(transaction, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction-${txid.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHex = () => {
    if (!rawData?.rawtx) return;
    const blob = new Blob([rawData.rawtx], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction-${txid.slice(0, 8)}.hex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Raw Transaction Data
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJson}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download JSON
            </Button>
            {rawData?.rawtx && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadHex}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Hex
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="json" className="gap-2">
              <FileJson className="h-4 w-4" />
              JSON
            </TabsTrigger>
            <TabsTrigger value="hex" className="gap-2">
              <Code className="h-4 w-4" />
              Hex
            </TabsTrigger>
          </TabsList>

          <TabsContent value="json" className="mt-4">
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <CopyButton text={JSON.stringify(transaction, null, 2)} />
              </div>
              <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-xs">
                <code className="text-foreground">
                  {JSON.stringify(transaction, null, 2)}
                </code>
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="hex" className="mt-4">
            {rawData?.rawtx ? (
              <div className="relative">
                <div className="absolute top-2 right-2 z-10">
                  <CopyButton text={rawData.rawtx} />
                </div>
                <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-xs">
                  <code className="text-foreground break-all">
                    {rawData.rawtx}
                  </code>
                </pre>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <Code className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Loading raw transaction data...</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Transaction Structure Information */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50 text-sm space-y-2">
          <h4 className="font-semibold mb-2">Transaction Structure</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Version:</span>
              <span className="ml-2 font-mono">{transaction.version}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lock Time:</span>
              <span className="ml-2 font-mono">{transaction.locktime}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Inputs:</span>
              <span className="ml-2 font-mono">{transaction.vin.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Outputs:</span>
              <span className="ml-2 font-mono">{transaction.vout.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Size:</span>
              <span className="ml-2 font-mono">{transaction.size} bytes</span>
            </div>
            <div>
              <span className="text-muted-foreground">Weight:</span>
              <span className="ml-2 font-mono">{transaction.size * 4} WU</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
