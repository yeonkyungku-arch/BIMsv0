# 테스트 가이드 (Testing Guide)

## 1. 테스트 전략

### 1.1 테스트 계층
- **Unit Tests**: 함수/컴포넌트 단위 (Jest)
- **Integration Tests**: 모듈 간 연동 (Vitest)
- **E2E Tests**: 사용자 흐름 (Playwright)

---

## 2. Unit 테스트

### 테스트 작성
```typescript
// __tests__/utils.test.ts
import { formatDate } from '@/lib/utils';

describe('formatDate', () => {
  it('should format date correctly', () => {
    const result = formatDate('2026-03-29');
    expect(result).toBe('2026-03-29');
  });
});
```

### 실행
```bash
npm run test
npm run test:watch  # Watch mode
npm run test:coverage  # 커버리지 확인
```

---

## 3. Integration 테스트

### API 연동 테스트
```typescript
import { getAllTabletWorkOrders } from '@/lib/tablet-portal-sync';

describe('Tablet API Integration', () => {
  it('should fetch work orders', async () => {
    const works = await getAllTabletWorkOrders('today');
    expect(works).toHaveLength(5);
  });
});
```

---

## 4. E2E 테스트

### Playwright 설정
```bash
npx playwright install
```

### 테스트 작성
```typescript
// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('Dashboard loads correctly', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle('Dashboard');
});
```

### 실행
```bash
npm run test:e2e
npm run test:e2e:ui  # UI 모드
```

---

## 5. 테스트 커버리지 목표

| 항목 | 목표 |
|------|------|
| 전체 | 80% |
| 문장 | 75% |
| 분기 | 70% |

---

## 6. CI/CD 테스트

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e
```

---

## 7. 수동 테스트 체크리스트

### Portal
- [ ] 로그인/로그아웃
- [ ] 자산 CRUD
- [ ] 단말 모니터링
- [ ] 작업지시서 생성/수정
- [ ] 권한 검증

### Tablet
- [ ] 대시보드 로드
- [ ] 작업 목록 표시
- [ ] 점검 기록 등록
- [ ] 오프라인 모드
- [ ] 지도 표시

---

## 8. 성능 테스트

```bash
npm run build
npm run start

# Lighthouse 실행
npm run lighthouse
```
