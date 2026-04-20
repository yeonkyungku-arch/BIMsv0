/**
 * Tablet Thresholds SSOT
 * 
 * /tablet 앱에서 사용하는 모든 임계치 정의
 * - 배터리/전원 임계치
 * - 통신/연결 임계치
 * - 작업 우선순위 임계치
 * - Outbox 동기화 임계치
 * - 창고 재고 임계치
 * - 환경 센서 임계치
 */

// ---------------------------------------------------------------------------
// 1. 배터리(SOC) 임계치 -- Battery State of Charge
// ---------------------------------------------------------------------------
export const BATTERY_THRESHOLDS = {
  /** 정상 (> 50%) */
  NORMAL: 50,
  /** 주의 (30% ~ 50%) */
  LOW: 30,
  /** 경고 (15% ~ 30%) */
  WARNING: 15,
  /** 위험 (< 15%) - 즉시 충전/교체 필요 */
  CRITICAL: 15,
  /** 방전 차단 (< 5%) - BMS 보호 모드 진입 */
  SHUTDOWN: 5,
} as const;

export type BatterySeverity = "NORMAL" | "LOW" | "WARNING" | "CRITICAL" | "SHUTDOWN";

export function getBatterySeverity(socPercent: number): BatterySeverity {
  if (socPercent < BATTERY_THRESHOLDS.SHUTDOWN) return "SHUTDOWN";
  if (socPercent < BATTERY_THRESHOLDS.CRITICAL) return "CRITICAL";
  if (socPercent < BATTERY_THRESHOLDS.LOW) return "WARNING";
  if (socPercent < BATTERY_THRESHOLDS.NORMAL) return "LOW";
  return "NORMAL";
}

// ---------------------------------------------------------------------------
// 2. 통신/연결 임계치 -- Communication & Connectivity
// ---------------------------------------------------------------------------
export const CONNECTIVITY_THRESHOLDS = {
  /** 오프라인 판정: 마지막 통신 후 경과 시간 (분) */
  OFFLINE_DURATION_MIN: 15,
  
  /** 오프라인 판정: 연속 Pull 실패 횟수 */
  PULL_FAIL_COUNT: 5,
  
  /** 통신 지연 경고: 마지막 통신 후 경과 시간 (분) */
  COMM_DELAY_WARNING_MIN: 5,
  
  /** 통신 지연 위험: 마지막 통신 후 경과 시간 (분) */
  COMM_DELAY_CRITICAL_MIN: 10,
  
  /** 15분 내 Pull 실패 경고 횟수 */
  PULL_FAIL_15M_WARNING: 2,
  
  /** 15분 내 Pull 실패 위험 횟수 */
  PULL_FAIL_15M_CRITICAL: 4,
} as const;

export type ConnectivitySeverity = "ONLINE" | "DELAYED" | "UNSTABLE" | "OFFLINE";

export function getConnectivitySeverity(
  offlineDurationMin: number,
  pullFailCount: number
): ConnectivitySeverity {
  // 오프라인 판정
  if (offlineDurationMin >= CONNECTIVITY_THRESHOLDS.OFFLINE_DURATION_MIN ||
      pullFailCount >= CONNECTIVITY_THRESHOLDS.PULL_FAIL_COUNT) {
    return "OFFLINE";
  }
  // 불안정 (위험)
  if (offlineDurationMin >= CONNECTIVITY_THRESHOLDS.COMM_DELAY_CRITICAL_MIN ||
      pullFailCount >= CONNECTIVITY_THRESHOLDS.PULL_FAIL_15M_CRITICAL) {
    return "UNSTABLE";
  }
  // 지연 (주의)
  if (offlineDurationMin >= CONNECTIVITY_THRESHOLDS.COMM_DELAY_WARNING_MIN ||
      pullFailCount >= CONNECTIVITY_THRESHOLDS.PULL_FAIL_15M_WARNING) {
    return "DELAYED";
  }
  return "ONLINE";
}

