# API 명세서

> **BIMS REST API Specification**  
> 버전: v1.0  
> 최종 업데이트: 2026-03-29

---

## 1. 개요

### 1.1 API 기본 정보

| 항목 | 값 |
|------|-----|
| Base URL | `/api/v1` |
| 인증 방식 | Bearer Token (JWT) |
| Content-Type | `application/json` |
| 문자 인코딩 | UTF-8 |

### 1.2 공통 응답 형식

```typescript
// 성공 응답
interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

// 에러 응답
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
```

### 1.3 공통 HTTP 상태 코드

| 코드 | 설명 |
|------|------|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 오류 |

---

## 2. 인증 API

### 2.1 로그인

```
POST /api/v1/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "user": {
      "id": "user-001",
      "email": "user@example.com",
      "name": "홍길동",
      "role": "FIELD_ENGINEER",
      "companyId": "company-001",
      "companyName": "BIS설치전문"
    }
  }
}
```

### 2.2 토큰 갱신

```
POST /api/v1/auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2.3 로그아웃

```
POST /api/v1/auth/logout
Authorization: Bearer {accessToken}
```

---

## 3. 자산 API (Assets)

### 3.1 자산 목록 조회

```
GET /api/v1/assets
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| page | number | N | 페이지 번호 (기본값: 1) |
| limit | number | N | 페이지 크기 (기본값: 20) |
| status | string | N | 상태 필터 (IN_STOCK, INSTALLED, FAULTY, DISPOSED) |
| warehouseId | string | N | 창고 ID 필터 |
| modelId | string | N | 모델 ID 필터 |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "asset-001",
      "serialNumber": "BIS-2024-001",
      "modelId": "model-001",
      "modelName": "BIS-A100",
      "status": "IN_STOCK",
      "warehouseId": "wh-001",
      "warehouseName": "서울 중앙창고",
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-03-01T14:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### 3.2 자산 상세 조회

```
GET /api/v1/assets/{assetId}
Authorization: Bearer {accessToken}
```

### 3.3 자산 등록 (입고)

```
POST /api/v1/assets
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "serialNumber": "BIS-2024-002",
  "modelId": "model-001",
  "warehouseId": "wh-001",
  "purchaseDate": "2024-03-01",
  "notes": "신규 입고"
}
```

### 3.4 자산 상태 변경

```
PATCH /api/v1/assets/{assetId}/status
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "status": "INSTALLED",
  "deviceId": "device-001",
  "reason": "정류장 설치"
}
```

### 3.5 자산 출고

```
POST /api/v1/assets/{assetId}/dispatch
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "destinationWarehouseId": "wh-002",
  "workOrderId": "wo-001",
  "notes": "설치 작업용 출고"
}
```

---

## 4. 단말 API (Devices)

### 4.1 단말 목록 조회

```
GET /api/v1/devices
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| page | number | N | 페이지 번호 |
| limit | number | N | 페이지 크기 |
| status | string | N | 상태 필터 (ACTIVE, INACTIVE, FAULT, OFFLINE) |
| customerId | string | N | 고객사 ID 필터 |
| busStopId | string | N | 정류장 ID 필터 |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "device-001",
      "serialNumber": "DEV-2024-001",
      "status": "ACTIVE",
      "busStopId": "stop-001",
      "busStopName": "강남역 1번출구",
      "customerId": "customer-001",
      "customerName": "서울시",
      "lastCommunication": "2024-03-29T10:30:00Z",
      "batteryLevel": 85,
      "firmwareVersion": "2.1.0"
    }
  ]
}
```

### 4.2 단말 상세 조회

```
GET /api/v1/devices/{deviceId}
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "device-001",
    "serialNumber": "DEV-2024-001",
    "status": "ACTIVE",
    "busStop": {
      "id": "stop-001",
      "name": "강남역 1번출구",
      "address": "서울시 강남구 강남대로 396"
    },
    "customer": {
      "id": "customer-001",
      "name": "서울시"
    },
    "asset": {
      "id": "asset-001",
      "serialNumber": "BIS-2024-001",
      "modelName": "BIS-A100"
    },
    "metrics": {
      "lastCommunication": "2024-03-29T10:30:00Z",
      "batteryLevel": 85,
      "signalStrength": -65,
      "temperature": 25
    },
    "firmware": {
      "currentVersion": "2.1.0",
      "latestVersion": "2.2.0",
      "updateAvailable": true
    }
  }
}
```

