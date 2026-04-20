"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  CloudOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getOutboxItems,
  subscribeOutbox,
} from "@/lib/tablet-outbox";
import type { OutboxItem } from "@/lib/tablet-install-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SyncStatus = "idle" | "pending" | "syncing" | "success" | "failed";

interface SyncState {
  status: SyncStatus;
  totalItems: number;
  pendingItems: number;
  failedItems: number;
  syncedItems: number;
  lastSyncAt: string | null;
  isOnline: boolean;
}

// ---------------------------------------------------------------------------
// Sync State Helper
// ---------------------------------------------------------------------------
function computeSyncState(items: OutboxItem[] | undefined): SyncState {
  if (!items || !Array.isArray(items)) {
    return {
      status: "idle",
      totalItems: 0,
      pendingItems: 0,
      failedItems: 0,
      syncedItems: 0,
      lastSyncAt: null,
      isOnline: true,
    };
  }
  const pending = items.filter(
    (i) =>
      i.transmissionStatus === "LOCAL_SAVED" ||
      i.transmissionStatus === "QUEUED"
  ).length;
  const failed = items.filter(
    (i) =>
      i.transmissionStatus === "TX_FAILED" ||
      i.transmissionStatus === "SERVER_REJECTED"
  ).length;
  const synced = items.filter(
    (i) =>
      i.transmissionStatus === "TX_CONFIRMED" ||
      i.transmissionStatus === "APPROVAL_CONFIRMED"
  ).length;
  const syncing = items.filter(
    (i) => i.transmissionStatus === "SENDING"
  ).length;

  let status: SyncStatus = "idle";
  if (syncing > 0) {
    status = "syncing";
  } else if (failed > 0) {
    status = "failed";
  } else if (pending > 0) {
    status = "pending";
  } else if (synced > 0) {
    status = "success";
  }

  // Find last sync time
  const syncedItems = items.filter(
    (i) =>
      i.transmissionStatus === "TX_CONFIRMED" ||
      i.transmissionStatus === "APPROVAL_CONFIRMED"
  );
  const lastSyncAt =
    syncedItems.length > 0
      ? syncedItems.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0].updatedAt
      : null;

  return {
    status,
    totalItems: items.length,
    pendingItems: pending,
    failedItems: failed,
    syncedItems: synced,
    lastSyncAt,
    // isOnline is set separately via useEffect to avoid hydration mismatch
    isOnline: true,
  };
}

// ---------------------------------------------------------------------------
// Status Config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  SyncStatus,
  {
    icon: React.ElementType;
    label: string;
    color: string;
    bgColor: string;
    progressColor: string;
  }
> = {
  idle: {
    icon: Cloud,
    label: "동기화 완료",
    color: "var(--outbox-success)",
    bgColor: "rgba(16, 185, 129, 0.1)",
    progressColor: "bg-emerald-500",
  },
  pending: {
    icon: Upload,
    label: "전송 대기",
    color: "var(--outbox-pending)",
    bgColor: "rgba(245, 158, 11, 0.1)",
    progressColor: "bg-amber-500",
  },
  syncing: {
    icon: RefreshCw,
    label: "동기화 중",
    color: "var(--outbox-syncing)",
    bgColor: "rgba(139, 92, 246, 0.1)",
    progressColor: "bg-violet-500",
  },
  success: {
    icon: CheckCircle2,
    label: "전송 완료",
    color: "var(--outbox-success)",
    bgColor: "rgba(16, 185, 129, 0.1)",
    progressColor: "bg-emerald-500",
  },
  failed: {
    icon: AlertCircle,
    label: "전송 실패",
    color: "var(--outbox-failed)",
    bgColor: "rgba(239, 68, 68, 0.1)",
    progressColor: "bg-red-500",
  },
};

// ---------------------------------------------------------------------------
// Mini Indicator (for AppBar)
// ---------------------------------------------------------------------------
interface OutboxMiniIndicatorProps {
  onClick?: () => void;
}

