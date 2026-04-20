"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  Warehouse,
  Box,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  RefreshCw,
  X,
} from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { tabletKoKR } from "@/lib/tablet-i18n";
import {
  mockWarehouses,
  mockAssets,
  ASSET_STATUS_META,
  type Asset,
  type AssetStatus,
  type Warehouse as WarehouseType,
} from "@/lib/mock-data";
import {
  getWarehouseInventory,
  getWarehouses,
  getAssetStatusSummary,
  processDispatch,
  type AssetTransitionLog,
} from "@/lib/tablet-asset-lifecycle";
import {
  createReceivingOutbox,
  createDispatchOutbox,
  createAssetStatusOutbox,
} from "@/lib/tablet-install-data";
import { pushOutboxItem } from "@/lib/tablet-outbox";

// ---------------------------------------------------------------------------
// Asset Status 색상 매핑 (Tablet Dark Theme)
// ---------------------------------------------------------------------------
const ASSET_STATUS_COLORS: Record<AssetStatus, string> = {
  IN_STOCK:         "#10b981",  // emerald
  PENDING_INSTALL:  "#3b82f6",  // blue
  INSTALLED:        "#06b6d4",  // cyan
  OPERATING:        "#10b981",  // emerald
  UNDER_REPAIR:     "#f59e0b",  // amber
  REMOVED:          "#94a3b8",  // slate
  RELOCATING:       "#8b5cf6",  // violet
  PENDING_DISPOSAL: "#ef4444",  // red
  DISPOSED:         "#64748b",  // slate-dark
};

// ---------------------------------------------------------------------------
// KPI 카드
// ---------------------------------------------------------------------------
function KpiChip({
  label,
  value,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  color: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-3 rounded-xl border transition-all min-w-[90px]",
        active
          ? "border-[var(--tablet-accent)] bg-[var(--tablet-bg-elevated)]"
          : "border-[var(--tablet-border)] bg-[var(--tablet-bg-card)] hover:border-[var(--tablet-accent)]/50"
      )}
    >
      <span className="text-2xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="text-[11px] text-[var(--tablet-text-muted)] mt-0.5">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 창고 셀렉터 탭
// ---------------------------------------------------------------------------
function WarehouseTab({
  warehouse,
  active,
  count,
  onClick,
}: {
  warehouse: WarehouseType;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all whitespace-nowrap",
        active
          ? "bg-[var(--tablet-accent)] border-[var(--tablet-accent)] text-white font-medium"
          : "border-[var(--tablet-border)] bg-[var(--tablet-bg-card)] text-[var(--tablet-text-muted)] hover:border-[var(--tablet-accent)]/50"
      )}
    >
      <Warehouse className="h-4 w-4 shrink-0" />
      <span>{warehouse.name}</span>
      <Badge
        className={cn(
          "text-[10px] px-1.5 py-0 h-5",
          active ? "bg-white/20 text-white" : "bg-[var(--tablet-bg-elevated)] text-[var(--tablet-text)]"
        )}
      >
        {count}
      </Badge>
    </button>
  );
}

// ---------------------------------------------------------------------------
// 자산 아이템 카드
// ---------------------------------------------------------------------------
function AssetCard({
  asset,
  onClick,
}: {
  asset: Asset;
  onClick: () => void;
}) {
  const statusMeta = ASSET_STATUS_META[asset.status];
  const statusColor = ASSET_STATUS_COLORS[asset.status];

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
        "border-[var(--tablet-border)] bg-[var(--tablet-bg-card)]",
        "hover:border-[var(--tablet-accent)]/50 hover:bg-[var(--tablet-bg-elevated)]",
        "active:scale-[0.99]"
      )}
    >
      {/* 상태 인디케이터 */}
      <div
        className="h-10 w-1 rounded-full shrink-0"
        style={{ backgroundColor: statusColor }}
      />

      {/* 아이콘 */}
      <div
        className="p-2.5 rounded-xl shrink-0"
        style={{ backgroundColor: `${statusColor}18` }}
      >
        <Box className="h-5 w-5" style={{ color: statusColor }} />
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-[var(--tablet-text)] truncate">
            {asset.assetCode}
          </p>
          <Badge
            className="text-[10px] px-1.5 py-0 h-4 shrink-0"
            style={{
              backgroundColor: `${statusColor}20`,
              color: statusColor,
              border: `1px solid ${statusColor}40`,
            }}
          >
            {statusMeta.label}
          </Badge>
        </div>
        <p className="text-xs text-[var(--tablet-text-muted)] truncate">
          {asset.model || "-"} · {asset.manufacturerName || "-"}
        </p>
        {asset.manufacturerSerial && (
          <p className="text-[11px] text-[var(--tablet-text-muted)]/60 font-mono mt-0.5 truncate">
            S/N: {asset.manufacturerSerial}
          </p>
        )}
      </div>

      {/* 날짜 */}
      <div className="text-right shrink-0">
        <p className="text-[11px] text-[var(--tablet-text-muted)]">
          {asset.receivedDate || "-"}
        </p>
        <ChevronRight className="h-4 w-4 text-[var(--tablet-text-muted)] ml-auto mt-1" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 자산 상세 Sheet
