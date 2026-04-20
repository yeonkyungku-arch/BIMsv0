/**
 * /tablet 사용자 권한 관리
 * 
 * 기업 유형: 설치/구축 기업, 유지보수 기업, 통합 기업
 * 권한: 접근 가능한 메뉴, 작업 타입
 */

export type TabletCompanyType = "installer" | "maintainer" | "integrated";

export interface TabletUser {
  id: string;
  name: string;
  companyId: string;
  companyType: TabletCompanyType;
  role: "operator" | "supervisor" | "manager";
  permissions: TabletPermission[];
  createdAt: string;
}

export type TabletPermission =
  // 공통
  | "view_dashboard"
  | "view_device_list"
  | "view_terminal_info"
  | "view_work_history"
  
  // 설치/구축 기업
  | "warehouse_view"
  | "warehouse_manage"
  | "asset_dispatch"
  | "installation_execute"
  | "installation_report"
  
  // 유지보수 기업
  | "maintenance_accept"
  | "maintenance_execute"
  | "maintenance_report"
  | "asset_replacement"
  
  // 철거/폐기 (공통)
  | "recall_execute"
  | "disposal_execute"
  
  // Outbox 관리
  | "outbox_view"
  | "outbox_sync"
  | "outbox_retry";

/**
 * 기업 타입별 기본 권한 세트
 */
export const COMPANY_TYPE_PERMISSIONS: Record<TabletCompanyType, TabletPermission[]> = {
  installer: [
    "view_dashboard",
    "view_device_list",
    "view_terminal_info",
    "view_work_history",
    "warehouse_view",
    "warehouse_manage",
    "asset_dispatch",
    "installation_execute",
    "installation_report",
    "recall_execute",
    "outbox_view",
    "outbox_sync",
  ],
  maintainer: [
    "view_dashboard",
    "view_device_list",
    "view_terminal_info",
    "view_work_history",
    "maintenance_accept",
    "maintenance_execute",
    "maintenance_report",
    "asset_replacement",
    "recall_execute",
    "disposal_execute",
    "outbox_view",
    "outbox_sync",
  ],
  integrated: [
    "view_dashboard",
    "view_device_list",
    "view_terminal_info",
    "view_work_history",
    "warehouse_view",
    "warehouse_manage",
    "asset_dispatch",
    "installation_execute",
    "installation_report",
    "maintenance_accept",
    "maintenance_execute",
    "maintenance_report",
    "asset_replacement",
    "recall_execute",
    "disposal_execute",
    "outbox_view",
    "outbox_sync",
    "outbox_retry",
  ],
};

/**
 * 메뉴 접근 권한 확인
 */
export type TabletMenuKey =
  | "dashboard"
  | "warehouse"
  | "installation"
  | "maintenance"
  | "recall"
  | "disposal"
  | "devices"
  | "terminals"
  | "history"
  | "outbox";

export const MENU_PERMISSIONS: Record<TabletMenuKey, TabletPermission[]> = {
  dashboard: ["view_dashboard"],
  warehouse: ["warehouse_view", "warehouse_manage"],
  installation: [
    "installation_execute",
    "installation_report",
    "asset_dispatch",
  ],
  maintenance: [
    "maintenance_accept",
    "maintenance_execute",
    "maintenance_report",
    "asset_replacement",
  ],
  recall: ["recall_execute"],
  disposal: ["disposal_execute"],
  devices: ["view_device_list"],
  terminals: ["view_terminal_info"],
  history: ["view_work_history"],
  outbox: ["outbox_view", "outbox_sync"],
};

export function canAccessMenu(
  user: TabletUser,
  menu: TabletMenuKey
): boolean {
  const requiredPermissions = MENU_PERMISSIONS[menu];
  return requiredPermissions.some((perm) =>
    user.permissions.includes(perm)
  );
}

/**
 * 작업 수행 권한 확인
 */
export type TabletAction =
  | "view_warehouse_inventory"
  | "dispatch_asset"
  | "execute_installation"
  | "report_installation"
  | "accept_maintenance"
  | "execute_maintenance"
  | "report_maintenance"
  | "replace_asset"
  | "execute_recall"
  | "execute_disposal"
  | "sync_outbox"
  | "retry_outbox";

