# /tablet ↔ Portal 연동 관계 명세

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Portal (관리 시스템)                          │
├──────────┬──────────────┬──────────────┬────────────────────────────┤
│ Registry │ Asset        │ Field Ops    │ RMS                        │
│ (마스터) │ (자산관리)   │ (현장운영)   │ (원격관리)                 │
└──────────┴──────────────┴──────────────┴────────────────────────────┘
     △            △               △                   △
     │            │               │                   │
     └────────────┴───────────────┴───────────────────┘
              ┌────────────────────┴──────────────────┐
              │  Outbox (오프라인 큐, 비동기 동기화) │
              └────────────────────┬──────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    /tablet (현장 작업 앱)                           │
│  설치/구축 기업 & 유지보수 기업                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

---

## 1. Dashboard (대시보드) ↔ Portal 연동 (v2.0 신규)

### 1.1 대시보드 데이터 흐름

```
Portal (RMS/Field-Ops/Asset)       →  Tablet Dashboard (재설계 v2.0)
  │
  ├─ 오늘 작업 (Today)             →  KPI 카드 + 작업 목록 + 지도
  │  (getAllTabletWorkOrders(today))   ├─ 탭: 오늘/금주/긴급
  │                                   ├─ 지도: 작업 위치 마커
  │                                   ├─ 마커 클릭 → Drawer 오픈
  │                                   └─ 현재 위치 표시
  │
  ├─ 금주 작업 (This Week)          →  탭 필터링 (금주 작업 목록)
  │  (getAllTabletWorkOrders(week))    ├─ 스케줄 카드
  │  // getWeekWorkOrders() 함수 추가  ├─ 지도 업데이트
  │                                   └─ KPI: 금주 작업 수
  │
  ├─ 긴급 출동 (Emergency)          →  우선순위 높음 (빨강)
  │  (getWorkOrdersByType(emergency))  ├─ 상단 알림 배너
  │                                   ├─ KPI: 긴급 작업 수
  │                                   └─ 실시간 업데이트
  │
  ├─ 장애 현황 (Faults)             →  Dashboard Alerts
  │  (getFaultedTerminals)            ├─ 긴급 마커 (빨강)
  │                                   ├─ 경고 마커 (주황)
  │                                   └─ 배너 스크롤
  │
  └─ 재고 현황 (Assets)             →  KPI 카드
     (getAssetSummary())              └─ 설치 가능 수량 강조
```

### 1.2 대시보드 UI 구성 (좌우 분할 레이아웃) - v2.0 재설계 완료

