// ---------------------------------------------------------------------------
// Tablet Install Mock Data
// ---------------------------------------------------------------------------

export type InstallStatus = "ASSIGNED" | "IN_PROGRESS" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type TransmissionStatus =
  | "LOCAL_SAVED"
  | "LOCAL_ONLY"
  | "QUEUED"
  | "SENDING"
  | "NETWORK_ERROR"
  | "SERVER_ERROR"
  | "AUTO_RETRYING"
  | "CONFIRMED"
  | "FAILED";

/** 주변 기기 (배터리, 태양광 패널 등) */
export interface PeripheralDevice {
  id: string;
  type: "BATTERY" | "SOLAR_PANEL" | "LTE_MODEM" | "POWER_UNIT" | "BRACKET" | "ENCLOSURE";
  model: string;
  serialNumber?: string;
  assetCode?: string;
  status: "PENDING" | "INSTALLED" | "FAILED";
}

/** 주변 기기 타입 라벨 */
export const PERIPHERAL_TYPE_LABELS: Record<PeripheralDevice["type"], string> = {
  BATTERY: "배터리",
  SOLAR_PANEL: "태양광 패널",
  LTE_MODEM: "LTE 모뎀",
  POWER_UNIT: "전원 장치",
  BRACKET: "브라켓",
  ENCLOSURE: "하우징",
};

/** 설치 업체 정보 */
export interface InstallerCompany {
  id: string;
  name: string;
  contact: string;
  phone: string;
  assignedAt: string;
}

export interface InstallAssignment {
  id: string;
  // 정류장 정보
  stopId: string;
  stationName: string;
  address: string;
  gps: { lat: number; lng: number };
  // 단말 정보
  terminalId: string;
  terminalModel: string;
  assetCode?: string;
  serialNumber?: string;
  powerType: "GRID" | "SOLAR";
  // 고객사 정보
  customerId: string;
  customerName: string;
  customerContact?: string;
  customerPhone?: string;
  // 설치 업체 정보 (Registry에서 배정)
  installerCompany?: InstallerCompany;
  // 주변 기기 목록
  peripherals?: PeripheralDevice[];
  // 일정
  scheduledDate: string;
  scheduledTime?: string;
  // 진행 상태
  status: InstallStatus;
  installerName?: string;
  arrivalTime?: string;
  installStartedAt?: string;
  checklist?: {
    powerOk: boolean;
    commOk: boolean;
    displayOk: boolean;
    exteriorOk: boolean;
  };
  photos?: string[];
  fieldNote?: string;
  rejectReason?: string;
  // Registry 연동 참조
  registryDeviceId?: string;
  workOrderId?: string;
}

// ---------------------------------------------------------------------------
// [멱등성 정책 – Outbox Contract "완전형"]
//
// 식별자 규칙:
//   - outboxId (id): 앱 내부 고유 ID (OBXxxx)
//   - businessKey: 업무 동일 건 식별 (incidentId | assignmentId 등)
//   - idempotencyKey: 서버 중복 제거 키
//     생성: `${type}:${businessKey}:${schemaVersion}` (bk 있을 때)
//           `${type}:${outboxId}:${schemaVersion}` (bk 없을 때)
//   - schemaVersion: payload 스키마 버전 ('v1' 포맷)
// ---------------------------------------------------------------------------

/** 서버/RMS 연동 대비 영문 타입 enum */
export type OutboxType = 
  | "INSTALL"           // 설치 완료 보고
  | "MAINTENANCE"       // 유지보수 완료 보고
  | "REPLACEMENT"       // 교체 완료 보고
  | "REMOVAL"           // 철거 완료 보고
  | "RELOCATION"        // 이전 완료 보고
  | "INSPECTION"        // 점검 완료 보고
  | "DISPOSAL"          // 폐기 처리 보고
  | "RECEIVING"         // 입고 처리 (창고)
  | "DISPATCH"          // 출고 처리 (창고)
  | "ASSET_STATUS"      // 자산 상태 변경
  | "ETC";              // 기타

/** 한글 UI 표시 라벨 매핑 */
export const OUTBOX_TYPE_LABELS: Record<OutboxType, string> = {
  INSTALL: "설치 완료",
  MAINTENANCE: "유지보수 완료",
  REPLACEMENT: "교체 완료",
  REMOVAL: "철거 완료",
  RELOCATION: "이전 완료",
  INSPECTION: "점검 완료",
  DISPOSAL: "폐기 처리",
  RECEIVING: "입고 처리",
  DISPATCH: "출고 처리",
  ASSET_STATUS: "자산 상태 변경",
  ETC: "기타",
};

/** 작업 유형별 Portal 모듈 매핑 */
export const OUTBOX_TYPE_MODULE: Record<OutboxType, string> = {
  INSTALL: "field-operations",
  MAINTENANCE: "field-operations",
  REPLACEMENT: "field-operations",
  REMOVAL: "field-operations",
  RELOCATION: "field-operations",
  INSPECTION: "field-operations",
  DISPOSAL: "registry/assets",
  RECEIVING: "registry/assets",
  DISPATCH: "registry/assets",
  ASSET_STATUS: "registry/assets",
  ETC: "field-operations",
};

/** 작업 유형별 기업 권한 */
export const OUTBOX_TYPE_COMPANY: Record<OutboxType, ("INSTALLER" | "MAINTAINER" | "BOTH")[]> = {
  INSTALL: ["INSTALLER", "BOTH"],
  MAINTENANCE: ["MAINTAINER", "BOTH"],
  REPLACEMENT: ["MAINTAINER", "BOTH"],
  REMOVAL: ["INSTALLER", "MAINTAINER", "BOTH"],
  RELOCATION: ["INSTALLER", "BOTH"],
  INSPECTION: ["INSTALLER", "MAINTAINER", "BOTH"],
  DISPOSAL: ["MAINTAINER", "BOTH"],
  RECEIVING: ["INSTALLER", "BOTH"],
  DISPATCH: ["INSTALLER", "BOTH"],
  ASSET_STATUS: ["INSTALLER", "MAINTAINER", "BOTH"],
  ETC: ["INSTALLER", "MAINTAINER", "BOTH"],
};

/** eventLog 이벤트 타입 */
export type OutboxEventType =
  | "LOCAL_SAVED"
  | "SEND_REQUESTED"
  | "SEND_FAILED"
  | "SEND_SUCCEEDED"
  | "APPROVAL_FETCHED";

export interface OutboxEventLogEntry {
  at: string; // ISO
  eventType: OutboxEventType;
  fromStage?: Partial<OutboxStage>;
  toStage?: Partial<OutboxStage>;
  message?: string;
}

export interface OutboxRetry {
  count: number;
  max: number;
  lastAttemptAt?: string; // ISO
  nextAttemptAt?: string; // ISO
}

export interface OutboxNetwork {
  state: "ONLINE" | "UNSTABLE" | "OFFLINE";
  observedAt: string; // ISO
}

