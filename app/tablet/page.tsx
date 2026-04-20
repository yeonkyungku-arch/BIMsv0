"use client";
// Dashboard Redesign v2: 2026-03-29

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  HardHat,
  Wrench,
  AlertTriangle,
  Package,
  MapPin,
  ChevronRight,
  Clock,
  CheckCircle2,
  Calendar,
  Navigation,
  Play,
  Building2,
  CalendarDays,
  Layers,
  Timer,
  Map,
  ArrowRight,
  Phone,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";
import {
  getTabletDashboardData,
  type FaultedTerminal,
} from "@/lib/tablet-portal-sync";

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------
type WorkType = "INSTALL" | "MAINTENANCE" | "EMERGENCY";
type WorkTab = "today" | "week" | "emergency";

interface UnifiedWork {
  id: string;
  type: WorkType;
  stationName: string;
  terminalId: string;
  customerName: string;
  address: string;
  gps: { lat: number; lng: number };
  scheduledDate: string;
  scheduledTime?: string;
  status: string;
  description?: string;
}

const WORK_TYPE_CONFIG: Record<WorkType, { label: string; color: string; bgColor: string; icon: typeof HardHat }> = {
  INSTALL: { label: "설치", color: "#3b82f6", bgColor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400", icon: HardHat },
  MAINTENANCE: { label: "유지보수", color: "#f59e0b", bgColor: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400", icon: Wrench },
  EMERGENCY: { label: "긴급", color: "#ef4444", bgColor: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400", icon: AlertTriangle },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: "배정됨", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  IN_PROGRESS: { label: "진행중", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  APPROVED: { label: "승인됨", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  DONE: { label: "완료", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  PENDING_APPROVAL: { label: "승인대기", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
};

// ---------------------------------------------------------------------------
// Mock Data (from install page)
// ---------------------------------------------------------------------------
const unifiedWorks: UnifiedWork[] = [
  { id: "INST001", type: "INSTALL", stationName: "강남역 1번출구", terminalId: "BIS-GN-001", customerName: "서울교통공사", address: "서울 강남구 강남대로 396", gps: { lat: 37.4979, lng: 127.0276 }, scheduledDate: "2026-03-29", scheduledTime: "09:00", status: "ASSIGNED" },
  { id: "INST022", type: "INSTALL", stationName: "역삼역 2번출구", terminalId: "BIS-YS-022", customerName: "서울교통공사", address: "서울 강남구 역삼로 180", gps: { lat: 37.5007, lng: 127.0366 }, scheduledDate: "2026-03-29", scheduledTime: "14:00", status: "ASSIGNED" },
  { id: "INST023", type: "INSTALL", stationName: "인천시청역 앞", terminalId: "BIS-IC-023", customerName: "인천교통공사", address: "인천 남동구 인주대로 728", gps: { lat: 37.4429, lng: 126.7025 }, scheduledDate: "2026-03-29", scheduledTime: "11:00", status: "IN_PROGRESS" },
  { id: "INST025", type: "INSTALL", stationName: "수원역 2번출구", terminalId: "BIS-SW-025", customerName: "수원시청", address: "경기 수원시 팔달구 덕영대로 924", gps: { lat: 37.2656, lng: 127.0001 }, scheduledDate: "2026-03-31", scheduledTime: "10:00", status: "ASSIGNED" },
  { id: "INC-001", type: "MAINTENANCE", stationName: "홍대입구역 2번출구", terminalId: "BIS-HD-001", customerName: "서울교통공사", address: "서울 마포구 양화로 188", gps: { lat: 37.5538, lng: 126.9233 }, scheduledDate: "2026-03-29", scheduledTime: "10:00", status: "APPROVED", description: "디스플레이 깜빡임" },
  { id: "INC-002", type: "MAINTENANCE", stationName: "신촌역 앞", terminalId: "BIS-SC-002", customerName: "서울교통공사", address: "서울 서대문구 신촌로 90", gps: { lat: 37.5540, lng: 126.9364 }, scheduledDate: "2026-03-30", scheduledTime: "14:00", status: "ASSIGNED", description: "통신 불안정" },
  { id: "INC-003", type: "MAINTENANCE", stationName: "합정역 1번출구", terminalId: "BIS-HJ-001", customerName: "서울교통공사", address: "서울 마포구 합정동", gps: { lat: 37.5503, lng: 126.9245 }, scheduledDate: "2026-03-31", scheduledTime: "13:00", status: "ASSIGNED", description: "배터리 교체" },
  { id: "EMG-001", type: "EMERGENCY", stationName: "잠실역 8번출구", terminalId: "BIS-JS-100", customerName: "서울교통공사", address: "서울 송파구 올림픽로 240", gps: { lat: 37.5142, lng: 127.0753 }, scheduledDate: "2026-03-29", scheduledTime: "08:00", status: "IN_PROGRESS", description: "전원 완전 차단" },
  { id: "EMG-002", type: "EMERGENCY", stationName: "별내역 앞", terminalId: "BIS-BN-109", customerName: "남양주시청", address: "경기 남양주시 별내면", gps: { lat: 37.5680, lng: 127.1219 }, scheduledDate: "2026-03-29", scheduledTime: "07:00", status: "ASSIGNED", description: "화면 파손 - 긴급 교체" },
  { id: "EMG-003", type: "EMERGENCY", stationName: "선릉역 5번출구", terminalId: "BIS-SL-101", customerName: "강남구청", address: "서울 강남구 테헤란로 340", gps: { lat: 37.4954, lng: 127.0578 }, scheduledDate: "2026-03-30", scheduledTime: "07:00", status: "ASSIGNED", description: "차량 충돌 손상" },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------
function getToday(): string {
  return "2026-03-29"; // Mock today
}

function getWeekRange(): { start: string; end: string } {
  // Mock week: 2026-03-24 ~ 2026-03-30 (Mon-Sun)
  return { start: "2026-03-24", end: "2026-03-30" };
}

function isInWeek(date: string): boolean {
  const { start, end } = getWeekRange();
  return date >= start && date <= end;
}

// ---------------------------------------------------------------------------
// KPI Card Component
// ---------------------------------------------------------------------------
interface KpiCardProps {
  title: string;
  value: number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
  active?: boolean;
  subItems?: { label: string; value: number; color?: string }[];
}

function KpiCard({ title, value, unit = "건", icon, color, onClick, active, subItems }: KpiCardProps) {
  return (
    <button
      className={cn(
        "relative p-4 rounded-xl border transition-all text-left w-full",
        "bg-card hover:shadow-md",
        active ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/50",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ backgroundColor: color }} />
      
      <div className="flex items-start justify-between pl-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold" style={{ color }}>{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </div>
      
      {subItems && subItems.length > 0 && (
        <div className="mt-3 pt-3 border-t flex gap-4 pl-3">
          {subItems.map((item) => (
            <div key={item.label} className="text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="ml-1 font-semibold" style={{ color: item.color || "inherit" }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Work Card Component
// ---------------------------------------------------------------------------
function WorkCard({ work, onClick, isSelected }: { work: UnifiedWork; onClick: () => void; isSelected?: boolean }) {
  const config = WORK_TYPE_CONFIG[work.type];
  const statusConfig = STATUS_CONFIG[work.status] || { label: work.status, color: "bg-gray-100 text-gray-700" };
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/50",
        isSelected ? "ring-2 ring-primary border-primary bg-primary/5" : "bg-card border-border"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${config.color}20` }}>
          <Icon className="h-5 w-5" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn("text-[10px]", config.bgColor)}>{config.label}</Badge>
            <Badge className={cn("text-[10px]", statusConfig.color)}>{statusConfig.label}</Badge>
          </div>
          <p className="font-semibold text-sm truncate">{work.stationName}</p>
          <p className="text-xs text-muted-foreground truncate">{work.address}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {work.scheduledTime || "미정"}
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {work.customerName}
            </span>
          </div>
          {work.description && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 truncate">{work.description}</p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert Banner Component
// ---------------------------------------------------------------------------
function AlertBanner({ alerts, onClick }: { alerts: FaultedTerminal[]; onClick: () => void }) {
  if (alerts.length === 0) return null;

  return (
    <div
      className="mx-4 mb-4 p-3 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/50">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">장애 알림 {alerts.length}건</p>
          <p className="text-xs text-red-600 dark:text-red-400/80 truncate">
            {alerts[0]?.terminal.stationName} 외 {alerts.length - 1}건의 장애가 발생했습니다
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-red-500 flex-shrink-0" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function TabletDashboardPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [activeTab, setActiveTab] = useState<WorkTab>("today");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [navDialogOpen, setNavDialogOpen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Dashboard data
  const dashboardData = useMemo(() => getTabletDashboardData(), []);
  const today = getToday();

  // Filter works by tab
  const filteredWorks = useMemo(() => {
    switch (activeTab) {
      case "today":
        return unifiedWorks.filter((w) => w.scheduledDate === today);
      case "week":
        return unifiedWorks.filter((w) => isInWeek(w.scheduledDate));
      case "emergency":
        return unifiedWorks.filter((w) => w.type === "EMERGENCY");
      default:
        return [];
    }
  }, [activeTab, today]);

  // KPI counts
  const kpiCounts = useMemo(() => {
    const todayWorks = unifiedWorks.filter((w) => w.scheduledDate === today);
    const weekWorks = unifiedWorks.filter((w) => isInWeek(w.scheduledDate));
    const emergencyWorks = unifiedWorks.filter((w) => w.type === "EMERGENCY");

    return {
      today: {
        total: todayWorks.length,
        pending: todayWorks.filter((w) => w.status === "ASSIGNED" || w.status === "APPROVED").length,
        inProgress: todayWorks.filter((w) => w.status === "IN_PROGRESS").length,
      },
      week: {
        total: weekWorks.length,
        pending: weekWorks.filter((w) => w.status === "ASSIGNED" || w.status === "APPROVED").length,
        done: weekWorks.filter((w) => w.status === "DONE").length,
      },
      emergency: emergencyWorks.length,
      faults: dashboardData.rms.critical + dashboardData.rms.warning,
      inventory: dashboardData.asset.inStock,
    };
  }, [today, dashboardData]);

  // Selected work
  const selectedWork = useMemo(() => {
    return filteredWorks.find((w) => w.id === selectedWorkId) || null;
  }, [filteredWorks, selectedWorkId]);

  // Map initialization
  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;
    loadGoogleMapsScript().then(() => {
      if (!mapRef.current) return;
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 37.5, lng: 127.0 },
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
      setMapLoaded(true);
    });
  }, [mapLoaded]);

  // Update markers when filtered works change
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    
    // Clear existing markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add new markers
    filteredWorks.forEach((work) => {
      const config = WORK_TYPE_CONFIG[work.type];
      const marker = new google.maps.Marker({
        position: work.gps,
        map: mapInstanceRef.current,
        title: work.stationName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selectedWorkId === work.id ? 12 : 8,
          fillColor: config.color,
          fillOpacity: 1,
          strokeColor: selectedWorkId === work.id ? "#000" : "#fff",
          strokeWeight: selectedWorkId === work.id ? 3 : 2,
        },
      });

      marker.addListener("click", () => {
        setSelectedWorkId(work.id);
        setDrawerOpen(true);
        mapInstanceRef.current?.panTo(work.gps);
        mapInstanceRef.current?.setZoom(14);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (filteredWorks.length > 0 && !selectedWorkId) {
      const bounds = new google.maps.LatLngBounds();
      filteredWorks.forEach((w) => bounds.extend(w.gps));
      mapInstanceRef.current.fitBounds(bounds, 50);
    }
  }, [filteredWorks, mapLoaded, selectedWorkId]);

  // Handlers
  const handleWorkClick = useCallback((workId: string) => {
    setSelectedWorkId(workId);
    const work = filteredWorks.find((w) => w.id === workId);
    if (work && mapInstanceRef.current) {
      mapInstanceRef.current.panTo(work.gps);
      mapInstanceRef.current.setZoom(14);
    }
  }, [filteredWorks]);

  const handleOpenDrawer = useCallback(() => {
    if (selectedWork) {
      setDrawerOpen(true);
    }
  }, [selectedWork]);

  const handleGoDetail = useCallback(() => {
    if (!selectedWork) return;
    // 작업 지시 페이지로 이동 (해당 작업 유형 필터 적용)
    router.push(`/tablet/install`);
    setDrawerOpen(false);
  }, [selectedWork, router]);

  const handleNavigation = useCallback(() => {
    setNavDialogOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* KPI Cards */}
      <div className="px-4 pt-4 pb-2">
        <div className="grid grid-cols-4 gap-3">
          <KpiCard
            title="오늘 작업"
            value={kpiCounts.today.total}
            icon={<CalendarDays className="h-5 w-5 text-blue-500" />}
            color="#3b82f6"
            onClick={() => setActiveTab("today")}
            active={activeTab === "today"}
            subItems={[
              { label: "대기", value: kpiCounts.today.pending, color: "#64748b" },
              { label: "진행중", value: kpiCounts.today.inProgress, color: "#3b82f6" },
            ]}
          />
          <KpiCard
            title="금주 작업"
            value={kpiCounts.week.total}
            icon={<Calendar className="h-5 w-5 text-emerald-500" />}
            color="#10b981"
            onClick={() => setActiveTab("week")}
            active={activeTab === "week"}
            subItems={[
              { label: "대기", value: kpiCounts.week.pending, color: "#64748b" },
              { label: "완료", value: kpiCounts.week.done, color: "#10b981" },
            ]}
          />
          <KpiCard
            title="긴급 출동"
            value={kpiCounts.emergency}
            icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
            color="#ef4444"
            onClick={() => setActiveTab("emergency")}
            active={activeTab === "emergency"}
          />
          <KpiCard
            title="창고 재고"
            value={kpiCounts.inventory}
            unit="대"
            icon={<Package className="h-5 w-5 text-violet-500" />}
            color="#8b5cf6"
            onClick={() => router.push("/tablet/inventory")}
          />
        </div>
      </div>

      {/* Alert Banner */}
      <AlertBanner
        alerts={dashboardData.faultedTerminals}
        onClick={() => router.push("/tablet/stops")}
      />

      {/* Main Content: Work List + Map */}
      <div className="flex-1 flex gap-4 px-4 pb-4 min-h-0">
        {/* Left: Work List */}
        <div className="w-[420px] flex flex-col border rounded-xl bg-card overflow-hidden">
          {/* Tab Header */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as WorkTab)}>
                <TabsList className="h-9">
                  <TabsTrigger value="today" className="text-xs px-3">오늘</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-3">금주</TabsTrigger>
                  <TabsTrigger value="emergency" className="text-xs px-3">
                    긴급
                    {kpiCounts.emergency > 0 && (
                      <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[10px] bg-red-500 text-white">
                        {kpiCounts.emergency}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <span className="text-xs text-muted-foreground">{filteredWorks.length}건</span>
            </div>
          </div>

          {/* Work List */}
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredWorks.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "today" && "오늘 예정된 작업이 없습니다"}
                    {activeTab === "week" && "금주 예정된 작업이 없습니다"}
                    {activeTab === "emergency" && "긴급 출동 건이 없습니다"}
                  </p>
                </div>
              ) : (
                filteredWorks.map((work) => (
                  <WorkCard
                    key={work.id}
                    work={work}
                    onClick={() => handleWorkClick(work.id)}
                    isSelected={selectedWorkId === work.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Selected Work Actions */}
          {selectedWork && (
            <div className="p-3 border-t bg-muted/30">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleNavigation}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  길찾기
                </Button>
                <Button className="flex-1" onClick={handleGoDetail}>
                  <Play className="h-4 w-4 mr-2" />
                  작업 시작
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Map */}
        <div className="flex-1 rounded-xl border overflow-hidden bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="text-sm font-medium">작업 위치</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />설치
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />유지보수
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />긴급
              </span>
            </div>
          </div>
          <div ref={mapRef} className="h-[calc(100%-48px)] w-full" />
        </div>
      </div>

      {/* Work Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selectedWork && (() => {
            const TypeIcon = WORK_TYPE_CONFIG[selectedWork.type].icon;
            return (
              <>
                <SheetHeader className="px-6 pt-6 pb-4 border-b">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={cn("text-xs gap-1", WORK_TYPE_CONFIG[selectedWork.type].bgColor)}>
                      <TypeIcon className="h-3 w-3" />
                      {WORK_TYPE_CONFIG[selectedWork.type].label}
                    </Badge>
                    <Badge className={cn("text-xs", STATUS_CONFIG[selectedWork.status]?.color)}>
                      {STATUS_CONFIG[selectedWork.status]?.label}
                    </Badge>
                  </div>
                  <SheetTitle className="text-lg">{selectedWork.stationName}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {selectedWork.address}
                  </SheetDescription>
                </SheetHeader>

                <div className="px-6 py-5 space-y-5">
                  {/* 작업 기본 정보 */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">작업 정보</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> 고객사
                        </dt>
                        <dd className="font-medium">{selectedWork.customerName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" /> 단말 ID
                        </dt>
                        <dd className="font-mono text-xs">{selectedWork.terminalId}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> 예정일
                        </dt>
                        <dd className="font-medium tabular-nums">{selectedWork.scheduledDate}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> 예정시간
                        </dt>
                        <dd className="font-medium tabular-nums">{selectedWork.scheduledTime || "미정"}</dd>
                      </div>
                    </dl>
                  </div>

                  {selectedWork.description && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">작업 내용</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{selectedWork.description}</p>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* 빠른 액션 */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={handleGoDetail}
                    >
                      <Play className="h-4 w-4" />
                      작업 지시 이동
                    </Button>
                    <Button
                      className="w-full gap-2"
                      onClick={handleNavigation}
                    >
                      <Navigation className="h-4 w-4" />
                      길찾기
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── 길찾기 앱 선택 Dialog ────────────────────────────────────── */}
      <Dialog open={navDialogOpen} onOpenChange={setNavDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              길찾기
            </DialogTitle>
            <DialogDescription>
              {selectedWork?.stationName}으로 이동할 지도 앱을 선택하세요.
            </DialogDescription>
          </DialogHeader>
          {selectedWork && (
            <div className="space-y-3 py-2">
              <div className="grid gap-2">
                {[
                  {
                    label: "카카오맵",
                    url: `https://map.kakao.com/link/to/${encodeURIComponent(selectedWork.stationName)},${selectedWork.gps.lat},${selectedWork.gps.lng}`,
                  },
                  {
                    label: "네이버지도",
                    url: `https://map.naver.com/v5/directions/-/${selectedWork.gps.lng},${selectedWork.gps.lat},${encodeURIComponent(selectedWork.stationName)}/-/transit`,
                  },
                  {
                    label: "구글맵",
                    url: `https://maps.google.com/?q=${selectedWork.gps.lat},${selectedWork.gps.lng}`,
                  },
                ].map(({ label, url }) => (
                  <Button
                    key={label}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => {
                      window.open(url, "_blank");
                      setNavDialogOpen(false);
                    }}
                  >
                    {label}
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