```
대시보드 (/) - v2.0 재설계 완료
├─ 헤더: 페이지 제목 ("정류장 모니터링")
│
├─ KPI 카드 행 (4개) - 클릭 시 필터 활성화
│  ├─ 오늘 작업 수 (클릭 → 오늘 탭 활성화)
│  ├─ 금주 작업 수 (클릭 → 금주 탭 활성화)
│  ├─ 긴급 출동 수 (클릭 → 긴급 탭 활성화)
│  └─ 창고 재고 수
│
├─ 작업 탭 필터 (3개 탭)
│  ├─ 탭 1: 오늘 (today) - 기본값 / 배지: TODAY
│  ├─ 탭 2: 금주 (thisWeek) / 배지: THIS_WEEK
│  └─ 탭 3: 긴급 (emergency) / 배지: EMERGENCY
│
├─ 좌우 분할 레이아웃 (반응형)
│  │
│  ├─ [좌측 60%] 작업 카드 리스트
│  │  ├─ 선택된 탭의 작업 목록
│  │  ├─ 각 카드 전체 클릭 → 작업 선택 + Drawer 오픈
│  │  ├─ 카드 내용:
│  │  │  ├─ 정류장명
│  │  │  ├─ 단말 ID / 주소
│  │  │  ├─ 작업 유형 배지 (설치/유지보수/긴급)
│  │  │  ├─ 상태 배지 (예정/진행중/완료)
│  │  │  ├─ 예정일/시간
│  │  │  └─ 고객사명
│  │  ├─ 행 하이라이트 (선택 시 bg-primary/5)
│  │  └─ ScrollArea (최대 높이 고정, 스크롤 가능)
│  │
│  └─ [우측 40%] Google Maps (Google Maps API v3)
│     ├─ 선택된 탭의 작업 위치 마커 (기본 파랑)
│     ├─ 장애 마커 (빨강) - 모든 탭에 겹쳐서 표시
│     ├─ 마커 클릭 → 해당 작업 선택 + Drawer 오픈
│     │  (AdvancedMarkerElement 미사용, google.maps.Marker 사용)
│     │  (deprecated 경고 있으나 12개월 이상 유지 예정)
│     ├─ 지도 팬 → 마커 위치로 자동 이동 (panTo)
│     ├─ 확대/축소 (zoomControl)
│     ├─ 현위치 버튼 (geolocation API 미구현)
│     └─ 초기 중심: 서울 강남역 (37.4979, 127.0276)
│
├─ 상단 긴급 알림 배너 (스크롤 - 향후 구현)
│  ├─ 긴급 장애 우선 표시
│  ├─ 이전/다음 버튼
│  └─ 우선순위 색상 (빨강/주황/파랑)
│
└─ Drawer (작업 상세, 우측 시트) - 이미 구현
   ├─ 작업 헤더
   │  ├─ 작업 유형 배지 (아이콘 포함)
   │  ├─ 상태 배지
   │  └─ 정류장명
   │
   ├─ 작업 기본 정보
   │  ├─ 고객사
   │  ├─ 단말 ID
   │  ├─ 예정일
   │  ├─ 예정시간
   │  └─ 작업 내용 (description)
   │
   └─ 빠른 액션 (2개 버튼, 2열)
      ├─ 좌측: 작업 지시 이동 → /tablet/install
      └─ 우측: 길찾기 (Dialog - 카카오맵/네이버/구글 선택)
           └─ Dialog: NavigationAppSelector
              ├─ 카카오맵 → https://map.kakao.com/link/to/...
              ├─ 네이버지도 → https://map.naver.com/v5/directions/...
              └─ 구글맵 → https://maps.google.com/?q=...
```

### 1.3 마커 클릭 이벤트 흐름 (지도 ↔ Drawer)

```
사용자 액션
┌────────────────────────────────┐
│ 1. 지도 마커 클릭              │
│    (작업 위치 또는 장애 위치)   │
└──────────┬──────────────────────┘
           │
    ┌──────▼──────────────────────┐
    │ 2. marker.addListener('click')
    │    setSelectedWorkId(work.id)│
    │    setDrawerOpen(true)       │
    │    mapInstance.panTo(gps)    │
    │    mapInstance.setZoom(14)   │
    └──────┬──────────────────────┘
           │
    ┌──────▼──────────────────────┐
    │ 3. 좌측 목록에서 해당 작업  │
    │    하이라이트(bg-primary/5)  │
    │    스크롤 위치 조정          │
    └──────┬──────────────────────┘
           │
    ┌──────▼──────────────────────┐
    │ 4. 우측 Drawer 자동 오픈    │
    │    작업 상세 정보 표시       │
    │    (SheetContent)            │
    └──────┬──────────────────────┘
           │
    ┌──────▼──────────────────────┐
    │ 5. 사용자 선택              │
    │    1. 작업 지시 이동        │
    │    2. 길찾기                │
    │    3. Drawer 닫기 (X)       │
    └──────────────────────────────┘
```

### 1.4 데이터 연동 함수

| 화면 요소 | 데이터 소스 | 함수 | 빈도 | 상태 |
|----------|-----------|------|------|------|
| KPI 카드 (오늘) | WorkOrder | `getAllTabletWorkOrders(today)` | 실시간 | 완료 |
| KPI 카드 (금주) | WorkOrder | `getWeekWorkOrders()` | 실시간 | 완료 |
| KPI 카드 (긴급) | WorkOrder | `getWorkOrdersByType('emergency')` | 실시간 | 완료 |
| KPI 카드 (재고) | Asset | `getAssetSummary()` | 5분 | 완료 |
| 작업 목록 | WorkOrder | 탭 선택 필터링 | 실시간 | 완료 |
| 지도 마커 | WorkOrder.gps | 작업 위치 좌표 | 실시간 | 완료 |
| 장애 배너 | Fault | `getFaultedTerminals()` | 1분 | 예정 |
| Drawer | WorkOrder | 선택된 작업 전체 데이터 | 즉시 | 완료 |


