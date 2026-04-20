/**
 * Tablet ↔ Portal Data Synchronization
 * 
 * /tablet과 Portal 모듈 간 데이터 동기화 로직
 * 
 * 연동 관계:
 * - Registry > Asset: 자산 마스터, 창고 재고, 입출고
 * - Registry: 정류장, 단말 마스터
 * - Field Operations: 작업 지시, 완료 보고
 * - RMS: 실시간 상태, 장애 정보
 */

import { 
  mockAssets, 
  mockDevices, 
  mockWorkOrders, 
  mockWarehouses,
  mockBusStops,
  mockFaults,
  type Asset,
  type Device,
  type WorkOrder,
  type Warehouse,
  type BusStopLocation,
  type Fault,
  type AssetStatus,
  type WorkOrderStatus,
} from "./mock-data";
import { 
  mockBisTerminals, 
  mockInstallAssignments,
  type BisTerminal,
  type InstallAssignment,
} from "./tablet-install-data";
import { getOverallSnapshot } from "@/components/rms/shared/overall-state-mock";
import { tabletToMonitoringId } from "./rms-device-map";
import type { OverallSnapshot, OverallSeverity } from "@/components/rms/shared/overall-state-types";

// ---------------------------------------------------------------------------
// 동기화 상태 관리
// ---------------------------------------------------------------------------
export interface SyncState {
  lastSyncAt: string | null;
  pendingChanges: number;
  isSyncing: boolean;
  syncError: string | null;
}

let _syncState: SyncState = {
  lastSyncAt: null,
  pendingChanges: 0,
  isSyncing: false,
  syncError: null,
};

export function getSyncState(): SyncState {
  return { ..._syncState };
}

// ---------------------------------------------------------------------------
// Registry 연동: 자산 데이터
// ---------------------------------------------------------------------------

/**
 * 창고별 재고 조회 (Registry > Asset 연동)
 */
export function getWarehouseAssets(warehouseId: string): Asset[] {
  return mockAssets.filter(a => 
    a.currentWarehouseId === warehouseId && 
    ["IN_STOCK", "PENDING_INSTALL", "REMOVED", "PENDING_DISPOSAL"].includes(a.status)
  );
}

/**
 * 설치 가능 자산 조회 (출고 대상)
 */
export function getAvailableForInstall(warehouseId?: string): Asset[] {
  let assets = mockAssets.filter(a => a.status === "IN_STOCK");
  if (warehouseId) {
    assets = assets.filter(a => a.currentWarehouseId === warehouseId);
  }
  return assets;
}

/**
 * 입고 대기 자산 조회 (철거품 등)
 */
export function getPendingReceiving(): Asset[] {
  return mockAssets.filter(a => 
    a.status === "REMOVED" && !a.currentWarehouseId
  );
}

/**
 * 자산 상태 집계 (대시보드용)
 */
export interface AssetSyncSummary {
  total: number;
  inStock: number;
  pendingInstall: number;
  operating: number;
  underRepair: number;
  removed: number;
  pendingDisposal: number;
}

export function getAssetSummary(ownerId?: string): AssetSyncSummary {
  let assets = [...mockAssets];
  if (ownerId) {
    assets = assets.filter(a => a.ownerId === ownerId);
  }
  
  return {
    total: assets.length,
    inStock: assets.filter(a => a.status === "IN_STOCK").length,
    pendingInstall: assets.filter(a => a.status === "PENDING_INSTALL").length,
    operating: assets.filter(a => a.status === "OPERATING").length,
    underRepair: assets.filter(a => a.status === "UNDER_REPAIR").length,
    removed: assets.filter(a => a.status === "REMOVED").length,
    pendingDisposal: assets.filter(a => a.status === "PENDING_DISPOSAL").length,
  };
}

// ---------------------------------------------------------------------------
// Registry 연동: 정류장/단말 마스터
// ---------------------------------------------------------------------------

/**
 * 정류장 목록 조회 (설치 대상 위치)
 */
export function getBusStopsForTablet(region?: string): BusStopLocation[] {
  let stops = [...mockBusStops];
  if (region) {
    stops = stops.filter(s => s.region === region);
  }
  return stops;
}

/**
 * 단말 목록 조회 (Tablet용 BisTerminal 형식)
 */
export function getTerminalsForTablet(customerId?: string): BisTerminal[] {
  let terminals = [...mockBisTerminals];
  if (customerId) {
    // customerName으로 필터링 (mock 데이터 구조상)
    terminals = terminals.filter(t => t.customerName.includes(customerId));
  }
  return terminals;
}

/**
 * 단말 상세 정보 with RMS 상태
 */
export interface TerminalWithRmsState extends BisTerminal {
  rmsState?: OverallSnapshot;
  rmsSeverity?: OverallSeverity;
}

