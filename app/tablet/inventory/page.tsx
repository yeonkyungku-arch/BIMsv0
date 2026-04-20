"use client";
// inventory page - with inout registration modals - 2026-03-29

import { useState, useMemo } from "react";
import {
  mockReceivingRecords,
  mockOutgoingRecords,
  mockTransferRecords,
  mockReturnRecords,
  mockAssets,
  RECEIVING_STATUS_META,
  OUTGOING_STATUS_META,
  TRANSFER_STATUS_META,
  RETURN_STATUS_META,
  ASSET_TYPE_META,
} from "@/lib/mock-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Package,
  Truck,
  ArrowLeftRight,
  RotateCcw,
  Warehouse,
  RefreshCw,
  X,
  Box,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

type TabType = "inventory" | "inout" | "history";
type HistoryType = "all" | "receiving" | "outgoing" | "transfer" | "return";
type ModalType = "receiving" | "outgoing" | "transfer" | "return" | null;

// ============================================================================
// Constants
// ============================================================================

const HISTORY_TYPE_CONFIG: Record<
  HistoryType,
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  all:       { label: "전체", icon: Package,        color: "text-foreground" },
  receiving: { label: "입고", icon: Truck,          color: "text-emerald-600" },
  outgoing:  { label: "출고", icon: Box,            color: "text-blue-600" },
  transfer:  { label: "전출", icon: ArrowLeftRight, color: "text-amber-600" },
  return:    { label: "반품", icon: RotateCcw,      color: "text-red-600" },
};

// ============================================================================
// Mock Data
// ============================================================================

interface WarehouseData { id: string; name: string; address: string; }

const WAREHOUSES: WarehouseData[] = [
  { id: "WH-001", name: "서울 본사 창고",  address: "서울 강남구 테헤란로 100" },
  { id: "WH-002", name: "경기 물류센터",   address: "경기 성남시 분당구 판교로 35" },
  { id: "WH-003", name: "부산 서비스센터", address: "부산 해운대구 센텀중앙로 30" },
];

// 재고 상태 매핑 (창고에 있는 자산 필터링)
const getInventoryStatus = (asset: typeof mockAssets[0]): "available" | "reserved" | "damaged" => {
  if (!asset.currentWarehouseId) return "reserved"; // 창고에 없으면 예약
  if (asset.status === "DAMAGED" || asset.inspectionStatus === "failed") return "damaged";
  return "available";
};

