/**
 * Tablet Authentication & Authorization
 * 
 * /tablet 앱 전용 인증/권한 관리
 * 
 * 기업 유형:
 * - INSTALLER: 설치/구축 기업 (창고 관리, 설치 작업)
 * - MAINTAINER: 유지보수 기업 (장애 대응, 수리, 철거, 폐기)
 * - BOTH: 설치 + 유지보수 모두 담당
 */

import type { TabletWorkType } from "./tablet-asset-lifecycle";

// ---------------------------------------------------------------------------
// 기업 유형
// ---------------------------------------------------------------------------
export type TabletCompanyType = "INSTALLER" | "MAINTAINER" | "BOTH";

export const COMPANY_TYPE_META: Record<TabletCompanyType, { label: string; description: string }> = {
  INSTALLER: { 
    label: "설치/구축 기업", 
    description: "자산 입출고 및 정류장 설치 구축 담당" 
  },
  MAINTAINER: { 
    label: "유지보수 기업", 
    description: "장애 대응, 수리, 철거, 폐기 담당" 
  },
  BOTH: { 
    label: "설치+유지보수 기업", 
    description: "설치 구축 및 유지보수 전체 담당" 
  },
};

// ---------------------------------------------------------------------------
// Tablet 사용자 (현장 작업자)
// ---------------------------------------------------------------------------
export interface TabletUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  
  // 소속 기업
  companyId: string;
  companyName: string;
  companyType: TabletCompanyType;
  
  // 담당 지역/고객사
  assignedRegions?: string[];
  assignedCustomers?: string[];
  
  // 권한
  role: TabletUserRole;
  permissions: TabletPermission[];
  
  // 상태
  isActive: boolean;
  lastLoginAt?: string;
}

export type TabletUserRole = 
  | "FIELD_WORKER"      // 현장 작업자
  | "FIELD_LEAD"        // 현장 팀장
  | "WAREHOUSE_MANAGER" // 창고 관리자
  | "COMPANY_ADMIN";    // 기업 관리자

export const TABLET_ROLE_META: Record<TabletUserRole, { label: string; level: number }> = {
  FIELD_WORKER: { label: "현장 작업자", level: 1 },
  FIELD_LEAD: { label: "현장 팀장", level: 2 },
  WAREHOUSE_MANAGER: { label: "창고 관리자", level: 2 },
  COMPANY_ADMIN: { label: "기업 관리자", level: 3 },
};

// ---------------------------------------------------------------------------
// 권한 정의
// ---------------------------------------------------------------------------
export type TabletPermission =
  // 대시보드
  | "tablet.dashboard.view"
  
  // 창고 관리 (INSTALLER 전용)
  | "tablet.warehouse.view"
  | "tablet.warehouse.receiving"    // 입고 처리
  | "tablet.warehouse.dispatch"     // 출고 처리
  | "tablet.warehouse.inventory"    // 재고 조회
  
  // 설치 작업 (INSTALLER 전용)
  | "tablet.install.view"
  | "tablet.install.execute"
  | "tablet.install.complete"
  
  // 유지보수 작업 (MAINTAINER 전용)
  | "tablet.maintenance.view"
  | "tablet.maintenance.execute"
  | "tablet.maintenance.complete"
  
  // 철거 작업 (BOTH)
  | "tablet.removal.view"
  | "tablet.removal.execute"
  | "tablet.removal.complete"
  
  // 폐기 처리 (MAINTAINER 전용)
  | "tablet.disposal.view"
  | "tablet.disposal.execute"
  
  // 단말/정류장 조회 (BOTH)
  | "tablet.device.view"
  | "tablet.stop.view"
  
  // Outbox (BOTH)
  | "tablet.outbox.view"
  | "tablet.outbox.sync"
  
  // 작업 이력 (BOTH)
  | "tablet.history.view";

// ---------------------------------------------------------------------------
// 기업 유형별 기본 권한
// ---------------------------------------------------------------------------
const INSTALLER_BASE_PERMISSIONS: TabletPermission[] = [
  "tablet.dashboard.view",
  "tablet.warehouse.view",
  "tablet.warehouse.receiving",
  "tablet.warehouse.dispatch",
  "tablet.warehouse.inventory",
  "tablet.install.view",
  "tablet.install.execute",
  "tablet.install.complete",
  "tablet.removal.view",
  "tablet.removal.execute",
  "tablet.removal.complete",
  "tablet.device.view",
  "tablet.stop.view",
  "tablet.outbox.view",
  "tablet.outbox.sync",
  "tablet.history.view",
];

