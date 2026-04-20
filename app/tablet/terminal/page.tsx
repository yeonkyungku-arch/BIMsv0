"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Search,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Smartphone,
  MapPin,
  Sun,
  Zap,
  Wrench,
  X,
  RefreshCw,
  ExternalLink,
  Building2,
  Tag,
  Activity,
} from "@/components/icons";
import { POWER_TYPE_LABEL_KO } from "@/contracts/rms/device-power-type";
import { cn } from "@/lib/utils";
import { OverallBadge } from "@/components/rms/shared/overall-badge";
import type { OverallState } from "@/components/rms/shared/overall-state-types";
import {
  useTerminals,
  INCIDENT_STATUS_LABELS,
  type EnrichedTerminal,
  type IncidentStatus,
} from "@/hooks/useTerminals";

// ============================================================================
// Types & Constants
// ============================================================================

type CardFilter = "all" | "normal" | "warning" | "critical" | "offline" | "maintenance";

const CARD_CONFIG: Record<CardFilter, {
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  ring: string;
  bg: string;
  states: OverallState[];
}> = {
  all:         { label: "전체",      icon: Smartphone,   color: "text-foreground",  ring: "ring-foreground/30",   bg: "bg-muted/40",                         states: ["정상","주의","경고","치명","오프라인","유지보수중"] },
  normal:      { label: "정상",      icon: CheckCircle2, color: "text-emerald-600", ring: "ring-emerald-400",      bg: "bg-emerald-50 dark:bg-emerald-950/20", states: ["정상"] },
  warning:     { label: "주의/경고", icon: AlertCircle,  color: "text-amber-600",   ring: "ring-amber-400",        bg: "bg-amber-50 dark:bg-amber-950/20",     states: ["주의","경고"] },
  critical:    { label: "치명",      icon: AlertTriangle,color: "text-red-600",     ring: "ring-red-400",          bg: "bg-red-50 dark:bg-red-950/20",         states: ["치명"] },
  offline:     { label: "오프라인",  icon: Clock,        color: "text-slate-500",   ring: "ring-slate-400",        bg: "bg-slate-50 dark:bg-slate-900/20",     states: ["오프라인"] },
  maintenance: { label: "유지보수중",icon: Wrench,       color: "text-blue-600",    ring: "ring-blue-400",         bg: "bg-blue-50 dark:bg-blue-950/20",       states: ["유지보수중"] },
};

const INCIDENT_BADGE: Record<Exclude<IncidentStatus, "NONE">, string> = {
  OPEN:        "bg-red-100 text-red-700 border-red-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-300",
  COMPLETED:   "bg-emerald-100 text-emerald-700 border-emerald-300",
};

// ============================================================================
// Main Component
// ============================================================================

