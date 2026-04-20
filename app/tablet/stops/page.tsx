"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MapPin, Search, Navigation, Wrench, AlertCircle, CheckCircle2,
  Clock, Phone, Calendar, Bus, Zap, Cpu, ArrowRight, User,
  Building2, AlertTriangle, ChevronRight, Map,
} from "@/components/icons";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────────────────────────────────────
type WorkType = "maintenance" | "fieldDispatch" | "emergency" | "normal";
type StopStatus = "정상" | "주의" | "오류";
type DeviceStatus = "정상" | "배터리 저하" | "통신 오류" | "전원 오류" | "점검 중";

interface StopDevice {
  deviceId: string;           // 단말 ID
  assetCode: string;          // 자산 코드
  model: string;              // 모델명
  powerType: "solar" | "grid"; // 전원 유형
  status: DeviceStatus;       // 단말 상태
  installedDate: string;      // 설치일
  batteryLevel?: number;      // 배터리 잔량 (%)
  lastCommunication: string;  // 마지막 통신
  firmwareVersion: string;    // 펌웨어 버전
}

interface InspectionRecord {
  date: string;               // 점검 일자
  type: "정기점검" | "긴급점검" | "설치" | "교체" | "현장AS";
  result: "정상" | "수리완료" | "부품교체" | "이상없음";
  technician: string;         // 담당 기사
  note: string;               // 점검 내용
}

