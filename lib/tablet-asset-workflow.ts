/**
 * /tablet 자산 라이프사이클 워크플로우
 * 
 * 설치/구축 기업: 창고 출고 → 정류장 설치 → 입고(철거)
 * 유지보수 기업: 부품 출고 → 현장 교체 → 입고
 * 
 * Asset 상태 전이:
 * RECEIVED → WAREHOUSED → DISPATCHED → INSTALLED/MAINTAINED → RECALLED/DISPOSED
 */

export type AssetStatus =
  | "RECEIVED"        // 입고됨 (창고 도착)
  | "WAREHOUSED"      // 창고보관 (재고 대기)
  | "DISPATCHED"      // 출고됨 (현장 배정)
  | "INSTALLED"       // 설치됨 (정류장에 설치)
  | "MAINTAINED"      // 유지보수됨 (현장 부품 교체)
  | "RECALLED"        // 철거됨 (정류장에서 철거)
  | "RETURNED"        // 반납됨 (창고 복귀)
  | "DISPOSED";       // 폐기됨 (최종 폐기)

export const ASSET_STATUS_WORKFLOW = {
  RECEIVED: { label: "입고됨", color: "secondary", nextStates: ["WAREHOUSED"] },
  WAREHOUSED: { label: "창고보관", color: "outline", nextStates: ["DISPATCHED", "DISPOSED"] },
  DISPATCHED: { label: "출고됨", color: "default", nextStates: ["INSTALLED", "MAINTAINED", "RETURNED"] },
  INSTALLED: { label: "설치됨", color: "default", nextStates: ["MAINTAINED", "RECALLED"] },
  MAINTAINED: { label: "유지보수", color: "default", nextStates: ["RECALLED", "DISPOSED"] },
  RECALLED: { label: "철거됨", color: "secondary", nextStates: ["RETURNED", "DISPOSED"] },
  RETURNED: { label: "반납됨", color: "secondary", nextStates: ["WAREHOUSED", "DISPOSED"] },
  DISPOSED: { label: "폐기됨", color: "destructive", nextStates: [] },
} as const;

/**
 * Tablet 작업 타입별 자산 상태 변경 규칙
 */

// 1. 설치 작업 워크플로우
export interface InstallAssetWorkflow {
  assetId: string;
  serialNumber: string;
  currentStatus: AssetStatus;
  
  // 출고 단계 (설치 전)
  warehouseId: string;
  dispatchedAt: string;
  dispatchedBy: string;
  
  // 설치 단계
  installationAt?: string;
  installedBy?: string;
  stationId?: string;
  deviceId?: string;
  
  // 설치 보고
  installationPhotos?: string[];
  checklist?: Record<string, boolean>;
  completedAt?: string;
  
  // 상태 변경 이력
  statusHistory: {
    status: AssetStatus;
    changedAt: string;
    changedBy: string;
    reason: string;
  }[];
}

// 2. 유지보수 작업 워크플로우
export interface MaintenanceAssetWorkflow {
  assetId: string;
  serialNumber: string;
  currentStatus: AssetStatus;
  
  // 부품 출고 (유지보수 전)
  dispatchedAt: string;
  dispatchedBy: string;
  maintenanceReason: string;
  
  // 현장 교체
  replacedAt?: string;
  replacedBy?: string;
  stationId?: string;
  oldDeviceId?: string;
  newDeviceId?: string;
  
  // 교체 보고
  replacementPhotos?: string[];
  checklist?: Record<string, boolean>;
  completedAt?: string;
  
  // 폐기 판정
  disposalRequired?: boolean;
  disposalReason?: string;
  
  statusHistory: {
    status: AssetStatus;
    changedAt: string;
    changedBy: string;
    reason: string;
  }[];
}

// 3. 철거/폐기 워크플로우
export interface RecallAssetWorkflow {
  assetId: string;
  serialNumber: string;
  currentStatus: AssetStatus;
  
  // 철거 단계
  recalledAt: string;
  recalledBy: string;
  stationId: string;
  deviceId: string;
  recallReason: "MAINTENANCE" | "FAILURE" | "DECOMMISSION" | "UPGRADE";
  
  // 철거 보고
  recallPhotos?: string[];
  checklist?: Record<string, boolean>;
  
  // 반납 또는 폐기
  returnedAt?: string;
  disposalAt?: string;
  disposalReason?: string;
  
  statusHistory: {
    status: AssetStatus;
    changedAt: string;
    changedBy: string;
    reason: string;
  }[];
}

/**
 * 상태 전이 검증
 */
export function isValidAssetTransition(
  currentStatus: AssetStatus,
  nextStatus: AssetStatus
): boolean {
  const allowed = ASSET_STATUS_WORKFLOW[currentStatus].nextStates;
  return allowed.includes(nextStatus as AssetStatus);
}

/**
 * 작업 타입에 따른 권한 확인
 */
export type TabletUserRole = "installer" | "maintainer" | "both";

export function canPerformAssetAction(
  userRole: TabletUserRole,
  workflowType: "install" | "maintenance" | "recall"
): boolean {
  if (userRole === "both") return true;
  
  const rolePermissions = {
    installer: ["install", "recall"],
    maintainer: ["maintenance", "recall"],
  };
  
  return rolePermissions[userRole]?.includes(workflowType) ?? false;
}

/**
 * 자산 상태 변경 기록
 */
export function recordAssetStatusChange(
  workflow: InstallAssetWorkflow | MaintenanceAssetWorkflow | RecallAssetWorkflow,
  newStatus: AssetStatus,
  changedBy: string,
  reason: string
) {
  if (!isValidAssetTransition(workflow.currentStatus, newStatus)) {
    throw new Error(
      `Invalid transition: ${workflow.currentStatus} → ${newStatus}`
    );
  }
  
  workflow.statusHistory.push({
    status: newStatus,
    changedAt: new Date().toISOString(),
    changedBy,
    reason,
  });
  
  workflow.currentStatus = newStatus;
}

/**
 * Outbox 큐에 자산 작업 완료 사항 추가
 */
export interface AssetOutboxItem {
  id: string;
  type: "asset-install" | "asset-maintenance" | "asset-recall" | "asset-disposal";
  workflow: InstallAssetWorkflow | MaintenanceAssetWorkflow | RecallAssetWorkflow;
  status: "pending" | "synced" | "failed";
  createdAt: string;
  syncedAt?: string;
  retryCount: number;
}

export function createAssetOutboxItem(
  workflow: InstallAssetWorkflow | MaintenanceAssetWorkflow | RecallAssetWorkflow,
  type: AssetOutboxItem["type"]
): AssetOutboxItem {
  return {
    id: `asset-${Date.now()}`,
    type,
    workflow,
    status: "pending",
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
}
