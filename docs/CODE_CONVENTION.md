# 코딩 컨벤션 (Code Convention)

## 1. 파일 및 폴더 명명

### 폴더
- 소문자, 하이픈 구분
- `/app/tablet/stops` ✓
- `/components/tablet/tablet-nav` ✓
- `/lib/tablet-portal-sync` ✓

### 파일
- 컴포넌트: PascalCase (`Button.tsx`, `UserCard.tsx`)
- 유틸리티: camelCase (`utils.ts`, `helpers.ts`)
- 상수: UPPER_CASE (`COLORS.ts`, `CONFIG.ts`)

### 폴더 구조
```
src/
├── app/              # Next.js 페이지
├── components/       # React 컴포넌트
├── lib/             # 유틸리티, 함수
├── hooks/           # Custom Hooks
├── types/           # TypeScript 타입
└── styles/          # 글로벌 스타일
```

---

## 2. TypeScript 규칙

### 인터페이스
```typescript
// ✓ 좋음
interface UserProfile {
  id: string;
  name: string;
  email: string;
}

type UserStatus = 'active' | 'inactive' | 'suspended';
```

### 타입 정의
```typescript
// ✓ 좋음 - 명시적 타입
const users: UserProfile[] = [];
function getUser(id: string): UserProfile | null {
  // ...
}

// ✗ 나쁨 - any 사용 금지
const users: any = [];
```

### 제네릭
```typescript
// ✓ 좋음
function getOrDefault<T>(value: T | undefined, defaultValue: T): T {
  return value ?? defaultValue;
}

// ✗ 나쁨 - 제약 없음
function getOrDefault(value, defaultValue) {
  return value ?? defaultValue;
}
```

---

## 3. React 컴포넌트

### 함수형 컴포넌트
```typescript
// ✓ 좋음
export function UserCard({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    loadUser(userId);
  }, [userId]);

  if (!user) return <div>로딩 중...</div>;

  return (
    <div className="user-card">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

// ✗ 나쁨 - Props 타입 명시 없음
export function UserCard(props) {
  // ...
}
```

### Props 구조
```typescript
// ✓ 좋음 - 구조분해
function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return <button onClick={onClick}>{label}</button>;
}

// ✗ 나쁨 - Props 전체 전달
function Button(props: ButtonProps) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### Custom Hooks
```typescript
// ✓ 좋음 - use 접두사
export function useUserData(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId)
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [userId]);

  return { user, loading, error };
}
```

---

## 4. 함수 및 메서드

### 명명
```typescript
// ✓ 좋음 - 동사로 시작
function fetchUsers() { }
function getUserById(id: string) { }
function isValidEmail(email: string) { }
function hasPermission(role: string) { }

// ✗ 나쁨
function users() { }
function user(id: string) { }
function emailValid(email: string) { }
```

### 길이
- 최대 80줄 권장
- 더 길면 함수 분리 고려

### 매개변수
```typescript
// ✓ 좋음 - 3개 이하
function createUser(name: string, email: string, role: string) { }

// ✗ 나쁨 - 많은 매개변수
function createUser(name, email, role, dept, manager, active, ...) { }

// ✓ 좋음 - 객체로 변경
function createUser(params: CreateUserParams) { }
```

---

## 5. 변수 명명

### camelCase
```typescript
// ✓ 좋음
const userName = 'John Doe';
const isActive = true;
const userCount = 10;

// ✗ 나쁨
const user_name = 'John Doe';
const UserName = 'John Doe';
const USENAME = 'John Doe';
```

### 명확한 이름
```typescript
// ✓ 좋음
const isUserAuthenticated = true;
const maxRetryCount = 3;
const usersByStatus = new Map();

// ✗ 나쁨
const u = true;
const max = 3;
const data = new Map();
```

---

## 6. 클래스

### 메서드 순서
```typescript
class User {
  // 프로퍼티
  private id: string;
  private name: string;

  // 생성자
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  // Getters
  getId(): string {
    return this.id;
  }

  // Public 메서드
  public getName(): string {
    return this.name;
  }

  // Private 메서드
  private validate(): boolean {
    return this.name.length > 0;
  }
}
```

---

## 7. 주석

### 필요한 주석
```typescript
// ✓ 좋음 - 왜(why)를 설명
// 사용자가 중복 요청을 피하기 위해 요청 중 버튼 비활성화
const [isSubmitting, setIsSubmitting] = useState(false);

// 파일 크기가 5MB를 초과하면 압축 필요
if (file.size > 5 * 1024 * 1024) {
  compressFile(file);
}
```

### 불필요한 주석
```typescript
// ✗ 나쁨 - 코드가 명확하면 불필요
// 이름을 출력한다
console.log(name);

// 사용자 배열에 새 사용자 추가
users.push(newUser);
```

---

## 8. 에러 처리

### try-catch
```typescript
// ✓ 좋음
try {
  const result = await fetchData();
  return result;
} catch (error) {
  console.error('데이터 조회 실패:', error);
  throw new Error('데이터를 조회할 수 없습니다.');
}

// ✗ 나쁨 - 에러 무시
try {
  const result = await fetchData();
  return result;
} catch (error) {
  // 무시
}
```

---

## 9. 테스트

### 테스트 명명
```typescript
describe('UserService', () => {
  it('should return user when ID is valid', () => {
    // Arrange
    const userId = '123';

    // Act
    const user = getUserById(userId);

    // Assert
    expect(user).toBeDefined();
    expect(user.id).toBe(userId);
  });
});
```

---

## 10. Import 순서

```typescript
// 1. 외부 라이브러리
import React, { useState } from 'react';
import { useRouter } from 'next/router';

// 2. 내부 절대 경로
import { Button } from '@/components/ui/button';
import { fetchUsers } from '@/lib/api';

// 3. 상대 경로
import { UserCard } from './user-card';
import { formatDate } from '../utils';

// 4. 스타일
import styles from './page.module.css';
```

---

## 11. 린트 및 포맷팅

### ESLint 규칙
```json
{
  "rules": {
    "no-var": "error",
    "prefer-const": "error",
    "no-console": "warn",
    "@typescript-eslint/explicit-function-return-types": "warn"
  }
}
```

### Prettier 설정
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

---

## 12. 체크리스트

- [ ] TypeScript 타입 명시
- [ ] 함수 최대 80줄
- [ ] 매개변수 3개 이하
- [ ] 명확한 변수명
- [ ] 필요한 주석만
- [ ] 에러 처리 구현
- [ ] 테스트 작성
- [ ] Lint 통과
