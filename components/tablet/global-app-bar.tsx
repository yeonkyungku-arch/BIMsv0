"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useSyncExternalStore } from "react";
import { getOutboxPendingCount, subscribeOutbox } from "@/lib/tablet-outbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Wifi, WifiOff, Send, User, ChevronLeft, ChevronRight } from "@/components/icons";
import { OutboxMiniIndicator } from "@/components/tablet/outbox-sync-indicator";

// ---------------------------------------------------------------------------
// Breadcrumb mapping
// ---------------------------------------------------------------------------

interface Crumb {
  label: string;
  href?: string;
}

function buildBreadcrumbs(pathname: string, module: "operations" | "registry"): Crumb[] {
  // ---------- Operations module ----------
  if (module === "operations") {
    if (pathname === "/tablet") return [];

    const crumbs: Crumb[] = [{ label: "Operations", href: "/tablet" }];

    if (pathname.startsWith("/tablet/install") && pathname !== "/tablet/install") {
      crumbs.push({ label: "설치 구축", href: "/tablet/install" });
      crumbs.push({ label: "설치 상세" });
    } else if (pathname === "/tablet/install") {
      crumbs.push({ label: "설치 구축" });
    } else if (pathname === "/tablet/outbox") {
      crumbs.push({ label: "전송 대기함" });
    } else if (pathname.endsWith("/complete") && pathname.includes("/tablet/maintenance/")) {
      crumbs.push({ label: "유지보수 작업" });
      crumbs.push({ label: "작업 완료" });
    } else if (pathname.startsWith("/tablet/maintenance/")) {
      crumbs.push({ label: "유지보수 작업" });
    } else if (pathname.startsWith("/tablet/device/")) {
      crumbs.push({ label: "유지보수" });
    } else if (pathname.startsWith("/tablet/terminal") && pathname !== "/tablet/terminal") {
      crumbs.push({ label: "단말 현황", href: "/tablet/terminal" });
      crumbs.push({ label: "단말 상세" });
    } else if (pathname === "/tablet/terminal") {
      crumbs.push({ label: "단말 현황" });
    } else if (pathname.startsWith("/tablet/inventory")) {
      crumbs.push({ label: "재고 관리" });
    }

    return crumbs;
  }

  // ---------- Registry module ----------
  const crumbs: Crumb[] = [{ label: "Registry", href: "/registry/bis-terminal" }];

  if (pathname === "/registry/bis-terminal") {
    crumbs.push({ label: "BIS 단말 관리" });
  } else if (pathname.startsWith("/registry/bis-terminal/")) {
    crumbs.push({ label: "BIS 단말 관리", href: "/registry/bis-terminal" });
    crumbs.push({ label: "단말 상세" });
  }

  return crumbs;
}

// ---------------------------------------------------------------------------
// GlobalAppBar
// ---------------------------------------------------------------------------

type AppModule = "operations" | "registry";

interface GlobalAppBarProps {
  module?: AppModule;
}

const MODULE_CONFIG: Record<AppModule, { title: string; homeHref: string }> = {
  operations: { title: "BIMS Operations", homeHref: "/tablet" },
  registry:   { title: "BIMS Registry",   homeHref: "/registry/bis-terminal" },
};

export function GlobalAppBar({ module = "operations" }: GlobalAppBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const config = MODULE_CONFIG[module];

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const outboxCount = useSyncExternalStore(subscribeOutbox, getOutboxPendingCount, getOutboxPendingCount);

  const isHome = pathname === config.homeHref;
  const breadcrumbs = buildBreadcrumbs(pathname, module);

  return (
    <div className="sticky top-0 z-50 bg-[var(--tablet-bg-card)] border-b border-[var(--tablet-border)]">
      {/* Main header row */}
      <header className="h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {!isHome && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 text-[var(--tablet-text)] hover:bg-[var(--tablet-bg-elevated)]" 
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1
            className="text-lg font-bold tracking-tight cursor-pointer text-[var(--tablet-text)]"
            onClick={() => router.push(config.homeHref)}
          >
            {config.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Network badge */}
          <Badge
            variant="outline"
            className={`text-xs gap-1.5 px-3 py-1 rounded-full font-medium ${
              isOnline
                ? "border-emerald-800 bg-emerald-950/40 text-emerald-400"
                : "border-amber-800 bg-amber-950/40 text-amber-400"
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {isOnline ? "ONLINE" : "OFFLINE"}
          </Badge>

          {/* Outbox Mini Indicator */}
          <OutboxMiniIndicator />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 text-[var(--tablet-text)] hover:bg-[var(--tablet-bg-elevated)]"
              >
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-[var(--tablet-bg-card)] border-[var(--tablet-border)]">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-[var(--tablet-text)]">김설치</p>
                <p className="text-xs text-[var(--tablet-text-muted)]">현장 설치 담당자</p>
              </div>
              <DropdownMenuSeparator className="bg-[var(--tablet-border)]" />
            <DropdownMenuItem 
              onClick={() => router.push("/tablet")}
              className="text-[var(--tablet-text)] focus:bg-[var(--tablet-bg-elevated)]"
            >
              홈으로
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => router.push("/tablet/terminal")}
              className="text-[var(--tablet-text)] focus:bg-[var(--tablet-bg-elevated)]"
            >
              단말 조회
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => router.push("/tablet/outbox")}
              className="text-[var(--tablet-text)] focus:bg-[var(--tablet-bg-elevated)]"
            >
              전송 대기함
            </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Breadcrumb row */}
      {breadcrumbs.length > 0 && (
        <nav className="h-8 flex items-center gap-1 px-4 border-t border-[var(--tablet-border)]/50 bg-[var(--tablet-bg-elevated)]/30">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-[var(--tablet-text-muted)]/40 shrink-0" />}
              {crumb.href && idx < breadcrumbs.length - 1 ? (
                <button
                  className="text-xs text-[var(--tablet-text-muted)]/70 hover:text-[var(--tablet-text)] transition-colors"
                  onClick={() => router.push(crumb.href!)}
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-xs font-medium text-[var(--tablet-text)]/80">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
    </div>
  );
}
