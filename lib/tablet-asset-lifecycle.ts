/**
 * Tablet Asset Lifecycle Management
 * 
 * /tablet 앱에서 사용하는 자산 라이프사이클 관리 로직
 * 
 * 자산 흐름:
 * 제조사/공급사 → 입고 → 창고보관 → 출고(설치배정) → 설치완료 → 운영중
 *                   ↑                                      ↓
 *              수리완료                              장애 발생
 *                   ↑                                      ↓
 *             ┌─────┴─────┐                          유지보수
 *             │ 철거(입고) │←────────────────────────────┘
 *             └─────┬─────┘
 *                   │
 *             ┌─────┴─────┐
 *             │   폐기    │
 *             └───────────┘
 */

import type { Asset, AssetStatus, AssetSubType, Warehouse, WorkOrder } from "./mock-data";
import { mockAssets, mockWarehouses, mockWorkOrders, ASSET_STATUS_META } from "./mock-data";

// ---------------------------------------------------------------------------
// 작업 유형 정의
// ---------------------------------------------------------------------------
export type TabletWorkType = 
  | "INSTALL"           // 설치
  | "MAINTENANCE"       // 유지보수 (수리)
  | "REPLACEMENT"       // 교체
  | "REMOVAL"           // 철거
  | "RELOCATION"        // 이전
  | "INSPECTION"        // 점검
  | "DISPOSAL";         // 폐기

export const TABLET_WORK_TYPE_META: Record<TabletWorkType, { label: string; description: string; targetStatuses: AssetStatus[] }> = {
  INSTALL: { 
    label: "설치", 
    description: "신규 자산을 정류장에 설치",
    targetStatuses: ["IN_STOCK", "PENDING_INSTALL"]
  },
  MAINTENANCE: { 
    label: "유지보수", 
    description: "장애/이상 현장 대응 및 수리",
    targetStatuses: ["OPERATING", "UNDER_REPAIR"]
  },
  REPLACEMENT: { 
    label: "교체", 
    description: "기존 자산을 새 자산으로 교체",
    targetStatuses: ["OPERATING", "UNDER_REPAIR"]
  },
  REMOVAL: { 
    label: "철거", 
    description: "정류장에서 자산 철거 후 회수",
    targetStatuses: ["OPERATING", "UNDER_REPAIR", "INSTALLED"]
  },
  RELOCATION: { 
    label: "이전", 
    description: "다른 위치로 자산 재배치",
    targetStatuses: ["OPERATING", "INSTALLED"]
  },
  INSPECTION: { 
    label: "점검", 
    description: "정기/긴급 점검",
    targetStatuses: ["OPERATING", "IN_STOCK"]
  },
  DISPOSAL: { 
    label: "폐기", 
    description: "수리 불가 자산 폐기 처리",
    targetStatuses: ["REMOVED", "PENDING_DISPOSAL"]
  },
};

// ---------------------------------------------------------------------------
// 자산 상태 전이 규칙
// ---------------------------------------------------------------------------
export type AssetTransition = {
  from: AssetStatus[];
  to: AssetStatus;
  workType: TabletWorkType;
  requiredRole: "installer" | "maintainer" | "both";
  description: string;
};