---

## 2. Registry ↔ /tablet 연동

## 3. Asset ↔ /tablet 연동

```
Registry (Portal)                           /tablet (현장)
  │
  ├─ 정류장 등록                        →  정류장 위치 지도 표시
  │  (mockBusStops)                         (getBusStopsForTablet)
  │
  ├─ 단말 마스터 등록                  →  단말 설치 목표 조회
  │  (mockDevices)                         (getTerminalsForTablet)
  │
  └─ 고객사/파트너 관리                →  현장 작업 대상 확인
     (mockCustomers)                       (assignedCustomers)
```

### 1.2 주요 함수

| Portal | /tablet | 용도 |
|--------|---------|------|
| Registry UI | `getBusStopsForTablet(region?)` | 설치 대상 정류장 조회 |
| Registry UI | `getTerminalsForTablet(customerId?)` | 배정된 설치 단말 조회 |
| - | `mockBisTerminals` | 설치/구축 예정 단말 목록 (오프라인 동기화) |

### 1.3 설치 흐름

```
1. Portal Registry: 단말 + 정류장 마스터 등록
2. /tablet Dashboard: getBusStopsForTablet() → 지도에 마커 표시
3. /tablet Install: 설치 지시 조회 (Field Ops와의 연동)
4. /tablet Warehouse: 창고에서 자산 출고
5. /tablet Install: 현장 설치 완료 → createInstallOutbox() → Outbox 큐
6. Portal Field Ops: Outbox 동기화 시 완료 보고 수신 → 승인
```

---

## 2. Asset ↔ /tablet 연동

### 2.1 데이터 흐름

```
Registry > Asset (Portal)                  /tablet (현장)
  │
  ├─ 입고 처리 (REC)                   →  창고 입고 확인
  │  (PENDING_INSTALL)                    (createReceivingOutbox)
  │
  ├─ 출고 처리 (DISPATCH)              →  창고 출고 처리
  │  (IN_STOCK)                           (createDispatchOutbox)
  │
  ├─ 자산 상태 추적                     →  현장 자산 상태 변경
  │  (OPERATING, REMOVED, etc)            (createAssetStatusOutbox)
  │
  └─ 폐기 처리 (PENDING_DISPOSAL)      →  폐기 자산 등록
     (DISPOSED)                           (폐기 처리 완료)
```

### 2.2 자산 상태 전이

```
입고대기 → 입고완료 → 창고보관 → 출고(설치배정) → 설치완료(운영중)
                          ↑                              │
                          │                    장애 발생  ↓
                          │               ┌──────────────────┐
                   수리완료 │               │    유지보수     │
                          │               └──────┬───────────┘
                          │                      │
                    ┌─────┴─────┐          ┌────┴────┐
                    │ 철거(입고) │          │  폐기   │
                    └───────────┘          └─────────┘
```

### 2.3 주요 함수

| Portal | /tablet | 용도 |
|--------|---------|------|
| Registry > Assets | `getWarehouseAssets(warehouseId)` | 창고별 재고 조회 |
| Registry > Assets | `getAvailableForInstall(warehouseId?)` | 출고 가능 자산 조회 |
| Registry > Assets | `getPendingReceiving()` | 입고 대기 자산 조회 |
| Registry > Assets | `getAssetSummary(ownerId?)` | 자산 상태 집계 (KPI) |
| - | `createReceivingOutbox()` | 입고 처리 Outbox 생성 |
| - | `createDispatchOutbox()` | 출고 처리 Outbox 생성 |
| - | `createAssetStatusOutbox()` | 자산 상태 변경 Outbox 생성 |

---

## 4. Field Operations ↔ /tablet 연동