export const ACTION_PERMISSIONS: Record<TabletAction, TabletPermission[]> = {
  view_warehouse_inventory: ["warehouse_view"],
  dispatch_asset: ["asset_dispatch"],
  execute_installation: ["installation_execute"],
  report_installation: ["installation_report"],
  accept_maintenance: ["maintenance_accept"],
  execute_maintenance: ["maintenance_execute"],
  report_maintenance: ["maintenance_report"],
  replace_asset: ["asset_replacement"],
  execute_recall: ["recall_execute"],
  execute_disposal: ["disposal_execute"],
  sync_outbox: ["outbox_sync"],
  retry_outbox: ["outbox_retry"],
};

export function canPerformAction(user: TabletUser, action: TabletAction): boolean {
  const requiredPermissions = ACTION_PERMISSIONS[action];
  return requiredPermissions.some((perm) =>
    user.permissions.includes(perm)
  );
}

/**
 * 타블렛 메뉴 구조 (기업 타입별)
 */
export interface TabletMenuStructure {
  label: string;
  key: TabletMenuKey;
  requiredPermissions: TabletPermission[];
  subMenus?: TabletMenuStructure[];
}

export function getTabletMenuStructure(
  companyType: TabletCompanyType
): TabletMenuStructure[] {
  const baseMenus: TabletMenuStructure[] = [
    {
      label: "대시보드",
      key: "dashboard",
      requiredPermissions: ["view_dashboard"],
    },
    {
      label: "기기 조회",
      key: "devices",
      requiredPermissions: ["view_device_list"],
    },
    {
      label: "정류장 조회",
      key: "terminals",
      requiredPermissions: ["view_terminal_info"],
    },
    {
      label: "작업 이력",
      key: "history",
      requiredPermissions: ["view_work_history"],
    },
    {
      label: "동기화 관리",
      key: "outbox",
      requiredPermissions: ["outbox_view"],
    },
  ];

  const installerMenus: TabletMenuStructure[] = [
    {
      label: "창고 관리",
      key: "warehouse",
      requiredPermissions: ["warehouse_view"],
      subMenus: [
        {
          label: "재고 현황",
          key: "warehouse",
          requiredPermissions: ["warehouse_view"],
        },
      ],
    },
    {
      label: "설치 작업",
      key: "installation",
      requiredPermissions: ["installation_execute"],
      subMenus: [
        {
          label: "설치 작업 실행",
          key: "installation",
          requiredPermissions: ["installation_execute"],
        },
        {
          label: "완료 보고",
          key: "installation",
          requiredPermissions: ["installation_report"],
        },
      ],
    },
    {
      label: "철거 작업",
      key: "recall",
      requiredPermissions: ["recall_execute"],
    },
  ];

  const maintainerMenus: TabletMenuStructure[] = [
    {
      label: "유지보수 작업",
      key: "maintenance",
      requiredPermissions: ["maintenance_execute"],
      subMenus: [
        {
          label: "작업 수락",
          key: "maintenance",
          requiredPermissions: ["maintenance_accept"],
        },
        {
          label: "작업 실행",
          key: "maintenance",
          requiredPermissions: ["maintenance_execute"],
        },
        {
          label: "완료 보고",
          key: "maintenance",
          requiredPermissions: ["maintenance_report"],
        },
      ],
    },
    {
      label: "철거 작업",
      key: "recall",
      requiredPermissions: ["recall_execute"],
    },
    {
      label: "폐기 처리",
      key: "disposal",
      requiredPermissions: ["disposal_execute"],
    },
  ];

  let companyMenus: TabletMenuStructure[] = [];

  if (companyType === "installer") {
    companyMenus = installerMenus;
  } else if (companyType === "maintainer") {
    companyMenus = maintainerMenus;
  } else if (companyType === "integrated") {
    companyMenus = [...installerMenus, ...maintainerMenus];
  }

  return [...baseMenus, ...companyMenus];
}

/**
 * 동적 메뉴 필터링
 */
export function filterMenusByUserPermissions(
  menus: TabletMenuStructure[],
  user: TabletUser
): TabletMenuStructure[] {
  return menus
    .filter((menu) =>
      menu.requiredPermissions.some((perm) => user.permissions.includes(perm))
    )
    .map((menu) => ({
      ...menu,
      subMenus: menu.subMenus
        ? filterMenusByUserPermissions(menu.subMenus, user)
        : undefined,
    }));
}