// ---------------------------------------------------------------------------
// 3. 작업 우선순위 임계치 -- Work Order Priority
// ---------------------------------------------------------------------------
export const WORK_PRIORITY_THRESHOLDS = {
  /** 긴급: SLA 초과 임박 (시간) */
  URGENT_SLA_HOURS: 2,
  
  /** 높음: SLA 여유 (시간) */
  HIGH_SLA_HOURS: 8,
  
  /** 보통: SLA 여유 (시간) */
  NORMAL_SLA_HOURS: 24,
  
  /** 장애 등급별 대응 시간 (시간) */
  FAULT_RESPONSE: {
    CRITICAL: 2,    // 치명 장애 - 2시간 내 대응
    WARNING: 8,     // 경고 - 8시간 내 대응
    INFO: 24,       // 주의 - 24시간 내 대응
    NORMAL: 72,     // 예방 점검 - 72시간 내 대응
  },
  
  /** 배터리 SOC 기준 긴급 대응 필요 (%) */
  BATTERY_URGENT_SOC: 15,
  
  /** 오프라인 지속 시간 기준 긴급 대응 필요 (시간) */
  OFFLINE_URGENT_HOURS: 4,
} as const;

export type WorkPriority = "URGENT" | "HIGH" | "NORMAL" | "LOW";

export function getWorkPriority(
  slaRemainingHours: number,
  faultSeverity?: "CRITICAL" | "WARNING" | "INFO" | "NORMAL"
): WorkPriority {
  // 장애 등급 기준
  if (faultSeverity === "CRITICAL") return "URGENT";
  if (faultSeverity === "WARNING") return "HIGH";
  
  // SLA 기준
  if (slaRemainingHours <= WORK_PRIORITY_THRESHOLDS.URGENT_SLA_HOURS) return "URGENT";
  if (slaRemainingHours <= WORK_PRIORITY_THRESHOLDS.HIGH_SLA_HOURS) return "HIGH";
  if (slaRemainingHours <= WORK_PRIORITY_THRESHOLDS.NORMAL_SLA_HOURS) return "NORMAL";
  return "LOW";
}

// ---------------------------------------------------------------------------
// 4. Outbox 동기화 임계치 -- Sync Thresholds
// ---------------------------------------------------------------------------
export const OUTBOX_THRESHOLDS = {
  /** 최대 재시도 횟수 */
  MAX_RETRY_COUNT: 5,
  
  /** 재시도 간격 (초): 1, 2, 4, 8, 16 (exponential backoff) */
  RETRY_BASE_INTERVAL_SEC: 2,
  
  /** 최대 재시도 간격 (초) */
  MAX_RETRY_INTERVAL_SEC: 60,
  
  /** 보관 기간 (일): 성공한 항목 */
  ARCHIVE_RETENTION_DAYS: 30,
  
  /** 보관 기간 (일): 실패한 항목 */
  FAILED_RETENTION_DAYS: 90,
  
  /** 동기화 경고: 대기 중인 항목 수 */
  PENDING_WARNING_COUNT: 10,
  
  /** 동기화 위험: 대기 중인 항목 수 */
  PENDING_CRITICAL_COUNT: 30,
  
  /** 동기화 경고: 가장 오래된 대기 항목 나이 (시간) */
  OLDEST_PENDING_WARNING_HOURS: 4,
  
  /** 동기화 위험: 가장 오래된 대기 항목 나이 (시간) */
  OLDEST_PENDING_CRITICAL_HOURS: 24,
} as const;

export type OutboxSyncStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "BLOCKED";

export function getOutboxSyncStatus(
  pendingCount: number,
  failedCount: number,
  oldestPendingHours: number
): OutboxSyncStatus {
  // 실패 항목이 많으면 차단 상태
  if (failedCount >= OUTBOX_THRESHOLDS.MAX_RETRY_COUNT) return "BLOCKED";
  
  // 대기 항목 수 또는 나이 기준 위험
  if (pendingCount >= OUTBOX_THRESHOLDS.PENDING_CRITICAL_COUNT ||
      oldestPendingHours >= OUTBOX_THRESHOLDS.OLDEST_PENDING_CRITICAL_HOURS) {
    return "CRITICAL";
  }
  
  // 대기 항목 수 또는 나이 기준 경고
  if (pendingCount >= OUTBOX_THRESHOLDS.PENDING_WARNING_COUNT ||
      oldestPendingHours >= OUTBOX_THRESHOLDS.OLDEST_PENDING_WARNING_HOURS) {
    return "WARNING";
  }
  
  return "HEALTHY";
}