export function getTerminalWithRmsState(terminalId: string): TerminalWithRmsState | null {
  const terminal = mockBisTerminals.find(t => t.terminalId === terminalId);
  if (!terminal) return null;
  
  // RMS 상태 조회
  const monitoringId = tabletToMonitoringId(terminalId);
  const rmsState = monitoringId ? getOverallSnapshot(monitoringId) : undefined;
  
  return {
    ...terminal,
    rmsState,
    rmsSeverity: rmsState?.overall,
  };
}

// ---------------------------------------------------------------------------
// Field Operations 연동: 작업 지시
// ---------------------------------------------------------------------------

/**
 * 작업 지시 상태 정규화
 */
function normalizeWorkOrderStatus(status: string): WorkOrderStatus {
  const statusMap: Record<string, WorkOrderStatus> = {
    "pending": "CREATED",
    "created": "CREATED",
    "CREATED": "CREATED",
    "assigned": "ASSIGNED",
    "ASSIGNED": "ASSIGNED",
    "in_progress": "IN_PROGRESS",
    "IN_PROGRESS": "IN_PROGRESS",
    "completion_submitted": "COMPLETION_SUBMITTED",
    "COMPLETION_SUBMITTED": "COMPLETION_SUBMITTED",
    "approved": "APPROVED",
    "APPROVED": "APPROVED",
    "rejected": "REJECTED",
    "REJECTED": "REJECTED",
    "closed": "CLOSED",
    "CLOSED": "CLOSED",
  };
  return statusMap[status] || "CREATED";
}

/**
 * Tablet용 작업 지시 조회 (배정됨, 진행중)
 */
export function getWorkOrdersForTablet(vendorName?: string): WorkOrder[] {
  let orders = mockWorkOrders.filter(wo => {
    const status = normalizeWorkOrderStatus(wo.status);
    return ["ASSIGNED", "IN_PROGRESS"].includes(status);
  });
  
  if (vendorName) {
    orders = orders.filter(wo => wo.vendor === vendorName);
  }
  
  return orders.map(wo => ({
    ...wo,
    status: normalizeWorkOrderStatus(wo.status),
  }));
}

/**
 * 설치 작업 지시 조회 (InstallAssignment 형식)
 */
export function getInstallAssignmentsForTablet(status?: string): InstallAssignment[] {
  let assignments = [...mockInstallAssignments];
  if (status) {
    assignments = assignments.filter(a => a.status === status);
  }
  return assignments;
}

/**
 * 유지보수 작업 지시 조회 (incidentId 있는 것)
 */
export function getMaintenanceWorkOrders(vendorName?: string): WorkOrder[] {
  return getWorkOrdersForTablet(vendorName).filter(wo => wo.incidentId);
}

/**
 * 완료 보고 대기 작업 조회
 */
export function getPendingApprovalWorkOrders(): WorkOrder[] {
  return mockWorkOrders.filter(wo => 
    normalizeWorkOrderStatus(wo.status) === "COMPLETION_SUBMITTED"
  ).map(wo => ({
    ...wo,
    status: normalizeWorkOrderStatus(wo.status),
  }));
}

/**
 * 작업 지시서 집계 (대시보드용)
 */
export interface WorkOrderSyncSummary {
  total: number;
  assigned: number;
  inProgress: number;
  pendingApproval: number;
  approved: number;
  todayCount: number;
}

