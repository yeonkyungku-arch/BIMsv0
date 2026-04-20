# 배포 가이드 (Deployment Guide)

## 1. 배포 환경 설정

### 1.1 Vercel 배포 (Portal & Tablet Web)

#### 사전 조건
- Vercel 계정 보유
- GitHub 저장소 연결
- 환경 변수 설정

#### 배포 단계

1. **GitHub Push**
```bash
git add .
git commit -m "feat: [기능명]"
git push origin main
```

2. **Vercel 자동 배포**
- GitHub main 브랜치에 push 시 자동 배포
- 배포 로그: Vercel 대시보드에서 확인

3. **환경 변수 설정**
Vercel 프로젝트 설정 > Vars:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_GOOGLE_MAPS_KEY=YOUR_KEY
```

#### 배포 검증
- 브라우저에서 접속 확인
- 각 페이지 렌더링 확인
- API 연동 테스트

---

### 1.2 모바일 앱 배포 (Tablet)

#### iOS 배포 (App Store)
1. **빌드**
   - Xcode에서 Archive 생성
   - 서명 및 프로비저닝

2. **App Store Connect 제출**
   - 앱 스크린샷, 설명, 키워드 입력
   - 심사 요청 (약 1-2일)

3. **앱 공개**
   - 심사 승인 후 자동 공개

#### Android 배포 (Google Play)
1. **빌드**
   - Release APK/AAB 생성
   - 서명 (키스토어)

2. **Google Play Console 제출**
   - 앱 정보, 스크린샷 입력
   - 심사 요청 (약 수시간~1일)

3. **앱 공개**
   - 심사 승인 후 자동 공개

---

## 2. 백엔드 API 서버 배포

### 2.1 Node.js API 서버 (Vercel)

```bash
# 1. API 디렉토리 생성
mkdir api
cd api

# 2. 서버 코드 작성 (Node.js/Express)
# 3. Vercel Functions로 배포
vercel deploy

# 4. API 엔드포인트
# https://api.yourdomain.com/api/assets
# https://api.yourdomain.com/api/devices
```

### 2.2 데이터베이스 설정

#### PostgreSQL (Supabase 또는 AWS RDS)
```sql
-- DB 초기화 스크립트 실행
psql -h host -U user -d database -f init.sql
```

#### MongoDB (Atlas)
```javascript
// MongoDB Atlas 프로젝트 생성
// 연결 문자열: mongodb+srv://user:pass@cluster...
```

---

## 3. 환경별 배포 전략

### 3.1 개발(Dev) 환경
- URL: `https://dev.yourdomain.com`
- 자동 배포: GitHub develop 브랜치
- 데이터: 개발 DB

### 3.2 스테이징(Staging) 환경
- URL: `https://staging.yourdomain.com`
- 수동 배포: release 브랜치
- 데이터: 복제된 프로덕션 데이터

### 3.3 프로덕션(Prod) 환경
- URL: `https://yourdomain.com`
- 수동 배포: main 브랜치 (tag 기반)
- 데이터: 프로덕션 DB

---

## 4. 배포 체크리스트

### 배포 전 확인
- [ ] 모든 테스트 통과
- [ ] 코드 리뷰 완료
- [ ] 환경 변수 설정 확인
- [ ] 데이터 마이그레이션 준비
- [ ] 백업 생성

### 배포 중 확인
- [ ] 빌드 성공
- [ ] 환경 변수 정상 로드
- [ ] API 연동 테스트
- [ ] 성능 모니터링 활성화

### 배포 후 확인
- [ ] 로그인 기능 테스트
- [ ] API 응답 확인
- [ ] 데이터베이스 연동 확인
- [ ] 에러 로깅 정상 작동
- [ ] 사용자 피드백 수집

---

## 5. 롤백 전략

### 긴급 롤백
```bash
# 이전 버전으로 배포
git revert <commit-hash>
git push origin main

# 또는 Vercel에서 이전 배포로 복원
# Vercel Dashboard > Deployments > Promote
```

### 데이터 롤백
```bash
# 백업에서 복원
pg_restore -h host -U user -d database backup.sql
```

---

## 6. 모니터링 및 로깅

### Vercel 모니터링
- https://vercel.com/dashboard
- 배포 상태, 성능 지표 확인

### Sentry 에러 추적
```bash
# .env 설정
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# 에러 발생 시 자동 리포팅
```

### 로그 확인
```bash
# Vercel Logs
vercel logs <deployment-url>

# 또는 Vercel Dashboard > Logs
```

---

## 7. 성능 최적화

### 이미지 최적화
```tsx
// next/image 사용
<Image
  src="/logo.png"
  width={200}
  height={100}
  quality={75}
/>
```

### 번들 크기 최적화
```bash
# 번들 분석
npm run build
npx next-bundle-analyzer
```

### CDN 설정
- Vercel 기본 CDN 사용
- 또는 Cloudflare CDN 추가

---

## 8. 보안 체크리스트

- [ ] HTTPS 강제
- [ ] CORS 설정 확인
- [ ] API 인증 활성화
- [ ] 환경 변수 암호화
- [ ] SQL Injection 방지 (Parameterized Queries)
- [ ] XSS 방지 (CSP 헤더)

---

## 9. 배포 후 운영

### 정기 점검
- 일일: 에러 로그 확인
- 주간: 성능 지표 검토
- 월간: 보안 감사

### 버전 관리
```bash
# 태그 생성
git tag -a v1.0.0 -m "Release 1.0.0"
git push origin v1.0.0
```

### 릴리스 노트
- 새 기능
- 버그 수정
- 성능 개선
- 주의사항
