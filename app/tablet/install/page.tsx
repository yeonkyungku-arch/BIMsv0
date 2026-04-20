"use client";
// v6: final rebuild - 2026-03-29-fix

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  INSTALL_STATUS_LABELS,
  INSTALL_STATUS_COLORS,
  type InstallStatus,
} from "@/lib/tablet-install-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  HardHat,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  CalendarDays,
  MapPin,
  Navigation,
  RefreshCw,
  ExternalLink,
  X,
  Building2,
  Timer,
  Layers,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";

// ============================================================================
// Types & Constants
// ============================================================================

type WorkType = "INSTALL" | "MAINTENANCE" | "EMERGENCY";
type StatusFilter = "ALL" | "ASSIGNED" | "IN_PROGRESS" | "DONE";

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
  status: InstallStatus;
  description?: string;
}

const WORK_TYPE_LABELS: Record<WorkType, string> = {
  INSTALL: "설치",
  MAINTENANCE: "유지보수",
  EMERGENCY: "긴급",
};

const WORK_TYPE_BADGE: Record<WorkType, string> = {
  INSTALL: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  MAINTENANCE: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  EMERGENCY: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

const MARKER_COLORS = {
  INSTALL: "#3b82f6",
  MAINTENANCE: "#f59e0b",
  EMERGENCY: "#ef4444",
};

// ============================================================================
// Mock Data
// ============================================================================

const unifiedWorks: UnifiedWork[] = [
  { id: "INST001", type: "INSTALL", stationName: "강남역 1번출구", terminalId: "BIS-GN-001", customerName: "서울교통공사", address: "서울 강남구 강남대로 396", gps: { lat: 37.4979, lng: 127.0276 }, scheduledDate: "2026-03-03", scheduledTime: "09:00", status: "APPROVED" },
  { id: "INST022", type: "INSTALL", stationName: "역삼역 2번출구", terminalId: "BIS-YS-022", customerName: "서울교통공사", address: "서울 강남구 역삼로 180", gps: { lat: 37.5007, lng: 127.0366 }, scheduledDate: "2026-03-28", scheduledTime: "14:00", status: "ASSIGNED" },
  { id: "INST023", type: "INSTALL", stationName: "인천시청역 앞", terminalId: "BIS-IC-023", customerName: "인천교통공사", address: "인천 남동구 인주대로 728", gps: { lat: 37.4429, lng: 126.7025 }, scheduledDate: "2026-03-29", scheduledTime: "11:00", status: "ASSIGNED" },
  { id: "INC-20260215-001", type: "MAINTENANCE", stationName: "홍대입구역 2번출구", terminalId: "BIS-HD-001", customerName: "서울교통공사", address: "서울 마포구 양화로 188", gps: { lat: 37.5538, lng: 126.9233 }, scheduledDate: "2026-03-03", scheduledTime: "10:00", status: "APPROVED", description: "디스플레이 깜빡임" },
  { id: "INC-20260215-109", type: "EMERGENCY", stationName: "별내역 앞", terminalId: "BIS-BN-109", customerName: "남양주시청", address: "경기 남양주시 별내면", gps: { lat: 37.5680, lng: 127.1219 }, scheduledDate: "2026-03-28", scheduledTime: "07:00", status: "IN_PROGRESS", description: "화면 파손 - 긴급 교체" },
  { id: "INST025", type: "INSTALL", stationName: "수원역 2번출구", terminalId: "BIS-SW-025", customerName: "수원시청", address: "경기 수원시 팔달구 덕영대로 924", gps: { lat: 37.2656, lng: 127.0001 }, scheduledDate: "2026-03-31", scheduledTime: "10:00", status: "ASSIGNED" },
  { id: "INC-20260215-002", type: "MAINTENANCE", stationName: "신촌역 앞", terminalId: "BIS-SC-002", customerName: "서울교통공사", address: "서울 서대문구 신촌로 90", gps: { lat: 37.5540, lng: 126.9364 }, scheduledDate: "2026-03-04", scheduledTime: "14:00", status: "APPROVED", description: "통신 불안정" },
  { id: "INC-20260215-003", type: "MAINTENANCE", stationName: "합정역 1번출구", terminalId: "BIS-HJ-001", customerName: "서울교통공사", address: "서울 마포구 합정동", gps: { lat: 37.5503, lng: 126.9245 }, scheduledDate: "2026-03-05", scheduledTime: "13:00", status: "APPROVED", description: "배터리 교체" },
  { id: "INC-20260215-004", type: "MAINTENANCE", stationName: "망원역 2번출구", terminalId: "BIS-MW-001", customerName: "서울교통공사", address: "서울 마포구 망원동", gps: { lat: 37.5567, lng: 126.9233 }, scheduledDate: "2026-03-07", scheduledTime: "09:00", status: "APPROVED", description: "센서 점검" },
  { id: "INC-20260215-005", type: "MAINTENANCE", stationName: "상수역 1번출구", terminalId: "BIS-SS-001", customerName: "서울교통공사", address: "서울 마포구 상수동", gps: { lat: 37.5486, lng: 126.9288 }, scheduledDate: "2026-03-10", scheduledTime: "11:00", status: "APPROVED", description: "시스템 오류" },
  { id: "INC-20260215-006", type: "MAINTENANCE", stationName: "연남동 정류장", terminalId: "BIS-YN-001", customerName: "서울교통공사", address: "서울 마포구 연남동", gps: { lat: 37.5622, lng: 126.9341 }, scheduledDate: "2026-03-11", scheduledTime: "15:00", status: "APPROVED", description: "외관 점검" },
  { id: "INC-20260215-007", type: "MAINTENANCE", stationName: "공덕역 3번출구", terminalId: "BIS-GD-007", customerName: "서울교통공사", address: "서울 마포구 마포대로 195", gps: { lat: 37.5447, lng: 126.9485 }, scheduledDate: "2026-03-12", scheduledTime: "10:00", status: "APPROVED", description: "펌웨어 업데이트" },
  { id: "INC-20260215-008", type: "MAINTENANCE", stationName: "마포구청역 앞", terminalId: "BIS-MP-008", customerName: "마포구청", address: "서울 마포구 마포대로 122", gps: { lat: 37.5421, lng: 126.9564 }, scheduledDate: "2026-03-13", scheduledTime: "09:00", status: "ASSIGNED", description: "전원 불안정" },
  { id: "INC-20260215-010", type: "MAINTENANCE", stationName: "영등포역 앞", terminalId: "BIS-YP-010", customerName: "영등포구청", address: "서울 영등포구 경인로 846", gps: { lat: 37.5268, lng: 126.9251 }, scheduledDate: "2026-03-17", scheduledTime: "09:30", status: "ASSIGNED", description: "배선 점검" },
  { id: "INC-20260215-011", type: "MAINTENANCE", stationName: "당산역 1번출구", terminalId: "BIS-DS-011", customerName: "영등포구청", address: "서울 영등포구 당산로 121", gps: { lat: 37.5344, lng: 126.9151 }, scheduledDate: "2026-03-18", scheduledTime: "11:00", status: "ASSIGNED", description: "화면 표시 오류" },
  { id: "INC-20260215-100", type: "EMERGENCY", stationName: "잠실역 8번출구", terminalId: "BIS-JS-100", customerName: "서울교통공사", address: "서울 송파구 올림픽로 240", gps: { lat: 37.5142, lng: 127.0753 }, scheduledDate: "2026-03-05", scheduledTime: "08:00", status: "APPROVED", description: "전원 완전 차단" },
  { id: "INC-20260215-101", type: "EMERGENCY", stationName: "선릉역 5번출구", terminalId: "BIS-SL-101", customerName: "강남구청", address: "서울 강남구 테헤란로 340", gps: { lat: 37.4954, lng: 127.0578 }, scheduledDate: "2026-03-07", scheduledTime: "07:00", status: "APPROVED", description: "차량 충돌 손상" },
  { id: "INC-20260215-102", type: "EMERGENCY", stationName: "강변역 3번출구", terminalId: "BIS-GB-102", customerName: "광진구청", address: "서울 광진구 강변역로", gps: { lat: 37.5362, lng: 127.0871 }, scheduledDate: "2026-03-10", scheduledTime: "06:30", status: "APPROVED", description: "화재로 인한 손상" },
  { id: "INC-20260215-103", type: "EMERGENCY", stationName: "건대입구역 앞", terminalId: "BIS-GD-103", customerName: "광진구청", address: "서울 광진구 아차산로 243", gps: { lat: 37.5359, lng: 127.0722 }, scheduledDate: "2026-03-12", scheduledTime: "06:00", status: "APPROVED", description: "전선 피복 손상" },
  { id: "INC-20260215-104", type: "EMERGENCY", stationName: "성수역 2번출구", terminalId: "BIS-SS-104", customerName: "성동구청", address: "서울 성동구 왕십리로 253", gps: { lat: 37.5449, lng: 127.0596 }, scheduledDate: "2026-03-14", scheduledTime: "07:30", status: "PENDING_APPROVAL", description: "침수로 인한 단말 손상" },
  { id: "INC-20260215-105", type: "EMERGENCY", stationName: "왕십리역 3번출구", terminalId: "BIS-WS-105", customerName: "성동구청", address: "서울 성동구 왕십리광장로 1", gps: { lat: 37.5549, lng: 127.0649 }, scheduledDate: "2026-03-17", scheduledTime: "08:00", status: "IN_PROGRESS", description: "기기 완전 불응답" },
  { id: "INC-20260215-106", type: "EMERGENCY", stationName: "마장역 1번출구", terminalId: "BIS-MJ-106", customerName: "성동구청", address: "서울 성동구 마장로 109", gps: { lat: 37.5656, lng: 127.0718 }, scheduledDate: "2026-03-19", scheduledTime: "09:00", status: "ASSIGNED", description: "LTE 장애 - 통신 두절" },
  { id: "INC-20260215-107", type: "EMERGENCY", stationName: "잠실나루역 앞", terminalId: "BIS-JN-107", customerName: "서울교통공사", address: "서울 광진구 능동로 1", gps: { lat: 37.5346, lng: 127.0929 }, scheduledDate: "2026-03-24", scheduledTime: "06:00", status: "ASSIGNED", description: "vandalism 파손" },
  { id: "INC-20260215-108", type: "EMERGENCY", stationName: "구리역 2번출구", terminalId: "BIS-GR-108", customerName: "구리시청", address: "경기 구리시 경춘로 153", gps: { lat: 37.6026, lng: 127.1274 }, scheduledDate: "2026-03-26", scheduledTime: "08:00", status: "ASSIGNED", description: "전원 공급 완전 차단" },
  { id: "INC-20260215-110", type: "EMERGENCY", stationName: "다산신도시역 앞", terminalId: "BIS-DS-110", customerName: "남양주시청", address: "경기 남양주시 다산동", gps: { lat: 37.5896, lng: 127.1289 }, scheduledDate: "2026-03-30", scheduledTime: "08:30", status: "ASSIGNED", description: "통신 완전 두절" },
  { id: "INC-20260215-111", type: "EMERGENCY", stationName: "하남풍산역 앞", terminalId: "BIS-HP-111", customerName: "하남시청", address: "경기 하남시 미사대로 750", gps: { lat: 37.5412, lng: 127.1636 }, scheduledDate: "2026-03-31", scheduledTime: "07:00", status: "ASSIGNED", description: "낙뢰로 인한 기기 손상" },
];

const WorkTypeIcon = ({ type, className }: { type: WorkType; className?: string }) => {
  const Icon = type === "INSTALL" ? HardHat : type === "MAINTENANCE" ? Wrench : AlertTriangle;
  return <Icon className={className} />;
};

// ============================================================================
// Main Component
// ============================================================================

export default function InstallPage() {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const [currentDate, setCurrentDate] = useState<Date>(() => new Date(2026, 2, 28)); // 2026-03-28
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [workType, setWorkType] = useState<WorkType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [drawerWork, setDrawerWork] = useState<UnifiedWork | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // 캘린더 데이터 계산
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days: (Date | null)[] = [];
  let current = new Date(startDate);
  while (current <= lastDay || days.length % 7 !== 0) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // 작업 필터링
  const filteredWorks = useMemo(() => {
    return unifiedWorks.filter((w) => {
      if (workType !== "ALL" && w.type !== workType) return false;
      if (selectedDate && w.scheduledDate !== selectedDate) return false;
      if (statusFilter !== "ALL" && w.status !== statusFilter) return false;
      if (search && !w.stationName.toLowerCase().includes(search.toLowerCase()) && !w.terminalId.includes(search)) return false;
      return true;
    });
  }, [workType, selectedDate, statusFilter, search]);

  // 상태별 카운트
  const counts = useMemo(() => ({
    total: unifiedWorks.filter(w => (selectedDate ? w.scheduledDate === selectedDate : true)).length,
    assigned: unifiedWorks.filter(w => w.status === "ASSIGNED" && (selectedDate ? w.scheduledDate === selectedDate : true)).length,
    inProgress: unifiedWorks.filter(w => w.status === "IN_PROGRESS" && (selectedDate ? w.scheduledDate === selectedDate : true)).length,
    done: unifiedWorks.filter(w => w.status === "DONE" && (selectedDate ? w.scheduledDate === selectedDate : true)).length,
  }), [selectedDate]);

  // 날짜별 작업 개수
  const worksByDate = useMemo(() => {
    const map: Record<string, number> = {};
    unifiedWorks.forEach((w) => {
      map[w.scheduledDate] = (map[w.scheduledDate] || 0) + 1;
    });
    return map;
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;
    loadGoogleMapsScript().then(() => {
      if (!mapRef.current) return;
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 37.5, lng: 127.0 },
        zoom: 10,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
      setMapLoaded(true);
    });
  }, [mapLoaded]);

  // 마커 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !mapLoaded) return;
    
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    filteredWorks.forEach((work) => {
      const marker = new google.maps.Marker({
        position: work.gps,
        map: mapInstanceRef.current,
        title: work.stationName,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: MARKER_COLORS[work.type],
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });

      marker.addListener("click", () => {
        setSelectedWorkId(work.id);
        mapInstanceRef.current?.panTo(work.gps);
        mapInstanceRef.current?.setZoom(15);
      });

      markersRef.current.push(marker);
    });
  }, [filteredWorks, mapLoaded]);

  const handleGoDetail = (work: UnifiedWork) => {
    if (work.type === "INSTALL") {
      router.push(`/tablet/install/${work.id}`);
    } else if (work.type === "MAINTENANCE" || work.type === "EMERGENCY") {
      router.push(`/tablet/maintenance/${work.id}`);
    }
  };

  const handleLocateMe = useCallback(async () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      mapInstanceRef.current?.panTo({ lat: latitude, lng: longitude });
      mapInstanceRef.current?.setZoom(14);
      setIsLocating(false);
    });
  }, []);

  const handleResetMap = () => {
    mapInstanceRef.current?.panTo({ lat: 37.5, lng: 127.0 });
    mapInstanceRef.current?.setZoom(10);
  };

  return (
    <>
    <div className="flex flex-col h-screen bg-background">
      {/* 상단 영역 */}
      <div className="flex gap-4 p-4 h-[55%] min-h-0 border-b">
        {/* 좌측: 캘린더 */}
        <div className="w-80 flex flex-col bg-background rounded-xl border p-4 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">{year}년 {String(month + 1).padStart(2, "0")}월</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 요일 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-muted-foreground h-6 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-6" />;
                const dateStr = day.toISOString().split("T")[0];
                const isSelected = dateStr === selectedDate;
                const isCurrentMonth = day.getMonth() === month;
                const count = worksByDate[dateStr] || 0;
                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={cn(
                      "h-6 text-[10px] rounded transition-all flex items-center justify-center relative",
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : isCurrentMonth
                        ? "hover:bg-muted"
                        : "text-muted-foreground"
                    )}
                  >
                    {day.getDate()}
                    {count > 0 && (
                      <span className={cn(
                        "absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full",
                        isSelected ? "bg-primary-foreground" : "bg-primary"
                      )} />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 우측: 카드 + 테이블 */}
        <div className="flex-1 flex flex-col min-w-0 bg-background rounded-xl border overflow-hidden">
          {/* 상태 카드 */}
          <div className="grid grid-cols-4 gap-2 p-4 border-b">
            {(
              [
                { key: "ALL", label: "전체", count: counts.total, icon: CalendarDays },
                { key: "ASSIGNED", label: "배정", count: counts.assigned, icon: Clock },
                { key: "IN_PROGRESS", label: "진행", count: counts.inProgress, icon: Play },
                { key: "DONE", label: "완료", count: counts.done, icon: CheckCircle2 },
              ] as { key: StatusFilter; label: string; count: number; icon: React.FC<{className?: string}> }[]
            ).map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "p-2 rounded-lg border text-left transition-all",
                  statusFilter === key ? "bg-primary/10 border-primary" : "hover:bg-muted"
                )}
              >
                <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                <p className="text-lg font-bold">{count}</p>
              </button>
            ))}
          </div>

          {/* 검색 */}
          <div className="px-4 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="정류장/단말 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          </div>

          {/* 테이블 */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="text-[10px]">유형</TableHead>
                  <TableHead className="text-[10px]">정류장</TableHead>
                  <TableHead className="text-[10px]">단말 ID</TableHead>
                  <TableHead className="text-[10px]">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorks.map((work) => (
                  <TableRow
                    key={work.id}
                    onClick={() => {
                      setSelectedWorkId(work.id);
                      setDrawerWork(work);
                    }}
                    className="cursor-pointer hover:bg-muted/40"
                  >
                    <TableCell className="text-[10px]">
                      <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium", WORK_TYPE_BADGE[work.type])}>
                        <WorkTypeIcon type={work.type} className="h-3 w-3" />
                        {WORK_TYPE_LABELS[work.type]}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px]">{work.stationName}</TableCell>
                    <TableCell className="text-[10px] font-mono">{work.terminalId}</TableCell>
                    <TableCell className="text-[10px]">
                      <Badge variant="outline" className="text-[8px] h-4 px-1">
                        {INSTALL_STATUS_LABELS[work.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* 하단: 지도 */}
      <div className="flex-1 relative bg-muted/20 min-h-0">
        <div ref={mapRef} className="absolute inset-0" />

        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/40">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">지도 로딩 중...</p>
            </div>
          </div>
        )}

        {/* 컨트롤 버튼 */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <Button variant="outline" size="icon" className="h-8 w-8 bg-background/95" onClick={handleLocateMe} disabled={isLocating}>
            <Navigation className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 bg-background/95" onClick={handleResetMap}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 선택된 작업 팝업 */}
        {selectedWorkId && (() => {
          const w = filteredWorks.find((r) => r.id === selectedWorkId);
          if (!w) return null;
          return (
            <div className="absolute top-4 left-4 bg-background/98 rounded-lg border shadow-lg p-3 z-10 max-w-[250px]">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded", WORK_TYPE_BADGE[w.type])}>
                  {WORK_TYPE_LABELS[w.type]}
                </span>
                <button onClick={() => setSelectedWorkId(null)}>
                  <X className="h-3 w-3" />
                </button>
              </div>
              <p className="font-semibold text-xs mb-0.5">{w.stationName}</p>
              <p className="text-[10px] text-muted-foreground mb-2">{w.address}</p>
              <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => handleGoDetail(w)}>
                상세 보기
              </Button>
            </div>
          );
        })()}
      </div>
    </div>

    {/* Drawer */}
    <Sheet open={!!drawerWork} onOpenChange={(open) => { if (!open) setDrawerWork(null); }}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0">
          {drawerWork && (
            <>
              <SheetHeader className="px-6 pt-6 pb-4 border-b">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn("text-xs font-medium px-2 py-1 rounded", WORK_TYPE_BADGE[drawerWork.type])}>
                    {WORK_TYPE_LABELS[drawerWork.type]}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {INSTALL_STATUS_LABELS[drawerWork.status]}
                  </Badge>
                </div>
                <SheetTitle>{drawerWork.stationName}</SheetTitle>
                <SheetDescription>{drawerWork.description || drawerWork.address}</SheetDescription>
              </SheetHeader>

              <div className="px-6 py-5 space-y-4">
                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">일정</h4>
                  <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                    <Timer className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{drawerWork.scheduledDate}</p>
                      <p className="text-xs text-muted-foreground">{drawerWork.scheduledTime || "시간 미지정"}</p>
                    </div>
                  </div>
                </section>

                <Separator />

                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">위치</h4>
                  <div className="flex gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{drawerWork.stationName}</p>
                      <p className="text-xs text-muted-foreground">{drawerWork.address}</p>
                    </div>
                  </div>
                </section>

                <Separator />

                <section>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">단말</h4>
                  <div className="flex gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">고객사</p>
                      <p className="text-sm font-medium">{drawerWork.customerName}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{drawerWork.terminalId}</p>
                    </div>
                  </div>
                </section>

                <Button className="w-full mt-4" onClick={() => { setDrawerWork(null); handleGoDetail(drawerWork); }}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  상세 페이지로 이동
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