export function getWorkOrderSummary(vendorName?: string): WorkOrderSyncSummary {
  let orders = [...mockWorkOrders];
  if (vendorName) {
    orders = orders.filter(wo => wo.vendor === vendorName);
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  return {
    total: orders.length,
    assigned: orders.filter(wo => normalizeWorkOrderStatus(wo.status) === "ASSIGNED").length,
    inProgress: orders.filter(wo => normalizeWorkOrderStatus(wo.status) === "IN_PROGRESS").length,
    pendingApproval: orders.filter(wo => normalizeWorkOrderStatus(wo.status) === "COMPLETION_SUBMITTED").length,
    approved: orders.filter(wo => normalizeWorkOrderStatus(wo.status) === "APPROVED").length,
    todayCount: orders.filter(wo => wo.requestedAt?.startsWith(today)).length,
  };
}

// ---------------------------------------------------------------------------
// RMS 연동: 실시간 상태/장애
// ---------------------------------------------------------------------------

/**
 * RMS 장애 목록 조회 (유지보수 트리거)
 */
export function getActiveFaults(region?: string): Fault[] {
  let faults = mockFaults.filter(f => f.status === "open" || f.status === "in_progress");
  
  if (region) {
    // Device에서 region 매칭
    const regionDeviceIds = mockDevices
      .filter(d => d.region === region)
      .map(d => d.id);
    faults = faults.filter(f => regionDeviceIds.includes(f.deviceId));
  }
  
  return faults;
}

/**
 * 장애 기반 유지보수 필요 단말 조회
 */
export interface FaultedTerminal {
  terminal: BisTerminal;
  fault: Fault;
  rmsState?: OverallSnapshot;
  workOrder?: WorkOrder;
}

export function getFaultedTerminals(): FaultedTerminal[] {
  const activeFaults = getActiveFaults();
  const results: FaultedTerminal[] = [];
  
  for (const fault of activeFaults) {
    // Device → BisTerminal 매핑
    const device = mockDevices.find(d => d.id === fault.deviceId);
    if (!device) continue;
    
    // BisTerminal 찾기 (bisDeviceId 또는 stopName으로)
    const terminal = mockBisTerminals.find(t => 
      t.stationName === device.stopName || 
      t.terminalId.includes(device.bisDeviceId)
    );
    if (!terminal) continue;
    
    // 연결된 작업 지시서 찾기
    const workOrder = mockWorkOrders.find(wo => 
      wo.deviceId === fault.deviceId && 
      ["ASSIGNED", "IN_PROGRESS"].includes(normalizeWorkOrderStatus(wo.status))
    );
    
    // RMS 상태
    const monitoringId = tabletToMonitoringId(terminal.terminalId);
    const rmsState = monitoringId ? getOverallSnapshot(monitoringId) : undefined;
    
    results.push({
      terminal,
      fault,
      rmsState,
      workOrder: workOrder ? { ...workOrder, status: normalizeWorkOrderStatus(workOrder.status) } : undefined,
    });
  }
  
  return results;
}

/**
 * 단말 RMS 상태 집계 (대시보드용)
 */
export interface RmsSyncSummary {
  total: number;
  normal: number;
  warning: number;
  critical: number;
  offline: number;
}

export function getRmsSummary(): RmsSyncSummary {
  const summary: RmsSyncSummary = {
    total: mockBisTerminals.length,
    normal: 0,
    warning: 0,
    critical: 0,
    offline: 0,
  };
  
  for (const terminal of mockBisTerminals) {
    const monitoringId = tabletToMonitoringId(terminal.terminalId);
    const rmsState = monitoringId ? getOverallSnapshot(monitoringId) : null;
    
    if (!rmsState || rmsState.overall === "OFFLINE") {
      summary.offline++;
    } else if (rmsState.overall === "CRITICAL") {
      summary.critical++;
    } else if (rmsState.overall === "WARNING") {
      summary.warning++;
    } else {
      summary.normal++;
    }
  }
  
  return summary;
}

// ---------------------------------------------------------------------------
// 통합 대시보드 데이터
// ---------------------------------------------------------------------------
export interface TabletDashboardData {
  asset: AssetSyncSummary;
  workOrder: WorkOrderSyncSummary;
  rms: RmsSyncSummary;
  faultedTerminals: FaultedTerminal[];
  pendingInstalls: InstallAssignment[];
  lastSyncAt: string | null;
}

export function getTabletDashboardData(vendorName?: string): TabletDashboardData {
  return {
    asset: getAssetSummary(),
    workOrder: getWorkOrderSummary(vendorName),
    rms: getRmsSummary(),
    faultedTerminals: getFaultedTerminals().slice(0, 5), // 최근 5건
    pendingInstalls: getInstallAssignmentsForTablet("ASSIGNED").slice(0, 5),
    lastSyncAt: _syncState.lastSyncAt,
  };
}

// ---------------------------------------------------------------------------
// 동기화 액션
// ---------------------------------------------------------------------------

/**
 * 전체 동기화 실행 (Mock)
 */
export async function performFullSync(): Promise<{ success: boolean; error?: string }> {
  _syncState.isSyncing = true;
  _syncState.syncError = null;
  
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In real app: API calls to Portal
    // - Pull latest assets from Registry
    // - Pull latest work orders from Field Operations
    // - Pull latest device states from RMS
    // - Push pending changes from Outbox
    
    _syncState.lastSyncAt = new Date().toISOString();
    _syncState.pendingChanges = 0;
    _syncState.isSyncing = false;
    
    return { success: true };
  } catch (error) {
    _syncState.isSyncing = false;
    _syncState.syncError = error instanceof Error ? error.message : "동기화 실패";
    return { success: false, error: _syncState.syncError };
  }
}

/**
 * 특정 모듈 동기화
 */
export async function syncModule(module: "asset" | "workOrder" | "rms"): Promise<boolean> {
  // In real app: Selective API sync
  await new Promise(resolve => setTimeout(resolve, 500));
  return true;
}

/**
 * 변경사항 큐잉 (오프라인 지원)
 */
export function queueChange(changeType: string, data: unknown): void {
  _syncState.pendingChanges++;
  // In real app: Store in IndexedDB or SQLite
  console.log(`[Tablet Sync] Queued ${changeType}:`, data);
}
