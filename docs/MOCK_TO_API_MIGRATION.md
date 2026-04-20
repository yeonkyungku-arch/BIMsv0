# Mock to API 마이그레이션 가이드

> **BIMS Mock 데이터를 실제 API로 전환하는 가이드**  
> 버전: v1.0  
> 최종 업데이트: 2026-03-29

---

## 1. 개요

### 1.1 현재 상태

현재 BIMS 시스템은 **Mock 데이터** 기반으로 동작합니다. 실제 서비스를 위해 백엔드 API로 전환이 필요합니다.

| 구분 | 현재 | 목표 |
|------|------|------|
| 데이터 소스 | `lib/mock-data.tsx` | REST API |
| 인증 | 구조만 정의 | JWT 기반 인증 |
| 상태 관리 | useState + Mock | SWR + API |

### 1.2 마이그레이션 원칙

1. **점진적 전환** - 모듈별로 순차 전환
2. **Provider 패턴 활용** - Mock/API 전환 용이
3. **환경 변수 제어** - 개발/운영 환경 분리
4. **하위 호환성 유지** - 기존 컴포넌트 수정 최소화

---

## 2. 아키텍처

### 2.1 Provider 패턴 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                        Component Layer                          │
│  (pages, components)                                            │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Provider Factory                           │
│  getRmsProvider(), getCmsProvider(), getAssetProvider()        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              ▼                                   ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│     Mock Provider       │         │      API Provider       │
│  (MockRmsProvider)      │         │   (ApiRmsProvider)      │
│  - 개발/테스트 환경      │         │   - 운영 환경           │
│  - mock-data.tsx 사용   │         │   - REST API 호출       │
└─────────────────────────┘         └─────────────────────────┘
```

### 2.2 기존 Provider 구현 위치

| Provider | 경로 | 상태 |
|----------|------|------|
| RMS Provider | `lib/rms/provider/` | 구현됨 |
| CMS Provider | `lib/cms/provider/` | 구현됨 |
| Asset Provider | (신규 필요) | 미구현 |
| Auth Provider | (신규 필요) | 미구현 |

---

## 3. 마이그레이션 단계

### 3.1 Phase 1: 인프라 준비

#### Step 1.1: 환경 변수 설정

```bash
# .env.local (개발)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_PROVIDER_TYPE=mock

# .env.production (운영)
NEXT_PUBLIC_API_BASE_URL=https://api.bims.example.com/api/v1
NEXT_PUBLIC_PROVIDER_TYPE=api
```

#### Step 1.2: API 클라이언트 생성

```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
```

### 3.2 Phase 2: 인증 시스템 구현

#### Step 2.1: Auth Provider 인터페이스

```typescript
// lib/auth/auth-provider.ts
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId: string;
  companyName: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthProvider {
  login(credentials: LoginCredentials): Promise<{ tokens: AuthTokens; user: AuthUser }>;
  logout(): Promise<void>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  getCurrentUser(): Promise<AuthUser | null>;
}
```

#### Step 2.2: Mock Auth Provider

```typescript
// lib/auth/impl/mock-auth-provider.ts
import { AuthProvider, LoginCredentials, AuthTokens, AuthUser } from '../auth-provider';

export class MockAuthProvider implements AuthProvider {
  private currentUser: AuthUser | null = null;

  async login(credentials: LoginCredentials) {
    // Mock 로그인 시뮬레이션
    const user: AuthUser = {
      id: 'user-001',
      email: credentials.email,
      name: '테스트 사용자',
      role: 'FIELD_ENGINEER',
      companyId: 'company-001',
      companyName: 'BIS설치전문',
    };

    const tokens: AuthTokens = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      expiresIn: 3600,
    };

    this.currentUser = user;
    return { tokens, user };
  }

  async logout() {
    this.currentUser = null;
  }

  async refreshToken(refreshToken: string) {
    return {
      accessToken: 'mock-new-access-token',
      refreshToken: 'mock-new-refresh-token',
      expiresIn: 3600,
    };
  }

  async getCurrentUser() {
    return this.currentUser;
  }
}
```

#### Step 2.3: API Auth Provider

```typescript
// lib/auth/impl/api-auth-provider.ts
import { apiClient } from '../../api/client';
import { AuthProvider, LoginCredentials, AuthTokens, AuthUser } from '../auth-provider';

export class ApiAuthProvider implements AuthProvider {
  async login(credentials: LoginCredentials) {
    const response = await apiClient.post<{
      success: boolean;
      data: { tokens: AuthTokens; user: AuthUser };
    }>('/auth/login', credentials);

    apiClient.setToken(response.data.tokens.accessToken);
    return response.data;
  }

  async logout() {
    await apiClient.post('/auth/logout');
    apiClient.setToken(null);
  }

