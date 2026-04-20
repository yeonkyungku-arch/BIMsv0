# 서비스 소개서 (Service Overview)

## BIS (Bus Information System) - 정류장 종합 관리 솔루션

### 핵심 가치

**효율적인 정류장 관리 + 실시간 모니터링 + 현장 작업 지원**

---

## 서비스 개요

### 문제점
- 다수 정류장의 단말 관리 어려움
- 장애 대응 지연
- 작업 진행 상황 파악 곤란

### 해결책
- **Portal**: 종합 관리 시스템 (마스터 데이터, 작업 관리, 모니터링)
- **Tablet**: 현장 작업 앱 (작업 조회, 점검 기록, 재고 관리)

---

## 주요 기능

### Portal (웹)
1. **Registry**: 자산, 단말, 고객사, 정류장 마스터 관리
2. **Field-Ops**: 설치/유지보수 작업 관리
3. **RMS**: 단말 실시간 모니터링 + 원격 제어
4. **CMS**: 정류장 콘텐츠 관리
5. **Admin**: 사용자/권한/감사 로그 관리

### Tablet (모바일)
1. **대시보드**: 오늘/금주/긴급 작업 요약 (지도 연동)
2. **작업 지시**: 할당 작업 조회 및 상태 업데이트
3. **정류장**: 정류장 모니터링 + 점검 기록
4. **단말 현황**: 단말 실시간 상태 조회
5. **재고 관리**: 창고 입출고 기록

---

## 기술 스택

| 계층 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, Tailwind CSS |
| Backend | Node.js, Express (Vercel Functions) |
| Database | PostgreSQL / MongoDB |
| 인프라 | Vercel (배포), Google Maps API |
| 인증 | JWT / OAuth |

---

## 사용자 유형

| 역할 | 책임 |
|------|------|
| **관리자** | 시스템 관리, 권한 설정, 감사 |
| **운영자** | 작업 배정, 단말 모니터링 |
| **기술자** | 현장 점검, 설치, AS |
| **조회자** | 정보 조회만 |

---

## 배포 방식

- **Portal**: Vercel (https://yourdomain.com)
- **Tablet**: App Store / Google Play

---

## 라이선스

상용 소프트웨어 (계약 기반)

---

## 지원

- 이메일: support@company.com
- 전화: 02-XXXX-XXXX
