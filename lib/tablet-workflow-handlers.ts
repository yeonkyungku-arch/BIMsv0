/**
 * /tablet 워크플로우 핸들러
 * 
 * 각 업무(설치, 유지보수, 철거)별 상태 관리 로직
 */

import {
  InstallAssetWorkflow,
  MaintenanceAssetWorkflow,
  RecallAssetWorkflow,
  AssetOutboxItem,
  recordAssetStatusChange,
  createAssetOutboxItem,
} from "./tablet-asset-workflow";
import { TabletUser } from "./tablet-user-permissions";

/**
 * 1. 설치 워크플로우 핸들러
 */
export class InstallationWorkflowHandler {
  /**
   * 창고에서 자산 출고
   */
  static dispatchAsset(
    workflow: InstallAssetWorkflow,
    warehouseId: string,
    dispatchedBy: string
  ): InstallAssetWorkflow {
    if (workflow.currentStatus !== "WAREHOUSED") {
      throw new Error("Asset must be in WAREHOUSED status to dispatch");
    }

    recordAssetStatusChange(
      workflow,
      "DISPATCHED",
      dispatchedBy,
      `Dispatched from warehouse ${warehouseId}`
    );

    workflow.warehouseId = warehouseId;
    workflow.dispatchedAt = new Date().toISOString();
    workflow.dispatchedBy = dispatchedBy;

    return workflow;
  }

  /**
   * 정류장에 기기 설치
   */
  static installDevice(
    workflow: InstallAssetWorkflow,
    stationId: string,
    deviceId: string,
    installedBy: string
  ): InstallAssetWorkflow {
    if (workflow.currentStatus !== "DISPATCHED") {
      throw new Error("Asset must be in DISPATCHED status to install");
    }

    recordAssetStatusChange(
      workflow,
      "INSTALLED",
      installedBy,
      `Installed at station ${stationId}`
    );

    workflow.stationId = stationId;
    workflow.deviceId = deviceId;
    workflow.installationAt = new Date().toISOString();
    workflow.installedBy = installedBy;

    return workflow;
  }

  /**
   * 설치 완료 보고
   */
  static reportInstallation(
    workflow: InstallAssetWorkflow,
    photos: string[],
    checklist: Record<string, boolean>,
    reportedBy: string
  ): InstallAssetWorkflow {
    if (workflow.currentStatus !== "INSTALLED") {
      throw new Error("Asset must be in INSTALLED status to report");
    }

    // 체크리스트 모두 통과 확인
    if (!Object.values(checklist).every((v) => v)) {
      throw new Error("Not all checklist items passed");
    }

    workflow.installationPhotos = photos;
    workflow.checklist = checklist;
    workflow.completedAt = new Date().toISOString();

    return workflow;
  }

  /**
   * 설치 완료 버튼 누르기 (상태 변경 + Outbox 추가)
   */
  static completeInstallation(
    workflow: InstallAssetWorkflow,
    completedBy: string
  ): { workflow: InstallAssetWorkflow; outboxItem: AssetOutboxItem } {
    if (!workflow.completedAt) {
      throw new Error("Installation not yet reported");
    }

    recordAssetStatusChange(
      workflow,
      "INSTALLED",
      completedBy,
      "Installation completion reported to server"
    );

    const outboxItem = createAssetOutboxItem(workflow, "asset-install");

    return { workflow, outboxItem };
  }
}

/**
 * 2. 유지보수 워크플로우 핸들러
 */
export class MaintenanceWorkflowHandler {
  /**
   * 부품 출고 (유지보수 전)
   */
  static dispatchForMaintenance(
    workflow: MaintenanceAssetWorkflow,
    maintenanceReason: string,
    dispatchedBy: string
  ): MaintenanceAssetWorkflow {
    if (workflow.currentStatus !== "WAREHOUSED") {
      throw new Error("Asset must be in WAREHOUSED status to dispatch");
    }

    recordAssetStatusChange(
      workflow,
      "DISPATCHED",
      dispatchedBy,
      `Dispatched for maintenance: ${maintenanceReason}`
    );

    workflow.dispatchedAt = new Date().toISOString();
    workflow.dispatchedBy = dispatchedBy;
    workflow.maintenanceReason = maintenanceReason;

    return workflow;
  }

  /**
   * 현장에서 부품 교체
   */
  static replaceAsset(
    workflow: MaintenanceAssetWorkflow,
    oldDeviceId: string,
    newDeviceId: string,
    replacedBy: string
  ): MaintenanceAssetWorkflow {
    if (workflow.currentStatus !== "DISPATCHED") {
      throw new Error("Asset must be in DISPATCHED status to replace");
    }

    recordAssetStatusChange(
      workflow,
      "MAINTAINED",
      replacedBy,
      `Replaced device ${oldDeviceId} with ${newDeviceId}`
    );

    workflow.oldDeviceId = oldDeviceId;
    workflow.newDeviceId = newDeviceId;
    workflow.replacedAt = new Date().toISOString();
    workflow.replacedBy = replacedBy;

    return workflow;
  }

  /**
   * 유지보수 완료 보고
   */
  static reportMaintenance(
    workflow: MaintenanceAssetWorkflow,
    photos: string[],
    checklist: Record<string, boolean>,
    disposalRequired: boolean,
    disposalReason?: string
  ): MaintenanceAssetWorkflow {
    if (workflow.currentStatus !== "MAINTAINED") {
      throw new Error("Asset must be in MAINTAINED status to report");
    }

    workflow.replacementPhotos = photos;
    workflow.checklist = checklist;
    workflow.completedAt = new Date().toISOString();
    workflow.disposalRequired = disposalRequired;
    workflow.disposalReason = disposalReason;

    return workflow;
  }