export default function TerminalStatusPage() {
  const router = useRouter();
  const { data, isLoading, refetch } = useTerminals();

  // --- Card filter ---
  const [cardFilter, setCardFilter] = useState<CardFilter>("all");

  // --- Dropdown / search filters ---
  const [searchQuery, setSearchQuery]     = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [powerFilter, setPowerFilter]     = useState("all");
  const [incidentFilter, setIncidentFilter] = useState("all");

  // --- Drawer ---
  const [selectedTerminal, setSelectedTerminal] = useState<EnrichedTerminal | null>(null);

  // Unique customers
  const uniqueCustomers = useMemo(
    () => Array.from(new Set(data.map((d) => d.terminal.customerName))).sort(),
    [data]
  );

  // Counts per card
  const counts = useMemo(() => {
    const map: Record<CardFilter, number> = { all: data.length, normal: 0, warning: 0, critical: 0, offline: 0, maintenance: 0 };
    for (const item of data) {
      if (item.overallState === "정상") map.normal++;
      else if (item.overallState === "주의" || item.overallState === "경고") map.warning++;
      else if (item.overallState === "치명") map.critical++;
      else if (item.overallState === "오프라인") map.offline++;
      else if (item.overallState === "유지보수중") map.maintenance++;
    }
    return map;
  }, [data]);

  // Filtered rows
  const filtered = useMemo(() => {
    return data.filter((item) => {
      const t = item.terminal;

      // Card filter
      if (cardFilter !== "all") {
        if (!CARD_CONFIG[cardFilter].states.includes(item.overallState)) return false;
      }

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.stationName.toLowerCase().includes(q) && !t.terminalId.toLowerCase().includes(q) && !t.customerName.toLowerCase().includes(q)) return false;
      }

      // Customer
      if (customerFilter !== "all" && t.customerName !== customerFilter) return false;

      // Power
      if (powerFilter !== "all" && t.powerType !== powerFilter) return false;

      // Incident
      if (incidentFilter === "has_incident" && item.incidentStatus === "NONE") return false;
      if (incidentFilter === "no_incident"  && item.incidentStatus !== "NONE") return false;

      return true;
    });
  }, [data, cardFilter, searchQuery, customerFilter, powerFilter, incidentFilter]);

  const hasActiveFilters = searchQuery || customerFilter !== "all" || powerFilter !== "all" || incidentFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setCustomerFilter("all");
    setPowerFilter("all");
    setIncidentFilter("all");
    setCardFilter("all");
  };

  return (
    <div className="h-full flex flex-col bg-background">

      {/* ── Header ── */}
      <div className="shrink-0 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">단말 현황</h1>
            <p className="text-sm text-muted-foreground mt-0.5">담당 구역의 단말 운영 현황을 모니터링합니다</p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-1.5">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            새로고침
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="shrink-0 px-6 py-3 grid grid-cols-6 gap-3">
        {(Object.keys(CARD_CONFIG) as CardFilter[]).map((key) => {
          const cfg = CARD_CONFIG[key];
          const Icon = cfg.icon;
          const isActive = cardFilter === key;
          return (
            <button
              key={key}
              onClick={() => setCardFilter(key)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left hover:shadow-sm",
                isActive
                  ? cn("border-transparent shadow-sm ring-2", cfg.ring, cfg.bg)
                  : "border-border bg-card hover:bg-muted/40"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", cfg.color)} />
              <div>
                <p className="text-xl font-bold leading-none tabular-nums">{counts[key]}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Filter Bar ── */}
      <div className="shrink-0 px-6 py-2.5 border-b border-t">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="단말 ID / 정류장명 / 고객사"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          {/* Customer */}
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue placeholder="전체 고객사" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 고객사</SelectItem>
              {uniqueCustomers.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Power type */}
          <Select value={powerFilter} onValueChange={setPowerFilter}>
            <SelectTrigger className="w-28 h-9 text-sm">
              <SelectValue placeholder="전원 유형" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 전원</SelectItem>
              <SelectItem value="GRID">상용 전원</SelectItem>
              <SelectItem value="SOLAR">태양광</SelectItem>
            </SelectContent>
          </Select>

          {/* Incident */}
          <Select value={incidentFilter} onValueChange={setIncidentFilter}>
            <SelectTrigger className="w-28 h-9 text-sm">
              <SelectValue placeholder="장애 여부" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="has_incident">장애 있음</SelectItem>
              <SelectItem value="no_incident">장애 없음</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-xs">
              <X className="h-3.5 w-3.5" />
              필터 초기화
            </Button>
          )}

          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            {filtered.length}건 / {data.length}건
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="rounded-lg border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[130px] text-xs font-semibold">단말 ID</TableHead>
                <TableHead className="text-xs font-semibold">정류장명</TableHead>
                <TableHead className="w-[110px] text-xs font-semibold">운영 상태</TableHead>
                <TableHead className="w-[130px] text-xs font-semibold">고객사</TableHead>
                <TableHead className="w-[100px] text-xs font-semibold">전원</TableHead>
                <TableHead className="w-[110px] text-xs font-semibold">장애</TableHead>
                <TableHead className="text-xs font-semibold">상태 사유</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                    조건에 맞는 단말이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow
                    key={item.terminal.terminalId}
                    className={cn(
                      "cursor-pointer transition-colors hover:bg-muted/50",
                      selectedTerminal?.terminal.terminalId === item.terminal.terminalId && "bg-primary/5"
                    )}
                    onClick={() => setSelectedTerminal(item)}
                  >
                    <TableCell className="font-mono text-sm font-semibold">{item.terminal.terminalId}</TableCell>
                    <TableCell>
                      <p className="text-sm font-medium leading-snug">{item.terminal.stationName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.terminal.address}</p>
                    </TableCell>
                    <TableCell>
                      <OverallBadge state={item.overallState} size="sm" />
                    </TableCell>
                    <TableCell className="text-sm">{item.terminal.customerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {item.terminal.powerType === "SOLAR"
                          ? <Sun className="h-3.5 w-3.5 text-amber-500" />
                          : <Zap className="h-3.5 w-3.5 text-blue-500" />}
                        <span className="text-xs">{POWER_TYPE_LABEL_KO[item.terminal.powerType]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.incidentStatus === "NONE" ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : (
                        <Badge variant="outline" className={cn("text-[10px] h-5", INCIDENT_BADGE[item.incidentStatus as Exclude<IncidentStatus, "NONE">])}>
                          <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                          {INCIDENT_STATUS_LABELS[item.incidentStatus]}
                          {item.incidentCount > 1 && ` (${item.incidentCount}건)`}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {item.overallReason ?? "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Detail Drawer ── */}
      <Sheet open={!!selectedTerminal} onOpenChange={(open) => { if (!open) setSelectedTerminal(null); }}>
        <SheetContent side="right" className="w-[420px] sm:w-[500px] p-0 overflow-y-auto">
          {selectedTerminal && (() => {
            const item = selectedTerminal;
            const t = item.terminal;
            return (
              <>
                {/* Drawer Header */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                  <div className="flex items-center gap-2 mb-2">
                    <OverallBadge state={item.overallState} />
                    {item.incidentStatus !== "NONE" && (
                      <Badge variant="outline" className={cn("text-[10px]", INCIDENT_BADGE[item.incidentStatus as Exclude<IncidentStatus, "NONE">])}>
                        <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                        장애 {INCIDENT_STATUS_LABELS[item.incidentStatus]}
                        {item.incidentCount > 1 && ` (${item.incidentCount}건)`}
                      </Badge>
                    )}
                  </div>
                  <SheetTitle className="flex items-center gap-2 text-base">
                    <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                    {t.terminalId}
                  </SheetTitle>
                  <SheetDescription>{t.stationName}</SheetDescription>
                </SheetHeader>

                <div className="px-6 py-5 space-y-5">

                  {/* 운영 상태 */}
                  {item.overallReason && (
                    <section>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5" /> 상태 상세
                      </h4>
                      <div className="p-3 rounded-lg bg-muted/40 border space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{item.overallReason}</p>
                            {item.workflowHint && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.workflowHint}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  <Separator />

                  {/* 단말 정보 */}
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Tag className="h-3.5 w-3.5" /> 단말 정보
                    </h4>
                    <dl className="space-y-2.5 text-sm">
                      {[
                        { label: "단말 ID",   value: <span className="font-mono">{t.terminalId}</span> },
                        { label: "모델",      value: t.model },
                        { label: "시리얼",    value: <span className="font-mono text-xs">{t.serialNumber || "-"}</span> },
                        { label: "전원",      value: (
                          <span className="flex items-center gap-1">
                            {t.powerType === "SOLAR"
                              ? <Sun className="h-3.5 w-3.5 text-amber-500" />
                              : <Zap className="h-3.5 w-3.5 text-blue-500" />}
                            {POWER_TYPE_LABEL_KO[t.powerType]}
                          </span>
                        )},
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd className="font-medium text-right">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>

                  <Separator />

                  {/* 고객사 */}
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> 고객사
                    </h4>
                    <p className="text-sm font-medium">{t.customerName}</p>
                  </section>

                  <Separator />

                  {/* 위치 */}
                  <section>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" /> 위치
                    </h4>
                    <p className="text-sm text-muted-foreground">{t.address}</p>
                  </section>

                  {/* 장애 현황 */}
                  {item.incidentStatus !== "NONE" && (
                    <>
                      <Separator />
                      <section>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500" /> 장애 현황
                        </h4>
                        <div className="flex items-center justify-between p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/10">
                          <Badge variant="outline" className={cn("text-xs", INCIDENT_BADGE[item.incidentStatus as Exclude<IncidentStatus, "NONE">])}>
                            {INCIDENT_STATUS_LABELS[item.incidentStatus]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{item.incidentCount}건 활성</span>
                        </div>
                      </section>
                    </>
                  )}

                  {/* 액션 */}
                  <div className="pt-2 space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedTerminal(null);
                        router.push(`/tablet/terminal/${t.terminalId}`);
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      단말 상세 페이지
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