const INVENTORY_STATUS_META: Record<"available" | "reserved" | "damaged", { label: string; color: string }> = {
  available: { label: "가용", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  reserved:  { label: "예약", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  damaged:   { label: "손상", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

// ============================================================================
// Main Component
// ============================================================================

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<TabType>("inventory");
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [drawerType, setDrawerType] = useState<"inventory" | "history" | null>(null);
  const [modalOpen, setModalOpen] = useState<ModalType>(null);

  // --- 재고 현황 필터 ---
  const [invWarehouse, setInvWarehouse] = useState("all");
  const [invType, setInvType] = useState("all");
  const [invStatus, setInvStatus] = useState("all");
  const [invSearch, setInvSearch] = useState("");

  // --- 입출고 이력 필터 ---
  const [histWarehouse, setHistWarehouse] = useState("all");
  const [histType, setHistType] = useState("all");
  const [histKind, setHistKind] = useState<HistoryType>("all");
  const [histSearch, setHistSearch] = useState("");

// 재고 필터링 함수 (창고에 보유 중인 자산만)
const getInventoryAssets = () => {
  return mockAssets.filter(asset => asset.currentWarehouseId).map(asset => ({
    ...asset,
    inventoryStatus: getInventoryStatus(asset),
  }));
};

// Unique asset types
const invAssetTypes = useMemo(
  () => Array.from(new Set(getInventoryAssets().map((i) => i.assetType))),
  []
);
  const histAssetTypes = useMemo(
    () => Array.from(new Set((mockReceivingRecords.flatMap((r) => r.assets || []).map((a: any) => a.assetType) as string[]))),
    []
  );

  // Filtered inventory
  const filteredInventory = useMemo(() => {
    const assets = getInventoryAssets();
    return assets.filter((item) => {
      if (invWarehouse !== "all" && item.currentWarehouseId !== invWarehouse) return false;
      if (invType !== "all" && item.assetType !== invType) return false;
      if (invStatus !== "all" && getInventoryStatus(item) !== invStatus) return false;
      if (invSearch) {
        const q = invSearch.toLowerCase();
        if (!item.assetCode.toLowerCase().includes(q) && !item.assetSubType.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [invWarehouse, invType, invStatus, invSearch]);

  // Inventory counts
  const invCounts = useMemo(() => {
    const assets = getInventoryAssets();
    return {
      total:     assets.length,
      available: assets.filter((i) => getInventoryStatus(i) === "available").length,
      reserved:  assets.filter((i) => getInventoryStatus(i) === "reserved").length,
      damaged:   assets.filter((i) => getInventoryStatus(i) === "damaged").length,
    };
  }, []);

  // History records (필터 미적용 — 카드 카운트 기준)
  const allHistoryRecords = useMemo(() => {
    const recs: { kind: HistoryType; date: string; data: any }[] = [];
    mockReceivingRecords.forEach((r) => recs.push({ kind: "receiving", date: r.receivedDate,               data: r }));
    mockOutgoingRecords.forEach((r)  => recs.push({ kind: "outgoing",  date: r.shippedDate || r.createdAt, data: r }));
    mockTransferRecords.forEach((r)  => recs.push({ kind: "transfer",  date: r.createdAt,                  data: r }));
    mockReturnRecords.forEach((r)    => recs.push({ kind: "return",    date: r.receivedDate || r.createdAt, data: r }));
    recs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return recs;
  }, []);

  // History records (필터 적용 — 테이블 데이터 기준)
  const historyRecords = useMemo(() => {
    return allHistoryRecords.filter((r) => {
      if (histKind !== "all" && r.kind !== histKind) return false;
      if (histWarehouse !== "all") {
        const whName = WAREHOUSES.find((w) => w.id === histWarehouse)?.name ?? "";
        const d = r.data;
        const fields = [d.warehouseName, d.fromWarehouseName, d.toWarehouseName].filter(Boolean);
        if (!fields.some((f: string) => f === whName)) return false;
      }
      if (histType !== "all") {
        const d = r.data;
        const assetTypes = (d.assets ?? []).map((a: any) => a.assetType ?? "");
        if (!assetTypes.includes(histType)) return false;
      }
      if (histSearch) {
        const q = histSearch.toLowerCase();
        const d = r.data;
        const fields = [d.id, d.supplierName, d.warehouseName, d.customerName, d.stopName, d.fromWarehouseName, d.toWarehouseName].filter(Boolean);
        if (!fields.some((f: any) => String(f).toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [allHistoryRecords, histKind, histWarehouse, histType, histSearch]);

  // 카드 카운트 — 전체 기준(필터 무관)
  const histKindCounts = useMemo(() => ({
    all:       allHistoryRecords.length,
    receiving: allHistoryRecords.filter((r) => r.kind === "receiving").length,
    outgoing:  allHistoryRecords.filter((r) => r.kind === "outgoing").length,
    transfer:  allHistoryRecords.filter((r) => r.kind === "transfer").length,
    return:    allHistoryRecords.filter((r) => r.kind === "return").length,
  }), [allHistoryRecords]);

  const hasInvFilters  = invSearch  || invWarehouse  !== "all" || invType  !== "all" || invStatus !== "all";
  const hasHistFilters = histSearch || histWarehouse !== "all" || histType !== "all" || histKind !== "all";

  const clearInvFilters  = () => { setInvSearch("");  setInvWarehouse("all");  setInvType("all");  setInvStatus("all"); };
  const clearHistFilters = () => { setHistSearch(""); setHistWarehouse("all"); setHistType("all"); setHistKind("all"); };

  const openInvDrawer  = (item: typeof mockAssets[0]) => { setSelectedItem(item);   setDrawerType("inventory"); };
  const openHistDrawer = (rec: any)             => { setSelectedItem(rec);   setDrawerType("history"); };
  const closeDrawer    = ()                      => { setSelectedItem(null); setDrawerType(null); };

  return (
    <div className="h-full flex flex-col bg-background">

      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-muted-foreground" />
              재고 관리
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">창고 재고 현황 및 입출고 관리를 합니다</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            새로고침
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-6 pt-3 border-b">
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="inventory" className="gap-2">
            <Package className="h-4 w-4" />재고 현황
          </TabsTrigger>
          <TabsTrigger value="inout" className="gap-2">
            <Box className="h-4 w-4" />입출고
          </TabsTrigger>
        </TabsList>
        </div>

        {/* ────────────── 재고 현황 탭 ────────────── */}
        <TabsContent value="inventory" className="flex-1 flex flex-col overflow-hidden m-0">

          {/* 요약 카드 */}
          <div className="shrink-0 px-6 py-3 grid grid-cols-4 gap-3">
            {([
              { key: "all",       label: "전체 재고", count: invCounts.total,     Icon: Package,       color: "text-foreground",  ring: "ring-foreground/30", bg: "bg-muted/40" },
              { key: "available", label: "가용",      count: invCounts.available, Icon: CheckCircle2,  color: "text-emerald-600", ring: "ring-emerald-400",   bg: "bg-emerald-50 dark:bg-emerald-950/20" },
              { key: "reserved",  label: "예약",      count: invCounts.reserved,  Icon: Clock,         color: "text-amber-600",   ring: "ring-amber-400",     bg: "bg-amber-50 dark:bg-amber-950/20" },
              { key: "damaged",   label: "손상",      count: invCounts.damaged,   Icon: AlertTriangle, color: "text-red-600",     ring: "ring-red-400",       bg: "bg-red-50 dark:bg-red-950/20" },
            ] as const).map(({ key, label, count, Icon, color, ring, bg }) => (
              <button
                key={key}
                onClick={() => setInvStatus(key === "all" ? "all" : key)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left hover:shadow-sm",
                  invStatus === key
                    ? cn("border-transparent shadow-sm ring-2", ring, bg)
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", color)} />
                <div>
                  <p className="text-xl font-bold leading-none tabular-nums">{count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              </button>
            ))}
          </div>

          {/* 필터 바 */}
          <div className="shrink-0 px-6 py-2.5 border-b border-t">
            <div className="flex flex-wrap items-center gap-2.5">
              <Select value={invWarehouse} onValueChange={(v) => { setInvWarehouse(v); setInvType("all"); }}>
                <SelectTrigger className="w-44 h-9 text-sm">
                  <Warehouse className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="전체 창고" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 창고</SelectItem>
                  {WAREHOUSES.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={invType} onValueChange={setInvType}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="전체 품목" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 품목</SelectItem>
                  {invAssetTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="relative w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="자산 코드 / 품목 검색" value={invSearch} onChange={(e) => setInvSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>

              {hasInvFilters && (
                <Button variant="ghost" size="sm" onClick={clearInvFilters} className="h-9 gap-1 text-xs">
                  <X className="h-3.5 w-3.5" />필터 초기화
                </Button>
              )}
                <span className="ml-auto text-sm text-muted-foreground tabular-nums">{filteredInventory.length}건 / {invCounts.total}건</span>
            </div>
          </div>

          {/* 테이블 */}
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[150px] text-xs font-semibold">자산 코드</TableHead>
                    <TableHead className="text-xs font-semibold">품목</TableHead>
                    <TableHead className="w-[140px] text-xs font-semibold">창고</TableHead>
                    <TableHead className="w-[90px]  text-xs font-semibold">상태</TableHead>
                    <TableHead className="w-[110px] text-xs font-semibold">입고일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">조건에 맞는 재고가 없습니다.</TableCell>
                    </TableRow>
                  ) : filteredInventory.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn("cursor-pointer hover:bg-muted/50 transition-colors", drawerType === "inventory" && selectedItem?.id === item.id && "bg-primary/5")}
                      onClick={() => openInvDrawer(item)}
                    >
                      <TableCell className="font-mono text-sm font-semibold">{item.assetCode}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{item.assetSubType}</p>
                        <p className="text-xs text-muted-foreground">{item.assetType}</p>
                      </TableCell>
                      <TableCell className="text-sm">{item.currentWarehouseName}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-[10px]", INVENTORY_STATUS_META[getInventoryStatus(item)].color)}>
                          {INVENTORY_STATUS_META[getInventoryStatus(item)].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{item.registeredDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ────────────── 입출고 탭 ────────────── */}
        <TabsContent value="inout" className="flex-1 flex flex-col overflow-hidden m-0">
          
          {/* 요약 카드 (입출고 유형별) — 클릭 시 테이블 필터 연동 */}
          <div className="shrink-0 px-6 py-3 grid grid-cols-5 gap-3">
            {(["all", "receiving", "outgoing", "transfer", "return"] as HistoryType[]).map((kind) => {
              const cfg  = HISTORY_TYPE_CONFIG[kind];
              const Icon = cfg.icon;
              const count = histKindCounts[kind];
              const isActive = histKind === kind;
              return (
                <button
                  key={kind}
                  onClick={() => setHistKind(kind)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all text-left hover:shadow-sm",
                    isActive
                      ? "border-transparent shadow-sm ring-2 ring-primary/30 bg-muted/60"
                      : "border-border bg-card hover:bg-muted/40"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", cfg.color)} />
                  <div>
                    <p className="text-lg font-bold leading-none tabular-nums">{count}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 필터 바 + 입고/출고 등록 버튼 */}
          <div className="shrink-0 px-6 py-2.5 border-b border-t">
            <div className="flex flex-wrap items-center gap-2.5">
              <Select value={histWarehouse} onValueChange={(v) => { setHistWarehouse(v); setHistType("all"); }}>
                <SelectTrigger className="w-44 h-9 text-sm">
                  <Warehouse className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="전체 창고" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 창고</SelectItem>
                  {WAREHOUSES.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={histType} onValueChange={setHistType}>
                <SelectTrigger className="w-36 h-9 text-sm">
                  <SelectValue placeholder="전체 품목" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 품목</SelectItem>
                  {histAssetTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>

              <div className="relative w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ID / 공급사 / 고객사 검색" value={histSearch} onChange={(e) => setHistSearch(e.target.value)} className="pl-9 h-9 text-sm" />
              </div>

              {hasHistFilters && (
                <Button variant="ghost" size="sm" onClick={clearHistFilters} className="h-9 gap-1 text-xs">
                  <X className="h-3.5 w-3.5" />필터 초기화
                </Button>
              )}

              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setModalOpen("receiving")} className="gap-1.5 h-9 text-xs">
                  <Plus className="h-3.5 w-3.5" />입고 등록
                </Button>
                <Button size="sm" variant="outline" onClick={() => setModalOpen("outgoing")} className="gap-1.5 h-9 text-xs">
                  <Plus className="h-3.5 w-3.5" />출고 요청
                </Button>
              </div>
            </div>
          </div>

          {/* 입출고 이력 테이블 */}
          <div className="flex-1 overflow-auto px-6 py-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[80px]  text-xs font-semibold">유형</TableHead>
                    <TableHead className="w-[115px] text-xs font-semibold">ID</TableHead>
                    <TableHead className="text-xs font-semibold">입고지 / 출발지</TableHead>
                    <TableHead className="text-xs font-semibold">출고지 / 도착지</TableHead>
                    <TableHead className="w-[60px]  text-xs font-semibold">수량</TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold">일자</TableHead>
                    <TableHead className="w-[100px] text-xs font-semibold">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">입출고 이력이 없습니다.</TableCell>
                    </TableRow>
                  ) : historyRecords.map((rec, idx) => {
                    const cfg  = HISTORY_TYPE_CONFIG[rec.kind];
                    const Icon = cfg.icon;
                    const d    = rec.data;

                    let fromPlace = "";
                    let toPlace   = "";
                    let quantity  = 0;
                    let statusMeta: { label: string; color: string } | undefined;

                    if (rec.kind === "receiving") {
                      fromPlace  = d.supplierName;
                      toPlace    = d.warehouseName;
                      quantity   = d.totalQuantity;
                      statusMeta = RECEIVING_STATUS_META[d.status as keyof typeof RECEIVING_STATUS_META];
                    }
                    if (rec.kind === "outgoing") {
                      fromPlace  = d.warehouseName;
                      toPlace    = d.stopName ? `${d.customerName} · ${d.stopName}` : d.customerName;
                      quantity   = d.items?.length || 0;
                      statusMeta = OUTGOING_STATUS_META[d.status as keyof typeof OUTGOING_STATUS_META];
                    }
                    if (rec.kind === "transfer") {
                      fromPlace  = d.fromWarehouseName;
                      toPlace    = d.toWarehouseName;
                      quantity   = d.items?.length || 0;
                      statusMeta = TRANSFER_STATUS_META[d.status as keyof typeof TRANSFER_STATUS_META];
                    }
                    if (rec.kind === "return") {
                      fromPlace  = d.stopName ? `${d.customerName} · ${d.stopName}` : d.customerName;
                      toPlace    = d.toWarehouseName;
                      quantity   = d.items?.length || 0;
                      statusMeta = RETURN_STATUS_META[d.status as keyof typeof RETURN_STATUS_META];
                    }

                    return (
                      <TableRow
                        key={`${rec.kind}-${d.id}-${idx}`}
                        className={cn("cursor-pointer hover:bg-muted/50 transition-colors", drawerType === "history" && selectedItem?.data?.id === d.id && "bg-primary/5")}
                        onClick={() => openHistDrawer(rec)}
                      >
                        <TableCell>
                          <div className={cn("flex items-center gap-1.5", cfg.color)}>
                            <Icon className="h-4 w-4" />
                            <span className="text-xs font-medium">{cfg.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{d.id}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[150px]">{fromPlace}</TableCell>
                        <TableCell className="text-xs font-medium truncate max-w-[150px]">{toPlace}</TableCell>
                        <TableCell className="text-xs tabular-nums">{quantity}건</TableCell>
                        <TableCell className="text-xs tabular-nums">{rec.date}</TableCell>
                        <TableCell>
                          {statusMeta && (
                            <Badge className={cn("text-[10px]", statusMeta.color)}>{statusMeta.label}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Drawer - 입출고 상세 정보 */}
      <Sheet open={drawerType === "history"} onOpenChange={(open) => { if (!open) { setDrawerType(null); setSelectedItem(null); } }}>
        <SheetContent side="right" className="w-full md:max-w-lg overflow-y-auto">
          {selectedItem && <HistoryDrawer record={selectedItem} onClose={() => { setDrawerType(null); setSelectedItem(null); }} />}
        </SheetContent>
      </Sheet>

      {/* 입고 등록 모달 */}
      <Dialog open={modalOpen === "receiving"} onOpenChange={(open) => !open && setModalOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>입고 등록</DialogTitle>
            <DialogDescription>공급사로부터 배송된 자산을 입고 처리합니다. 개별 등록 또는 파일로 일괄 등록할 수 있습니다.</DialogDescription>
          </DialogHeader>
          
          {/* 등록 방식 선택 탭 */}
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">개별 등록</TabsTrigger>
              <TabsTrigger value="bulk">일괄 등록 (파일)</TabsTrigger>
            </TabsList>
            
            {/* 개별 등록 */}
            <TabsContent value="single" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">입고 창고</label>
                  <Select defaultValue="WH-001">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WAREHOUSES.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">공급사</label>
                  <Input placeholder="공급사명" className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">배송일</label>
                  <Input type="date" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">비고</label>
                  <Input placeholder="입고 관련 비고" className="mt-1" />
                </div>
              </div>
              
              {/* 자산 목록 (여러 대 등록) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">입고 자산 목록</label>
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" /> 자산 추가
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs h-8">시리얼 번호</TableHead>
                        <TableHead className="text-xs h-8">품목 유형</TableHead>
                        <TableHead className="text-xs h-8">모델</TableHead>
                        <TableHead className="text-xs h-8 w-24">검수</TableHead>
                        <TableHead className="text-xs h-8 w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="py-2"><Input placeholder="SN-2026-001" className="h-8 text-sm" /></TableCell>
                        <TableCell className="py-2">
                          <Select defaultValue="terminal">
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="terminal">단말기</SelectItem>
                              <SelectItem value="battery">배터리</SelectItem>
                              <SelectItem value="solar">태양광 패널</SelectItem>
                              <SelectItem value="module">통신 모듈</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2"><Input placeholder="BIS-SOLAR-100" className="h-8 text-sm" /></TableCell>
                        <TableCell className="py-2">
                          <Select defaultValue="pass">
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pass">합격</SelectItem>
                              <SelectItem value="fail">불합격</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><X className="h-3.5 w-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground mt-1">총 1건의 자산이 등록됩니다.</p>
              </div>
            </TabsContent>
            
            {/* 일괄 등록 (파일 업로드) */}
            <TabsContent value="bulk" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">입고 창고</label>
                  <Select defaultValue="WH-001">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WAREHOUSES.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">공급사</label>
                  <Input placeholder="공급사명" className="mt-1" />
                </div>
              </div>
              
              {/* 파일 업로드 영역 */}
              <div>
                <label className="text-sm font-medium">파일 업로드</label>
                <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">파일을 드래그하거나 클릭하여 선택</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, XLS, XLSX 파일 지원 (최대 10MB)</p>
                  <input type="file" accept=".csv,.xls,.xlsx" className="hidden" />
                </div>
              </div>
              
              {/* 템플릿 다운로드 */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">입고 등록 템플릿</p>
                  <p className="text-xs text-muted-foreground">양식에 맞게 데이터를 입력 후 업로드하세요</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3.5 w-3.5" /> 템플릿 다운로드
                </Button>
              </div>
              
              {/* 업로드된 파일 미리보기 (예시) */}
              <div className="text-sm text-muted-foreground text-center py-4">
                파일을 업로드하면 미리보기가 표시됩니다.
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setModalOpen(null)} className="flex-1">취소</Button>
            <Button onClick={() => { setModalOpen(null); }} className="flex-1">입고 등록</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 출고 요청 모달 */}
      <Dialog open={modalOpen === "outgoing"} onOpenChange={(open) => !open && setModalOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>출고 요청</DialogTitle>
            <DialogDescription>고객사로 출고할 자산을 선택하여 요청합니다. 개별 선택 또는 파일로 일괄 요청할 수 있습니다.</DialogDescription>
          </DialogHeader>
          
          {/* 등록 방식 선택 탭 */}
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="single">개별 선택</TabsTrigger>
              <TabsTrigger value="bulk">일괄 등록 (파일)</TabsTrigger>
            </TabsList>
            
            {/* 개별 선택 */}
            <TabsContent value="single" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">출고 창고</label>
                  <Select defaultValue="WH-001">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WAREHOUSES.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">출고 사유</label>
                  <Select defaultValue="new">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">신규 설치</SelectItem>
                      <SelectItem value="replace">교체</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">출고처 (고객사)</label>
                  <Input placeholder="고객사 선택" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">설치 정류장</label>
                  <Input placeholder="정류장 선택" className="mt-1" />
                </div>
              </div>
              
              {/* 자산 선택 목록 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">출고 자산 선택</label>
                  <span className="text-xs text-muted-foreground">0건 선택됨</span>
                </div>
                <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs h-8 w-10"></TableHead>
                        <TableHead className="text-xs h-8">자산 코드</TableHead>
                        <TableHead className="text-xs h-8">품목</TableHead>
                        <TableHead className="text-xs h-8">상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockAssets.filter(i => i.currentWarehouseId && getInventoryStatus(i) === "available").slice(0, 5).map((item) => (
                        <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="py-2"><input type="checkbox" className="h-4 w-4 rounded border-gray-300" /></TableCell>
                          <TableCell className="py-2 font-mono text-xs">{item.assetCode}</TableCell>
                          <TableCell className="py-2 text-sm">{item.assetSubType}</TableCell>
                          <TableCell className="py-2">
                            <Badge className={cn("text-[10px]", INVENTORY_STATUS_META[getInventoryStatus(item)].color)}>
                              {INVENTORY_STATUS_META[getInventoryStatus(item)].label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
            
            {/* 일괄 등록 (파일 업로드) */}
            <TabsContent value="bulk" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">출고 창고</label>
                  <Select defaultValue="WH-001">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WAREHOUSES.map((w) => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">출고 사유</label>
                  <Select defaultValue="new">
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">신규 설치</SelectItem>
                      <SelectItem value="replace">교체</SelectItem>
                      <SelectItem value="other">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* 파일 업로드 영역 */}
              <div>
                <label className="text-sm font-medium">파일 업로드</label>
                <div className="mt-1 border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">파일을 드래그하거나 클릭하여 선택</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, XLS, XLSX 파일 지원 (최대 10MB)</p>
                  <input type="file" accept=".csv,.xls,.xlsx" className="hidden" />
                </div>
              </div>
              
              {/* 템플릿 다운로드 */}
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">출고 요청 템플릿</p>
                  <p className="text-xs text-muted-foreground">자산 코드, 출고처 정보를 입력 후 업로드하세요</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3.5 w-3.5" /> 템플릿 다운로드
                </Button>
              </div>
              
              <div className="text-sm text-muted-foreground text-center py-4">
                파일을 업로드하면 미리보기가 표시됩니다.
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setModalOpen(null)} className="flex-1">취소</Button>
            <Button onClick={() => { setModalOpen(null); }} className="flex-1">출고 요청</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Drawer Components
// ============================================================================

function InventoryDrawer({ item, onClose }: { item: typeof mockAssets[0]; onClose: () => void }) {
  // 출고 예정 정보 조회 (해당 자산이 포함된 outgoing record 찾기)
  const outgoingRecord = useMemo(() => {
    return mockOutgoingRecords.find(o => o.items?.some((it: any) => it.assetCode === item.assetCode) && o.status !== 'installed');
  }, [item.assetCode]);

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b">
        <SheetTitle className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          {item.assetCode}
        </SheetTitle>
        <SheetDescription>{item.assetSubType}</SheetDescription>
      </SheetHeader>
      <div className="px-6 py-4 space-y-5 overflow-y-auto">
        {/* 기본 정보 */}
        <div>
          <p className="text-sm font-semibold mb-2">기본 정보</p>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">품목 유형</dt>
              <dd>{item.assetType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">품목 분류</dt>
              <dd>{item.assetSubType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">창고</dt>
              <dd>{item.currentWarehouseName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">상태</dt>
              <dd><Badge className={cn("text-[10px]", INVENTORY_STATUS_META[getInventoryStatus(item)].color)}>{INVENTORY_STATUS_META[getInventoryStatus(item)].label}</Badge></dd>
            </div>
          </dl>
        </div>

        <Separator />

        {/* 제조/공급 정보 */}
        <div>
          <p className="text-sm font-semibold mb-2">제조 및 공급 정보</p>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">제조사</dt>
              <dd>{item.manufacturerName || "-"}</dd>
            </div>
            {item.manufacturerSerial && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">제조사 시리얼</dt>
                <dd className="font-mono text-xs">{item.manufacturerSerial}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">공급사</dt>
              <dd>{item.receivedFromSupplierName || "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">입고일</dt>
              <dd>{item.registeredDate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">입고 담당자</dt>
              <dd>{item.receivedBy || "-"}</dd>
            </div>
            {item.inspectionStatus && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">검수 상태</dt>
                <dd>
                  <Badge variant="outline" className={cn("text-[10px]", 
                    item.inspectionStatus === 'passed' ? 'bg-emerald-50 text-emerald-700' :
                    item.inspectionStatus === 'failed' ? 'bg-red-50 text-red-700' :
                    'bg-amber-50 text-amber-700'
                  )}>
                    {item.inspectionStatus === 'passed' ? '합격' : item.inspectionStatus === 'failed' ? '불합격' : '대기'}
                  </Badge>
                </dd>
              </div>
            )}
            {item.inspectionNotes && (
              <div className="flex flex-col">
                <dt className="text-muted-foreground text-xs mb-1">검수 메모</dt>
                <dd className="text-xs bg-muted/50 rounded px-2 py-1.5 text-muted-foreground">{item.inspectionNotes}</dd>
              </div>
            )}
          </dl>
        </div>

        <Separator />

        {/* 출고 예정 정보 */}
        {outgoingRecord ? (
          <div>
            <p className="text-sm font-semibold mb-2">출고 예정</p>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground">{outgoingRecord.id}</p>
                  <p className="text-sm font-medium mt-1">{outgoingRecord.customerName}</p>
                  <p className="text-xs text-muted-foreground">{outgoingRecord.stopName}</p>
                </div>
                <Badge className={cn("text-[10px]", OUTGOING_STATUS_META[outgoingRecord.status as keyof typeof OUTGOING_STATUS_META]?.color)}>
                  {OUTGOING_STATUS_META[outgoingRecord.status as keyof typeof OUTGOING_STATUS_META]?.label}
                </Badge>
              </div>
              <Separator />
              <dl className="text-xs space-y-1">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">예정일</dt>
                  <dd>{outgoingRecord.scheduledDate}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">소유권</dt>
                  <dd>{outgoingRecord.ownershipType === 'rental' ? '임대' : '판매'}</dd>
                </div>
                {outgoingRecord.notes && (
                  <div className="flex flex-col col-span-2">
                    <dt className="text-muted-foreground mb-1">비고</dt>
                    <dd className="text-xs bg-white/50 rounded px-1.5 py-1">{outgoingRecord.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <p className="text-xs text-emerald-700">출고 예정이 없습니다.</p>
          </div>
        )}

        <Separator />

        {/* 사용자/소유자 정보 */}
        <div>
          <p className="text-sm font-semibold mb-2">소유자 정보</p>
          <dl className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">소유 유형</dt>
              <dd>{item.ownerType === 'customer' ? '고객사' : '파트너'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">소유자</dt>
              <dd>{item.ownerName}</dd>
            </div>
            {item.currentStopName && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">현재 위치</dt>
                <dd>{item.currentStopName}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">사용 기간</dt>
              <dd>{item.usageDays}일</dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}

function HistoryDrawer({ record, onClose }: { record: { kind: HistoryType; date: string; data: any }; onClose: () => void }) {
  const cfg = HISTORY_TYPE_CONFIG[record.kind];
  const Icon = cfg.icon;
  const d = record.data;

  // 유형별 입고지/출고지
  let fromPlace = "";
  let toPlace   = "";
  if (record.kind === "receiving") { fromPlace = d.supplierName;          toPlace = d.warehouseName; }
  if (record.kind === "outgoing")  { fromPlace = d.warehouseName;         toPlace = d.stopName ? `${d.customerName} · ${d.stopName}` : d.customerName; }
  if (record.kind === "transfer")  { fromPlace = d.fromWarehouseName;     toPlace = d.toWarehouseName; }
  if (record.kind === "return")    { fromPlace = d.stopName ? `${d.customerName} · ${d.stopName}` : d.customerName; toPlace = d.toWarehouseName; }

  // 품목 리스트
  const items: any[] = d.items || [];
  const totalQty = d.totalQuantity ?? items.length;

  // 상태 메타
  let statusMeta: { label: string; color: string } | undefined;
  if (record.kind === "receiving") statusMeta = RECEIVING_STATUS_META[d.status as keyof typeof RECEIVING_STATUS_META];
  if (record.kind === "outgoing")  statusMeta = OUTGOING_STATUS_META[d.status  as keyof typeof OUTGOING_STATUS_META];
  if (record.kind === "transfer")  statusMeta = TRANSFER_STATUS_META[d.status  as keyof typeof TRANSFER_STATUS_META];
  if (record.kind === "return")    statusMeta = RETURN_STATUS_META[d.status     as keyof typeof RETURN_STATUS_META];

  return (
    <>
      <SheetHeader className="px-6 pt-6 pb-4 border-b">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-5 w-5", cfg.color)} />
          <Badge variant="outline" className={cn("text-xs", cfg.color)}>{cfg.label}</Badge>
          {statusMeta && <Badge className={cn("text-[10px]", statusMeta.color)}>{statusMeta.label}</Badge>}
        </div>
        <SheetTitle className="font-mono text-base">{d.id}</SheetTitle>
        <SheetDescription className="text-xs text-muted-foreground">{record.date}</SheetDescription>
      </SheetHeader>

      <div className="px-6 py-4 space-y-5 overflow-y-auto">

        {/* 출발지 / 도착지 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">입고지 / 출발지</p>
            <p className="text-sm font-medium">{fromPlace || "-"}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">출고지 / 도착지</p>
            <p className="text-sm font-medium">{toPlace || "-"}</p>
          </div>
        </div>

        {/* 기본 정보 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">기본 정보</p>
          <dl className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <dt className="text-muted-foreground">총 수량</dt>
              <dd className="font-medium tabular-nums">{totalQty}건</dd>
            </div>
            {record.kind === "receiving" && (
              <>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">수령일</dt>
                  <dd>{d.receivedDate || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">수령자</dt>
                  <dd>{d.receivedBy || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">검수자</dt>
                  <dd>{d.inspectedBy || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">검수일시</dt>
                  <dd className="text-xs">{d.inspectedAt || "-"}</dd>
                </div>
              </>
            )}
            {record.kind === "outgoing" && (
              <>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">예정일</dt>
                  <dd>{d.scheduledDate || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">설치일</dt>
                  <dd>{d.installedDate || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">설치자</dt>
                  <dd>{d.installedBy || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">운영사 승인</dt>
                  <dd>{d.approvedBy || "승인 대기"}</dd>
                </div>
              </>
            )}
            {record.kind === "transfer" && (
              <>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">전출 유형</dt>
                  <dd>{d.fromPartnerId === d.toPartnerId ? "내부 전출" : "외부 전출"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">예정일</dt>
                  <dd>{d.scheduledDate || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">완료일</dt>
                  <dd>{d.completedDate || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">사유</dt>
                  <dd className="text-xs text-right max-w-[180px]">{d.reason || "-"}</dd>
                </div>
              </>
            )}
            {record.kind === "return" && (
              <>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">반품 사유</dt>
                  <dd>{d.reason || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">요청일</dt>
                  <dd>{d.requestedDate || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">수령일</dt>
                  <dd>{d.receivedDate || "-"}</dd>
                </div>
                <div className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">수령자</dt>
                  <dd>{d.receivedBy || "-"}</dd>
                </div>
              </>
            )}
          </dl>
        </div>

        <Separator />

        {/* 품목 리스트 */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">품목 목록</p>

          {/* 입고 - items에 quantity/passed/failed 포함 */}
          {record.kind === "receiving" && items.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[10px] h-7 font-semibold">품목</TableHead>
                    <TableHead className="text-[10px] h-7 font-semibold w-14 text-right">수량</TableHead>
                    <TableHead className="text-[10px] h-7 font-semibold w-14 text-right">합격</TableHead>
                    <TableHead className="text-[10px] h-7 font-semibold w-14 text-right">불합격</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs py-1.5">
                        {ASSET_TYPE_META[item.assetSubType as keyof typeof ASSET_TYPE_META]?.label || item.assetSubType}
                      </TableCell>
                      <TableCell className="text-xs py-1.5 text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right tabular-nums text-emerald-600">{item.passedQuantity ?? "-"}</TableCell>
                      <TableCell className="text-xs py-1.5 text-right tabular-nums text-red-500">{item.failedQuantity ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 출고/전출/반품 - items에 assetCode 포함 */}
          {(record.kind === "outgoing" || record.kind === "transfer") && items.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[10px] h-7 font-semibold">자산 코드</TableHead>
                    <TableHead className="text-[10px] h-7 font-semibold">품목</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-[11px] py-1.5">{item.assetCode}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        {ASSET_TYPE_META[item.assetSubType as keyof typeof ASSET_TYPE_META]?.label || item.assetSubType}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 반품 - condition 포함 */}
          {record.kind === "return" && items.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-[10px] h-7 font-semibold">자산 코드</TableHead>
                    <TableHead className="text-[10px] h-7 font-semibold">품목</TableHead>
                    <TableHead className="text-[10px] h-7 font-semibold w-16">상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-[11px] py-1.5">{item.assetCode}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        {ASSET_TYPE_META[item.assetSubType as keyof typeof ASSET_TYPE_META]?.label || item.assetSubType}
                      </TableCell>
                      <TableCell className="text-xs py-1.5">
                        <Badge variant="outline" className={cn("text-[10px]",
                          item.condition === "good"     ? "text-emerald-600 border-emerald-300" :
                          item.condition === "defective"? "text-red-500 border-red-300" : "text-amber-600 border-amber-300"
                        )}>
                          {item.condition === "good" ? "양호" : item.condition === "defective" ? "불량" : "수리필요"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">품목 정보가 없습니다.</p>
          )}
        </div>

        {/* 비고 */}
        {(d.notes || d.inspectionNotes) && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">비고</p>
              <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{d.notes || d.inspectionNotes}</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