  async refreshToken(refreshToken: string) {
    const response = await apiClient.post<{
      success: boolean;
      data: AuthTokens;
    }>('/auth/refresh', { refreshToken });

    apiClient.setToken(response.data.accessToken);
    return response.data;
  }

  async getCurrentUser() {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: AuthUser;
      }>('/auth/me');
      return response.data;
    } catch {
      return null;
    }
  }
}
```

### 3.3 Phase 3: 도메인별 Provider 전환

#### Step 3.1: Asset Provider

```typescript
// lib/asset/asset-provider.ts
import { Asset, AssetStatus } from './asset.types';

export interface AssetListParams {
  page?: number;
  limit?: number;
  status?: AssetStatus;
  warehouseId?: string;
  modelId?: string;
}

export interface AssetProvider {
  getAssets(params?: AssetListParams): Promise<{ data: Asset[]; total: number }>;
  getAsset(id: string): Promise<Asset>;
  createAsset(data: Partial<Asset>): Promise<Asset>;
  updateAsset(id: string, data: Partial<Asset>): Promise<Asset>;
  updateAssetStatus(id: string, status: AssetStatus, reason?: string): Promise<Asset>;
  dispatchAsset(id: string, destinationId: string, workOrderId?: string): Promise<Asset>;
}
```

```typescript
// lib/asset/impl/mock-asset-provider.ts
import { mockAssets } from '../../mock-data';
import { AssetProvider, AssetListParams } from '../asset-provider';

export class MockAssetProvider implements AssetProvider {
  async getAssets(params?: AssetListParams) {
    let filtered = [...mockAssets];

    if (params?.status) {
      filtered = filtered.filter(a => a.status === params.status);
    }
    if (params?.warehouseId) {
      filtered = filtered.filter(a => a.warehouseId === params.warehouseId);
    }

    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return { data, total: filtered.length };
  }

  async getAsset(id: string) {
    const asset = mockAssets.find(a => a.id === id);
    if (!asset) throw new Error('Asset not found');
    return asset;
  }

  // ... 나머지 메서드 구현
}
```

```typescript
// lib/asset/impl/api-asset-provider.ts
import { apiClient } from '../../api/client';
import { AssetProvider, AssetListParams } from '../asset-provider';

export class ApiAssetProvider implements AssetProvider {
  async getAssets(params?: AssetListParams) {
    const response = await apiClient.get<{
      success: boolean;
      data: Asset[];
      meta: { total: number };
    }>('/assets', { params: params as Record<string, string> });

    return { data: response.data, total: response.meta.total };
  }

  async getAsset(id: string) {
    const response = await apiClient.get<{
      success: boolean;
      data: Asset;
    }>(`/assets/${id}`);

    return response.data;
  }

  // ... 나머지 메서드 구현
}
```

#### Step 3.2: Provider Factory 패턴

```typescript
// lib/asset/asset-provider.factory.ts
import { AssetProvider } from './asset-provider';
import { MockAssetProvider } from './impl/mock-asset-provider';
import { ApiAssetProvider } from './impl/api-asset-provider';

let assetProvider: AssetProvider | null = null;

export function getAssetProvider(): AssetProvider {
  if (assetProvider) return assetProvider;

  const providerType = process.env.NEXT_PUBLIC_PROVIDER_TYPE || 'mock';

  switch (providerType) {
    case 'api':
      assetProvider = new ApiAssetProvider();
      break;
    case 'mock':
    default:
      assetProvider = new MockAssetProvider();
  }

  return assetProvider;
}
```

### 3.4 Phase 4: 컴포넌트 전환

#### Step 4.1: SWR 훅 생성

```typescript
// hooks/use-assets.ts
import useSWR from 'swr';
import { getAssetProvider } from '@/lib/asset/asset-provider.factory';

