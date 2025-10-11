"use client";

import { useNetworkStatus } from "@/lib/api";
import { useFluxNodeCount, useFluxInstancesCount, useArcaneAdoption } from "@/lib/api/hooks/useFluxStats";
import { useFluxSupply } from "@/lib/api/hooks/useFluxSupply";
import { useAverageBlockTime } from "@/lib/api/hooks/useAverageBlockTime";
import { use24hTransactions } from "@/lib/api/hooks/use24hTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Coins,
  TrendingUp,
  Database,
  Clock,
  Server,
  Layers,
  Boxes,
} from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  isLoading?: boolean;
}

function StatCard({ title, value, subtitle, icon, gradient, isLoading }: StatCardProps) {
  return (
    <Card className="overflow-hidden border-primary/5">
      <div className={`h-0.5 ${gradient} opacity-60`} />
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            {subtitle && <Skeleton className="h-4 w-24" />}
          </div>
        ) : (
          <div>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function NetworkStats() {
  const { data: networkStatus, isLoading: statusLoading } = useNetworkStatus();
  const { data: supplyStats, isLoading: supplyLoading } = useFluxSupply();
  const { data: txStats, isLoading: txStatsLoading } = use24hTransactions();
  const { data: nodeCount, isLoading: nodeCountLoading } = useFluxNodeCount();
  const { data: instancesCount, isLoading: instancesCountLoading } = useFluxInstancesCount();
  const { data: arcaneAdoption, isLoading: arcaneLoading } = useArcaneAdoption();
  const { data: avgBlockTime, isLoading: avgBlockTimeLoading } = useAverageBlockTime();


  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Block Height"
        value={networkStatus?.info.blocks.toLocaleString() ?? "—"}
        subtitle="Current height"
        icon={<Database className="h-4 w-4" />}
        gradient="bg-gradient-to-r from-blue-500 to-cyan-500"
        isLoading={statusLoading}
      />

      <StatCard
        title="App Instances Running"
        value={instancesCount?.toLocaleString() ?? "—"}
        subtitle="Total running instances"
        icon={<Boxes className="h-4 w-4" />}
        gradient="bg-gradient-to-r from-purple-500 to-pink-500"
        isLoading={instancesCountLoading}
      />

      {/* PoUW Nodes Card with hover tooltip */}
      <Card className="overflow-visible border-primary/5 group relative">
        <div className="h-0.5 bg-gradient-to-r from-orange-500 to-red-500 opacity-60" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Server className="h-4 w-4" />
            PoUW Nodes
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {nodeCountLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : nodeCount ? (
            <>
              <div className="text-2xl font-bold">{nodeCount.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Active FluxNodes</p>
              {/* Hover tooltip - positioned absolutely outside card */}
              <div className="absolute left-0 bottom-full mb-2 p-3 bg-card border rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[220px]">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-pink-500 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                      CUMULUS
                    </span>
                    <span className="font-bold text-pink-500">
                      {nodeCount["cumulus-enabled"].toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-purple-500 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                      NIMBUS
                    </span>
                    <span className="font-bold text-purple-500">
                      {nodeCount["nimbus-enabled"].toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-blue-500 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                      STRATUS
                    </span>
                    <span className="font-bold text-blue-500">
                      {nodeCount["stratus-enabled"].toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Arrow pointing down */}
                <div className="absolute left-4 bottom-[-6px] w-3 h-3 bg-card border-r border-b rotate-45"></div>
              </div>
            </>
          ) : (
            <div>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">Active FluxNodes</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ArcaneOS Adoption Card with hover tooltip */}
      <Card className="overflow-visible border-primary/5 group relative">
        <div className="h-0.5 bg-gradient-to-r from-teal-500 to-cyan-500 opacity-60" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            ArcaneOS Adoption
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {arcaneLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : arcaneAdoption ? (
            <>
              <div className="text-2xl font-bold">
                {arcaneAdoption.percentage.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {arcaneAdoption.arcane.toLocaleString()} of {arcaneAdoption.total.toLocaleString()} nodes
              </p>
              {/* Hover tooltip - positioned absolutely outside card */}
              <div className="absolute left-0 bottom-full mb-2 p-3 bg-card border rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[220px]">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-teal-400 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-teal-400"></span>
                      Arcane
                    </span>
                    <span className="font-bold text-teal-400">
                      {arcaneAdoption.arcane.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-400 font-medium flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
                      Legacy
                    </span>
                    <span className="font-bold text-yellow-400">
                      {arcaneAdoption.legacy.toLocaleString()}
                    </span>
                  </div>
                </div>
                {/* Arrow pointing down */}
                <div className="absolute left-4 bottom-[-6px] w-3 h-3 bg-card border-r border-b rotate-45"></div>
              </div>
            </>
          ) : (
            <div>
              <div className="text-2xl font-bold">—</div>
            </div>
          )}
        </CardContent>
      </Card>

      <StatCard
        title="Circulating Supply"
        value={supplyStats ? `${(supplyStats.circulatingSupply / 1e6).toFixed(2)}M` : "—"}
        subtitle={supplyStats ? `${supplyStats.circulatingSupply.toLocaleString()} FLUX` : undefined}
        icon={<Layers className="h-4 w-4" />}
        gradient="bg-gradient-to-r from-cyan-500 to-blue-500"
        isLoading={supplyLoading}
      />

      <StatCard
        title="Max Supply"
        value={supplyStats ? `${(supplyStats.maxSupply / 1e6).toFixed(2)}M` : "—"}
        subtitle={supplyStats ? `${supplyStats.maxSupply.toLocaleString()} FLUX` : undefined}
        icon={<Coins className="h-4 w-4" />}
        gradient="bg-gradient-to-r from-indigo-500 to-purple-500"
        isLoading={supplyLoading}
      />

      <StatCard
        title="Avg Block Time"
        value={avgBlockTime ? `${Math.round(avgBlockTime)} sec` : "—"}
        subtitle="Last 100 blocks (Target: 120s)"
        icon={<Clock className="h-4 w-4" />}
        gradient="bg-gradient-to-r from-yellow-500 to-orange-500"
        isLoading={avgBlockTimeLoading}
      />

      {/* Transactions (24h) Card with hover tooltip */}
      <Card className="overflow-visible border-primary/5 group relative">
        <div className="h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 opacity-60" />
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Transactions (24h)
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {txStatsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          ) : txStats ? (
            <>
              <div className="text-2xl font-bold">{txStats.totalTransactions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{txStats.blocks} blocks</p>
              {/* Hover tooltip - positioned absolutely outside card */}
              <div className="absolute left-0 bottom-full mb-2 p-3 bg-card border rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[220px]">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Standard Transactions:</span>
                    <span className="font-bold">{txStats.regularTransactions?.toLocaleString() ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Node Confirmations:</span>
                    <span className="font-bold">{txStats.nodeConfirmations?.toLocaleString() ?? 0}</span>
                  </div>
                </div>
                {/* Arrow pointing down */}
                <div className="absolute left-4 bottom-[-6px] w-3 h-3 bg-card border-r border-b rotate-45"></div>
              </div>
            </>
          ) : (
            <div>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground mt-1">Last 24 hours</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