// ---------------------------------------------------------------------------
function AssetDetailSheet({
  asset,
  open,
  onClose,
  onReceiving,
  onDispatch,
  onDispose,
}: {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  onReceiving: (asset: Asset) => void;
  onDispatch: (asset: Asset) => void;
  onDispose: (asset: Asset) => void;
}) {
  if (!asset) return null;

  const statusColor = ASSET_STATUS_COLORS[asset.status];
  const statusMeta = ASSET_STATUS_META[asset.status];

  const rows: { label: string; value: string }[] = [
    { label: "자산 코드", value: asset.assetCode },
    { label: "모델", value: asset.model || "-" },
    { label: "제조사", value: asset.manufacturerName || "-" },
    { label: "시리얼 번호", value: asset.manufacturerSerial || "-" },
    { label: "소유자", value: asset.ownerName },
    { label: "현재 위치", value: asset.currentWarehouseName || asset.currentStopName || "-" },
    { label: "입고일", value: asset.receivedDate || "-" },
    { label: "검수 상태", value: asset.inspectionStatus === "passed" ? "검수 완료" : asset.inspectionStatus === "failed" ? "검수 불가" : "검수 대기" },
    { label: "등록일", value: asset.registeredDate || "-" },
    { label: "최종 수정", value: asset.modifiedAt?.slice(0, 10) || "-" },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-[400px] sm:w-[480px] bg-[var(--tablet-bg)] border-[var(--tablet-border)] flex flex-col"
      >
        <SheetHeader className="pb-4 border-b border-[var(--tablet-border)]">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: `${statusColor}20` }}
            >
              <Box className="h-6 w-6" style={{ color: statusColor }} />
            </div>
            <div>
              <SheetTitle className="text-[var(--tablet-text)] text-base">
                {asset.assetCode}
              </SheetTitle>
              <SheetDescription className="text-[var(--tablet-text-muted)] text-xs mt-0.5">
                {asset.model || "-"} · {asset.manufacturerName || "-"}
              </SheetDescription>
            </div>
            <Badge
              className="ml-auto shrink-0 text-xs"
              style={{
                backgroundColor: `${statusColor}20`,
                color: statusColor,
                border: `1px solid ${statusColor}40`,
              }}
            >
              {statusMeta.label}
            </Badge>
          </div>
        </SheetHeader>

        {/* 상세 정보 */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex justify-between items-center py-2 border-b border-[var(--tablet-border)]/50"
            >
              <span className="text-xs text-[var(--tablet-text-muted)]">{label}</span>
              <span className="text-xs text-[var(--tablet-text)] font-medium max-w-[60%] text-right break-all">
                {value}
              </span>
            </div>
          ))}

          {asset.inspectionNotes && (
            <div className="mt-3 p-3 rounded-xl bg-[var(--tablet-bg-elevated)] border border-[var(--tablet-border)]">
              <p className="text-xs text-[var(--tablet-text-muted)] mb-1">검수 비고</p>
              <p className="text-xs text-[var(--tablet-text)]">{asset.inspectionNotes}</p>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="pt-4 border-t border-[var(--tablet-border)] space-y-2">
          {asset.status === "IN_STOCK" && (
            <Button
              className="w-full h-12 bg-[var(--tablet-install)] hover:bg-[var(--tablet-install)]/80 text-white"
              onClick={() => { onClose(); onDispatch(asset); }}
            >
              <ArrowUpFromLine className="h-4 w-4 mr-2" />
              출고 처리
            </Button>
          )}
          {asset.status === "REMOVED" && (
            <Button
              className="w-full h-12 bg-[var(--tablet-maintenance)] hover:bg-[var(--tablet-maintenance)]/80 text-white"
              onClick={() => { onClose(); onReceiving(asset); }}
            >
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              입고 처리 (재입고)
            </Button>
          )}
          {(asset.status === "IN_STOCK" || asset.status === "REMOVED" || asset.status === "PENDING_DISPOSAL") && (
            <Button
              variant="outline"
              className="w-full h-12 border-red-800/50 text-red-400 hover:bg-red-950/30"
              onClick={() => { onClose(); onDispose(asset); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              폐기 처리
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// 출고 처리 Sheet
// ---------------------------------------------------------------------------
function DispatchSheet({
  asset,
  open,
  onClose,
  onConfirm,
}: {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (destinationStopName: string, notes: string) => void;
}) {
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");

  if (!asset) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="bg-[var(--tablet-bg)] border-[var(--tablet-border)] rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-[var(--tablet-text)]">출고 처리</SheetTitle>
          <SheetDescription className="text-[var(--tablet-text-muted)]">
            {asset.assetCode} 자산을 출고합니다
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-[var(--tablet-text-muted)] mb-1.5 block">
              출고 목적지 (정류장명)
            </label>
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="예: 강남역 1번출구"
              className="h-12 bg-[var(--tablet-bg-elevated)] border-[var(--tablet-border)] text-[var(--tablet-text)]"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--tablet-text-muted)] mb-1.5 block">비고</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="작업 메모 (선택)"
              className="h-12 bg-[var(--tablet-bg-elevated)] border-[var(--tablet-border)] text-[var(--tablet-text)]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 border-[var(--tablet-border)] text-[var(--tablet-text)]"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              className="flex-1 h-12 bg-[var(--tablet-install)] hover:bg-[var(--tablet-install)]/80 text-white"
              disabled={!destination.trim()}
              onClick={() => {
                onConfirm(destination.trim(), notes.trim());
                setDestination("");
                setNotes("");
              }}
            >
              <ArrowUpFromLine className="h-4 w-4 mr-2" />
              출고 확정
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// 입고 처리 Sheet
// ---------------------------------------------------------------------------
function ReceivingSheet({
  asset,
  open,
  onClose,
  onConfirm,
}: {
  asset: Asset | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (inspectionStatus: "passed" | "failed" | "pending", notes: string) => void;
}) {
  const [inspectionStatus, setInspectionStatus] = useState<"passed" | "failed" | "pending">("pending");
  const [notes, setNotes] = useState("");

  if (!asset) return null;

  const options: { value: "passed" | "failed" | "pending"; label: string; color: string }[] = [
    { value: "passed", label: "검수 완료", color: "#10b981" },
    { value: "pending", label: "검수 대기", color: "#f59e0b" },
    { value: "failed", label: "검수 불가", color: "#ef4444" },
  ];

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="bg-[var(--tablet-bg)] border-[var(--tablet-border)] rounded-t-2xl"
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-[var(--tablet-text)]">입고 처리</SheetTitle>
          <SheetDescription className="text-[var(--tablet-text-muted)]">
            {asset.assetCode} 자산을 입고합니다
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-[var(--tablet-text-muted)] mb-2 block">검수 상태</label>
            <div className="flex gap-2">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInspectionStatus(opt.value)}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    inspectionStatus === opt.value
                      ? "text-white"
                      : "border-[var(--tablet-border)] bg-[var(--tablet-bg-card)] text-[var(--tablet-text-muted)]"
                  )}
                  style={
                    inspectionStatus === opt.value
                      ? { backgroundColor: opt.color, borderColor: opt.color }
                      : {}
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--tablet-text-muted)] mb-1.5 block">비고</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="입고 비고 (선택)"
              className="h-12 bg-[var(--tablet-bg-elevated)] border-[var(--tablet-border)] text-[var(--tablet-text)]"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 border-[var(--tablet-border)] text-[var(--tablet-text)]"
              onClick={onClose}
            >
              취소
            </Button>
            <Button
              className="flex-1 h-12 bg-[var(--tablet-maintenance)] hover:bg-[var(--tablet-maintenance)]/80 text-white"
              onClick={() => {
                onConfirm(inspectionStatus, notes.trim());
                setNotes("");
                setInspectionStatus("pending");
              }}
            >
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              입고 확정
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Toast 알림
// ---------------------------------------------------------------------------
function Toast({ message, type, onClose }: { message: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div
      className={cn(
        "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-2 px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white",
        "animate-in slide-in-from-bottom-4 duration-300",
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      )}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      )}
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function WarehousePage() {
  const router = useRouter();

  const warehouses = useMemo(() => getWarehouses(), []);
  const [activeWarehouseId, setActiveWarehouseId] = useState<string>(
    warehouses[0]?.id ?? ""
  );
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [dispatchAsset, setDispatchAsset] = useState<Asset | null>(null);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [receivingAsset, setReceivingAsset] = useState<Asset | null>(null);
  const [isReceivingOpen, setIsReceivingOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 활성 창고의 재고
  const inventory = useMemo(
    () => getWarehouseInventory(activeWarehouseId),
    [activeWarehouseId]
  );

  // 창고별 재고 수
  const warehouseCount = useMemo(
    () =>
      Object.fromEntries(
        warehouses.map((wh) => [wh.id, getWarehouseInventory(wh.id).length])
      ),
    [warehouses]
  );

  // KPI 집계
  const kpi = useMemo(() => {
    const inStock = inventory.filter((a) => a.status === "IN_STOCK").length;
    const pendingInstall = inventory.filter((a) => a.status === "PENDING_INSTALL").length;
    const removed = inventory.filter((a) => a.status === "REMOVED").length;
    const pendingDisposal = inventory.filter((a) => a.status === "PENDING_DISPOSAL").length;
    return { inStock, pendingInstall, removed, pendingDisposal, total: inventory.length };
  }, [inventory]);

  // 필터링
  const filtered = useMemo(() => {
    return inventory.filter((a) => {
      if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          a.assetCode.toLowerCase().includes(q) ||
          (a.model || "").toLowerCase().includes(q) ||
          (a.manufacturerSerial || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [inventory, statusFilter, searchQuery]);

  // 활성 창고 정보
  const activeWarehouse = warehouses.find((w) => w.id === activeWarehouseId);

  // 알림 표시
  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // 출고 처리
  function handleDispatchConfirm(destinationStopName: string, notes: string) {
    if (!dispatchAsset || !activeWarehouse) return;
    const outbox = createDispatchOutbox(
      dispatchAsset.id,
      dispatchAsset.assetCode,
      activeWarehouseId,
      activeWarehouse.name,
      `WO-DISPATCH-${Date.now()}`,
      { destinationStopId: "", destinationStopName, notes: notes || undefined }
    );
    pushOutboxItem(outbox);
    setIsDispatchOpen(false);
    setDispatchAsset(null);
    showToast(`${dispatchAsset.assetCode} 출고 처리가 완료되었습니다`, "success");
  }

  // 입고 처리
  function handleReceivingConfirm(
    inspectionStatus: "passed" | "failed" | "pending",
    notes: string
  ) {
    if (!receivingAsset || !activeWarehouse) return;
    const outbox = createReceivingOutbox(
      receivingAsset.id,
      receivingAsset.assetCode,
      activeWarehouseId,
      activeWarehouse.name,
      { inspectionStatus, notes: notes || undefined }
    );
    pushOutboxItem(outbox);
    setIsReceivingOpen(false);
    setReceivingAsset(null);
    showToast(`${receivingAsset.assetCode} 입고 처리가 완료되었습니다`, "success");
  }

  // 폐기 처리
  function handleDispose(asset: Asset) {
    const outbox = createAssetStatusOutbox(
      asset.id,
      asset.assetCode,
      asset.status,
      "PENDING_DISPOSAL",
      { reason: "현장 폐기 처리" }
    );
    pushOutboxItem(outbox);
    showToast(`${asset.assetCode} 폐기 처리가 Outbox에 추가되었습니다`, "success");
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "var(--tablet-bg)", color: "var(--tablet-text)" }}
    >
      {/* 헤더 */}
      <div className="px-5 pt-5 pb-4 border-b border-[var(--tablet-border)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-[var(--tablet-text)]">
              {tabletKoKR.warehouse.title}
            </h1>
            <p className="text-xs text-[var(--tablet-text-muted)] mt-0.5">
              {activeWarehouse?.name} · {activeWarehouse?.address}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-[var(--tablet-maintenance)] hover:bg-[var(--tablet-maintenance)]/80 text-white"
              onClick={() => {
                setReceivingAsset(mockAssets.find(a => a.status === "REMOVED") ?? null);
                setIsReceivingOpen(true);
              }}
            >
              <ArrowDownToLine className="h-4 w-4" />
              입고
            </Button>
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-[var(--tablet-install)] hover:bg-[var(--tablet-install)]/80 text-white"
              onClick={() => {
                const inStockAsset = inventory.find(a => a.status === "IN_STOCK");
                if (inStockAsset) {
                  setDispatchAsset(inStockAsset);
                  setIsDispatchOpen(true);
                } else {
                  showToast("출고 가능한 재고 자산이 없습니다", "error");
                }
              }}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              출고
            </Button>
          </div>
        </div>

        {/* 창고 탭 */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {warehouses.map((wh) => (
            <WarehouseTab
              key={wh.id}
              warehouse={wh}
              active={activeWarehouseId === wh.id}
              count={warehouseCount[wh.id] ?? 0}
              onClick={() => {
                setActiveWarehouseId(wh.id);
                setStatusFilter("ALL");
                setSearchQuery("");
              }}
            />
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="px-5 py-4 border-b border-[var(--tablet-border)]">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <KpiChip
            label="전체"
            value={kpi.total}
            color="var(--tablet-text)"
            active={statusFilter === "ALL"}
            onClick={() => setStatusFilter("ALL")}
          />
          <KpiChip
            label="재고"
            value={kpi.inStock}
            color={ASSET_STATUS_COLORS["IN_STOCK"]}
            active={statusFilter === "IN_STOCK"}
            onClick={() => setStatusFilter("IN_STOCK")}
          />
          <KpiChip
            label="설치예정"
            value={kpi.pendingInstall}
            color={ASSET_STATUS_COLORS["PENDING_INSTALL"]}
            active={statusFilter === "PENDING_INSTALL"}
            onClick={() => setStatusFilter("PENDING_INSTALL")}
          />
          <KpiChip
            label="철거품"
            value={kpi.removed}
            color={ASSET_STATUS_COLORS["REMOVED"]}
            active={statusFilter === "REMOVED"}
            onClick={() => setStatusFilter("REMOVED")}
          />
          <KpiChip
            label="폐기대기"
            value={kpi.pendingDisposal}
            color={ASSET_STATUS_COLORS["PENDING_DISPOSAL"]}
            active={statusFilter === "PENDING_DISPOSAL"}
            onClick={() => setStatusFilter("PENDING_DISPOSAL")}
          />
        </div>
      </div>

      {/* 검색 */}
      <div className="px-5 py-3 border-b border-[var(--tablet-border)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--tablet-text-muted)]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="자산 코드, 모델, S/N 검색"
            className="pl-9 h-11 bg-[var(--tablet-bg-card)] border-[var(--tablet-border)] text-[var(--tablet-text)] placeholder:text-[var(--tablet-text-muted)]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-[var(--tablet-text-muted)]" />
            </button>
          )}
        </div>
      </div>

      {/* 자산 목록 */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Package className="h-10 w-10 text-[var(--tablet-text-muted)]/30" />
            <p className="text-sm text-[var(--tablet-text-muted)]">
              {searchQuery ? "검색 결과가 없습니다" : "해당 상태의 자산이 없습니다"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-[var(--tablet-text-muted)] pb-1">
              총 {filtered.length}개 자산
            </p>
            {filtered.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                onClick={() => {
                  setSelectedAsset(asset);
                  setIsDetailOpen(true);
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* 자산 상세 Sheet */}
      <AssetDetailSheet
        asset={selectedAsset}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onReceiving={(asset) => {
          setReceivingAsset(asset);
          setIsReceivingOpen(true);
        }}
        onDispatch={(asset) => {
          setDispatchAsset(asset);
          setIsDispatchOpen(true);
        }}
        onDispose={handleDispose}
      />

      {/* 출고 처리 Sheet */}
      <DispatchSheet
        asset={dispatchAsset}
        open={isDispatchOpen}
        onClose={() => { setIsDispatchOpen(false); setDispatchAsset(null); }}
        onConfirm={handleDispatchConfirm}
      />

      {/* 입고 처리 Sheet */}
      <ReceivingSheet
        asset={receivingAsset}
        open={isReceivingOpen}
        onClose={() => { setIsReceivingOpen(false); setReceivingAsset(null); }}
        onConfirm={handleReceivingConfirm}
      />

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