export const ASSET_TRANSITIONS: AssetTransition[] = [
  // 설치 작업
  { from: ["IN_STOCK"], to: "PENDING_INSTALL", workType: "INSTALL", requiredRole: "installer", description: "창고에서 출고하여 설치 배정" },
  { from: ["PENDING_INSTALL"], to: "INSTALLED", workType: "INSTALL", requiredRole: "installer", description: "현장 설치 완료" },
  { from: ["INSTALLED"], to: "OPERATING", workType: "INSTALL", requiredRole: "installer", description: "검수 승인 후 운영 시작" },
  
  // 유지보수 작업
  { from: ["OPERATING"], to: "UNDER_REPAIR", workType: "MAINTENANCE", requiredRole: "maintainer", description: "장애 발생으로 수리 시작" },
  { from: ["UNDER_REPAIR"], to: "OPERATING", workType: "MAINTENANCE", requiredRole: "maintainer", description: "수리 완료 후 운영 복귀" },
  
  // 교체 작업 (기존 자산은 철거, 새 자산은 설치)
  { from: ["OPERATING", "UNDER_REPAIR"], to: "REMOVED", workType: "REPLACEMENT", requiredRole: "maintainer", description: "교체를 위해 기존 자산 철거" },
  
  // 철거 작업
  { from: ["OPERATING", "UNDER_REPAIR", "INSTALLED"], to: "REMOVED", workType: "REMOVAL", requiredRole: "both", description: "정류장에서 자산 철거" },
  { from: ["REMOVED"], to: "IN_STOCK", workType: "REMOVAL", requiredRole: "both", description: "철거품 창고 입고 (수리 대기)" },
  { from: ["REMOVED"], to: "PENDING_DISPOSAL", workType: "REMOVAL", requiredRole: "maintainer", description: "수리 불가 판정, 폐기 대기" },
  
  // 이전 작업
  { from: ["OPERATING", "INSTALLED"], to: "RELOCATING", workType: "RELOCATION", requiredRole: "installer", description: "이전을 위해 철거" },
  { from: ["RELOCATING"], to: "INSTALLED", workType: "RELOCATION", requiredRole: "installer", description: "새 위치에 설치 완료" },
  
  // 점검 작업 (상태 변경 없음, 점검 이력만 기록)
  { from: ["OPERATING"], to: "OPERATING", workType: "INSPECTION", requiredRole: "both", description: "정기/긴급 점검 완료" },
  { from: ["IN_STOCK"], to: "IN_STOCK", workType: "INSPECTION", requiredRole: "both", description: "재고 자산 점검" },
  
  // 폐기 작업
  { from: ["PENDING_DISPOSAL"], to: "DISPOSED", workType: "DISPOSAL", requiredRole: "maintainer", description: "폐기 처리 완료" },
];