const MAINTAINER_BASE_PERMISSIONS: TabletPermission[] = [
  "tablet.dashboard.view",
  "tablet.maintenance.view",
  "tablet.maintenance.execute",
  "tablet.maintenance.complete",
  "tablet.removal.view",
  "tablet.removal.execute",
  "tablet.removal.complete",
  "tablet.disposal.view",
  "tablet.disposal.execute",
  "tablet.device.view",
  "tablet.stop.view",
  "tablet.outbox.view",
  "tablet.outbox.sync",
  "tablet.history.view",
];

const BOTH_BASE_PERMISSIONS: TabletPermission[] = [
  ...new Set([...INSTALLER_BASE_PERMISSIONS, ...MAINTAINER_BASE_PERMISSIONS])
];

export function getBasePermissionsForCompanyType(companyType: TabletCompanyType): TabletPermission[] {
  switch (companyType) {
    case "INSTALLER": return [...INSTALLER_BASE_PERMISSIONS];
    case "MAINTAINER": return [...MAINTAINER_BASE_PERMISSIONS];
    case "BOTH": return [...BOTH_BASE_PERMISSIONS];
  }
}

// ---------------------------------------------------------------------------
// 권한 검증
// ---------------------------------------------------------------------------
export function hasPermission(user: TabletUser, permission: TabletPermission): boolean {
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: TabletUser, permissions: TabletPermission[]): boolean {
  return permissions.some(p => user.permissions.includes(p));
}

export function hasAllPermissions(user: TabletUser, permissions: TabletPermission[]): boolean {
  return permissions.every(p => user.permissions.includes(p));
}

// ---------------------------------------------------------------------------
// 작업 유형별 권한 매핑
// ---------------------------------------------------------------------------
export function getRequiredPermissionsForWorkType(workType: TabletWorkType): TabletPermission[] {
  switch (workType) {
    case "INSTALL":
      return ["tablet.install.view", "tablet.install.execute"];
    case "MAINTENANCE":
      return ["tablet.maintenance.view", "tablet.maintenance.execute"];
    case "REPLACEMENT":
      return ["tablet.maintenance.view", "tablet.maintenance.execute", "tablet.install.execute"];
    case "REMOVAL":
      return ["tablet.removal.view", "tablet.removal.execute"];
    case "RELOCATION":
      return ["tablet.install.view", "tablet.install.execute", "tablet.removal.execute"];
    case "INSPECTION":
      return ["tablet.device.view"];
    case "DISPOSAL":
      return ["tablet.disposal.view", "tablet.disposal.execute"];
    default:
      return [];
  }
}

export function canPerformWorkType(user: TabletUser, workType: TabletWorkType): boolean {
  const required = getRequiredPermissionsForWorkType(workType);
  return hasAnyPermission(user, required);
}

// ---------------------------------------------------------------------------
// 메뉴 접근 권한
// ---------------------------------------------------------------------------
export interface TabletMenuItem {
  id: string;
  label: string;
  path: string;
  requiredPermissions: TabletPermission[];
  companyTypes: TabletCompanyType[];
}

export const TABLET_MENU_ITEMS: TabletMenuItem[] = [
  {
    id: "dashboard",
    label: "대시보드",
    path: "/tablet",
    requiredPermissions: ["tablet.dashboard.view"],
    companyTypes: ["INSTALLER", "MAINTAINER", "BOTH"],
  },
  {
    id: "warehouse",
    label: "창고 관리",
    path: "/tablet/warehouse",
    requiredPermissions: ["tablet.warehouse.view"],
    companyTypes: ["INSTALLER", "BOTH"],
  },
  {
    id: "install",
    label: "설치 작업",
    path: "/tablet/install",
    requiredPermissions: ["tablet.install.view"],
    companyTypes: ["INSTALLER", "BOTH"],
  },
  {
    id: "maintenance",
    label: "유지보수",
    path: "/tablet/maintenance",
    requiredPermissions: ["tablet.maintenance.view"],
    companyTypes: ["MAINTAINER", "BOTH"],
  },
  {
    id: "removal",
    label: "철거 작업",
    path: "/tablet/removal",
    requiredPermissions: ["tablet.removal.view"],
    companyTypes: ["INSTALLER", "MAINTAINER", "BOTH"],
  },
  {
    id: "disposal",
    label: "폐기 처리",
    path: "/tablet/disposal",
    requiredPermissions: ["tablet.disposal.view"],
    companyTypes: ["MAINTAINER", "BOTH"],
  },
  {
    id: "device",
    label: "단말 조회",
    path: "/tablet/device/list",
    requiredPermissions: ["tablet.device.view"],
    companyTypes: ["INSTALLER", "MAINTAINER", "BOTH"],
  },
  {
    id: "stop",
    label: "정류장 조회",
    path: "/tablet/stops",
    requiredPermissions: ["tablet.stop.view"],
    companyTypes: ["INSTALLER", "MAINTAINER", "BOTH"],
  },
  {
    id: "outbox",
    label: "동기화",
    path: "/tablet/outbox",
    requiredPermissions: ["tablet.outbox.view"],
    companyTypes: ["INSTALLER", "MAINTAINER", "BOTH"],
  },
];

