# 프로젝트 인수인계서

> **BIMS (Bus Information Management System)**  
> 버전: v2.0  
> 최종 업데이트: 2026-03-29

---

## 1. 프로젝트 개요

### 1.1 시스템 목적

BIMS는 버스정보시스템(BIS) 단말기의 설치, 운영, 유지보수를 위한 통합 관리 플랫폼입니다.

| 구분 | 설명 |
|------|------|
| **Portal** | 웹 기반 관리자 시스템 (Registry, Field-Ops, RMS, CMS, Admin) |
| **Tablet** | 모바일/태블릿 현장 작업 앱 (설치/유지보수 기사용) |
| **Display** | 정류장 디스플레이 렌더링 시스템 |

### 1.2 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | Next.js 16, React 19.2, TypeScript |
| **스타일링** | Tailwind CSS v4, shadcn/ui |
| **상태관리** | React Hooks, SWR |
| **지도** | Google Maps API v3 |
| **인증** | RBAC 기반 권한 관리 (구조 정의됨, 실제 구현 필요) |
| **데이터** | Mock 데이터 (실제 API 연동 필요) |

### 1.3 현재 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| UI/UX 구현 | 완료 | Portal + Tablet 전체 화면 |
| 데이터 연동 | Mock | 실제 백엔드 API 교체 필요 |
| 인증 시스템 | 구조 정의 | 실제 로그인/세션 구현 필요 |
| 배포 | Vercel | 정상 배포 가능 |

---

## 2. 프로젝트 구조

### 2.1 폴더 구조

```
/
├── app/
│   ├── (portal)/           # Portal 웹 앱
│   │   ├── registry/       # 자산/단말/고객사/정류장 관리
│   │   ├── field-operations/ # 작업지시서/설치/분석
│   │   ├── rms/            # 실시간 모니터링/장애 관리
│   │   ├── cms/            # 콘텐츠 관리
│   │   ├── analysis/       # 예측/이상탐지
│   │   └── admin/          # 권한/감사/설정
│   │
│   ├── tablet/             # Tablet 현장 앱
│   │   ├── page.tsx        # 대시보드
│   │   ├── install/        # 작업 지시
│   │   ├── stops/          # 정류장 모니터링
│   │   ├── terminal/       # 단말 현황
│   │   └── inventory/      # 재고 관리
│   │
│   └── display/            # 디스플레이 렌더링
│
├── components/
│   ├── ui/                 # shadcn/ui 기본 컴포넌트
│   ├── tablet/             # Tablet 전용 컴포넌트
│   ├── rms/                # RMS 도메인 컴포넌트
│   └── cms/                # CMS 도메인 컴포넌트
│
├── lib/
│   ├── mock-data.tsx       # Mock 데이터 (핵심)
│   ├── tablet-portal-sync.ts # Portal-Tablet 연동
│   ├── tablet-auth.ts      # Tablet 인증 구조
│   ├── rms/                # RMS Provider 패턴
│   └── cms/                # CMS Provider 패턴
│
└── docs/                   # 설계 문서 (41개)
```

### 2.2 주요 파일

| 파일 | 역할 | 중요도 |
|------|------|--------|
| `lib/mock-data.tsx` | 모든 Mock 데이터 정의 | 높음 |
| `lib/tablet-portal-sync.ts` | Portal-Tablet 데이터 연동 | 높음 |
| `lib/tablet-auth.ts` | Tablet 인증/권한 구조 | 중간 |
| `lib/rms/provider/` | RMS Provider 패턴 | 중간 |
| `lib/cms/provider/` | CMS Provider 패턴 | 중간 |

---

## 3. 핵심 모듈별 안내

### 3.1 Portal 모듈

| 모듈 | 경로 | 기능 |
|------|------|------|
| **Registry** | `/registry/*` | 자산/단말/고객사/정류장 마스터 데이터 관리 |
| **Field-Ops** | `/field-operations/*` | 작업지시서, 설치, 리포트, 분석 |
| **RMS** | `/rms/*` | 실시간 모니터링, 장애 관리, 원격 제어 |
| **CMS** | `/cms/*` | 콘텐츠 템플릿, 배포, 승인 |
| **Analysis** | `/analysis/*` | 예측, 이상탐지, 수명 분석 |
| **Admin** | `/admin/*` | 역할/권한, 감사 로그, 시스템 설정 |

### 3.2 Tablet 모듈

| 메뉴 | 경로 | 기능 |
|------|------|------|
| **대시보드** | `/tablet` | 오늘/금주/긴급 작업, 지도, KPI |
| **작업 지시** | `/tablet/install` | 설치/유지보수/긴급 작업 관리 |
| **정류장** | `/tablet/stops` | 정류장 모니터링, 점검 기록 |
| **단말 현황** | `/tablet/terminal` | 단말 상태, 이력, 사진 |
| **재고 관리** | `/tablet/inventory` | 창고 입출고, 자산 관리 |

---

## 4. 데이터 구조

### 4.1 핵심 엔티티