### 4.3 단말 상태 변경

```
PATCH /api/v1/devices/{deviceId}/status
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "status": "INACTIVE",
  "reason": "유지보수 작업"
}
```

### 4.4 단말 원격 명령

```
POST /api/v1/devices/{deviceId}/commands
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "command": "REBOOT",
  "parameters": {}
}
```

**지원 명령:**
| 명령 | 설명 | 파라미터 |
|------|------|----------|
| REBOOT | 재부팅 | - |
| SCREENSHOT | 스크린샷 | - |
| UPDATE_FIRMWARE | 펌웨어 업데이트 | version |
| ADJUST_BRIGHTNESS | 밝기 조절 | level (0-100) |

---

## 5. 작업지시서 API (Work Orders)

### 5.1 작업지시서 목록 조회

```
GET /api/v1/work-orders
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| page | number | N | 페이지 번호 |
| limit | number | N | 페이지 크기 |
| type | string | N | 유형 (INSTALL, MAINTAIN, EMERGENCY) |
| status | string | N | 상태 (ASSIGNED, IN_PROGRESS, DONE) |
| assigneeId | string | N | 담당자 ID |
| scheduledDate | string | N | 예정일 (YYYY-MM-DD) |
| dateFrom | string | N | 시작일 |
| dateTo | string | N | 종료일 |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "wo-001",
      "type": "INSTALL",
      "status": "ASSIGNED",
      "priority": "NORMAL",
      "scheduledDate": "2024-03-30",
      "scheduledTime": "09:00",
      "busStop": {
        "id": "stop-001",
        "name": "강남역 1번출구",
        "address": "서울시 강남구 강남대로 396",
        "lat": 37.4979,
        "lng": 127.0276
      },
      "customer": {
        "id": "customer-001",
        "name": "서울시"
      },
      "assignee": {
        "id": "user-001",
        "name": "김기사",
        "phone": "010-1234-5678"
      },
      "description": "신규 BIS 단말 설치",
      "createdAt": "2024-03-28T09:00:00Z"
    }
  ]
}
```

### 5.2 작업지시서 상세 조회

```
GET /api/v1/work-orders/{workOrderId}
Authorization: Bearer {accessToken}
```

### 5.3 작업지시서 생성

```
POST /api/v1/work-orders
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "type": "INSTALL",
  "priority": "NORMAL",
  "scheduledDate": "2024-03-30",
  "scheduledTime": "09:00",
  "busStopId": "stop-001",
  "customerId": "customer-001",
  "assigneeId": "user-001",
  "assetId": "asset-001",
  "description": "신규 BIS 단말 설치"
}
```

### 5.4 작업 상태 변경

```
PATCH /api/v1/work-orders/{workOrderId}/status
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "notes": "현장 도착, 작업 시작"
}
```

### 5.5 작업 완료 처리

```
POST /api/v1/work-orders/{workOrderId}/complete
Authorization: Bearer {accessToken}
```

**Request Body (multipart/form-data):**
```
{
  "result": "SUCCESS",
  "notes": "설치 완료",
  "deviceId": "device-001",
  "photos": [File, File, ...]
}
```

---

## 6. 정류장 API (Bus Stops)

### 6.1 정류장 목록 조회

```
GET /api/v1/bus-stops
Authorization: Bearer {accessToken}
```

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|------|------|
| page | number | N | 페이지 번호 |
| limit | number | N | 페이지 크기 |
| status | string | N | 상태 (active, inactive) |
| customerId | string | N | 고객사 ID |
| search | string | N | 검색어 (이름, 주소) |
| lat | number | N | 위도 (근처 검색) |
| lng | number | N | 경도 (근처 검색) |
| radius | number | N | 반경 (km, 기본값: 5) |