export interface OutboxStage {
  local: "LOCAL_SAVED" | "NONE";
  transmission: "PENDING" | "SENT" | "FAILED";
  approval: "UNKNOWN" | "PENDING" | "APPROVED" | "REJECTED";
}

export interface OutboxRefs {
  deviceId: string;
  assignmentId?: string;
  incidentId?: string;
  customerName?: string;
  // Asset 관련 참조 (확장)
  assetId?: string;
  assetCode?: string;
  workOrderId?: string;
  warehouseId?: string;
  warehouseName?: string;
  stopId?: string;
  stopName?: string;
  // 자산 상태 변경 관련
  fromAssetStatus?: string;
  toAssetStatus?: string;
}

export interface OutboxSummary {
  actionSummary?: string;
  photosCount: number;
}

export interface OutboxItem {
  /** 앱 내부 고유 ID (OBXxxx). Contract 관점에서의 outboxId */
  id: string;
  type: OutboxType;
  schemaVersion: string; // 'v1' 포맷
  businessKey?: string;
  idempotencyKey: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO

  /** 기존 TransmissionStatus — 스토어/시뮬레이션 호환 */
  transmissionStatus: TransmissionStatus;

  retry: OutboxRetry;
  network: OutboxNetwork;
  stage: OutboxStage;
  refs: OutboxRefs;
  summary: OutboxSummary;
  payload: Record<string, unknown>;
  eventLog: OutboxEventLogEntry[];

}

// ---------------------------------------------------------------------------
// idempotencyKey 유틸
// ---------------------------------------------------------------------------
/** schemaVersion 정규화: number → 'v1', string → 그대로 */
function normalizeSchemaVersion(v: string | number): string {
  if (typeof v === "number") return `v${v}`;
  return v.startsWith("v") ? v : `v${v}`;
}

export function buildIdempotencyKey(
  type: string,
  outboxId: string,
  businessKey?: string,
  schemaVersion: string | number = "v1",
): string {
  const bk = businessKey || outboxId;
  const sv = normalizeSchemaVersion(schemaVersion);
  return `${type}:${bk}:${sv}`;
}

/** 주어진 OutboxItem에서 stage를 추론하는 헬퍼 */
export function deriveStageFromTransmissionStatus(
  ts: TransmissionStatus,
): Omit<OutboxStage, "approval"> & { local: OutboxStage["local"]; transmission: OutboxStage["transmission"] } {
  if (ts === "LOCAL_SAVED" || ts === "LOCAL_ONLY") {
    return { local: "LOCAL_SAVED", transmission: "PENDING" };
  }
  if (ts === "CONFIRMED") {
    return { local: "NONE", transmission: "SENT" };
  }
  if (ts === "FAILED" || ts === "NETWORK_ERROR" || ts === "SERVER_ERROR") {
    return { local: "NONE", transmission: "FAILED" };
  }
  return { local: "NONE", transmission: "PENDING" };
}

// ---------------------------------------------------------------------------
// Status chip helpers
// ---------------------------------------------------------------------------
export const INSTALL_STATUS_LABELS: Record<InstallStatus, string> = {
  ASSIGNED: "배정됨",
  IN_PROGRESS: "진행 중",
  PENDING_APPROVAL: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려",
};

export const INSTALL_STATUS_COLORS: Record<InstallStatus, string> = {
  ASSIGNED: "bg-muted text-muted-foreground border-border",
  IN_PROGRESS: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  PENDING_APPROVAL: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  APPROVED: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  REJECTED: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
};

export const TX_STATUS_LABELS: Record<TransmissionStatus, string> = {
  LOCAL_SAVED: "로컬 저장",
  LOCAL_ONLY: "로컬 저장",
  QUEUED: "전송 대기",
  SENDING: "전송 중",
  NETWORK_ERROR: "네트워크 오류",
  SERVER_ERROR: "서버 오류",
  AUTO_RETRYING: "자동 재시도 중",
  CONFIRMED: "전송 완료",
  FAILED: "전송 실패",
};

export const TX_STATUS_COLORS: Record<TransmissionStatus, string> = {
  LOCAL_SAVED: "bg-muted text-muted-foreground border-border",
  LOCAL_ONLY: "bg-muted text-muted-foreground border-border",
  QUEUED: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  SENDING: "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  NETWORK_ERROR: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  SERVER_ERROR: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
  AUTO_RETRYING: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  CONFIRMED: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  FAILED: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
};

// ---------------------------------------------------------------------------
// BIS Terminal (field-read-only lookup)
// ---------------------------------------------------------------------------
export type TerminalStatus = "ACTIVE" | "PENDING_INSTALL_APPROVAL" | "OFFLINE" | "ERROR";

export interface BisTerminal {
  terminalId: string;
  stationName: string;
  customerName: string;
  address: string;
  gps: { lat: number; lng: number };
  powerType: "GRID" | "SOLAR";
  model: string;
  status: TerminalStatus;
  firmwareVersion: string;
  installedAt?: string;
  lastMaintenanceAt?: string;
  lastMaintenanceSummary?: string;
  installAssignmentId?: string;
  photos?: string[];
}

export const TERMINAL_STATUS_LABELS: Record<TerminalStatus, string> = {
  ACTIVE: "정상",
  PENDING_INSTALL_APPROVAL: "설치 승인 대기",
  OFFLINE: "오프라인",
  ERROR: "장애",
};

export const TERMINAL_STATUS_COLORS: Record<TerminalStatus, string> = {
  ACTIVE: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  PENDING_INSTALL_APPROVAL: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  OFFLINE: "bg-muted text-muted-foreground border-border",
  ERROR: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
};