// ---------------------------------------------------------------------------
// 자산 상태 전이 검증
// ---------------------------------------------------------------------------
export function canTransition(
  currentStatus: AssetStatus,
  targetStatus: AssetStatus,
  workType: TabletWorkType,
  userRole: "installer" | "maintainer" | "both"
): { allowed: boolean; reason?: string } {
  const transition = ASSET_TRANSITIONS.find(
    t => t.from.includes(currentStatus) && t.to === targetStatus && t.workType === workType
  );
  
  if (!transition) {
    return { 
      allowed: false, 
      reason: `상태 전이 불가: ${ASSET_STATUS_META[currentStatus].label} → ${ASSET_STATUS_META[targetStatus].label} (작업: ${TABLET_WORK_TYPE_META[workType].label})` 
    };
  }
  
  // 권한 검증
  if (transition.requiredRole !== "both" && transition.requiredRole !== userRole && userRole !== "both") {
    return { 
      allowed: false, 
      reason: `권한 부족: ${transition.requiredRole === "installer" ? "설치/구축 기업" : "유지보수 기업"} 전용 작업입니다.` 
    };
  }
  
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// 자산 상태 전이 실행 (Mock)
// ---------------------------------------------------------------------------
export interface AssetTransitionResult {
  success: boolean;
  asset?: Asset;
  error?: string;
  transitionLog?: AssetTransitionLog;
}

export interface AssetTransitionLog {
  assetId: string;
  assetCode: string;
  fromStatus: AssetStatus;
  toStatus: AssetStatus;
  workType: TabletWorkType;
  workOrderId?: string;
  performedBy: string;
  performedAt: string;
  location?: {
    warehouseId?: string;
    warehouseName?: string;
    stopId?: string;
    stopName?: string;
  };
  notes?: string;
}

// In-memory transition log
const _transitionLogs: AssetTransitionLog[] = [];

export function executeAssetTransition(
  assetId: string,
  targetStatus: AssetStatus,
  workType: TabletWorkType,
  userRole: "installer" | "maintainer" | "both",
  performedBy: string,
  options?: {
    workOrderId?: string;
    warehouseId?: string;
    warehouseName?: string;
    stopId?: string;
    stopName?: string;
    notes?: string;
  }
): AssetTransitionResult {
  const assetIndex = mockAssets.findIndex(a => a.id === assetId);
  if (assetIndex === -1) {
    return { success: false, error: "자산을 찾을 수 없습니다." };
  }
  
  const asset = mockAssets[assetIndex];
  const validation = canTransition(asset.status, targetStatus, workType, userRole);
  
  if (!validation.allowed) {
    return { success: false, error: validation.reason };
  }
  
  const now = new Date().toISOString();
  const log: AssetTransitionLog = {
    assetId: asset.id,
    assetCode: asset.assetCode,
    fromStatus: asset.status,
    toStatus: targetStatus,
    workType,
    workOrderId: options?.workOrderId,
    performedBy,
    performedAt: now,
    location: {
      warehouseId: options?.warehouseId,
      warehouseName: options?.warehouseName,
      stopId: options?.stopId,
      stopName: options?.stopName,
    },
    notes: options?.notes,
  };
  
  // Update asset status and location
  const updatedAsset: Asset = {
    ...asset,
    status: targetStatus,
    modifiedAt: now,
  };
  
  // Update location based on target status
  if (targetStatus === "IN_STOCK" && options?.warehouseId) {
    updatedAsset.currentWarehouseId = options.warehouseId;
    updatedAsset.currentWarehouseName = options.warehouseName;
    updatedAsset.currentStopId = undefined;
    updatedAsset.currentStopName = undefined;
  } else if (["INSTALLED", "OPERATING"].includes(targetStatus) && options?.stopId) {
    updatedAsset.currentStopId = options.stopId;
    updatedAsset.currentStopName = options.stopName;
    updatedAsset.currentWarehouseId = undefined;
    updatedAsset.currentWarehouseName = undefined;
  }
  
  // Apply update (in real app, this would be an API call)
  mockAssets[assetIndex] = updatedAsset;
  _transitionLogs.push(log);
  
  return { success: true, asset: updatedAsset, transitionLog: log };
}

// ---------------------------------------------------------------------------
// 자산 조회 유틸리티
// ---------------------------------------------------------------------------

// 창고별 재고 조회
export function getWarehouseInventory(warehouseId: string): Asset[] {
  return mockAssets.filter(
    a => a.currentWarehouseId === warehouseId && 
    ["IN_STOCK", "PENDING_INSTALL", "REMOVED", "PENDING_DISPOSAL"].includes(a.status)
  );
}

// 설치 가능한 자산 조회
export function getInstallableAssets(warehouseId?: string): Asset[] {
  let assets = mockAssets.filter(a => a.status === "IN_STOCK" || a.status === "PENDING_INSTALL");
  if (warehouseId) {
    assets = assets.filter(a => a.currentWarehouseId === warehouseId);
  }
  return assets;
}

// 유지보수 대상 자산 조회 (현장 설치된 자산)
export function getMaintenanceTargetAssets(): Asset[] {
  return mockAssets.filter(a => ["OPERATING", "INSTALLED", "UNDER_REPAIR"].includes(a.status));
}

// 폐기 대기 자산 조회
export function getPendingDisposalAssets(): Asset[] {
  return mockAssets.filter(a => a.status === "PENDING_DISPOSAL");
}

// 자산 상태별 집계
export function getAssetStatusSummary(ownerType?: "partner" | "customer", ownerId?: string): Record<AssetStatus, number> {
  let assets = [...mockAssets];
  
  if (ownerType) {
    assets = assets.filter(a => a.ownerType === ownerType);
  }
  if (ownerId) {
    assets = assets.filter(a => a.ownerId === ownerId);
  }
  
  const summary: Record<AssetStatus, number> = {
    IN_STOCK: 0,
    PENDING_INSTALL: 0,
    INSTALLED: 0,
    OPERATING: 0,
    UNDER_REPAIR: 0,
    REMOVED: 0,
    RELOCATING: 0,
    PENDING_DISPOSAL: 0,
    DISPOSED: 0,
  };
  
  assets.forEach(a => {
    summary[a.status]++;
  });
  
  return summary;
}

// ---------------------------------------------------------------------------
// 작업지시서 연동
// ---------------------------------------------------------------------------

// 작업지시서에서 자산 정보 추출
export function getAssetFromWorkOrder(workOrder: WorkOrder): Asset | undefined {
  if (!workOrder.deviceId) return undefined;
  
  // deviceId로 연결된 자산 찾기
  return mockAssets.find(a => a.linkedDeviceId === workOrder.deviceId);
}

// 작업 완료 시 자산 상태 업데이트
export function completeWorkOrderWithAsset(
  workOrderId: string,
  newAssetStatus: AssetStatus,
  workType: TabletWorkType,
  userRole: "installer" | "maintainer" | "both",
  performedBy: string,
  options?: {
    warehouseId?: string;
    warehouseName?: string;
    stopId?: string;
    stopName?: string;
    notes?: string;
  }
): AssetTransitionResult {
  const workOrder = mockWorkOrders.find(wo => wo.id === workOrderId);
  if (!workOrder) {
    return { success: false, error: "작업지시서를 찾을 수 없습니다." };
  }
  
  const asset = getAssetFromWorkOrder(workOrder);
  if (!asset) {
    // 자산이 없는 작업 (점검 등)은 성공 처리
    return { success: true };
  }
  
  return executeAssetTransition(
    asset.id,
    newAssetStatus,
    workType,
    userRole,
    performedBy,
    { ...options, workOrderId }
  );
}

// ---------------------------------------------------------------------------
// 입고/출고 처리
// ---------------------------------------------------------------------------

export interface ReceivingRequest {
  assetId?: string;           // 기존 자산 재입고
  newAsset?: {               // 신규 자산 입고
    assetSubType: AssetSubType;
    manufacturerSerial?: string;
    model?: string;
    ownerType: "partner" | "customer";
    ownerId: string;
    ownerName: string;
  };
  warehouseId: string;
  warehouseName: string;
  supplierId?: string;
  supplierName?: string;
  receivedBy: string;
  notes?: string;
}

export function processReceiving(request: ReceivingRequest): AssetTransitionResult {
  const now = new Date().toISOString();
  
  if (request.assetId) {
    // 기존 자산 재입고 (철거품 등)
    return executeAssetTransition(
      request.assetId,
      "IN_STOCK",
      "REMOVAL",
      "both",
      request.receivedBy,
      {
        warehouseId: request.warehouseId,
        warehouseName: request.warehouseName,
        notes: request.notes,
      }
    );
  }
  
  // 신규 자산 생성은 Portal에서 처리 (Tablet에서는 입고 확인만)
  return { success: false, error: "신규 자산 등록은 Portal에서 진행해주세요." };
}

export interface DispatchRequest {
  assetId: string;
  workOrderId: string;
  dispatchedBy: string;
  notes?: string;
}

export function processDispatch(request: DispatchRequest): AssetTransitionResult {
  return executeAssetTransition(
    request.assetId,
    "PENDING_INSTALL",
    "INSTALL",
    "installer",
    request.dispatchedBy,
    {
      workOrderId: request.workOrderId,
      notes: request.notes,
    }
  );
}

// ---------------------------------------------------------------------------
// 전이 로그 조회
// ---------------------------------------------------------------------------
export function getTransitionLogs(assetId?: string, limit = 50): AssetTransitionLog[] {
  let logs = [..._transitionLogs];
  
  if (assetId) {
    logs = logs.filter(l => l.assetId === assetId);
  }
  
  return logs.slice(-limit).reverse();
}

// ---------------------------------------------------------------------------
// 창고 조회
// ---------------------------------------------------------------------------
export function getWarehouses(partnerId?: string): Warehouse[] {
  if (partnerId) {
    return mockWarehouses.filter(w => w.partnerId === partnerId && w.isActive);
  }
  return mockWarehouses.filter(w => w.isActive);
}

export function getWarehouseById(warehouseId: string): Warehouse | undefined {
  return mockWarehouses.find(w => w.id === warehouseId);
}