export function OutboxMiniIndicator({ onClick }: OutboxMiniIndicatorProps) {
  const router = useRouter();
  const [syncState, setSyncState] = useState<SyncState>(() =>
    computeSyncState(getOutboxItems())
  );

  useEffect(() => {
    const unsubscribe = subscribeOutbox(() => {
      setSyncState(computeSyncState(getOutboxItems()));
    });
    return unsubscribe;
  }, []);

  // Online status listener - set initial value after hydration to avoid mismatch
  useEffect(() => {
    // Set initial online state after mount
    setSyncState((prev) => ({ ...prev, isOnline: navigator.onLine }));
    
    const handleOnline = () =>
      setSyncState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setSyncState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const config = STATUS_CONFIG[syncState.status];
  const Icon = config.icon;
  const hasPending = syncState.pendingItems > 0 || syncState.failedItems > 0;

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
    } else {
      router.push("/tablet/outbox");
    }
  }, [onClick, router]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors tablet-touch-target",
              "hover:bg-[var(--tablet-bg-elevated)]"
            )}
          >
            {/* Network Status */}
            {syncState.isOnline ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            )}

            {/* Sync Icon */}
            <Icon
              className={cn(
                "h-4 w-4",
                syncState.status === "syncing" && "animate-spin"
              )}
              style={{ color: config.color }}
            />

            {/* Badge */}
            {hasPending && (
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                  "h-4 min-w-4 px-1 text-[10px] font-bold rounded-full",
                  syncState.failedItems > 0
                    ? "bg-red-500 text-white"
                    : "bg-amber-500 text-white"
                )}
              >
                {syncState.pendingItems + syncState.failedItems}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>
            {config.label}
            {syncState.pendingItems > 0 &&
              ` (${syncState.pendingItems}건 대기)`}
            {syncState.failedItems > 0 &&
              ` (${syncState.failedItems}건 실패)`}
          </p>
          {!syncState.isOnline && (
            <p className="text-amber-400 mt-1">오프라인 상태</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Progress Bar (for Dashboard)
// ---------------------------------------------------------------------------
interface OutboxProgressBarProps {
  showDetails?: boolean;
  onClick?: () => void;
}

export function OutboxProgressBar({
  showDetails = true,
  onClick,
}: OutboxProgressBarProps) {
  const router = useRouter();
  const [syncState, setSyncState] = useState<SyncState>(() =>
    computeSyncState(getOutboxItems())
  );

  useEffect(() => {
    const unsubscribe = subscribeOutbox(() => {
      setSyncState(computeSyncState(getOutboxItems()));
    });
    return unsubscribe;
  }, []);

  const handleSync = useCallback(async () => {
    if (onSyncClick) {
      setIsSyncing(true);
      await onSyncClick();
      setIsSyncing(false);
    }
  }, [onSyncClick]);

  const config = STATUS_CONFIG[syncState.status];

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2 rounded-xl mb-4",
        "border border-[var(--tablet-border)]",
        syncState.isOnline
          ? "bg-[var(--tablet-bg-card)]"
          : "bg-amber-950/30 border-amber-800"
      )}
    >
      {/* Left: Network + Status */}
      <div className="flex items-center gap-3">
        {/* Network Icon */}
        <div
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg",
            syncState.isOnline ? "bg-emerald-950/50" : "bg-amber-950/50"
          )}
        >
          {syncState.isOnline ? (
            <Wifi className="h-4 w-4 text-emerald-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-amber-400" />
          )}
        </div>

        {/* Status Text */}
        <div>
          <p className="text-sm font-medium text-[var(--tablet-text)]">
            {syncState.isOnline ? "온라인" : "오프라인"}
          </p>
          <p className="text-xs text-[var(--tablet-text-muted)]">
            {syncState.pendingItems > 0 &&
              `${syncState.pendingItems}건 전송 대기`}
            {syncState.failedItems > 0 &&
              `${syncState.pendingItems > 0 ? " / " : ""}${syncState.failedItems}건 실패`}
            {syncState.pendingItems === 0 &&
              syncState.failedItems === 0 &&
              (syncState.lastSyncAt
                ? `마지막 동기화: ${new Date(syncState.lastSyncAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}`
                : "동기화 완료")}
          </p>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Sync Button */}
        {onSyncClick && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs bg-[var(--tablet-bg-elevated)] hover:bg-[var(--tablet-border)]"
            onClick={handleSync}
            disabled={isSyncing || !syncState.isOnline}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 mr-1.5", isSyncing && "animate-spin")}
            />
            동기화
          </Button>
        )}

        {/* Outbox Link */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs bg-[var(--tablet-bg-elevated)] hover:bg-[var(--tablet-border)]"
          onClick={() => router.push("/tablet/outbox")}
        >
          전송함
          {(syncState.pendingItems > 0 || syncState.failedItems > 0) && (
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-amber-500 text-white rounded-full">
              {syncState.pendingItems + syncState.failedItems}
            </span>
          )}
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