### 3.1 데이터 흐름

```
Field Operations (Portal)                  /tablet (현장)
  │
  ├─ 설치 작업 지시 생성                →  Tablet Install 메뉴에 표시
  │  (WorkOrder, ASSIGNED)                  (getAllTabletWorkOrders)
  │
  ├─ 유지보수 작업 지시 생성            →  Tablet Maintenance 메뉴에 표시
  │  (Fault + WorkOrder)                    (mockFaults 연동)
  │
  ├─ 철거 작업 지시 생성                →  Tablet에서 철거 작업 실행
  │  (WorkOrder, removal reason)            (설치 → 철거 전환)
  │
  └─ 작업 완료 보고 수신                ←  완료 보고 (Outbox 동기화)
     (COMPLETION_SUBMITTED → APPROVED)     (createInstallOutbox, etc)
```

### 3.2 Work Order 상태 흐름

```
CREATED → ASSIGNED → IN_PROGRESS → COMPLETION_SUBMITTED → APPROVED → CLOSED
              ↓           ↓                ↓
          Tablet UI    작업 실행        Outbox 전송
         표시됨    (진행 중)          완료 보고
```

### 3.3 주요 함수

| Portal | /tablet | 용도 |
|--------|---------|------|
| Field Ops > Work Orders | `getAllTabletWorkOrders()` | 배정된 작업 목록 조회 |
| Field Ops > Work Orders | `getWorkOrdersForTablet(vendorName)` | 기업별 작업 목록 조회 |
| Field Ops | `getCompletedWorkOrders()` | 완료된 작업 조회 (Report용) |
| - | `createInstallOutbox()` | 설치 완료 보고 Outbox |
| - | `createMaintenanceOutbox()` | 유지보수 완료 보고 Outbox |
| - | `createRemovalOutbox()` | 철거 완료 보고 Outbox |

---

## 5. RMS ↔ /tablet 연동

### 4.1 데이터 흐름

```
RMS (Portal)                               /tablet (현장)
  │
  ├─ 실시간 단말 상태                   →  Dashboard KPI 표시
  │  (Overall State)                       (getOverallSnapshot)
  │
  ├─ 장애 감지                         →  Maintenance 메뉴 알림
  │  (Fault: CRITICAL/WARNING)            (dashboardData.faultedTerminals)
  │
  ├─ Battery/Communication 모니터링    →  단말 상세 화면에 표시
  │  (Sensor data)                        (Device detail page)
  │
  └─ 이상 상태 알림                     →  긴급 대응 필요 표시
     (Alert)                               (Alert banner)
```

### 4.2 상태 매핑

```
RMS OverallState                /tablet UI
  │
  ├─ NORMAL (정상)           →  ✓ 초록색 배지
  ├─ WARNING (주의)          →  ⚠ 노란색 배지
  ├─ CRITICAL (위험)         →  ✗ 빨간색 배지
  └─ OFFLINE (오프라인)      →  ○ 회색 배지
```

### 4.3 주요 함수

