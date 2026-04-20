# 접근성 가이드 (Accessibility Guide)

## 1. WCAG 2.1 준수 기준

### 레벨 AA (권장)
- **인지 가능성**: 텍스트 대비도 4.5:1 이상
- **조작 가능성**: 터치 대상 최소 44x44px
- **이해 가능성**: 명확한 네비게이션
- **견고성**: 보조 기술 호환성

---

## 2. 색상 및 대비

### 텍스트 대비
```
배경(흰색 #FFF) + 텍스트(회색 #666) = 7:1 ✓
배경(흰색 #FFF) + 텍스트(파란색 #3B82F6) = 6:1 ✓
배경(파란색 #3B82F6) + 텍스트(흰색 #FFF) = 5.5:1 ✓
```

### 색상만으로 구분 금지
- ✗ "파란색은 성공, 빨간색은 오류"
- ✓ "✓ 성공 (초록색)", "✗ 오류 (빨간색)"

---

## 3. 키보드 네비게이션

### 포커스 순서
- Tab: 다음 요소로 이동
- Shift+Tab: 이전 요소로 이동
- Enter: 활성화
- Space: 토글

### 포커스 표시
```css
focus: outline 2px solid #3B82F6;
outline-offset: 2px;
```

---

## 4. 스크린 리더 지원

### ARIA 속성
```tsx
// Dialog
<Dialog>
  <DialogHeader>
    <DialogTitle>작업 상세</DialogTitle>
    <DialogDescription>
      선택한 작업의 상세 정보입니다.
    </DialogDescription>
  </DialogHeader>
</Dialog>

// 버튼
<button aria-label="지도 확대">+</button>

// 랜드마크
<main role="main">...</main>
<aside role="complementary">...</aside>
```

### 대체 텍스트
```tsx
// 이미지
<img src="logo.png" alt="BIS 로고" />

// 아이콘
<button aria-label="메뉴 열기">
  <MenuIcon />
</button>
```

---

## 5. 폼 접근성

### 레이블 연결
```tsx
<label htmlFor="email">이메일</label>
<input id="email" type="email" />
```

### 에러 메시지
```tsx
<input
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
<div id="email-error" role="alert">
  올바른 이메일 형식이 아닙니다.
</div>
```

---

## 6. 모바일 접근성

### 터치 대상 크기
- 최소: 44x44px
- 권장: 48x48px

### 제스처 대안
- 모든 제스처에 대체 방법 제공
- 예: 스와이프 → 버튼

---

## 7. 비디오 & 미디어

### 자막
- 모든 비디오에 폐쇄 자막 제공

### 오디오 설명
- 중요한 시각 정보에 음성 설명 추가

---

## 8. 테스트

### 자동 테스트
```bash
npm install axe-core
npm run test:a11y
```

### 수동 테스트
- [ ] 키보드만으로 모든 기능 접근 가능
- [ ] 스크린 리더에서 명확한 정보 전달
- [ ] 색상 대비도 4.5:1 이상
- [ ] 터치 대상 44x44px 이상

---

## 9. 체크리스트

- [ ] ARIA 속성 추가 (Dialog, 버튼)
- [ ] 대체 텍스트 (이미지, 아이콘)
- [ ] 포커스 표시 (outline)
- [ ] 키보드 네비게이션
- [ ] 색상 대비 검증
- [ ] 스크린 리더 테스트
- [ ] 터치 대상 크기 검증
- [ ] 폼 레이블 연결