interface Stop {
  id: string;
  name: string;
  district: string;           // 행정구
  line: string;               // 노선 (예: 3호선, 간선, 광역)
  location: string;           // 도로명 주소
  lat: number;
  lng: number;
  routes: string[];           // 운행 노선 번호
  status: StopStatus;
  workType: WorkType;
  devices: StopDevice[];      // 설치 단말 목록
  // 담당자
  managerName: string;
  managerPhone: string;
  managerCompany: string;     // 담당 업체명
  // 일정
  installedDate: string;      // 최초 설치일
  lastInspection: string;     // 마지막 점검일
  nextSchedule: string;       // 다음 점검 예정일
  // 점검 이력
  inspectionHistory: InspectionRecord[];
  // 비고
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock 데이터 — 15개 정류장, 다양한 작업 유형·상태·단말 구성
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_STOPS: Stop[] = [
  // ── WH-001 담당 (서울 강남권) ──────────────────────────────────────────────
  {
    id: "STOP-001",
    name: "강남역 1번 정류장",
    district: "강남구",
    line: "간선",
    location: "강남구 테헤란로 12",
    lat: 37.4979, lng: 127.0276,
    routes: ["2413", "2016", "2224", "140"],
    status: "주의",
    workType: "maintenance",
    devices: [
      {
        deviceId: "DEV-0101", assetCode: "BIS-SOLAR-001", model: "BIS-S300",
        powerType: "solar", status: "배터리 저하", installedDate: "2024-06-01",
        batteryLevel: 18, lastCommunication: "2026-03-29 08:12", firmwareVersion: "v2.3.1",
      },
    ],
    managerName: "김태호", managerPhone: "010-1234-5678", managerCompany: "(주)스마트정류장",
    installedDate: "2024-06-01", lastInspection: "2026-02-05", nextSchedule: "2026-03-05",
    inspectionHistory: [
      { date: "2026-02-05", type: "정기점검", result: "정상", technician: "김태호", note: "배터리 잔량 양호, 통신 정상" },
      { date: "2025-11-10", type: "정기점검", result: "이상없음", technician: "이민준", note: "전반적 점검 이상 없음" },
      { date: "2025-08-22", type: "현장AS", result: "수리완료", technician: "김태호", note: "화면 터치 불량 → 케이블 재연결" },
    ],
    notes: "배터리 잔량 18% — 다음 점검 시 교체 권장",
  },
  {
    id: "STOP-002",
    name: "강남역 2번 정류장",
    district: "강남구",
    line: "간선",
    location: "강남구 테헤란로 10",
    lat: 37.4979, lng: 127.0270,
    routes: ["2413", "2016", "360"],
    status: "정상",
    workType: "normal",
    devices: [
      {
        deviceId: "DEV-0201", assetCode: "BIS-SOLAR-002", model: "BIS-S300",
        powerType: "solar", status: "정상", installedDate: "2024-06-01",
        batteryLevel: 84, lastCommunication: "2026-03-29 09:01", firmwareVersion: "v2.3.1",
      },
    ],
    managerName: "이순신", managerPhone: "010-2345-6789", managerCompany: "(주)스마트정류장",
    installedDate: "2024-06-01", lastInspection: "2026-03-10", nextSchedule: "2026-06-10",
    inspectionHistory: [
      { date: "2026-03-10", type: "정기점검", result: "정상", technician: "이순신", note: "모든 기능 정상 작동" },
      { date: "2025-12-15", type: "정기점검", result: "이상없음", technician: "이순신", note: "태양광 패널 청소 완료" },
    ],
  },
  {
    id: "STOP-003",
    name: "선릉역 정류장",
    district: "강남구",
    line: "지선",
    location: "강남구 선릉로 428",
    lat: 37.5042, lng: 127.0486,
    routes: ["3412", "4412"],
    status: "오류",
    workType: "emergency",
    devices: [
      {
        deviceId: "DEV-0301", assetCode: "BIS-GRID-001", model: "BIS-G200",
        powerType: "grid", status: "통신 오류", installedDate: "2024-09-15",
        lastCommunication: "2026-03-27 14:20", firmwareVersion: "v2.2.0",
      },
    ],
    managerName: "박민준", managerPhone: "010-3456-7890", managerCompany: "(주)스마트정류장",
    installedDate: "2024-09-15", lastInspection: "2026-03-01", nextSchedule: "2026-03-30",
    inspectionHistory: [
      { date: "2026-03-27", type: "긴급점검", result: "수리완료", technician: "박민준", note: "LTE 모듈 불량 확인, 모듈 교체 예정" },
      { date: "2026-03-01", type: "정기점검", result: "정상", technician: "박민준", note: "이상 없음" },
    ],
    notes: "LTE 통신 모듈 교체 대기 중 — 긴급 출동 필요",
  },
  {
    id: "STOP-004",
    name: "역삼역 정류장",
    district: "강남구",
    line: "간선",
    location: "강남구 역삼로 180",
    lat: 37.5000, lng: 127.0360,
    routes: ["146", "341", "2413"],
    status: "정상",
    workType: "normal",
    devices: [
      {
        deviceId: "DEV-0401", assetCode: "BIS-SOLAR-003", model: "BIS-S300",
        powerType: "solar", status: "정상", installedDate: "2024-07-20",
        batteryLevel: 91, lastCommunication: "2026-03-29 09:15", firmwareVersion: "v2.3.2",
      },
      {
        deviceId: "DEV-0402", assetCode: "BIS-SOLAR-004", model: "BIS-S300",
        powerType: "solar", status: "정상", installedDate: "2024-07-20",
        batteryLevel: 88, lastCommunication: "2026-03-29 09:14", firmwareVersion: "v2.3.2",
      },
    ],
    managerName: "장보고", managerPhone: "010-4567-8901", managerCompany: "(주)스마트정류장",
    installedDate: "2024-07-20", lastInspection: "2026-03-15", nextSchedule: "2026-06-15",
    inspectionHistory: [
      { date: "2026-03-15", type: "정기점검", result: "이상없음", technician: "장보고", note: "2기 모두 정상" },
    ],
  },
  // ── WH-002 담당 (서울 서초권) ──────────────────────────────────────────────
  {
    id: "STOP-005",
    name: "서초역 정류장",
    district: "서초구",
    line: "간선",
    location: "서초구 강남대로 63",
    lat: 37.4947, lng: 127.0126,
    routes: ["2413", "2016", "2224", "N62"],
    status: "주의",
    workType: "fieldDispatch",
    devices: [
      {
        deviceId: "DEV-0501", assetCode: "BIS-SOLAR-005", model: "BIS-S300",
        powerType: "solar", status: "점검 중", installedDate: "2024-05-10",
        batteryLevel: 42, lastCommunication: "2026-03-28 22:00", firmwareVersion: "v2.3.0",
      },
      {
        deviceId: "DEV-0502", assetCode: "BIS-GRID-002", model: "BIS-G200",
        powerType: "grid", status: "정상", installedDate: "2024-05-10",
        lastCommunication: "2026-03-29 09:05", firmwareVersion: "v2.2.1",
      },
    ],
    managerName: "홍길동", managerPhone: "010-5678-9012", managerCompany: "(주)버스텍",
    installedDate: "2024-05-10", lastInspection: "2026-03-20", nextSchedule: "2026-03-31",
    inspectionHistory: [
      { date: "2026-03-20", type: "현장AS", result: "수리완료", technician: "홍길동", note: "DEV-0501 화면 밝기 저하 — 소프트웨어 업데이트" },
      { date: "2025-12-05", type: "정기점검", result: "정상", technician: "홍길동", note: "동절기 점검 완료" },
    ],
    notes: "DEV-0501 소프트웨어 업데이트 후 모니터링 중",
  },
  {
    id: "STOP-006",
    name: "교대역 정류장",
    district: "서초구",
    line: "지선",
    location: "서초구 강남대로 30",
    lat: 37.4807, lng: 127.0055,
    routes: ["2224", "450"],
    status: "정상",
    workType: "normal",
    devices: [
      {
        deviceId: "DEV-0601", assetCode: "BIS-SOLAR-006", model: "BIS-S300",
        powerType: "solar", status: "정상", installedDate: "2024-08-01",
        batteryLevel: 76, lastCommunication: "2026-03-29 08:55", firmwareVersion: "v2.3.1",
      },
    ],
    managerName: "이도치", managerPhone: "010-6789-0123", managerCompany: "(주)버스텍",
    installedDate: "2024-08-01", lastInspection: "2026-03-08", nextSchedule: "2026-06-08",
    inspectionHistory: [
      { date: "2026-03-08", type: "정기점검", result: "이상없음", technician: "이도치", note: "배터리, 통신 모두 정상" },
    ],
  },
  {
    id: "STOP-007",
    name: "남부터미널 정류장",
    district: "서초구",
    line: "광역",
    location: "서초구 서초대로 386",
    lat: 37.4828, lng: 126.9876,
    routes: ["100", "101", "102", "5500-2"],
    status: "오류",
    workType: "emergency",
    devices: [
      {
        deviceId: "DEV-0701", assetCode: "BIS-GRID-003", model: "BIS-G200",
        powerType: "grid", status: "전원 오류", installedDate: "2024-04-01",
        lastCommunication: "2026-03-28 06:30", firmwareVersion: "v2.2.0",
      },
    ],
    managerName: "최강민", managerPhone: "010-7890-1234", managerCompany: "(주)버스텍",
    installedDate: "2024-04-01", lastInspection: "2026-03-28", nextSchedule: "2026-03-30",
    inspectionHistory: [
      { date: "2026-03-28", type: "긴급점검", result: "수리완료", technician: "최강민", note: "전원부 단락 — 퓨즈 교체 후 재시동 대기" },
      { date: "2026-01-15", type: "정기점검", result: "정상", technician: "최강민", note: "이상 없음" },
    ],
    notes: "전원부 퓨즈 교체 완료, 재가동 확인 필요",
  },
  // ── WH-003 담당 (서울 송파·성동권) ────────────────────────────────────────
  {
    id: "STOP-008",
    name: "잠실역 1번 정류장",
    district: "송파구",
    line: "간선",
    location: "송파구 올림픽로 240",
    lat: 37.5132, lng: 127.1001,
    routes: ["30", "301", "302", "360"],
    status: "정상",
    workType: "maintenance",
    devices: [
      {
        deviceId: "DEV-0801", assetCode: "BIS-SOLAR-007", model: "BIS-S300",
        powerType: "solar", status: "정상", installedDate: "2024-10-10",
        batteryLevel: 65, lastCommunication: "2026-03-29 09:10", firmwareVersion: "v2.3.2",
      },
    ],
    managerName: "정수호", managerPhone: "010-8901-2345", managerCompany: "(주)한국정보통신",
    installedDate: "2024-10-10", lastInspection: "2026-03-01", nextSchedule: "2026-04-01",
    inspectionHistory: [
      { date: "2026-03-01", type: "정기점검", result: "정상", technician: "정수호", note: "3개월 주기 점검, 정상" },
      { date: "2025-12-01", type: "정기점검", result: "이상없음", technician: "정수호", note: "동절기 결로 확인 — 이상 없음" },
    ],
    notes: "3개월 주기 정기 유지보수 예정",
  },
  {
    id: "STOP-009",
    name: "잠실역 2번 정류장",
    district: "송파구",
    line: "간선",
    location: "송파구 올림픽로 244",
    lat: 37.5135, lng: 127.1005,
    routes: ["30", "301", "9403"],
    status: "정상",
    workType: "normal",
    devices: [
      {
        deviceId: "DEV-0901", assetCode: "BIS-SOLAR-008", model: "BIS-S400",
        powerType: "solar", status: "정상", installedDate: "2025-01-15",
        batteryLevel: 93, lastCommunication: "2026-03-29 09:20", firmwareVersion: "v2.4.0",
      },
    ],
    managerName: "김나래", managerPhone: "010-9012-3456", managerCompany: "(주)한국정보통신",
    installedDate: "2025-01-15", lastInspection: "2026-03-22", nextSchedule: "2026-06-22",
    inspectionHistory: [
      { date: "2026-03-22", type: "정기점검", result: "이상없음", technician: "김나래", note: "신규 설치 후 첫 정기점검, 이상 없음" },
      { date: "2025-01-15", type: "설치", result: "정상", technician: "김나래", note: "신규 설치 완료" },
    ],
  },
  {
    id: "STOP-010",
    name: "뚝섬역 정류장",
    district: "성동구",
    line: "지선",
    location: "성동구 뚝섬로 1길 48",
    lat: 37.5470, lng: 127.0444,
    routes: ["2014", "2016"],
    status: "주의",
    workType: "fieldDispatch",
    devices: [
      {
        deviceId: "DEV-1001", assetCode: "BIS-SOLAR-009", model: "BIS-S300",
        powerType: "solar", status: "배터리 저하", installedDate: "2024-11-01",
        batteryLevel: 9, lastCommunication: "2026-03-29 07:44", firmwareVersion: "v2.3.1",
      },
    ],
    managerName: "박지훈", managerPhone: "010-0123-4567", managerCompany: "(주)한국정보통신",
    installedDate: "2024-11-01", lastInspection: "2026-02-18", nextSchedule: "2026-03-30",
    inspectionHistory: [
      { date: "2026-02-18", type: "정기점검", result: "정상", technician: "박지훈", note: "배터리 85% — 차기 점검 시 확인 권고" },
    ],
    notes: "배터리 9% — 즉시 현장 출동 및 배터리 교체 필요",
  },
  // ── WH-004 담당 (부산) ─────────────────────────────────────────────────────
  {
    id: "STOP-011",
    name: "서면역 1번 정류장",
    district: "부산진구",
    line: "간선",
    location: "부산진구 중앙대로 672",
    lat: 35.1579, lng: 129.0597,
    routes: ["15", "17", "42", "85"],
    status: "정상",
    workType: "normal",
    devices: [
      {
        deviceId: "DEV-1101", assetCode: "BIS-SOLAR-010", model: "BIS-S300",
        powerType: "solar", status: "정상", installedDate: "2025-02-10",
        batteryLevel: 88, lastCommunication: "2026-03-29 09:00", firmwareVersion: "v2.3.2",
      },
    ],
    managerName: "부산길동", managerPhone: "010-1111-2222", managerCompany: "(주)부산정보",
    installedDate: "2025-02-10", lastInspection: "2026-03-05", nextSchedule: "2026-06-05",
    inspectionHistory: [
      { date: "2026-03-05", type: "정기점검", result: "이상없음", technician: "부산길동", note: "정상 운용 중" },
      { date: "2025-02-10", type: "설치", result: "정상", technician: "부산길동", note: "신규 설치 완료" },
    ],
  },
  {
    id: "STOP-012",
    name: "해운대역 정류장",
    district: "해운대구",
    line: "광역",
    location: "해운대구 해운대해변로 120",
    lat: 35.1630, lng: 129.1635,
    routes: ["139", "180", "1003"],
    status: "주의",
    workType: "maintenance",
    devices: [
      {
        deviceId: "DEV-1201", assetCode: "BIS-GRID-004", model: "BIS-G200",
        powerType: "grid", status: "점검 중", installedDate: "2024-12-01",
        lastCommunication: "2026-03-28 18:00", firmwareVersion: "v2.2.1",
      },
    ],
    managerName: "신해운", managerPhone: "010-2222-3333", managerCompany: "(주)부산정보",
    installedDate: "2024-12-01", lastInspection: "2026-03-25", nextSchedule: "2026-04-25",
    inspectionHistory: [
      { date: "2026-03-25", type: "정기점검", result: "수리완료", technician: "신해운", note: "해풍 염해로 인한 커넥터 부식 — 방청 처리" },
    ],
    notes: "해풍 염해 영향 지역 — 3개월 주기 방청 점검 권고",
  },
  // ── WH-005 담당 (대구) ─────────────────────────────────────────────────────
  {
    id: "STOP-013",
    name: "동대구역 정류장",
    district: "동구",
    line: "간선",
    location: "대구 동구 동대구로 550",
    lat: 35.8797, lng: 128.6280,
    routes: ["401", "509", "650"],
    status: "정상",
    workType: "normal",
    devices: [
      {
        deviceId: "DEV-1301", assetCode: "BIS-SOLAR-011", model: "BIS-S400",
        powerType: "solar", status: "정상", installedDate: "2025-03-01",
        batteryLevel: 97, lastCommunication: "2026-03-29 09:18", firmwareVersion: "v2.4.0",
      },
    ],
    managerName: "대구민준", managerPhone: "010-3333-4444", managerCompany: "(주)대구스마트",
    installedDate: "2025-03-01", lastInspection: "2026-03-20", nextSchedule: "2026-06-20",
    inspectionHistory: [
      { date: "2026-03-20", type: "정기점검", result: "이상없음", technician: "대구민준", note: "신규 설치 후 3개월 점검, 이상 없음" },
      { date: "2025-03-01", type: "설치", result: "정상", technician: "대구민준", note: "신규 설치 완료" },
    ],
  },
  {
    id: "STOP-014",
    name: "반월당역 정류장",
    district: "중구",
    line: "지선",
    location: "대구 중구 달구벌대로 2180",
    lat: 35.8679, lng: 128.5924,
    routes: ["303", "349", "410"],
    status: "오류",
    workType: "emergency",
    devices: [
      {
        deviceId: "DEV-1401", assetCode: "BIS-GRID-005", model: "BIS-G200",
        powerType: "grid", status: "통신 오류", installedDate: "2024-08-15",
        lastCommunication: "2026-03-26 11:00", firmwareVersion: "v2.2.0",
      },
    ],
    managerName: "대구서준", managerPhone: "010-4444-5555", managerCompany: "(주)대구스마트",
    installedDate: "2024-08-15", lastInspection: "2026-03-26", nextSchedule: "2026-03-30",
    inspectionHistory: [
      { date: "2026-03-26", type: "긴급점검", result: "수리완료", technician: "대구서준", note: "SIM 카드 인식 불량 확인 — 교체 부품 수령 후 재방문 예정" },
    ],
    notes: "SIM 교체 부품 발주 중 — 3월 30일 재방문 예정",
  },
  {
    id: "STOP-015",
    name: "칠성시장 정류장",
    district: "북구",
    line: "지선",
    location: "대구 북구 칠성남로 31",
    lat: 35.8902, lng: 128.5892,
    routes: ["156", "204"],
    status: "정상",
    workType: "normal",
    devices: [
      {
        deviceId: "DEV-1501", assetCode: "BIS-SOLAR-012", model: "BIS-S300",
        powerType: "solar", status: "정상", installedDate: "2024-10-22",
        batteryLevel: 79, lastCommunication: "2026-03-29 09:05", firmwareVersion: "v2.3.2",
      },
    ],
    managerName: "대구민준", managerPhone: "010-3333-4444", managerCompany: "(주)대구스마트",
    installedDate: "2024-10-22", lastInspection: "2026-03-12", nextSchedule: "2026-06-12",
    inspectionHistory: [
      { date: "2026-03-12", type: "정기점검", result: "이상없음", technician: "대구민준", note: "청소 및 기능 점검 완료" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────────────────────────────────────
const WORK_TYPE_CONFIG: Record<WorkType, { label: string; color: string; iconColor: string }> = {
  maintenance:   { label: "유지보수",  color: "bg-blue-100 text-blue-800 border-blue-200",   iconColor: "text-blue-600" },
  fieldDispatch: { label: "현장출동",  color: "bg-amber-100 text-amber-800 border-amber-200", iconColor: "text-amber-600" },
  emergency:     { label: "긴급출동",  color: "bg-red-100 text-red-800 border-red-200",       iconColor: "text-red-600" },
  normal:        { label: "정상",      color: "bg-emerald-100 text-emerald-800 border-emerald-200", iconColor: "text-emerald-600" },
};

const STATUS_CONFIG: Record<StopStatus, { color: string; icon: React.ReactNode }> = {
  정상: { color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  주의: { color: "bg-amber-100 text-amber-800",     icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  오류: { color: "bg-red-100 text-red-800",          icon: <AlertCircle className="h-3.5 w-3.5" /> },
};

const DEVICE_STATUS_CONFIG: Record<DeviceStatus, { color: string }> = {
  "정상":      { color: "bg-emerald-100 text-emerald-700" },
  "배터리 저하": { color: "bg-amber-100 text-amber-700" },
  "통신 오류":  { color: "bg-red-100 text-red-700" },
  "전원 오류":  { color: "bg-red-100 text-red-700" },
  "점검 중":   { color: "bg-blue-100 text-blue-700" },
};

const LINE_TYPE_CONFIG: Record<string, string> = {
  간선: "bg-sky-100 text-sky-800",
  지선: "bg-purple-100 text-purple-800",
  광역: "bg-orange-100 text-orange-800",
};

export default function StopsPage() {
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [workTypeFilter, setWorkTypeFilter] = useState<"all" | WorkType>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // 점검 기록 Dialog 상태
  const [inspectionDialogOpen, setInspectionDialogOpen] = useState(false);
  const [inspectionNote, setInspectionNote] = useState("");
  const [inspectionType, setInspectionType] = useState<InspectionRecord["type"]>("정기점검");
  const [inspectionResult, setInspectionResult] = useState<InspectionRecord["result"]>("정상");

  // 길찾기 Dialog 상태
  const [navDialogOpen, setNavDialogOpen] = useState(false);

  // 카드 클릭 → 필터 토글
  const handleCardClick = (key: "all" | WorkType) => {
    setWorkTypeFilter((prev) => (prev === key ? "all" : key));
  };

  // 필터링
  const filteredStops = useMemo(() => {
    return MOCK_STOPS.filter((stop) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        stop.name.toLowerCase().includes(q) ||
        stop.id.toLowerCase().includes(q) ||
        stop.district.toLowerCase().includes(q) ||
        stop.routes.some((r) => r.toLowerCase().includes(q));
      const matchWork   = workTypeFilter === "all" || stop.workType === workTypeFilter;
      const matchStatus = statusFilter === "all" || stop.status === statusFilter;
      return matchSearch && matchWork && matchStatus;
    });
  }, [searchQuery, workTypeFilter, statusFilter]);

  // 요약 카운트
  const counts = useMemo(() => ({
    all:           MOCK_STOPS.length,
    maintenance:   MOCK_STOPS.filter((s) => s.workType === "maintenance").length,
    fieldDispatch: MOCK_STOPS.filter((s) => s.workType === "fieldDispatch").length,
    emergency:     MOCK_STOPS.filter((s) => s.workType === "emergency").length,
    normal:        MOCK_STOPS.filter((s) => s.workType === "normal").length,
  }), []);

  const SUMMARY_CARDS = [
    { key: "all",           label: "전체",     count: counts.all,           icon: <Bus className="h-5 w-5 text-foreground/60" /> },
    { key: "maintenance",   label: "유지보수",  count: counts.maintenance,   icon: <Wrench className="h-5 w-5 text-blue-500" /> },
    { key: "fieldDispatch", label: "현장출동",  count: counts.fieldDispatch, icon: <Navigation className="h-5 w-5 text-amber-500" /> },
    { key: "emergency",     label: "긴급출동",  count: counts.emergency,     icon: <AlertCircle className="h-5 w-5 text-red-500" /> },
    { key: "normal",        label: "정상",      count: counts.normal,        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">정류장 모니터링</h1>
        <p className="text-sm text-muted-foreground mt-1">
          담당 정류장의 상태 및 작업 현황을 확인하세요.
        </p>
      </div>

      {/* 요약 카드 — 클릭 시 작업 유형 필터 연동 */}
      <div className="grid grid-cols-5 gap-3">
        {SUMMARY_CARDS.map(({ key, label, count, icon }) => (
          <button
            key={key}
            onClick={() => handleCardClick(key as "all" | WorkType)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg border bg-card text-left",
              "hover:shadow-sm transition-all",
              workTypeFilter === key
                ? "ring-2 ring-primary ring-offset-1 shadow-sm"
                : "hover:bg-muted/40"
            )}
          >
            {icon}
            <div>
              <p className="text-xl font-bold tabular-nums leading-none">{count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="정류장명, ID, 구, 노선번호 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="정상">정상</SelectItem>
            <SelectItem value="주의">주의</SelectItem>
            <SelectItem value="오류">오류</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 결과 수 */}
      <p className="text-sm text-muted-foreground">
        {filteredStops.length}개 / 전체 {MOCK_STOPS.length}개
      </p>

      {/* 테이블 — 행 클릭 시 Drawer 오픈 */}
      <div className="rounded-lg border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-28">ID</TableHead>
              <TableHead>정류장명</TableHead>
              <TableHead className="w-20">구</TableHead>
              <TableHead className="w-20">노선유형</TableHead>
              <TableHead>운행노선</TableHead>
              <TableHead className="w-16 text-center">단말</TableHead>
              <TableHead className="w-20">상태</TableHead>
              <TableHead className="w-32">마지막점검</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStops.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  조건에 맞는 정류장이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              filteredStops.map((stop) => (
                <TableRow
                  key={stop.id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-muted/50",
                    selectedStop?.id === stop.id && drawerOpen && "bg-primary/5"
                  )}
                  onClick={() => { setSelectedStop(stop); setDrawerOpen(true); }}
                >
                  <TableCell className="font-mono text-xs font-semibold">{stop.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">{stop.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{stop.district}</TableCell>
                  <TableCell>
                    <Badge className={cn("text-[10px]", LINE_TYPE_CONFIG[stop.line] ?? "bg-gray-100 text-gray-700")}>
                      {stop.line}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {stop.routes.slice(0, 3).map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px] px-1.5">{r}</Badge>
                      ))}
                      {stop.routes.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5">+{stop.routes.length - 3}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="tabular-nums text-xs">{stop.devices.length}개</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {STATUS_CONFIG[stop.status].icon}
                      <span className="text-xs">{stop.status}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">
                    {new Date(stop.lastInspection).toLocaleDateString("ko-KR")}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 지도 영역 */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="h-72 bg-muted/40 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <MapPin className="h-10 w-10 opacity-30" />
          <p className="text-sm">지도 영역 — Google Maps 연동 예정</p>
          <p className="text-xs">{filteredStops.length}개 정류장 마커 표시</p>
        </div>
      </div>

      {/* ── 상세 Drawer ────────────────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full md:max-w-lg overflow-y-auto p-0">
          {selectedStop && (() => {
            const cfg = WORK_TYPE_CONFIG[selectedStop.workType];
            return (
              <>
                {/* Drawer 헤더 */}
                <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={cn("text-xs gap-1", cfg.color)}>
                      {selectedStop.workType === "maintenance"   && <Wrench className="h-3 w-3" />}
                      {selectedStop.workType === "fieldDispatch" && <Navigation className="h-3 w-3" />}
                      {selectedStop.workType === "emergency"     && <AlertCircle className="h-3 w-3" />}
                      {selectedStop.workType === "normal"        && <CheckCircle2 className="h-3 w-3" />}
                      {cfg.label}
                    </Badge>
                    <Badge className={cn("text-xs gap-1", STATUS_CONFIG[selectedStop.status].color)}>
                      {STATUS_CONFIG[selectedStop.status].icon}
                      {selectedStop.status}
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">{selectedStop.id}</span>
                  </div>
                  <SheetTitle className="text-lg">{selectedStop.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-1 text-sm">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {selectedStop.location}
                  </SheetDescription>
                </SheetHeader>

                <div className="px-6 py-5 space-y-6">

                  {/* 비고 알림 */}
                  {selectedStop.notes && (
                    <div className={cn(
                      "flex items-start gap-3 rounded-lg border px-4 py-3",
                      selectedStop.workType === "emergency" ? "bg-red-50 border-red-200" :
                      selectedStop.workType === "fieldDispatch" ? "bg-amber-50 border-amber-200" :
                      "bg-blue-50 border-blue-200"
                    )}>
                      <AlertTriangle className={cn("h-4 w-4 shrink-0 mt-0.5",
                        selectedStop.workType === "emergency" ? "text-red-600" :
                        selectedStop.workType === "fieldDispatch" ? "text-amber-600" : "text-blue-600"
                      )} />
                      <p className="text-xs leading-relaxed">{selectedStop.notes}</p>
                    </div>
                  )}

                  {/* 기본 정보 */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">기본 정보</h4>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div className="flex justify-between col-span-2">
                        <dt className="text-muted-foreground">행정구</dt>
                        <dd className="font-medium">{selectedStop.district}</dd>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <dt className="text-muted-foreground">노선유형</dt>
                        <dd>
                          <Badge className={cn("text-[10px]", LINE_TYPE_CONFIG[selectedStop.line] ?? "bg-gray-100 text-gray-700")}>
                            {selectedStop.line}
                          </Badge>
                        </dd>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <dt className="text-muted-foreground">운행 노선</dt>
                        <dd className="flex flex-wrap gap-1 justify-end">
                          {selectedStop.routes.map((r) => (
                            <Badge key={r} variant="outline" className="text-[10px]">{r}번</Badge>
                          ))}
                        </dd>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <dt className="text-muted-foreground">최초 설치일</dt>
                        <dd className="font-medium tabular-nums">
                          {new Date(selectedStop.installedDate).toLocaleDateString("ko-KR")}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <Separator />

                  {/* 설치 단말 */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      설치 단말 ({selectedStop.devices.length}개)
                    </h4>
                    <div className="space-y-3">
                      {selectedStop.devices.map((dev) => (
                        <div key={dev.deviceId} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono text-[10px] text-muted-foreground">{dev.deviceId}</p>
                              <p className="text-sm font-semibold">{dev.assetCode}</p>
                              <p className="text-xs text-muted-foreground">{dev.model}</p>
                            </div>
                            <Badge className={cn("text-[10px]", DEVICE_STATUS_CONFIG[dev.status].color)}>
                              {dev.status}
                            </Badge>
                          </div>
                          <Separator />
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">전원</dt>
                              <dd className="flex items-center gap-1">
                                {dev.powerType === "solar"
                                  ? <><Zap className="h-3 w-3 text-amber-500" />태양광</>
                                  : <><Zap className="h-3 w-3 text-blue-500" />상용전원</>
                                }
                              </dd>
                            </div>
                            {dev.powerType === "solar" && dev.batteryLevel !== undefined && (
                              <div className="flex justify-between">
                                <dt className="text-muted-foreground">배터리</dt>
                                <dd className={cn("font-semibold tabular-nums",
                                  dev.batteryLevel <= 20 ? "text-red-600" :
                                  dev.batteryLevel <= 50 ? "text-amber-600" : "text-emerald-600"
                                )}>
                                  {dev.batteryLevel}%
                                </dd>
                              </div>
                            )}
                            <div className="flex justify-between col-span-2">
                              <dt className="text-muted-foreground">마지막 통신</dt>
                              <dd className="tabular-nums">{dev.lastCommunication}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">펌웨어</dt>
                              <dd className="font-mono">{dev.firmwareVersion}</dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">설치일</dt>
                              <dd className="tabular-nums">
                                {new Date(dev.installedDate).toLocaleDateString("ko-KR")}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 점검 일정 */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">점검 일정</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" /> 마지막 점검
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {new Date(selectedStop.lastInspection).toLocaleDateString("ko-KR")}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> 다음 예정
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {new Date(selectedStop.nextSchedule).toLocaleDateString("ko-KR")}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <Separator />

                  {/* 점검 이력 */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      점검 이력 ({selectedStop.inspectionHistory.length}건)
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {selectedStop.inspectionHistory.map((rec, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <div className="flex flex-col items-center gap-1">
                            <div className={cn("h-2 w-2 rounded-full mt-1.5 shrink-0",
                              rec.result === "정상" || rec.result === "이상없음"
                                ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            {i < selectedStop.inspectionHistory.length - 1 && (
                              <div className="w-px flex-1 bg-border" />
                            )}
                          </div>
                          <div className="pb-3 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] tabular-nums text-muted-foreground">{rec.date}</span>
                              <Badge variant="outline" className="text-[10px]">{rec.type}</Badge>
                              <Badge className={cn("text-[10px]",
                                rec.result === "정상" || rec.result === "이상없음"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              )}>
                                {rec.result}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{rec.note}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <User className="h-3 w-3" /> {rec.technician}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* 담당자 정보 */}
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">담당자 정보</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> 업체
                        </dt>
                        <dd className="font-medium">{selectedStop.managerCompany}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground flex items-center gap-1">
                          <User className="h-3.5 w-3.5" /> 담당자
                        </dt>
                        <dd className="font-medium">{selectedStop.managerName}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground" />
                        <dd>
                          <a
                            href={`tel:${selectedStop.managerPhone}`}
                            className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {selectedStop.managerPhone}
                          </a>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* 빠른 액션 */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setInspectionNote("");
                        setInspectionType("정기점검");
                        setInspectionResult("정상");
                        setInspectionDialogOpen(true);
                      }}
                    >
                      <Cpu className="h-4 w-4" />
                      점검 기록
                    </Button>
                    <Button
                      className="w-full gap-2"
                      onClick={() => setNavDialogOpen(true)}
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

      {/* ── 점검 기록 Dialog ─────────────────────────────────────────── */}
      <Dialog open={inspectionDialogOpen} onOpenChange={setInspectionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              점검 기록 등록
            </DialogTitle>
            <DialogDescription>
              {selectedStop?.name}의 점검 기록을 등록합니다.
            </DialogDescription>
          </DialogHeader>

          {selectedStop && (
            <div className="space-y-4 py-2">
              {/* 정류장 정보 */}
              <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm">
                <p className="font-semibold">{selectedStop.name}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{selectedStop.id} · {selectedStop.location}</p>
              </div>

              {/* 점검 유형 */}
              <div className="space-y-1.5">
                <Label className="text-sm">점검 유형</Label>
                <Select value={inspectionType} onValueChange={(v) => setInspectionType(v as InspectionRecord["type"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["정기점검", "긴급점검", "현장AS", "설치", "교체"] as InspectionRecord["type"][]).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 점검 결과 */}
              <div className="space-y-1.5">
                <Label className="text-sm">점검 결과</Label>
                <Select value={inspectionResult} onValueChange={(v) => setInspectionResult(v as InspectionRecord["result"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["정상", "이상없음", "수리완료", "부품교체"] as InspectionRecord["result"][]).map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 점검 내용 */}
              <div className="space-y-1.5">
                <Label className="text-sm">점검 내용</Label>
                <Textarea
                  placeholder="점검 내용을 입력하세요..."
                  value={inspectionNote}
                  onChange={(e) => setInspectionNote(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInspectionDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                // TODO: 실제 저장 API 연동
                setInspectionDialogOpen(false);
              }}
              disabled={!inspectionNote.trim()}
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── 길찾기 앱 선택 Dialog ──────────────────────────────────────── */}
      <Dialog open={navDialogOpen} onOpenChange={setNavDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Map className="h-4 w-4 text-primary" />
              길찾기
            </DialogTitle>
            <DialogDescription>
              {selectedStop?.name}으로 이동할 지도 앱을 선택하세요.
            </DialogDescription>
          </DialogHeader>

          {selectedStop && (
            <div className="space-y-3 py-2">
              <div className="grid gap-2">
                {[
                  {
                    label: "카카오맵",
                    url: `https://map.kakao.com/link/to/${encodeURIComponent(selectedStop.name)},${selectedStop.lat},${selectedStop.lng}`,
                  },
                  {
                    label: "네이버지도",
                    url: `https://map.naver.com/v5/directions/-/${selectedStop.lng},${selectedStop.lat},${encodeURIComponent(selectedStop.name)}/-/transit`,
                  },
                  {
                    label: "구글맵",
                    url: `https://maps.google.com/?q=${selectedStop.lat},${selectedStop.lng}`,
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