```typescript
// 자산 (Asset)
interface Asset {
  id: string;
  serialNumber: string;
  modelId: string;
  status: "IN_STOCK" | "INSTALLED" | "FAULTY" | "DISPOSED";
  warehouseId?: string;
  installedDeviceId?: string;
}

// 단말 (Device)
interface Device {
  id: string;
  serialNumber: string;
  status: "ACTIVE" | "INACTIVE" | "FAULT" | "OFFLINE";
  busStopId: string;
  customerId: string;
}

// 작업지시서 (WorkOrder)
interface WorkOrder {
  id: string;
  type: "INSTALL" | "MAINTAIN" | "EMERGENCY";
  status: "ASSIGNED" | "IN_PROGRESS" | "DONE";
  scheduledDate: string;
  stationName: string;
  terminalId: string;
  gps: { lat: number; lng: number };
}

// 정류장 (BusStop)
interface BusStopLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  customerId: string;
  status: "active" | "inactive";
}
```

### 4.2 Mock 데이터 위치

| 데이터 | 변수명 | 레코드 수 |
|--------|--------|----------|
| 자산 | `mockAssets` | 50+ |
| 단말 | `mockDevices` | 64+ |
| 작업지시서 | `mockWorkOrders` | 30+ |
| 정류장 | `mockBusStops` | 15+ |
| 고객사 | `mockCustomers` | 10+ |
| 창고 | `mockWarehouses` | 5+ |

---

## 5. 개발 환경 설정

### 5.1 필수 요구사항

- Node.js 18+
- pnpm 8+ (권장) 또는 npm/yarn

### 5.2 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 프로덕션 실행
pnpm start
```

### 5.3 환경 변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API 키 | 예 |
| `DATABASE_URL` | 데이터베이스 연결 (향후) | 아니오 |
| `AUTH_SECRET` | 인증 시크릿 (향후) | 아니오 |

---

## 6. 백엔드 연동 가이드

### 6.1 Mock → API 전환 순서

1. **API 엔드포인트 구현** (백엔드)
2. **Provider 패턴 활용** - `lib/rms/provider/`, `lib/cms/provider/`
3. **Mock Provider → API Provider 전환**
4. **환경 변수로 Provider 선택**

### 6.2 Provider 패턴 예시

```typescript
// lib/rms/provider/rms-provider.factory.ts
export function getRmsProvider(): RmsProvider {
  const providerType = process.env.RMS_PROVIDER || "mock";
  
  switch (providerType) {
    case "api":
      return new ApiRmsProvider();
    case "mock":
    default:
      return new MockRmsProvider();
  }
}
```

### 6.3 필수 API 엔드포인트

| 카테고리 | 엔드포인트 | 메소드 |
|----------|-----------|--------|
| 자산 | `/api/assets` | GET, POST, PUT, DELETE |
| 단말 | `/api/devices` | GET, POST, PUT, DELETE |
| 작업지시 | `/api/work-orders` | GET, POST, PUT |
| 정류장 | `/api/bus-stops` | GET, POST, PUT |
| 인증 | `/api/auth/login` | POST |
| 인증 | `/api/auth/logout` | POST |

---

## 7. 문서 목록

### 7.1 핵심 문서

| 문서 | 경로 | 설명 |
|------|------|------|
| 시스템 개요 | `docs/SYSTEM_OVERVIEW.md` | 전체 시스템 개요 |
| 모듈 아키텍처 | `docs/MODULE_ARCHITECTURE.md` | 모듈 구조 |
| 데이터 흐름 | `docs/DATA_FLOW_ARCHITECTURE.md` | Provider 패턴 |
| Tablet 연동 | `docs/TABLET_PORTAL_INTEGRATION.md` | Portal-Tablet 연동 |
| RBAC 명세 | `docs/RBAC_SPECIFICATION.md` | 권한 관리 |
| Mock 데이터 | `docs/MOCK_DATA_STRUCTURE.md` | 데이터 구조 |
| 컴포넌트 카탈로그 | `docs/COMPONENT_CATALOG.md` | UI 컴포넌트 |

### 7.2 전체 문서 수

- **기존 문서**: 41개 (최신화 완료)
- **신규 문서**: 4개 (인수인계서, API 명세, 화면 흐름도, 마이그레이션 가이드)

---

## 8. 알려진 이슈 및 향후 작업

### 8.1 알려진 경고 (기능 영향 없음)

| 경고 | 설명 | 권장 조치 |
|------|------|----------|
| `google.maps.Marker deprecated` | Google Maps API 경고 | 향후 AdvancedMarkerElement 마이그레이션 |
| `loading=async` 권장 | Maps 로딩 방식 | 성능 최적화 시 개선 |

### 8.2 향후 필수 작업

| 우선순위 | 작업 | 설명 |
|----------|------|------|
| 높음 | 백엔드 API 개발 | Mock 데이터를 실제 API로 교체 |
| 높음 | 인증 시스템 구현 | 로그인/세션/토큰 관리 |
| 중간 | 오프라인 동기화 | Tablet outbox 실제 구현 |
| 낮음 | 푸시 알림 | 긴급 작업 알림 |

---

## 9. 연락처

| 역할 | 담당 |
|------|------|
| 프로젝트 오너 | (기입 필요) |
| 프론트엔드 개발 | (기입 필요) |
| 백엔드 개발 | (기입 필요) |
| 디자인 | (기입 필요) |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v2.0 | 2026-03-29 | Tablet 재설계 완료, 대시보드 v2.0, 메뉴 순서 변경 |
| v1.0 | 2026-03-01 | 초기 버전 |