export function useAssets(params?: AssetListParams) {
  const provider = getAssetProvider();

  const { data, error, isLoading, mutate } = useSWR(
    ['assets', params],
    () => provider.getAssets(params),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    assets: data?.data || [],
    total: data?.total || 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useAsset(id: string) {
  const provider = getAssetProvider();

  const { data, error, isLoading, mutate } = useSWR(
    id ? ['asset', id] : null,
    () => provider.getAsset(id)
  );

  return {
    asset: data,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

#### Step 4.2: 컴포넌트에서 사용

```tsx
// Before (Mock 직접 참조)
import { mockAssets } from '@/lib/mock-data';

function AssetList() {
  const [assets, setAssets] = useState(mockAssets);
  // ...
}

// After (Provider + SWR 사용)
import { useAssets } from '@/hooks/use-assets';

function AssetList() {
  const { assets, isLoading, error, refresh } = useAssets({ status: 'IN_STOCK' });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <Table>
      {assets.map(asset => (
        <AssetRow key={asset.id} asset={asset} />
      ))}
    </Table>
  );
}
```

---

## 4. 전환 체크리스트

### 4.1 Phase별 체크리스트

#### Phase 1: 인프라 준비
- [ ] 환경 변수 설정 (.env.local, .env.production)
- [ ] API 클라이언트 생성 (lib/api/client.ts)
- [ ] 에러 핸들링 유틸리티 생성

#### Phase 2: 인증 시스템
- [ ] Auth Provider 인터페이스 정의
- [ ] Mock Auth Provider 구현
- [ ] API Auth Provider 구현
- [ ] Auth Factory 생성
- [ ] 로그인/로그아웃 페이지 연동
- [ ] 토큰 저장/갱신 로직

#### Phase 3: 도메인 Provider
- [ ] Asset Provider 전환
- [ ] Device Provider 전환
- [ ] WorkOrder Provider 전환
- [ ] BusStop Provider 전환
- [ ] Customer Provider 전환
- [ ] Warehouse Provider 전환

#### Phase 4: 컴포넌트 전환
- [ ] SWR 훅 생성 (도메인별)
- [ ] Portal 페이지 전환
- [ ] Tablet 페이지 전환
- [ ] 에러/로딩 상태 UI 추가

### 4.2 모듈별 전환 순서 (권장)

| 순서 | 모듈 | 우선순위 | 의존성 |
|------|------|----------|--------|
| 1 | 인증 (Auth) | 높음 | 없음 |
| 2 | 자산 (Asset) | 높음 | Auth |
| 3 | 단말 (Device) | 높음 | Auth, Asset |
| 4 | 정류장 (BusStop) | 중간 | Auth |
| 5 | 작업지시 (WorkOrder) | 중간 | Auth, Device, BusStop |
| 6 | RMS | 낮음 | Auth, Device |
| 7 | CMS | 낮음 | Auth |

---

## 5. 테스트 전략

### 5.1 단위 테스트

```typescript
// __tests__/lib/asset/mock-asset-provider.test.ts
import { MockAssetProvider } from '@/lib/asset/impl/mock-asset-provider';

describe('MockAssetProvider', () => {
  let provider: MockAssetProvider;

  beforeEach(() => {
    provider = new MockAssetProvider();
  });

  it('should return paginated assets', async () => {
    const result = await provider.getAssets({ page: 1, limit: 10 });
    expect(result.data.length).toBeLessThanOrEqual(10);
    expect(result.total).toBeGreaterThan(0);
  });

  it('should filter by status', async () => {
    const result = await provider.getAssets({ status: 'IN_STOCK' });
    result.data.forEach(asset => {
      expect(asset.status).toBe('IN_STOCK');
    });
  });
});
```

### 5.2 통합 테스트

```typescript
// __tests__/integration/asset-flow.test.ts
import { getAssetProvider } from '@/lib/asset/asset-provider.factory';

describe('Asset Flow Integration', () => {
  const provider = getAssetProvider();

  it('should create and retrieve asset', async () => {
    const created = await provider.createAsset({
      serialNumber: 'TEST-001',
      modelId: 'model-001',
      warehouseId: 'wh-001',
    });

    const retrieved = await provider.getAsset(created.id);
    expect(retrieved.serialNumber).toBe('TEST-001');
  });
});
```

---

## 6. 롤백 전략

### 6.1 환경 변수 롤백

```bash
# 문제 발생 시 Mock으로 롤백
NEXT_PUBLIC_PROVIDER_TYPE=mock
```

### 6.2 Feature Flag 사용

```typescript
// lib/feature-flags.ts
export const features = {
  useApiAssets: process.env.NEXT_PUBLIC_USE_API_ASSETS === 'true',
  useApiDevices: process.env.NEXT_PUBLIC_USE_API_DEVICES === 'true',
  useApiWorkOrders: process.env.NEXT_PUBLIC_USE_API_WORK_ORDERS === 'true',
};

// 사용
if (features.useApiAssets) {
  return new ApiAssetProvider();
} else {
  return new MockAssetProvider();
}
```

---

## 7. 트러블슈팅

### 7.1 일반적인 문제

| 문제 | 원인 | 해결 |
|------|------|------|
| CORS 에러 | API 서버 CORS 설정 | 백엔드 CORS 허용 설정 |
| 401 Unauthorized | 토큰 만료 | refreshToken 로직 확인 |
| 데이터 불일치 | Mock/API 스키마 차이 | 타입 정의 동기화 |
| 느린 응답 | 네트워크/서버 이슈 | 로딩 상태 UI, 캐싱 |

### 7.2 디버깅 팁

```typescript
// API 호출 로깅
if (process.env.NODE_ENV === 'development') {
  console.log('[API] Request:', endpoint, params);
  console.log('[API] Response:', response);
}
```

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-03-29 | 초기 버전 |