// ---------------------------------------------------------------------------
// 5. 창고 재고 임계치 -- Warehouse Inventory
// ---------------------------------------------------------------------------
export const INVENTORY_THRESHOLDS = {
  /** 자산 유형별 최소 안전 재고 */
  SAFETY_STOCK: {
    BIS_TERMINAL: 5,      // BIS 단말
    POWER_UNIT: 3,        // 전원 장치
    BATTERY: 10,          // 배터리
    DISPLAY_PANEL: 3,     // 디스플레이 패널
    COMMUNICATION: 5,     // 통신 모듈
    OTHER: 2,             // 기타
  },
  
  /** 재고 부족 경고 임계치 (안전재고 대비 배율) */
  LOW_STOCK_MULTIPLIER: 1.5,
  
  /** 재고 과잉 경고 임계치 (안전재고 대비 배율) */
  OVERSTOCK_MULTIPLIER: 5,
  
  /** 장기 미사용 경고 (일) */
  UNUSED_WARNING_DAYS: 90,
  
  /** 장기 미사용 위험 - 폐기 검토 (일) */
  UNUSED_CRITICAL_DAYS: 180,
} as const;

export type InventoryStatus = "SUFFICIENT" | "LOW" | "CRITICAL" | "OVERSTOCK";

export function getInventoryStatus(
  currentStock: number,
  assetType: keyof typeof INVENTORY_THRESHOLDS.SAFETY_STOCK
): InventoryStatus {
  const safetyStock = INVENTORY_THRESHOLDS.SAFETY_STOCK[assetType];
  
  // 재고 부족 위험
  if (currentStock < safetyStock) return "CRITICAL";
  
  // 재고 부족 경고
  if (currentStock < safetyStock * INVENTORY_THRESHOLDS.LOW_STOCK_MULTIPLIER) return "LOW";
  
  // 재고 과잉
  if (currentStock > safetyStock * INVENTORY_THRESHOLDS.OVERSTOCK_MULTIPLIER) return "OVERSTOCK";
  
  return "SUFFICIENT";
}

// ---------------------------------------------------------------------------
// 6. 환경 센서 임계치 -- Environmental Sensors
// ---------------------------------------------------------------------------
export const ENVIRONMENT_THRESHOLDS = {
  /** 온도 (섭씨) */
  TEMPERATURE: {
    MIN_OPERATING: -20,   // 최저 작동 온도
    LOW_WARNING: -10,     // 저온 경고
    HIGH_WARNING: 45,     // 고온 경고
    MAX_OPERATING: 55,    // 최고 작동 온도 (긴급)
  },
  
  /** 습도 (%) */
  HUMIDITY: {
    LOW_WARNING: 20,      // 저습 경고
    HIGH_WARNING: 80,     // 고습 경고
    HIGH_CRITICAL: 90,    // 고습 위험 (결로 발생 가능)
  },
  
  /** 진동 레벨 (g-force) */
  VIBRATION: {
    WARNING: 0.5,
    CRITICAL: 1.0,
  },
} as const;

export type EnvironmentSeverity = "NORMAL" | "WARNING" | "CRITICAL";

export function getTemperatureSeverity(tempC: number): EnvironmentSeverity {
  if (tempC <= ENVIRONMENT_THRESHOLDS.TEMPERATURE.MIN_OPERATING ||
      tempC >= ENVIRONMENT_THRESHOLDS.TEMPERATURE.MAX_OPERATING) {
    return "CRITICAL";
  }
  if (tempC <= ENVIRONMENT_THRESHOLDS.TEMPERATURE.LOW_WARNING ||
      tempC >= ENVIRONMENT_THRESHOLDS.TEMPERATURE.HIGH_WARNING) {
    return "WARNING";
  }
  return "NORMAL";
}

export function getHumiditySeverity(humidity: number): EnvironmentSeverity {
  if (humidity >= ENVIRONMENT_THRESHOLDS.HUMIDITY.HIGH_CRITICAL) return "CRITICAL";
  if (humidity <= ENVIRONMENT_THRESHOLDS.HUMIDITY.LOW_WARNING ||
      humidity >= ENVIRONMENT_THRESHOLDS.HUMIDITY.HIGH_WARNING) {
    return "WARNING";
  }
  return "NORMAL";
}

// ---------------------------------------------------------------------------
// 7. 위험 점수(Risk Score) 임계치 -- Device Health
// ---------------------------------------------------------------------------
export const RISK_SCORE_THRESHOLDS = {
  /** 정상: 0-29 */
  NORMAL_MAX: 29,
  /** 주의: 30-54 */
  INFO_MAX: 54,
  /** 경고: 55-74 */
  WARNING_MAX: 74,
  /** 교체 권고: 75-89 */
  REPLACE_MAX: 89,
  /** 치명: 90-100 */
  CRITICAL_MIN: 90,
} as const;

