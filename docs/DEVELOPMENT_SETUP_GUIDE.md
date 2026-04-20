# 개발 환경 설정 가이드

## 1. 사전 요구사항

### 설치 필요
- Node.js 18+ LTS
- npm 또는 yarn
- Git
- VS Code (권장 에디터)

### 확인
```bash
node --version  # v18.x 이상
npm --version   # 9.x 이상
git --version   # 2.x 이상
```

---

## 2. 프로젝트 초기 설정

### 저장소 클론
```bash
git clone https://github.com/your-org/bis-system.git
cd bis-system
```

### 의존성 설치
```bash
npm install
# 또는
yarn install
```

### 환경 변수 설정
```bash
cp .env.example .env.local
```

`.env.local` 파일 수정:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=YOUR_API_KEY
DATABASE_URL=postgresql://user:password@localhost:5432/bisdb
```

---

## 3. 로컬 개발 서버 실행

### 개발 서버 시작
```bash
npm run dev
```

서버 실행:
- Portal: http://localhost:3000
- API: http://localhost:3000/api

### 빌드
```bash
npm run build
npm run start
```

---

## 4. 데이터베이스 설정 (선택)

### PostgreSQL 설치 (Docker)
```bash
docker run --name bisdb \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=bisdb \
  -p 5432:5432 \
  -d postgres:15
```

### 마이그레이션
```bash
npm run migrate
```

---

## 5. IDE 설정

### VS Code Extensions
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Thunder Client (API 테스트)

### 설정 파일
`.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## 6. Git 설정

### .gitconfig
```bash
git config user.name "Your Name"
git config user.email "your@email.com"
```

### 커밋 메시지 규칙
```
feat: 새 기능
fix: 버그 수정
docs: 문서 변경
style: 코드 스타일 (포맷팅)
refactor: 리팩토링
perf: 성능 개선
test: 테스트 추가
chore: 빌드, 의존성 관리
```

---

## 7. 코드 포맷팅 및 린팅

### Prettier
```bash
npm run format     # 포맷팅
npm run format:check  # 확인만
```

### ESLint
```bash
npm run lint       # 린트 검사
npm run lint:fix   # 자동 수정
```

---

## 8. 테스트 실행

### Unit 테스트
```bash
npm run test
npm run test:watch    # Watch 모드
npm run test:coverage # 커버리지
```

### E2E 테스트
```bash
npm run test:e2e
npm run test:e2e:ui   # UI 모드
```

---

## 9. 문제 해결

### 포트 이미 사용 중
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :3000
kill -9 <PID>
```

### 의존성 문제
```bash
rm -rf node_modules package-lock.json
npm install
```

### 캐시 문제
```bash
npm run clean
npm install
```

---

## 10. 추천 개발 워크플로우

1. **브랜치 생성**
   ```bash
   git checkout -b feature/새-기능
   ```

2. **코드 작성**
   - 컴포넌트 수정
   - 테스트 작성

3. **로컬 테스트**
   ```bash
   npm run test
   npm run test:e2e
   ```

4. **포맷팅**
   ```bash
   npm run lint:fix
   npm run format
   ```

5. **커밋**
   ```bash
   git add .
   git commit -m "feat: 새 기능 추가"
   ```

6. **푸시 및 PR**
   ```bash
   git push origin feature/새-기능
   ```
   GitHub에서 PR 생성

---

## 11. 외부 서비스 통합 (선택)

### Google Maps API
1. Google Cloud Console에서 API 활성화
2. API 키 발급
3. `.env.local`에 추가:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_KEY=YOUR_KEY
   ```

### Sentry (에러 추적)
1. sentry.io에서 프로젝트 생성
2. DSN 복사
3. `.env.local`에 추가:
   ```
   NEXT_PUBLIC_SENTRY_DSN=YOUR_DSN
   ```

---

## 12. 성능 최적화 팁

### 빌드 분석
```bash
npm run analyze
```

### 번들 크기 확인
```bash
npm run build
npm run size
```

### 성능 측정
```bash
npm run lighthouse
```