| Portal | /tablet | 용도 |
|--------|---------|------|
| RMS > Monitoring | `getOverallSnapshot(devId)` | 단말 Overall State 조회 |
| RMS > Monitoring | `tabletToMonitoringId(terminalId)` | ID 변환 (BIS-XX-### → DEV###) |
| RMS > Faults | `mockFaults` | 장애 목록 (Tablet Maintenance용) |
| - | Dashboard에 RMS 심각도 반영 | KPI 카드의 "장애 단말" 표시 |

---

## 6. Outbox (비동기 동기화)

### 5.1 Outbox 역할

```
/tablet (오프라인 작업)          →  Outbox (로컬 큐)          →  Portal (수신 처리)
                                                              
작업 완료 보고 생성              저장 대기                    Outbox API 동기화
 ├─ Install                     ├─ LOCAL_SAVED               ├─ 상태 검증
 ├─ Maintenance                 ├─ TRANSMISSION_PENDING      ├─ 데이터 통합
 ├─ Removal                     ├─ IN_TRANSMISSION           ├─ Work Order 상태 변경
 ├─ Disposal                    ├─ TRANSMISSION_COMPLETE     └─ 보고서 생성
 ├─ Receiving                   └─ SYNCED
 └─ Dispatch

   (Offline OK)                 (Online → Sync)              (Approval)
```

### 5.2 Outbox 타입

| 타입 | 대상 Portal | 용도 |
|------|------------|------|
| INSTALL | Field Operations | 설치 완료 보고 |
| MAINTENANCE | Field Operations | 유지보수 완료 보고 |
| REPLACEMENT | Field Operations | 교체 완료 보고 |
| REMOVAL | Field Operations | 철거 완료 보고 |
| DISPOSAL | Registry > Assets | 폐기 처리 보고 |
| RECEIVING | Registry > Assets | 입고 처리 보고 |
| DISPATCH | Registry > Assets | 출고 처리 보고 |
| ASSET_STATUS | Registry > Assets | 자산 상태 변경 |

### 5.3 주요 함수

| Outbox 생성 | 입력 데이터 | 동기화 대상 |
|-----------|----------|----------|
| `createInstallOutbox()` | 설치 체크리스트, 사진 | Field Operations |
| `createMaintenanceOutbox()` | 조치 내용, 부품 사용 | Field Operations |
| `createRemovalOutbox()` | 철거 사유, 자산 상태 | Field Operations |
| `createReceivingOutbox()` | 검수 상태, 사진 | Registry > Assets |
| `createDispatchOutbox()` | 출고 대상지, 비고 | Registry > Assets |
| `createAssetStatusOutbox()` | 상태 변경, 사유 | Registry > Assets |

---

## 6. 권한 및 기업 유형별 연동

### 6.1 기업 유형

```
INSTALLER (설치/구축 기업)
├─ 접근 메뉴: Dashboard, Warehouse, Install, Device, Stops, History, Outbox
├─ Portal 연동: Registry > Asset (창고), Field Ops (설치 지시)
└─ 주요 작업: 입고 → 출고 → 설치 → 완료 보고

MAINTAINER (유지보수 기업)
├─ 접근 메뉴: Dashboard, Maintenance, Device, Stops, History, Outbox
├─ Portal 연동: Field Ops (유지보수 지시), RMS (장애 정보)
└─ 주요 작업: 장애 접수 → 현장 대응 → 수리/교체 → 완료 보고 → 철거/폐기

BOTH (설치 + 유지보수)
├─ 접근 메뉴: 전체 메뉴 (Dashboard 포함 6개)
├─ Portal 연동: Registry + Field Ops + RMS 전체
└─ 주요 작업: 설치 + 유지보수 + 철거/폐기 전체 담당
```

### 6.2 권한 매트릭스

| 메뉴 | INSTALLER | MAINTAINER | BOTH |
|------|-----------|-----------|------|
| Dashboard | O | O | O |
| Work Orders (설치) | O | - | O |
| Maintenance | - | O | O |
| Warehouse | O | - | O |
| Device List | O | O | O |
| Stops | O | O | O |
| History | O | O | O |
| Outbox | O | O | O |

---

## 7. 데이터 흐름 타임라인 (예시: 단말 설치)

### 설치/구축 프로세스

```
Day 1: Portal에서 설치 지시 생성
┌─ Portal Registry: 단말 + 정류장 등록
│  └─ mockDevices, mockBusStops 추가
├─ Portal Field Operations: 설치 작업 지시 생성
│  └─ WorkOrder (CREATED → ASSIGNED)

Day 1-3: /tablet에서 설치 작업 실행
┌─ Tablet Dashboard: 오늘 작업 KPI 표시
│  └─ getAllTabletWorkOrders() 조회
├─ Tablet Warehouse: 창고에서 자산 확인 및 출고
│  └─ createDispatchOutbox() 생성
├─ Tablet Install: 현장 설치 작업 실행
│  └─ WorkOrder 상태 IN_PROGRESS로 변경
└─ Tablet Install Complete: 완료 보고서 작성
   └─ createInstallOutbox() 생성 → Outbox 큐

Day 3-4: Outbox 동기화
┌─ 네트워크 연결 시 Outbox 항목 전송
│  └─ TRANSMISSION_PENDING → IN_TRANSMISSION
├─ Portal Field Operations: 완료 보고 수신
│  └─ WorkOrder (COMPLETION_SUBMITTED → APPROVED)
└─ Portal Registry > Assets: 자산 상태 OPERATING으로 업데이트

Day 5: Portal에서 최종 승인 및 보고서 생성
└─ Reports 메뉴에서 설치 완료 이력 조회 가능
```

### 유지보수/교체 프로세스

```
Real-time: RMS에서 장애 감지
┌─ RMS: 단말 CRITICAL 상태 감지
│  └─ mockFaults에 새 항목 추가
└─ Portal Field Operations: 작업 지시 자동 생성

Immediately: /tablet에 알림 전송
┌─ Tablet Dashboard: 긴급 알림 배너 표시
│  └─ dashboardData.faultedTerminals 업데이트
├─ Tablet Maintenance: 장애 목록에 추가
│  └─ mockFaults 조회
└─ Tablet Maintenance Detail: 작업 지시 조회

On-site: /tablet에서 유지보수 작업 실행
┌─ 점검 및 수리
├─ 부품 교체 (필요시)
└─ createMaintenanceOutbox() 생성 → Outbox 큐

Sync: Outbox 동기화
└─ Portal Field Operations: 완료 보고 수신
   └─ Fault 상태 RESOLVED로 변경
```

---

## 8. 핵심 통합 지점

### 8.1 필수 동기화

| 항목 | 방향 | 빈도 | 목적 |
|------|------|------|------|
| Work Order | Portal → Tablet | 실시간 | 작업 지시 전달 |
| Outbox | Tablet → Portal | 온라인 감지 시 | 완료 보고 전송 |
| Asset | Portal → Tablet | 일일 | 재고 정보 최신화 |
| RMS State | RMS → Tablet | 실시간 | 단말 상태 모니터링 |
| Fault | RMS → Tablet | 실시간 | 장애 정보 알림 |

### 8.2 Idempotency Key 구조

```
Outbox idempotencyKey = `${type}:${businessKey}:${schemaVersion}:${id}`

예시:
- INSTALL:ASG001:v1:OBX101
  └─ 중복 전송 시 자동 감지 & 스킵

- MAINTENANCE:INC055:v1:OBX102
  └─ 재전송해도 Portal에서 한 번만 처리
```

---

## 9. 연동 체크리스트

### 필수 구현 완료 항목

- [x] Registry 정류장/단말 마스터 조회
- [x] Asset 창고/재고 조회
- [x] Asset 상태 전이 로직
- [x] Field Operations 작업 지시 조회
- [x] RMS 장애/상태 조회
- [x] Outbox 생성 함수 (6개)
- [x] Outbox 동기화 로직
- [x] 권한별 메뉴 제어
- [x] i18n SSOT 통합
- [x] Dashboard 데이터 집계

### 선택 구현 항목

- [ ] 오프라인 모드 상세 테스트
- [ ] Outbox 재전송 로직 고도화
- [ ] 사진 업로드 연동
- [ ] 서명 기능 추가

---

## 10. 핵심 파일 매핑

| Portal 모듈 | 파일 | /tablet 연동 파일 |
|-----------|------|-----------------|
| Registry | `/app/(portal)/registry/*` | `/lib/tablet-portal-sync.ts` |
| Registry > Assets | `/app/(portal)/registry/assets/*` | `/lib/tablet-asset-lifecycle.ts` |
| Field Operations | `/app/(portal)/field-operations/*` | `/lib/unified-work-order.ts` |
| RMS | `/app/(portal)/rms/*` | `/lib/rms-device-map.ts` |
| - | - | `/lib/tablet-outbox.ts` |
| - | - | `/lib/tablet-install-data.ts` |
| - | - | `/lib/tablet-auth.ts` |
| - | - | `/lib/tablet-i18n.ts` |
| - | - | `/app/tablet/warehouse/page.tsx` |