export const mockBisTerminals: BisTerminal[] = [
  {
    terminalId: "BIS-GN-001",
    stationName: "강남역 1번출구",
    customerName: "서울교통공사",
    address: "서울특별시 강남구 강남대로 396",
    gps: { lat: 37.4979, lng: 127.0276 },
    powerType: "GRID",
    model: "EPD-4200X",
    status: "ACTIVE",
    firmwareVersion: "v2.4.1",
    installedAt: "2025-11-10",
    lastMaintenanceAt: "2026-01-22",
    lastMaintenanceSummary: "통신 모듈 점검 및 펌웨어 업데이트",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg"],
  },
  {
    terminalId: "BIS-YS-002",
    stationName: "역삼역 2번출구",
    customerName: "서울교통공사",
    address: "서울특별시 강남구 역삼로 180",
    gps: { lat: 37.5007, lng: 127.0366 },
    powerType: "SOLAR",
    model: "EPD-4200X",
    status: "ACTIVE",
    firmwareVersion: "v2.4.1",
    installedAt: "2025-12-05",
    photos: ["/placeholder-photo-1.jpg"],
  },
  {
    terminalId: "BIS-SC-003",
    stationName: "서초역 3번출구",
    customerName: "서초구청",
    address: "서울특별시 서초구 서초대로 248",
    gps: { lat: 37.4917, lng: 127.0078 },
    powerType: "SOLAR",
    model: "EPD-3200S",
    status: "ACTIVE",
    firmwareVersion: "v2.3.0",
    installedAt: "2025-10-20",
    lastMaintenanceAt: "2026-02-01",
    lastMaintenanceSummary: "배터리 교체",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
  },
  {
    terminalId: "BIS-GD-004",
    stationName: "교대역 앞",
    customerName: "서울교통공사",
    address: "서울특별시 서초구 서초중앙로 188",
    gps: { lat: 37.4937, lng: 127.0146 },
    powerType: "GRID",
    model: "EPD-4200X",
    status: "PENDING_INSTALL_APPROVAL",
    firmwareVersion: "v2.4.1",
    installAssignmentId: "INST004",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
  },
  {
    terminalId: "BIS-YT-005",
    stationName: "야탑역 1번출구",
    customerName: "성남시청",
    address: "경기도 성남시 분당구 야탑로 81",
    gps: { lat: 37.4116, lng: 127.1275 },
    powerType: "GRID",
    model: "EPD-3200S",
    status: "ACTIVE",
    firmwareVersion: "v2.3.0",
    installedAt: "2026-02-13",
    lastMaintenanceAt: "2026-02-13",
    lastMaintenanceSummary: "초기 설치 완료",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
  },
  {
    terminalId: "BIS-IC-006",
    stationName: "인천시청역 앞",
    customerName: "인천교통공사",
    address: "인천광역시 남동구 인주대로 728",
    gps: { lat: 37.4429, lng: 126.7025 },
    powerType: "SOLAR",
    model: "EPD-4200X",
    status: "ERROR",
    firmwareVersion: "v2.3.0",
    installedAt: "2025-09-15",
    lastMaintenanceAt: "2026-01-10",
    lastMaintenanceSummary: "통신 장애 조치 - 미해결",
    photos: ["/placeholder-photo-1.jpg"],
  },
  {
    terminalId: "BIS-DJ-007",
    stationName: "대전역 서광장",
    customerName: "대전시청",
    address: "대전광역시 동구 중앙로 215",
    gps: { lat: 36.3326, lng: 127.4346 },
    powerType: "GRID",
    model: "EPD-4200X",
    status: "OFFLINE",
    firmwareVersion: "v2.2.5",
    installedAt: "2025-08-01",
    lastMaintenanceAt: "2025-12-20",
    lastMaintenanceSummary: "전원 점검",
  },
  {
    terminalId: "BIS-BS-008",
    stationName: "부산역 광장",
    customerName: "부산교통공사",
    address: "부산광역시 동구 중앙대로 206",
    gps: { lat: 35.1150, lng: 129.0412 },
    powerType: "SOLAR",
    model: "EPD-3200S",
    status: "ACTIVE",
    firmwareVersion: "v2.4.1",
    installedAt: "2025-07-22",
    lastMaintenanceAt: "2026-02-05",
    lastMaintenanceSummary: "정기 점검 - 정상",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg"],
  },
];

// ---------------------------------------------------------------------------
// Install Commissioning Summary (read-only, per terminal)
// ---------------------------------------------------------------------------
export type CommissionApprovalStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export interface InstallCommissioningSummary {
  terminalId: string;
  approvalStatus: CommissionApprovalStatus;
  installCompletedAt: string;
  checklist: {
    powerOk: boolean;
    commOk: boolean;
    displayOk: boolean;
    exteriorOk: boolean;
  };
  fieldNote: string;
  photos: string[];
  rejectReasonCode?: string;
  rejectMemo?: string;
}

export const COMMISSION_STATUS_LABELS: Record<CommissionApprovalStatus, string> = {
  PENDING_APPROVAL: "승인 대기",
  APPROVED: "승인 완료",
  REJECTED: "반려",
};

export const COMMISSION_STATUS_COLORS: Record<CommissionApprovalStatus, string> = {
  PENDING_APPROVAL: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  APPROVED: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  REJECTED: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
};

export const mockCommissioningSummaries: Record<string, InstallCommissioningSummary> = {
  "BIS-GN-001": {
    terminalId: "BIS-GN-001",
    approvalStatus: "APPROVED",
    installCompletedAt: "2026-02-15 10:12",
    checklist: { powerOk: true, commOk: true, displayOk: true, exteriorOk: true },
    fieldNote: "브라켓 추가 설치. 케이블 정리 완료.",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
  },
  "BIS-GD-004": {
    terminalId: "BIS-GD-004",
    approvalStatus: "PENDING_APPROVAL",
    installCompletedAt: "2026-02-15 09:40",
    checklist: { powerOk: true, commOk: true, displayOk: true, exteriorOk: true },
    fieldNote: "태양광 패널 각도 조정 필요 가능성.",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
  },
  "BIS-BS-008": {
    terminalId: "BIS-BS-008",
    approvalStatus: "REJECTED",
    installCompletedAt: "2026-02-14 18:05",
    checklist: { powerOk: true, commOk: false, displayOk: true, exteriorOk: true },
    fieldNote: "현장 LTE 신호 약함.",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
    rejectReasonCode: "PHOTO_INSUFFICIENT",
    rejectMemo: "정면/측면/전원부 사진이 필요합니다.",
  },
};

// ---------------------------------------------------------------------------
// Recent Maintenance Summary (read-only, per terminal)
// ---------------------------------------------------------------------------
export type MaintenanceActionMode = "원격" | "현장" | "혼합";

export interface RecentMaintenanceSummary {
  terminalId: string;
  actionCompletedAt: string;
  causeCode: string;
  causeLabelKo: string;
  actionSummary: string;
  actionMode: MaintenanceActionMode;
  photos: string[];
}

export const ACTION_MODE_COLORS: Record<MaintenanceActionMode, string> = {
  "원격": "bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  "현장": "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  "혼합": "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
};

export const mockMaintenanceSummaries: Record<string, RecentMaintenanceSummary> = {
  "BIS-GN-001": {
    terminalId: "BIS-GN-001",
    actionCompletedAt: "2026-02-10 14:30",
    causeCode: "COMMS",
    causeLabelKo: "통신 이상",
    actionSummary: "LTE 모듈 재부팅 후 정상 복구",
    actionMode: "원격",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg"],
  },
  "BIS-IC-006": {
    terminalId: "BIS-IC-006",
    actionCompletedAt: "2026-02-12 16:20",
    causeCode: "DISPLAY",
    causeLabelKo: "화면 출력 불량",
    actionSummary: "패널 교체 및 케이블 재연결",
    actionMode: "현장",
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg"],
  },
};

// ---------------------------------------------------------------------------
// Mock Install Assignments
// ---------------------------------------------------------------------------
// Mock 설치 업체 목록 (Registry에서 관리)
// ---------------------------------------------------------------------------
export const mockInstallerCompanies: InstallerCompany[] = [
  { id: "IC001", name: "한국BIS설치", contact: "김설치", phone: "010-1234-5678", assignedAt: "2026-02-10" },
  { id: "IC002", name: "스마트정류장", contact: "박현장", phone: "010-2345-6789", assignedAt: "2026-02-08" },
  { id: "IC003", name: "디지털사이니지", contact: "이기술", phone: "010-3456-7890", assignedAt: "2026-02-05" },
];