export function getAccessibleMenuItems(user: TabletUser): TabletMenuItem[] {
  return TABLET_MENU_ITEMS.filter(item => {
    // 기업 유형 체크
    if (!item.companyTypes.includes(user.companyType)) {
      return false;
    }
    // 권한 체크
    return hasAnyPermission(user, item.requiredPermissions);
  });
}

// ---------------------------------------------------------------------------
// Mock 사용자 데이터
// ---------------------------------------------------------------------------
export const mockTabletUsers: TabletUser[] = [
  {
    id: "TU-001",
    name: "김설치",
    email: "install@epaper.co.kr",
    phone: "010-1234-5678",
    companyId: "SH001",
    companyName: "이페이퍼솔루션즈",
    companyType: "BOTH",
    assignedRegions: ["서울", "경기"],
    assignedCustomers: ["CUS001", "CUS002"],
    role: "FIELD_LEAD",
    permissions: getBasePermissionsForCompanyType("BOTH"),
    isActive: true,
    lastLoginAt: "2026-03-25 08:30:00",
  },
  {
    id: "TU-002",
    name: "박현장",
    email: "field@krmaint.co.kr",
    phone: "010-2345-6789",
    companyId: "SH002",
    companyName: "한국유지보수",
    companyType: "MAINTAINER",
    assignedRegions: ["서울", "인천"],
    assignedCustomers: ["CUS001", "CUS003"],
    role: "FIELD_WORKER",
    permissions: getBasePermissionsForCompanyType("MAINTAINER"),
    isActive: true,
    lastLoginAt: "2026-03-25 09:15:00",
  },
  {
    id: "TU-003",
    name: "이창고",
    email: "warehouse@smartdisplay.co.kr",
    phone: "010-3456-7890",
    companyId: "SH003",
    companyName: "스마트디스플레이",
    companyType: "INSTALLER",
    assignedRegions: ["인천", "경기"],
    role: "WAREHOUSE_MANAGER",
    permissions: getBasePermissionsForCompanyType("INSTALLER"),
    isActive: true,
    lastLoginAt: "2026-03-24 17:00:00",
  },
  {
    id: "TU-004",
    name: "최수리",
    email: "repair@krmaint.co.kr",
    phone: "010-4567-8901",
    companyId: "SH002",
    companyName: "한국유지보수",
    companyType: "MAINTAINER",
    assignedRegions: ["부산", "대전"],
    role: "FIELD_WORKER",
    permissions: getBasePermissionsForCompanyType("MAINTAINER"),
    isActive: true,
    lastLoginAt: "2026-03-25 07:45:00",
  },
];

// ---------------------------------------------------------------------------
// 현재 사용자 관리 (Mock)
// ---------------------------------------------------------------------------
let _currentUser: TabletUser | null = mockTabletUsers[0]; // 기본: 김설치

export function getCurrentTabletUser(): TabletUser | null {
  return _currentUser;
}

export function setCurrentTabletUser(userId: string): boolean {
  const user = mockTabletUsers.find(u => u.id === userId);
  if (user) {
    _currentUser = user;
    return true;
  }
  return false;
}

export function loginTabletUser(email: string): TabletUser | null {
  const user = mockTabletUsers.find(u => u.email === email && u.isActive);
  if (user) {
    _currentUser = user;
    return user;
  }
  return null;
}

export function logoutTabletUser(): void {
  _currentUser = null;
}

// ---------------------------------------------------------------------------
// 권한 역할 변환 (Asset Lifecycle 연동)
// ---------------------------------------------------------------------------
export function getAssetLifecycleRole(user: TabletUser): "installer" | "maintainer" | "both" {
  switch (user.companyType) {
    case "INSTALLER": return "installer";
    case "MAINTAINER": return "maintainer";
    case "BOTH": return "both";
  }
}