export type RiskSeverity = "NORMAL" | "INFO" | "WARNING" | "REPLACE" | "CRITICAL";

export function getRiskSeverity(riskScore: number): RiskSeverity {
  if (riskScore >= RISK_SCORE_THRESHOLDS.CRITICAL_MIN) return "CRITICAL";
  if (riskScore > RISK_SCORE_THRESHOLDS.WARNING_MAX) return "REPLACE";
  if (riskScore > RISK_SCORE_THRESHOLDS.INFO_MAX) return "WARNING";
  if (riskScore > RISK_SCORE_THRESHOLDS.NORMAL_MAX) return "INFO";
  return "NORMAL";
}

// ---------------------------------------------------------------------------
// 8. 임계치 메타데이터 (UI 표시용)
// ---------------------------------------------------------------------------
export const THRESHOLD_META = {
  battery: {
    label: "배터리 충전량",
    unit: "%",
    levels: [
      { severity: "NORMAL", min: 50, max: 100, color: "#22c55e", label: "정상" },
      { severity: "LOW", min: 30, max: 50, color: "#eab308", label: "주의" },
      { severity: "WARNING", min: 15, max: 30, color: "#f97316", label: "경고" },
      { severity: "CRITICAL", min: 5, max: 15, color: "#ef4444", label: "위험" },
      { severity: "SHUTDOWN", min: 0, max: 5, color: "#7f1d1d", label: "방전 차단" },
    ],
  },
  connectivity: {
    label: "통신 상태",
    unit: "분",
    levels: [
      { severity: "ONLINE", min: 0, max: 5, color: "#22c55e", label: "온라인" },
      { severity: "DELAYED", min: 5, max: 10, color: "#eab308", label: "지연" },
      { severity: "UNSTABLE", min: 10, max: 15, color: "#f97316", label: "불안정" },
      { severity: "OFFLINE", min: 15, max: Infinity, color: "#6b7280", label: "오프라인" },
    ],
  },
  temperature: {
    label: "온도",
    unit: "°C",
    levels: [
      { severity: "CRITICAL", min: -Infinity, max: -20, color: "#3b82f6", label: "극저온" },
      { severity: "WARNING", min: -20, max: -10, color: "#60a5fa", label: "저온" },
      { severity: "NORMAL", min: -10, max: 45, color: "#22c55e", label: "정상" },
      { severity: "WARNING", min: 45, max: 55, color: "#f97316", label: "고온" },
      { severity: "CRITICAL", min: 55, max: Infinity, color: "#ef4444", label: "과열" },
    ],
  },
  riskScore: {
    label: "위험 점수",
    unit: "점",
    levels: [
      { severity: "NORMAL", min: 0, max: 30, color: "#22c55e", label: "정상" },
      { severity: "INFO", min: 30, max: 55, color: "#eab308", label: "주의" },
      { severity: "WARNING", min: 55, max: 75, color: "#f97316", label: "경고" },
      { severity: "REPLACE", min: 75, max: 90, color: "#ef4444", label: "교체 권고" },
      { severity: "CRITICAL", min: 90, max: 100, color: "#7f1d1d", label: "치명" },
    ],
  },
  workPriority: {
    label: "작업 우선순위",
    unit: "시간",
    levels: [
      { severity: "URGENT", min: 0, max: 2, color: "#ef4444", label: "긴급" },
      { severity: "HIGH", min: 2, max: 8, color: "#f97316", label: "높음" },
      { severity: "NORMAL", min: 8, max: 24, color: "#eab308", label: "보통" },
      { severity: "LOW", min: 24, max: Infinity, color: "#22c55e", label: "낮음" },
    ],
  },
} as const;

// ---------------------------------------------------------------------------
// 9. 타입 익스포트
// ---------------------------------------------------------------------------
export type ThresholdCategory = keyof typeof THRESHOLD_META;

export interface ThresholdLevel {
  severity: string;
  min: number;
  max: number;
  color: string;
  label: string;
}

export function getThresholdLevels(category: ThresholdCategory): ThresholdLevel[] {
  return THRESHOLD_META[category].levels as ThresholdLevel[];
}