// ---------------------------------------------------------------------------
export const mockInstallAssignments: InstallAssignment[] = [
  {
    id: "INST001",
    stopId: "STOP-GN-001",
    stationName: "강남역 1번출구",
    terminalId: "BIS-GN-001",
    terminalModel: "EPD-4200X",
    assetCode: "AST-EPD-001",
    serialNumber: "SN-EPD4200X-00001",
    customerId: "CUS001",
    customerName: "서울교통공사",
    customerContact: "김교통",
    customerPhone: "02-1234-5678",
    address: "서울특별시 강남구 강남대로 396",
    gps: { lat: 37.4979, lng: 127.0276 },
    powerType: "GRID",
    scheduledDate: "2026-03-28",
    scheduledTime: "09:00",
    status: "ASSIGNED",
    installerCompany: mockInstallerCompanies[0],
    peripherals: [
      { id: "PER001", type: "LTE_MODEM", model: "LM-400", serialNumber: "LM-001", status: "PENDING" },
      { id: "PER002", type: "POWER_UNIT", model: "PU-220V", serialNumber: "PU-001", status: "PENDING" },
      { id: "PER003", type: "BRACKET", model: "BK-STD-01", status: "PENDING" },
    ],
    registryDeviceId: "DEV001",
    workOrderId: "WO-2026-0328-001",
  },
  {
    id: "INST002",
    stopId: "STOP-YS-002",
    stationName: "역삼역 2번출구",
    terminalId: "BIS-YS-002",
    terminalModel: "EPD-4200X",
    assetCode: "AST-EPD-002",
    serialNumber: "SN-EPD4200X-00002",
    customerId: "CUS001",
    customerName: "서울교통공사",
    customerContact: "김교통",
    customerPhone: "02-1234-5678",
    address: "서울특별시 강남구 역삼로 180",
    gps: { lat: 37.5007, lng: 127.0366 },
    powerType: "SOLAR",
    scheduledDate: "2026-03-28",
    scheduledTime: "14:00",
    status: "ASSIGNED",
    installerCompany: mockInstallerCompanies[0],
    peripherals: [
      { id: "PER004", type: "SOLAR_PANEL", model: "SP-100W", serialNumber: "SP-001", status: "PENDING" },
      { id: "PER005", type: "BATTERY", model: "BAT-12V-100AH", serialNumber: "BAT-001", status: "PENDING" },
      { id: "PER006", type: "LTE_MODEM", model: "LM-400", serialNumber: "LM-002", status: "PENDING" },
      { id: "PER007", type: "BRACKET", model: "BK-SOLAR-01", status: "PENDING" },
    ],
    registryDeviceId: "DEV002",
    workOrderId: "WO-2026-0216-002",
  },
  {
    id: "INST003",
    stopId: "STOP-SC-003",
    stationName: "서초역 3번출구",
    terminalId: "BIS-SC-003",
    terminalModel: "EPD-3200S",
    assetCode: "AST-EPD-003",
    serialNumber: "SN-EPD3200S-00001",
    customerId: "CUS002",
    customerName: "서초구청",
    customerContact: "박구청",
    customerPhone: "02-2345-6789",
    address: "서울특별시 서초구 서초대로 248",
    gps: { lat: 37.4917, lng: 127.0078 },
    powerType: "SOLAR",
    scheduledDate: "2026-03-27",
    scheduledTime: "09:00",
    status: "IN_PROGRESS",
    installerCompany: mockInstallerCompanies[1],
    peripherals: [
      { id: "PER008", type: "SOLAR_PANEL", model: "SP-100W", serialNumber: "SP-002", status: "INSTALLED" },
      { id: "PER009", type: "BATTERY", model: "BAT-12V-100AH", serialNumber: "BAT-002", status: "INSTALLED" },
      { id: "PER010", type: "LTE_MODEM", model: "LM-400", serialNumber: "LM-003", status: "PENDING" },
    ],
    installerName: "김설치",
    arrivalTime: "2026-02-15 09:30",
    installStartedAt: "2026-02-15 09:35",
    checklist: {
      powerOk: true,
      commOk: true,
      displayOk: false,
      exteriorOk: true,
    },
    registryDeviceId: "DEV003",
    workOrderId: "WO-2026-0215-001",
  },
  {
    id: "INST004",
    stopId: "STOP-GD-004",
    stationName: "교대역 앞",
    terminalId: "BIS-GD-004",
    terminalModel: "EPD-4200X",
    assetCode: "AST-EPD-004",
    serialNumber: "SN-EPD4200X-00003",
    customerId: "CUS001",
    customerName: "서울교통공사",
    customerContact: "김교통",
    customerPhone: "02-1234-5678",
    address: "서울특별시 서초구 서초중앙로 188",
    gps: { lat: 37.4937, lng: 127.0146 },
    powerType: "GRID",
    scheduledDate: "2026-03-26",
    scheduledTime: "10:00",
    status: "PENDING_APPROVAL",
    installerCompany: mockInstallerCompanies[0],
    peripherals: [
      { id: "PER011", type: "LTE_MODEM", model: "LM-400", serialNumber: "LM-004", status: "INSTALLED" },
      { id: "PER012", type: "POWER_UNIT", model: "PU-220V", serialNumber: "PU-002", status: "INSTALLED" },
    ],
    installerName: "김설치",
    arrivalTime: "2026-02-14 10:00",
    installStartedAt: "2026-02-14 10:05",
    checklist: {
      powerOk: true,
      commOk: true,
      displayOk: true,
      exteriorOk: true,
    },
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
    fieldNote: "전원 케이블 길이 여유 있음. 특이사항 없음.",
    registryDeviceId: "DEV004",
    workOrderId: "WO-2026-0214-001",
  },
  {
    id: "INST005",
    stopId: "STOP-YT-005",
    stationName: "야탑역 1번출구",
    terminalId: "BIS-YT-005",
    terminalModel: "EPD-3200S",
    assetCode: "AST-EPD-005",
    serialNumber: "SN-EPD3200S-00002",
    customerId: "CUS003",
    customerName: "성남시청",
    customerContact: "이성남",
    customerPhone: "031-1234-5678",
    address: "경기도 성남시 분당구 야탑로 81",
    gps: { lat: 37.4116, lng: 127.1275 },
    powerType: "GRID",
    scheduledDate: "2026-03-25",
    scheduledTime: "08:30",
    status: "APPROVED",
    installerCompany: mockInstallerCompanies[1],
    peripherals: [
      { id: "PER013", type: "LTE_MODEM", model: "LM-400", serialNumber: "LM-005", status: "INSTALLED" },
      { id: "PER014", type: "POWER_UNIT", model: "PU-220V", serialNumber: "PU-003", status: "INSTALLED" },
      { id: "PER015", type: "BRACKET", model: "BK-STD-01", status: "INSTALLED" },
    ],
    installerName: "박현장",
    arrivalTime: "2026-02-13 08:45",
    installStartedAt: "2026-02-13 08:50",
    checklist: {
      powerOk: true,
      commOk: true,
      displayOk: true,
      exteriorOk: true,
    },
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
    fieldNote: "정상 설치 완료.",
    registryDeviceId: "DEV005",
    workOrderId: "WO-2026-0213-001",
  },
  {
    id: "INST006",
    stopId: "STOP-IC-006",
    stationName: "인천시청역 앞",
    terminalId: "BIS-IC-006",
    terminalModel: "EPD-4200X",
    assetCode: "AST-EPD-006",
    serialNumber: "SN-EPD4200X-00004",
    customerId: "CUS004",
    customerName: "인천교통공사",
    customerContact: "최인천",
    customerPhone: "032-1234-5678",
    address: "인천광역시 남동구 인주대로 728",
    gps: { lat: 37.4429, lng: 126.7025 },
    powerType: "SOLAR",
    scheduledDate: "2026-03-29",
    scheduledTime: "11:00",
    status: "ASSIGNED",
    installerCompany: mockInstallerCompanies[1],
    peripherals: [
      { id: "PER016", type: "SOLAR_PANEL", model: "SP-100W", serialNumber: "SP-003", status: "INSTALLED" },
      { id: "PER017", type: "BATTERY", model: "BAT-12V-100AH", serialNumber: "BAT-003", status: "INSTALLED" },
      { id: "PER018", type: "LTE_MODEM", model: "LM-400", serialNumber: "LM-006", status: "INSTALLED" },
    ],
    installerName: "박현장",
    arrivalTime: "2026-02-12 11:00",
    installStartedAt: "2026-02-12 11:05",
    checklist: {
      powerOk: true,
      commOk: true,
      displayOk: true,
      exteriorOk: true,
    },
    photos: ["/placeholder-photo-1.jpg", "/placeholder-photo-2.jpg", "/placeholder-photo-3.jpg"],
    fieldNote: "설치 완료.",
    rejectReason: "사진 품질 불량 - 단말 전면부 사진이 흐릿합니다. 재촬영 후 재제출해주세요.",
    registryDeviceId: "DEV006",
    workOrderId: "WO-2026-0212-001",
  },
  // 캘린더 페이지 unifiedWorks에 맞춘 추가 데이터 (INST007 ~ INST025)
  { id: "INST007", stopId: "STOP-BP-007", stationName: "부평역 2번출구", terminalId: "BIS-BP-007", terminalModel: "EPD-4200X", assetCode: "AST-EPD-007", serialNumber: "SN-EPD4200X-00007", customerId: "CUS004", customerName: "인천교통공사", customerContact: "최인천", customerPhone: "032-1234-5678", address: "인천 부평구 부평대로 301", gps: { lat: 37.5075, lng: 126.7218 }, powerType: "GRID", scheduledDate: "2026-03-11", scheduledTime: "09:30", status: "APPROVED", installerCompany: mockInstallerCompanies[1], peripherals: [], registryDeviceId: "DEV007", workOrderId: "WO-2026-0311-001" },
  { id: "INST008", stopId: "STOP-SW-008", stationName: "수원역 앞", terminalId: "BIS-SW-008", terminalModel: "EPD-4200X", assetCode: "AST-EPD-008", serialNumber: "SN-EPD4200X-00008", customerId: "CUS005", customerName: "수원시청", customerContact: "이수원", customerPhone: "031-228-2114", address: "경기 수원시 팔달구 덕영대로 924", gps: { lat: 37.2656, lng: 127.0001 }, powerType: "GRID", scheduledDate: "2026-03-12", scheduledTime: "10:00", status: "APPROVED", installerCompany: mockInstallerCompanies[2], peripherals: [], registryDeviceId: "DEV008", workOrderId: "WO-2026-0312-001" },
  { id: "INST009", stopId: "STOP-DT-009", stationName: "동탄역 3번출구", terminalId: "BIS-DT-009", terminalModel: "EPD-3200S", assetCode: "AST-EPD-009", serialNumber: "SN-EPD3200S-00005", customerId: "CUS006", customerName: "화성시청", customerContact: "김화성", customerPhone: "031-369-2114", address: "경기 화성시 동탄대로 354", gps: { lat: 37.2001, lng: 127.0960 }, powerType: "SOLAR", scheduledDate: "2026-03-13", scheduledTime: "13:00", status: "PENDING_APPROVAL", installerCompany: mockInstallerCompanies[0], peripherals: [], registryDeviceId: "DEV009", workOrderId: "WO-2026-0313-001" },
  { id: "INST010", stopId: "STOP-PG-010", stationName: "판교역 1번출구", terminalId: "BIS-PG-010", terminalModel: "EPD-4200X", assetCode: "AST-EPD-010", serialNumber: "SN-EPD4200X-00010", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 분당구 판교역로 160", gps: { lat: 37.3948, lng: 127.1112 }, powerType: "GRID", scheduledDate: "2026-03-14", scheduledTime: "09:00", status: "APPROVED", installerCompany: mockInstallerCompanies[1], peripherals: [], registryDeviceId: "DEV010", workOrderId: "WO-2026-0314-001" },
  { id: "INST011", stopId: "STOP-BD-011", stationName: "분당중앙역 앞", terminalId: "BIS-BD-011", terminalModel: "EPD-4200X", assetCode: "AST-EPD-011", serialNumber: "SN-EPD4200X-00011", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 분당구 황새울로 319", gps: { lat: 37.3945, lng: 127.1195 }, powerType: "GRID", scheduledDate: "2026-03-17", scheduledTime: "10:00", status: "APPROVED", installerCompany: mockInstallerCompanies[2], peripherals: [], registryDeviceId: "DEV011", workOrderId: "WO-2026-0317-001" },
  { id: "INST012", stopId: "STOP-JJ-012", stationName: "죽전역 2번출구", terminalId: "BIS-JJ-012", terminalModel: "EPD-3200S", assetCode: "AST-EPD-012", serialNumber: "SN-EPD3200S-00006", customerId: "CUS007", customerName: "용인시청", customerContact: "박용인", customerPhone: "031-324-2114", address: "경기 용인시 수지구 포은대로 531", gps: { lat: 37.3249, lng: 127.1068 }, powerType: "SOLAR", scheduledDate: "2026-03-17", scheduledTime: "14:30", status: "APPROVED", installerCompany: mockInstallerCompanies[0], peripherals: [], registryDeviceId: "DEV012", workOrderId: "WO-2026-0317-002" },
  { id: "INST013", stopId: "STOP-MG-013", stationName: "미금역 4번출구", terminalId: "BIS-MG-013", terminalModel: "EPD-4200X", assetCode: "AST-EPD-013", serialNumber: "SN-EPD4200X-00013", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 분당구 분당로 63", gps: { lat: 37.3840, lng: 127.1260 }, powerType: "GRID", scheduledDate: "2026-03-18", scheduledTime: "09:00", status: "IN_PROGRESS", installerCompany: mockInstallerCompanies[1], peripherals: [], registryDeviceId: "DEV013", workOrderId: "WO-2026-0318-001" },
  { id: "INST014", stopId: "STOP-OR-014", stationName: "오리역 1번출구", terminalId: "BIS-OR-014", terminalModel: "EPD-4200X", assetCode: "AST-EPD-014", serialNumber: "SN-EPD4200X-00014", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 분당구 새마을로 172", gps: { lat: 37.3390, lng: 127.1085 }, powerType: "GRID", scheduledDate: "2026-03-19", scheduledTime: "11:00", status: "ASSIGNED", installerCompany: mockInstallerCompanies[2], peripherals: [], registryDeviceId: "DEV014", workOrderId: "WO-2026-0319-001" },
  { id: "INST015", stopId: "STOP-MR-015", stationName: "모란역 앞", terminalId: "BIS-MR-015", terminalModel: "EPD-3200S", assetCode: "AST-EPD-015", serialNumber: "SN-EPD3200S-00007", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 중원구 모란로 23", gps: { lat: 37.4321, lng: 127.1290 }, powerType: "GRID", scheduledDate: "2026-03-20", scheduledTime: "09:00", status: "ASSIGNED", installerCompany: mockInstallerCompanies[0], peripherals: [], registryDeviceId: "DEV015", workOrderId: "WO-2026-0320-001" },
  { id: "INST016", stopId: "STOP-IM-016", stationName: "이매역 2번출구", terminalId: "BIS-IM-016", terminalModel: "EPD-4200X", assetCode: "AST-EPD-016", serialNumber: "SN-EPD4200X-00016", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 분당구 이매로 77", gps: { lat: 37.3945, lng: 127.1298 }, powerType: "GRID", scheduledDate: "2026-03-24", scheduledTime: "10:00", status: "ASSIGNED", installerCompany: mockInstallerCompanies[1], peripherals: [], registryDeviceId: "DEV016", workOrderId: "WO-2026-0324-001" },
  { id: "INST017", stopId: "STOP-SH-017", stationName: "서현역 3번출구", terminalId: "BIS-SH-017", terminalModel: "EPD-4200X", assetCode: "AST-EPD-017", serialNumber: "SN-EPD4200X-00017", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 분당구 서현로 153", gps: { lat: 37.3848, lng: 127.1236 }, powerType: "GRID", scheduledDate: "2026-03-25", scheduledTime: "09:30", status: "APPROVED", installerCompany: mockInstallerCompanies[2], peripherals: [], registryDeviceId: "DEV017", workOrderId: "WO-2026-0325-001" },
  { id: "INST018", stopId: "STOP-SN-018", stationName: "수내역 1번출구", terminalId: "BIS-SN-018", terminalModel: "EPD-3200S", assetCode: "AST-EPD-018", serialNumber: "SN-EPD3200S-00008", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 분당구 수내로 45", gps: { lat: 37.3782, lng: 127.1155 }, powerType: "GRID", scheduledDate: "2026-03-25", scheduledTime: "13:00", status: "PENDING_APPROVAL", installerCompany: mockInstallerCompanies[0], peripherals: [], registryDeviceId: "DEV018", workOrderId: "WO-2026-0325-002" },
  { id: "INST019", stopId: "STOP-JJ-019", stationName: "정자역 앞", terminalId: "BIS-JJ-019", terminalModel: "EPD-4200X", assetCode: "AST-EPD-019", serialNumber: "SN-EPD4200X-00019", customerId: "CUS003", customerName: "성남시청", customerContact: "최성남", customerPhone: "031-729-2114", address: "경기 성남시 분당구 정자일로 100", gps: { lat: 37.3666, lng: 127.1084 }, powerType: "GRID", scheduledDate: "2026-03-26", scheduledTime: "10:00", status: "PENDING_APPROVAL", installerCompany: mockInstallerCompanies[1], peripherals: [], registryDeviceId: "DEV019", workOrderId: "WO-2026-0326-001" },
  { id: "INST020", stopId: "STOP-GD-020", stationName: "교대역 2번출구", terminalId: "BIS-GD-020", terminalModel: "EPD-4200X", assetCode: "AST-EPD-020", serialNumber: "SN-EPD4200X-00020", customerId: "CUS001", customerName: "서울교통공사", customerContact: "김교통", customerPhone: "02-1234-5678", address: "서울 서초구 서초중앙로 188", gps: { lat: 37.4942, lng: 127.0146 }, powerType: "GRID", scheduledDate: "2026-03-27", scheduledTime: "09:00", status: "IN_PROGRESS", installerCompany: mockInstallerCompanies[0], peripherals: [], registryDeviceId: "DEV020", workOrderId: "WO-2026-0327-001" },
  { id: "INST021", stopId: "STOP-GN-021", stationName: "강남역 1번출구", terminalId: "BIS-GN-021", terminalModel: "EPD-4200X", assetCode: "AST-EPD-021", serialNumber: "SN-EPD4200X-00021", customerId: "CUS001", customerName: "서울교통공사", customerContact: "김교통", customerPhone: "02-1234-5678", address: "서울 강남구 강남대로 396", gps: { lat: 37.4979, lng: 127.0276 }, powerType: "GRID", scheduledDate: "2026-03-28", scheduledTime: "09:00", status: "ASSIGNED", installerCompany: mockInstallerCompanies[1], peripherals: [], registryDeviceId: "DEV021", workOrderId: "WO-2026-0328-002" },
  { id: "INST022", stopId: "STOP-YS-022", stationName: "역삼역 2번출구", terminalId: "BIS-YS-022", terminalModel: "EPD-4200X", assetCode: "AST-EPD-022", serialNumber: "SN-EPD4200X-00022", customerId: "CUS001", customerName: "서울교통공사", customerContact: "김교통", customerPhone: "02-1234-5678", address: "서울 강남구 역삼로 180", gps: { lat: 37.5007, lng: 127.0366 }, powerType: "SOLAR", scheduledDate: "2026-03-28", scheduledTime: "14:00", status: "ASSIGNED", installerCompany: mockInstallerCompanies[2], peripherals: [], registryDeviceId: "DEV022", workOrderId: "WO-2026-0328-003" },
  { id: "INST023", stopId: "STOP-IC-023", stationName: "인천시청역 앞", terminalId: "BIS-IC-023", terminalModel: "EPD-4200X", assetCode: "AST-EPD-023", serialNumber: "SN-EPD4200X-00023", customerId: "CUS004", customerName: "인천교통공사", customerContact: "최인천", customerPhone: "032-1234-5678", address: "인천 남동구 인주대로 728", gps: { lat: 37.4429, lng: 126.7025 }, powerType: "GRID", scheduledDate: "2026-03-29", scheduledTime: "11:00", status: "ASSIGNED", installerCompany: mockInstallerCompanies[0], peripherals: [], registryDeviceId: "DEV023", workOrderId: "WO-2026-0329-001" },
  { id: "INST024", stopId: "STOP-BP-024", stationName: "부평역 3번출구", terminalId: "BIS-BP-024", terminalModel: "EPD-3200S", assetCode: "AST-EPD-024", serialNumber: "SN-EPD3200S-00010", customerId: "CUS004", customerName: "인천교통공사", customerContact: "최인천", customerPhone: "032-1234-5678", address: "인천 부평구 부평대로 301", gps: { lat: 37.5075, lng: 126.7218 }, powerType: "SOLAR", scheduledDate: "2026-03-30", scheduledTime: "09:30", status: "ASSIGNED", installerCompany: mockInstallerCompanies[1], peripherals: [], registryDeviceId: "DEV024", workOrderId: "WO-2026-0330-001" },
  { id: "INST025", stopId: "STOP-SW-025", stationName: "수원역 2번출구", terminalId: "BIS-SW-025", terminalModel: "EPD-4200X", assetCode: "AST-EPD-025", serialNumber: "SN-EPD4200X-00025", customerId: "CUS005", customerName: "수원시청", customerContact: "이수원", customerPhone: "031-228-2114", address: "경기 수원시 팔달구 덕영대로 924", gps: { lat: 37.2656, lng: 127.0001 }, powerType: "GRID", scheduledDate: "2026-03-31", scheduledTime: "10:00", status: "ASSIGNED", installerCompany: mockInstallerCompanies[2], peripherals: [], registryDeviceId: "DEV025", workOrderId: "WO-2026-0331-001" },
];

// ---------------------------------------------------------------------------
// Mock Outbox
// ---------------------------------------------------------------------------
export const mockOutboxItems: OutboxItem[] = [
  {
    id: "OBX001",
    type: "INSTALL",
    schemaVersion: "v1",
    businessKey: "INST006",
    idempotencyKey: "INSTALL:INST006:v1",
    createdAt: "2026-02-12T11:40:00+09:00",
    updatedAt: "2026-02-12T12:05:00+09:00",
    transmissionStatus: "FAILED",
    retry: { count: 2, max: 5, lastAttemptAt: "2026-02-12T12:05:00+09:00" },
    network: { state: "ONLINE", observedAt: "2026-02-12T12:05:00+09:00" },
    stage: { local: "NONE", transmission: "FAILED", approval: "UNKNOWN" },
    refs: { deviceId: "BIS-IC-006", assignmentId: "INST006", customerName: "인천교통공사" },
    summary: { actionSummary: "설치 보고서 전송 실패", photosCount: 3 },
    payload: {},
    eventLog: [
      { at: "2026-02-12T11:40:00+09:00", eventType: "SEND_REQUESTED", message: "전송 요청" },
      { at: "2026-02-12T12:05:00+09:00", eventType: "SEND_FAILED", toStage: { transmission: "FAILED" }, message: "네트워크 타임아웃" },
    ],
  },
  {
    id: "OBX002",
    type: "INSTALL",
    schemaVersion: "v1",
    businessKey: "INST004",
    idempotencyKey: "INSTALL:INST004:v1",
    createdAt: "2026-02-14T10:55:00+09:00",
    updatedAt: "2026-02-14T11:02:00+09:00",
    transmissionStatus: "CONFIRMED",
    retry: { count: 0, max: 5 },
    network: { state: "ONLINE", observedAt: "2026-02-14T11:02:00+09:00" },
    stage: { local: "NONE", transmission: "SENT", approval: "PENDING" },
    refs: { deviceId: "BIS-GD-004", assignmentId: "INST004", customerName: "광동구청" },
    summary: { photosCount: 5 },
    payload: {},
    eventLog: [
      { at: "2026-02-14T10:55:00+09:00", eventType: "SEND_REQUESTED" },
      { at: "2026-02-14T11:02:00+09:00", eventType: "SEND_SUCCEEDED", toStage: { transmission: "SENT" } },
    ],
  },
  {
    id: "OBX003",
    type: "INSTALL",
    schemaVersion: "v1",
    businessKey: "INST003",
    idempotencyKey: "INSTALL:INST003:v1",
    createdAt: "2026-02-15T10:20:00+09:00",
    updatedAt: "2026-02-15T10:20:00+09:00",
    transmissionStatus: "QUEUED",
    retry: { count: 0, max: 5 },
    network: { state: "ONLINE", observedAt: "2026-02-15T10:20:00+09:00" },
    stage: { local: "NONE", transmission: "PENDING", approval: "UNKNOWN" },
    refs: { deviceId: "BIS-SC-003", assignmentId: "INST003", customerName: "서초구청" },
    summary: { photosCount: 4 },
    payload: {},
    eventLog: [],
  },
  {
    id: "OBX004",
    type: "MAINTENANCE",
    schemaVersion: "v1",
    businessKey: "INC-20260216-001",
    idempotencyKey: "MAINTENANCE:INC-20260216-001:v1",
    createdAt: "2026-02-16T09:10:00+09:00",
    updatedAt: "2026-02-16T09:10:00+09:00",
    transmissionStatus: "LOCAL_SAVED",
    retry: { count: 0, max: 5 },
    network: { state: "OFFLINE", observedAt: "2026-02-16T09:10:00+09:00" },
    stage: { local: "LOCAL_SAVED", transmission: "PENDING", approval: "UNKNOWN" },
    refs: { deviceId: "BIS-IC-006", incidentId: "INC-20260216-001", customerName: "인천교통공사" },
    summary: { actionSummary: "전원부 교체 완료 후 로컬 저장", photosCount: 2 },
    payload: { actionSummary: "전원부 교체 완료 후 로컬 저장", photosCount: 2 },
    eventLog: [
      { at: "2026-02-16T09:10:00+09:00", eventType: "LOCAL_SAVED", toStage: { local: "LOCAL_SAVED" }, message: "오프라인 저장" },
    ],
  },
  {
    id: "OBX005",
    type: "INSTALL",
    schemaVersion: "v1",
    businessKey: "INST007",
    idempotencyKey: "INSTALL:INST007:v1",
    createdAt: "2026-02-16T08:30:00+09:00",
    updatedAt: "2026-02-16T08:30:00+09:00",
    transmissionStatus: "LOCAL_SAVED",
    retry: { count: 0, max: 5 },
    network: { state: "OFFLINE", observedAt: "2026-02-16T08:30:00+09:00" },
    stage: { local: "LOCAL_SAVED", transmission: "PENDING", approval: "UNKNOWN" },
    refs: { deviceId: "BIS-GD-004", assignmentId: "INST007", customerName: "광동구청" },
    summary: { actionSummary: "오프라인 환경에서 설치 기록 저장", photosCount: 4 },
    payload: { actionSummary: "오프라인 환경에서 설치 기록 저장", photosCount: 4 },
    eventLog: [
      { at: "2026-02-16T08:30:00+09:00", eventType: "LOCAL_SAVED", message: "오프라인 저장" },
    ],
  },
  // [중복 시나리오] OBX006은 OBX003과 동일 businessKey(INST003)
  // OBX003이 서버 대기(QUEUED)이고 OBX006은 로컬 저장 상태
  {
    id: "OBX006",
    type: "INSTALL",
    schemaVersion: "v1",
    businessKey: "INST003",
    idempotencyKey: "INSTALL:INST003:v1",
    createdAt: "2026-02-16T10:05:00+09:00",
    updatedAt: "2026-02-16T10:05:00+09:00",
    transmissionStatus: "LOCAL_SAVED",
    retry: { count: 0, max: 5 },
    network: { state: "OFFLINE", observedAt: "2026-02-16T10:05:00+09:00" },
    stage: { local: "LOCAL_SAVED", transmission: "PENDING", approval: "UNKNOWN" },
    refs: { deviceId: "BIS-SC-003", assignmentId: "INST003", customerName: "서초구청" },
    summary: { actionSummary: "재저장 - 사진 추가 후 오프라인 저장", photosCount: 6 },
    payload: { actionSummary: "재저장 - 사진 추가 후 오프라인 저장", photosCount: 6 },
    eventLog: [
      { at: "2026-02-16T10:05:00+09:00", eventType: "LOCAL_SAVED", message: "사진 추가 후 재저장" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Outbox 생성 헬퍼 함수
// ---------------------------------------------------------------------------

let _outboxIdCounter = 100;

/**
 * 새 Outbox 항목 생성
 */
export function createOutboxItem(
  type: OutboxType,
  refs: OutboxRefs,
  payload: Record<string, unknown>,
  options?: {
    businessKey?: string;
    actionSummary?: string;
    photosCount?: number;
  }
): OutboxItem {
  const now = new Date().toISOString();
  const id = `OBX${String(++_outboxIdCounter).padStart(3, "0")}`;
  const businessKey = options?.businessKey || refs.workOrderId || refs.assignmentId || refs.incidentId;
  const idempotencyKey = buildIdempotencyKey(type, id, businessKey, "v1");
  
  return {
    id,
    type,
    schemaVersion: "v1",
    businessKey,
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
    transmissionStatus: "LOCAL_SAVED",
    retry: { count: 0, max: 5 },
    network: { state: "ONLINE", observedAt: now },
    stage: { local: "LOCAL_SAVED", transmission: "PENDING", approval: "UNKNOWN" },
    refs,
    summary: {
      actionSummary: options?.actionSummary,
      photosCount: options?.photosCount ?? 0,
    },
    payload,
    eventLog: [
      { at: now, eventType: "LOCAL_SAVED", toStage: { local: "LOCAL_SAVED" }, message: "로컬 저장" },
    ],
  };
}

/**
 * 설치 완료 Outbox 생성
 */
export function createInstallOutbox(
  assignmentId: string,
  deviceId: string,
  customerName: string,
  payload: {
    checklist: { powerOk: boolean; commOk: boolean; displayOk: boolean; exteriorOk: boolean };
    fieldNote?: string;
    photos?: string[];
  }
): OutboxItem {
  return createOutboxItem(
    "INSTALL",
    {
      deviceId,
      assignmentId,
      customerName,
    },
    payload,
    {
      businessKey: assignmentId,
      actionSummary: "설치 완료 보고",
      photosCount: payload.photos?.length ?? 0,
    }
  );
}

/**
 * 유지보수 완료 Outbox 생성
 */
export function createMaintenanceOutbox(
  incidentId: string,
  deviceId: string,
  customerName: string,
  payload: {
    maintenanceActions: string[];
    partsReplaced?: string[];
    completionNotes?: string;
    photos?: string[];
  }
): OutboxItem {
  return createOutboxItem(
    "MAINTENANCE",
    {
      deviceId,
      incidentId,
      customerName,
    },
    payload,
    {
      businessKey: incidentId,
      actionSummary: payload.maintenanceActions.join(", "),
      photosCount: payload.photos?.length ?? 0,
    }
  );
}

/**
 * 철거 완료 Outbox 생성
 */
export function createRemovalOutbox(
  workOrderId: string,
  deviceId: string,
  assetId: string,
  assetCode: string,
  payload: {
    removalReason: string;
    assetCondition: "good" | "damaged" | "unusable";
    returnWarehouseId?: string;
    returnWarehouseName?: string;
    photos?: string[];
  }
): OutboxItem {
  return createOutboxItem(
    "REMOVAL",
    {
      deviceId,
      workOrderId,
      assetId,
      assetCode,
      warehouseId: payload.returnWarehouseId,
      warehouseName: payload.returnWarehouseName,
    },
    payload,
    {
      businessKey: workOrderId,
      actionSummary: `철거 (${payload.assetCondition === "unusable" ? "폐기 대기" : "창고 입고"})`,
      photosCount: payload.photos?.length ?? 0,
    }
  );
}

/**
 * 자산 상태 변경 Outbox 생성
 */
export function createAssetStatusOutbox(
  assetId: string,
  assetCode: string,
  fromStatus: string,
  toStatus: string,
  payload: {
    reason: string;
    workOrderId?: string;
    notes?: string;
  }
): OutboxItem {
  return createOutboxItem(
    "ASSET_STATUS",
    {
      deviceId: "",
      assetId,
      assetCode,
      workOrderId: payload.workOrderId,
      fromAssetStatus: fromStatus,
      toAssetStatus: toStatus,
    },
    payload,
    {
      businessKey: `${assetId}:${toStatus}`,
      actionSummary: `${fromStatus} → ${toStatus}`,
    }
  );
}

/**
 * 입고 처리 Outbox 생성
 */
export function createReceivingOutbox(
  assetId: string,
  assetCode: string,
  warehouseId: string,
  warehouseName: string,
  payload: {
    supplierId?: string;
    supplierName?: string;
    inspectionStatus: "passed" | "failed" | "pending";
    notes?: string;
    photos?: string[];
  }
): OutboxItem {
  return createOutboxItem(
    "RECEIVING",
    {
      deviceId: "",
      assetId,
      assetCode,
      warehouseId,
      warehouseName,
    },
    payload,
    {
      businessKey: `${assetId}:RECEIVING`,
      actionSummary: `입고 (${payload.inspectionStatus === "passed" ? "검수 완료" : "검수 대기"})`,
      photosCount: payload.photos?.length ?? 0,
    }
  );
}

/**
 * 출고 처리 Outbox 생성
 */
export function createDispatchOutbox(
  assetId: string,
  assetCode: string,
  warehouseId: string,
  warehouseName: string,
  workOrderId: string,
  payload: {
    destinationStopId: string;
    destinationStopName: string;
    notes?: string;
  }
): OutboxItem {
  return createOutboxItem(
    "DISPATCH",
    {
      deviceId: "",
      assetId,
      assetCode,
      warehouseId,
      warehouseName,
      workOrderId,
      stopId: payload.destinationStopId,
      stopName: payload.destinationStopName,
    },
    payload,
    {
      businessKey: workOrderId,
      actionSummary: `출고 → ${payload.destinationStopName}`,
    }
  );
}