### 6.2 정류장 상세 조회

```
GET /api/v1/bus-stops/{busStopId}
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "stop-001",
    "name": "강남역 1번출구",
    "busStopId": "23456",
    "address": "서울시 강남구 강남대로 396",
    "lat": 37.4979,
    "lng": 127.0276,
    "customer": {
      "id": "customer-001",
      "name": "서울시"
    },
    "status": "active",
    "device": {
      "id": "device-001",
      "serialNumber": "DEV-2024-001",
      "status": "ACTIVE"
    },
    "inspections": [
      {
        "date": "2024-03-15",
        "type": "정기점검",
        "result": "정상",
        "inspectorName": "김기사"
      }
    ],
    "nextInspectionDate": "2024-04-15"
  }
}
```

### 6.3 점검 기록 등록

```
POST /api/v1/bus-stops/{busStopId}/inspections
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "type": "정기점검",
  "result": "정상",
  "notes": "이상 없음",
  "nextScheduledDate": "2024-04-15"
}
```

---

## 7. 고객사 API (Customers)

### 7.1 고객사 목록 조회

```
GET /api/v1/customers
Authorization: Bearer {accessToken}
```

### 7.2 고객사 상세 조회

```
GET /api/v1/customers/{customerId}
Authorization: Bearer {accessToken}
```

---

## 8. 창고 API (Warehouses)

### 8.1 창고 목록 조회

```
GET /api/v1/warehouses
Authorization: Bearer {accessToken}
```

### 8.2 창고 재고 조회

```
GET /api/v1/warehouses/{warehouseId}/inventory
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "warehouseId": "wh-001",
    "warehouseName": "서울 중앙창고",
    "summary": {
      "totalAssets": 150,
      "inStock": 100,
      "reserved": 20,
      "faulty": 5
    },
    "byModel": [
      {
        "modelId": "model-001",
        "modelName": "BIS-A100",
        "inStock": 50,
        "reserved": 10
      }
    ]
  }
}
```

---

## 9. RMS API (Real-time Monitoring)

### 9.1 장애 단말 목록

```
GET /api/v1/rms/faults
Authorization: Bearer {accessToken}
```

### 9.2 실시간 상태 조회

```
GET /api/v1/rms/devices/{deviceId}/status
Authorization: Bearer {accessToken}
```

### 9.3 알림 목록

```
GET /api/v1/rms/alerts
Authorization: Bearer {accessToken}
```

---

## 10. Tablet 전용 API

### 10.1 오늘 작업 조회

```
GET /api/v1/tablet/work-orders/today
Authorization: Bearer {accessToken}
```

### 10.2 금주 작업 조회

```
GET /api/v1/tablet/work-orders/week
Authorization: Bearer {accessToken}
```

### 10.3 긴급 작업 조회

```
GET /api/v1/tablet/work-orders/emergency
Authorization: Bearer {accessToken}
```

### 10.4 대시보드 요약

```
GET /api/v1/tablet/dashboard
Authorization: Bearer {accessToken}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "todayWorkCount": 5,
    "weekWorkCount": 12,
    "emergencyCount": 1,
    "inventoryCount": 150,
    "faultedDevices": 3
  }
}
```

### 10.5 오프라인 동기화

```
POST /api/v1/tablet/sync
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "outbox": [
    {
      "type": "WORK_STATUS_UPDATE",
      "workOrderId": "wo-001",
      "status": "DONE",
      "timestamp": "2024-03-29T14:30:00Z"
    }
  ]
}
```

---

## 11. 웹소켓 API (실시간 알림)

### 11.1 연결

```
ws://api.example.com/ws?token={accessToken}
```

### 11.2 이벤트 타입

| 이벤트 | 설명 |
|--------|------|
| `device.status.changed` | 단말 상태 변경 |
| `device.fault.detected` | 장애 감지 |
| `work-order.assigned` | 작업 배정 |
| `work-order.status.changed` | 작업 상태 변경 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-03-29 | 초기 버전 |