  /**
   * 유지보수 완료 버튼 누르기
   */
  static completeMaintenance(
    workflow: MaintenanceAssetWorkflow,
    completedBy: string
  ): { workflow: MaintenanceAssetWorkflow; outboxItem: AssetOutboxItem } {
    if (!workflow.completedAt) {
      throw new Error("Maintenance not yet reported");
    }

    // 폐기 필요 시 -> DISPOSED로 전환
    // 정상 반납 시 -> RETURNED로 전환
    const nextStatus = workflow.disposalRequired ? "DISPOSED" : "RETURNED";

    recordAssetStatusChange(
      workflow,
      nextStatus,
      completedBy,
      `Maintenance completion reported: ${nextStatus}`
    );

    const outboxItem = createAssetOutboxItem(workflow, "asset-maintenance");

    return { workflow, outboxItem };
  }
}

/**
 * 3. 철거 워크플로우 핸들러
 */
export class RecallWorkflowHandler {
  /**
   * 정류장에서 기기 철거
   */
  static recallDevice(
    workflow: RecallAssetWorkflow,
    recallReason: "MAINTENANCE" | "FAILURE" | "DECOMMISSION" | "UPGRADE",
    photos: string[],
    checklist: Record<string, boolean>,
    recalledBy: string
  ): RecallAssetWorkflow {
    if (workflow.currentStatus !== "INSTALLED" && workflow.currentStatus !== "MAINTAINED") {
      throw new Error(
        "Asset must be INSTALLED or MAINTAINED to recall"
      );
    }

    recordAssetStatusChange(
      workflow,
      "RECALLED",
      recalledBy,
      `Recalled from station ${workflow.stationId}: ${recallReason}`
    );

    workflow.recalledAt = new Date().toISOString();
    workflow.recalledBy = recalledBy;
    workflow.recallReason = recallReason;
    workflow.recallPhotos = photos;
    workflow.checklist = checklist;

    return workflow;
  }

  /**
   * 철거품 처리 결정: 반납 또는 폐기
   */
  static handleRecalledDevice(
    workflow: RecallAssetWorkflow,
    action: "return" | "dispose",
    disposalReason?: string,
    handledBy?: string
  ): { workflow: RecallAssetWorkflow; outboxItem: AssetOutboxItem } {
    if (workflow.currentStatus !== "RECALLED") {
      throw new Error("Asset must be in RECALLED status");
    }

    if (action === "return") {
      recordAssetStatusChange(
        workflow,
        "RETURNED",
        handledBy || "system",
        "Recalled device returned to warehouse"
      );
    } else if (action === "dispose") {
      recordAssetStatusChange(
        workflow,
        "DISPOSED",
        handledBy || "system",
        `Disposed: ${disposalReason || "No reason provided"}`
      );
      workflow.disposalReason = disposalReason;
    }

    workflow.returnedAt = action === "return" ? new Date().toISOString() : undefined;
    workflow.disposalAt = action === "dispose" ? new Date().toISOString() : undefined;

    const outboxType =
      action === "dispose" ? ("asset-disposal" as const) : ("asset-recall" as const);
    const outboxItem = createAssetOutboxItem(workflow, outboxType);

    return { workflow, outboxItem };
  }
}

/**
 * 4. Outbox 동기화 핸들러
 */
export class OutboxSyncHandler {
  /**
   * Outbox 항목 동기화 (서버로 전송)
   */
  static async syncItem(
    item: AssetOutboxItem,
    maxRetries: number = 3
  ): Promise<AssetOutboxItem> {
    if (item.status === "synced") {
      return item;
    }

    if (item.retryCount >= maxRetries) {
      throw new Error(
        `Max retries exceeded for outbox item ${item.id}`
      );
    }

    try {
      // 실제 구현에서는 서버 API 호출
      // const response = await fetch('/api/tablet/sync', {
      //   method: 'POST',
      //   body: JSON.stringify(item),
      // });

      item.status = "synced";
      item.syncedAt = new Date().toISOString();

      return item;
    } catch (error) {
      item.retryCount++;
      item.status = "failed";
      throw error;
    }
  }

  /**
   * 모든 Outbox 항목 동기화
   */
  static async syncAll(
    items: AssetOutboxItem[]
  ): Promise<{ succeeded: AssetOutboxItem[]; failed: AssetOutboxItem[] }> {
    const results = await Promise.allSettled(
      items
        .filter((item) => item.status === "pending")
        .map((item) => this.syncItem(item))
    );

    const succeeded = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean) as AssetOutboxItem[];

    const failed = items.filter((item) => item.status === "failed");

    return { succeeded, failed };
  }

  /**
   * Outbox 항목 재시도
   */
  static async retry(
    item: AssetOutboxItem,
    maxRetries?: number
  ): Promise<AssetOutboxItem> {
    item.status = "pending";
    item.retryCount = 0;
    return this.syncItem(item, maxRetries);
  }
}

/**
 * 권한 검증 헬퍼
 */
export function validatePermissionForWorkflow(
  user: TabletUser,
  workflowType: "install" | "maintenance" | "recall",
  action: string
): boolean {
  const companyType = user.companyType;

  const allowedWorkflows = {
    installer: ["install", "recall"],
    maintainer: ["maintenance", "recall"],
    integrated: ["install", "maintenance", "recall"],
  };

  return allowedWorkflows[companyType].includes(workflowType);
}
