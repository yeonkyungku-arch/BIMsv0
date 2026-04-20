"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Navigation, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";
import { mockDevices, mockBusStops, mockWorkOrders } from "@/lib/mock-data";
import { mockBisTerminals } from "@/lib/tablet-install-data";
import { getActiveFaults, getRmsSummary } from "@/lib/tablet-portal-sync";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StopMarkerData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  deviceCount: number;
  onlineCount: number;
  primaryState: "PENDING_INSTALL" | "WARNING" | "CRITICAL" | "OFFLINE";
  hasActiveWorkOrder: boolean;
  hasFault: boolean;
  hasLowBattery: boolean;
  isPendingInstall: boolean;
}

interface TabletMapProps {
  onStopSelect?: (stopId: string, stopName: string) => void;
  selectedStopId?: string;
  height?: string;
  showControls?: boolean;
}

type MapFilter = "all" | "pending_install" | "fault" | "workorder" | "offline";

// ---------------------------------------------------------------------------
// State Colors
// ---------------------------------------------------------------------------
const STATE_COLORS: Record<string, string> = {
  PENDING_INSTALL: "#3b82f6", // 파란색 - 설치 예정
  WARNING: "#eab308",         // 노란색 - 주의
  CRITICAL: "#ef4444",        // 빨간색 - 위험
  OFFLINE: "#6b7280",         // 회색 - 오프라인
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function TabletMap({
  onStopSelect,
  selectedStopId,
  height = "100%",
  showControls = true,
}: TabletMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MapFilter>("all");
  const [isLocating, setIsLocating] = useState(false);

  // ---------------------------------------------------------------------------
  // Compute stop data
  // ---------------------------------------------------------------------------
  const stopData = useMemo((): StopMarkerData[] => {
    const activeFaults = getActiveFaults();
    const activeWorkOrders = mockWorkOrders.filter(
      (wo) => wo.status === "ASSIGNED" || wo.status === "IN_PROGRESS"
    );

    // 설치 예정 터미널 정보
    const pendingInstallTerminals = mockBisTerminals.filter(
      (t) => t.status === "PENDING_INSTALL_APPROVAL" || !t.installedAt
    );

    return mockBusStops.map((stop) => {
      const devicesAtStop = mockDevices.filter((d) => d.stopName === stop.name);
      const faultsAtStop = activeFaults.filter((f) =>
        devicesAtStop.some((d) => d.id === f.deviceId)
      );
      const workOrdersAtStop = activeWorkOrders.filter((wo) =>
        devicesAtStop.some((d) => d.id === wo.deviceId)
      );

      // 이 정류장에 설치 예정인 터미널이 있는지 확인
      const isPendingInstall = pendingInstallTerminals.some(
        (t) => t.stationName === stop.name
      );

      const onlineCount = devicesAtStop.filter(
        (d) => d.status === "online" || d.networkStatus === "connected"
      ).length;
      const hasLowBattery = devicesAtStop.some((d) => (d.socPercent || 0) < 30);

      // Determine primary state (정상 상태 제외 - 설치/유지보수 작업 중심)
      let primaryState: StopMarkerData["primaryState"] = "PENDING_INSTALL";
      if (faultsAtStop.some((f) => f.severity === "critical")) {
        primaryState = "CRITICAL";
      } else if (faultsAtStop.length > 0 || hasLowBattery) {
        primaryState = "WARNING";
      } else if (onlineCount === 0 && devicesAtStop.length > 0) {
        primaryState = "OFFLINE";
      } else if (isPendingInstall || devicesAtStop.length === 0) {
        primaryState = "PENDING_INSTALL";
      }

      return {
        id: stop.id,
        name: stop.name,
        lat: stop.lat,
        lng: stop.lng,
        deviceCount: devicesAtStop.length,
        onlineCount,
        primaryState,
        hasActiveWorkOrder: workOrdersAtStop.length > 0,
        hasFault: faultsAtStop.length > 0,
        hasLowBattery,
        isPendingInstall,
      };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Filter stops
  // ---------------------------------------------------------------------------
  const filteredStops = useMemo(() => {
    // 정상 상태 정류장은 항상 제외 (설치/유지보수 작업 중심)
    const workStops = stopData.filter(
      (s) => s.hasFault || s.hasActiveWorkOrder || s.isPendingInstall || 
             s.primaryState === "OFFLINE" || s.primaryState === "CRITICAL" || 
             s.primaryState === "WARNING"
    );

    switch (filter) {
      case "pending_install":
        return workStops.filter((s) => s.isPendingInstall || s.primaryState === "PENDING_INSTALL");
      case "fault":
        return workStops.filter((s) => s.hasFault);
      case "workorder":
        return workStops.filter((s) => s.hasActiveWorkOrder);
      case "offline":
        return workStops.filter((s) => s.primaryState === "OFFLINE");
      default:
        return workStops;
    }
  }, [stopData, filter]);

  // ---------------------------------------------------------------------------
  // Initialize map
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const initializeMap = async () => {
      if (!mapRef.current) return;

      try {
        await loadGoogleMapsScript();
        if (cancelled || !window.google) return;

        const { Map } = (await window.google.maps.importLibrary(
          "maps"
        )) as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = (await window.google.maps.importLibrary(
          "marker"
        )) as google.maps.MarkerLibrary;

        const map = new Map(mapRef.current, {
          center: { lat: 37.45, lng: 127.0 },
          zoom: 11,
          mapId: "tablet-field-map",
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
        });

        mapInstanceRef.current = map;

        // Clear existing markers
        markersRef.current.forEach((m) => (m.map = null));
        markersRef.current = [];

        // Create markers
        const markers: google.maps.marker.AdvancedMarkerElement[] = [];

        filteredStops.forEach((stop) => {
          const color = STATE_COLORS[stop.primaryState];
          const isSelected = stop.id === selectedStopId;

          // Marker element
          const markerContent = document.createElement("div");
          markerContent.className = "tablet-map-marker";
          markerContent.style.cssText = `
            position: relative;
            cursor: pointer;
            transition: transform 0.15s;
          `;

          // Pin
          const pin = document.createElement("div");
          pin.style.cssText = `
            width: ${isSelected ? "48px" : "40px"};
            height: ${isSelected ? "48px" : "40px"};
            background-color: ${color};
            border: ${isSelected ? "4px" : "3px"} solid white;
            border-radius: 50%;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${isSelected ? "14px" : "12px"};
            font-weight: bold;
            color: white;
            transition: all 0.15s;
          `;
          pin.textContent = stop.deviceCount.toString();

          // Label
          const label = document.createElement("div");
          label.style.cssText = `
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 4px;
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            white-space: nowrap;
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
          `;
          label.textContent = stop.name;

          markerContent.appendChild(pin);
          markerContent.appendChild(label);

          // Badges
          const badgeContainer = document.createElement("div");
          badgeContainer.style.cssText = `
            position: absolute;
            top: -6px;
            right: -6px;
            display: flex;
            gap: 2px;
          `;

          if (stop.hasFault) {
            const badge = document.createElement("div");
            badge.style.cssText = `
              width: 18px;
              height: 18px;
              background: #ef4444;
              border: 2px solid white;
              border-radius: 50%;
              font-size: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            `;
            badge.textContent = "!";
            badgeContainer.appendChild(badge);
          }

          if (stop.hasActiveWorkOrder) {
            const badge = document.createElement("div");
            badge.style.cssText = `
              width: 18px;
              height: 18px;
              background: #f59e0b;
              border: 2px solid white;
              border-radius: 50%;
              font-size: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
            `;
            badge.innerHTML = "&#9874;"; // wrench
            badgeContainer.appendChild(badge);
          }

          if (stop.isPendingInstall && !stop.hasFault && !stop.hasActiveWorkOrder) {
            const badge = document.createElement("div");
            badge.style.cssText = `
              width: 18px;
              height: 18px;
              background: #3b82f6;
              border: 2px solid white;
              border-radius: 50%;
              font-size: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            `;
            badge.textContent = "+";
            badgeContainer.appendChild(badge);
          }

          markerContent.appendChild(badgeContainer);

          // Hover effect
          markerContent.addEventListener("mouseenter", () => {
            pin.style.transform = "scale(1.1)";
          });
          markerContent.addEventListener("mouseleave", () => {
            pin.style.transform = "scale(1)";
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: stop.lat, lng: stop.lng },
            content: markerContent,
            title: stop.name,
          });

          marker.addListener("click", () => {
            if (onStopSelect) {
              onStopSelect(stop.id, stop.name);
            }
          });

          markers.push(marker);
        });

        markersRef.current = markers;
        setIsLoaded(true);
      } catch (err) {
        console.error("Map init error:", err);
        setError("지도 초기화 실패");
      }
    };

    initializeMap();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
    };
  }, [filteredStops, selectedStopId, onStopSelect]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const handleReset = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter({ lat: 37.45, lng: 127.0 });
      mapInstanceRef.current.setZoom(11);
    }
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          mapInstanceRef.current.setZoom(14);
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      }
    );
  }, []);

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div
        className="w-full rounded-lg bg-muted/50 flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center p-6">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-muted/30" style={{ height }}>
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
          </div>
        </div>
      )}

      {/* Controls */}
      {showControls && isLoaded && (
        <>
          {/* Filter Buttons - Top */}
          <div className="absolute top-3 left-3 right-3 flex items-center gap-2 z-10">
          <div className="bg-background/95 backdrop-blur rounded-lg p-1.5 shadow-md flex gap-1">
            {(
              [
                { key: "all", label: "작업대상", count: filteredStops.length },
                { key: "pending_install", label: "설치예정", count: stopData.filter((s) => s.isPendingInstall).length },
                { key: "fault", label: "장애", count: stopData.filter((s) => s.hasFault).length },
                { key: "workorder", label: "작업중", count: stopData.filter((s) => s.hasActiveWorkOrder).length },
                { key: "offline", label: "오프라인", count: stopData.filter((s) => s.primaryState === "OFFLINE").length },
              ] as const
            ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                    filter === f.key
                      ? "bg-foreground text-background"
                      : "bg-transparent hover:bg-muted text-foreground"
                  )}
                >
                  {f.label}
                  {f.count > 0 && (
                    <span className="ml-1 opacity-60">({f.count})</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons - Right */}
          <div className="absolute top-16 right-3 flex flex-col gap-2 z-10">
            <Button
              variant="outline"
              size="icon"
              className="bg-background/95 backdrop-blur shadow-md h-10 w-10"
              onClick={handleLocateMe}
              disabled={isLocating}
            >
              <Navigation className={cn("h-4 w-4", isLocating && "animate-pulse")} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/95 backdrop-blur shadow-md h-10 w-10"
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend - Bottom Left */}
          <div className="absolute bottom-3 left-3 bg-background/95 backdrop-blur rounded-lg p-3 shadow-md z-10">
            <div className="text-[10px] font-medium text-muted-foreground mb-2">작업 상태</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATE_COLORS.PENDING_INSTALL }} />
                <span>설치예정</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATE_COLORS.WARNING }} />
                <span>주의</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATE_COLORS.CRITICAL }} />
                <span>위험</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATE_COLORS.OFFLINE }} />
                <span>오프라인</span>
              </div>
            </div>
          </div>

          {/* Summary - Bottom Right */}
          <div className="absolute bottom-3 right-3 bg-background/95 backdrop-blur rounded-lg px-3 py-2 shadow-md z-10">
            <span className="text-xs text-muted-foreground">
              {filteredStops.length}개 정류장
            </span>
          </div>
        </>
      )}
    </div>
  );
}
