// ---------------------------------------------------------------------------
// Tablet i18n -- 한국어 용어 사전 (SSOT)
// 설치/구축 기업 및 유지보수 기업 공용 인터페이스
// ---------------------------------------------------------------------------

/**
 * Tablet 도메인 한글 용어 SSOT
 * - 설치 작업, 유지보수, 창고 관리, 철거/폐기 관련 모든 UI 텍스트
 * - 기업 유형별 권한 관련 라벨
 * - Outbox 동기화 상태 표시
 */
export const tabletKoKR = {
  // =========================================================================
  // 1. 대시보드
  // =========================================================================
  dashboard: {
    title: "현장 작업 대시보드",
    subtitle: "작업 현황을 한눈에 확인하세요",
    
    kpi: {
      todayWork: "오늘 작업",
      faultTerminals: "장애 단말",
      warehouseInventory: "창고 재고",
      pendingSync: "동기화 대기",
    },

    quickActions: {
      install: "설치 작업",
      maintenance: "유지보수",
      warehouse: "창고 관리",
      removal: "철거 작업",
    },

    alerts: {
      title: "긴급 알림",
      critical: "긴급",
      high: "높음",
      medium: "중간",
      low: "낮음",
      noAlerts: "알림 없음",
      viewAll: "전체 보기",
    },

    map: {
      title: "정류장 현황 지도",
      marker: {
        normal: "정상",
        caution: "주의",
        critical: "긴급",
        offline: "오프라인",
      },
      legend: "범례",
      zoom: "확대/축소",
    },
  },

  // =========================================================================
  // 2. 창고 관리
  // =========================================================================
  warehouse: {
    title: "창고 관리",
    
    inventory: {
      title: "재고 현황",
      total: "전체",
      available: "설치 가능",
      reserved: "예약됨",
      damaged: "손상",
      columnHeaders: {
        assetCode: "자산 코드",
        deviceModel: "단말 모델",
        manufacturer: "제조사",
        quantity: "수량",
        status: "상태",
        lastUpdated: "최종 수정",
      },
    },

    receiving: {
      title: "입고 처리",
      form: {
        supplier: "공급사",
        invoiceNumber: "송장 번호",
        quantity: "수량",
        inspectionStatus: "검수 상태",
        notes: "비고",
        takePhoto: "사진 촬영",
      },
      inspection: {
        passed: "검수 완료",
        failed: "검수 불가",
        pending: "검수 대기",
      },
      submit: "입고 완료",
      success: "입고 처리가 완료되었습니다",
    },

    dispatch: {
      title: "출고 처리",
      form: {
        sourceWarehouse: "출고 창고",
        destinationStop: "설치 정류장",
        assetCode: "자산 코드",
        quantity: "수량",
        workOrder: "작업 지시",
        notes: "비고",
      },
      submit: "출고 완료",
      success: "출고 처리가 완료되었습니다",
    },

    status: {
      inStock: "재고",
      reserved: "예약",
      installedField: "현장 설치",
      damageRepair: "손상 수리",
      disposal: "폐기 대기",
    },
  },

  // =========================================================================
  // 3. 설치 작업
  // =========================================================================
  install: {
    title: "설치 작업",
    
    list: {
      columnHeaders: {
        workOrder: "작업 지시",
        stop: "정류장",
        device: "단말",
        customer: "고객사",
        address: "주소",
        scheduled: "예정일",
        status: "상태",
      },
    },

    detail: {
      title: "설치 작업 상세",
      
      workOrder: {
        id: "작업 지시 ID",
        date: "지시일",
        manager: "담당자",
      },

      location: {
        stop: "정류장",
        address: "주소",
        coordinates: "좌표",
        coordinates_format: "위도: {lat}° / 경도: {lng}°",
      },

      device: {
        model: "단말 모델",
        serialNumber: "시리얼 번호",
        powerType: "전원 방식",
        powerTypeOptions: {
          GRID: "그리드 전원",
          SOLAR: "태양광",
        },
        assetCode: "자산 코드",
      },

      customer: {
        name: "고객사",
        contact: "담당자 연락처",
        phone: "연락처",
      },

      checklist: {
        title: "설치 체크리스트",
        powerOk: "전원 정상 작동",
        commOk: "통신 연결 정상",
        displayOk: "디스플레이 정상 작동",
        exteriorOk: "외부 상태 양호",
      },

      documents: {
        title: "문서",
        fieldNote: "현장 노트",
        photos: "사진",
        addPhoto: "사진 추가",
        removePhoto: "사진 삭제",
      },

      actions: {
        startInstall: "설치 시작",
        completeInstall: "설치 완료",
        cancelInstall: "설치 취소",
        saveProgress: "임시 저장",
      },

      status: {
        ASSIGNED: "배정됨",
        IN_PROGRESS: "진행 중",
        PENDING_APPROVAL: "승인 대기",
        APPROVED: "승인됨",
        REJECTED: "반려됨",
      },

      approval: {
        title: "승인 상태",
        notSubmitted: "미제출",
        submitted: "제출됨",
        approved: "승인",
        rejected: "반려",
        rejectionReason: "반려 사유",
      },
    },

    messages: {
      startSuccess: "설치를 시작했습니다",
      completeSuccess: "설치가 완료되었습니다. 동기화 대기 중입니다",
      cancelConfirm: "설치를 취소하시겠습니까? 저장하지 않은 데이터는 손실됩니다",
      validation: {
        checklistRequired: "모든 체크리스트 항목을 확인해주세요",
        photosRequired: "최소 1장의 사진이 필요합니다",
      },
    },
  },

  // =========================================================================
  // 4. 유지보수
  // =========================================================================
  maintenance: {
    title: "유지보수",
    
    list: {
      columnHeaders: {
        incident: "장애 ID",
        stop: "정류장",
        device: "단말",
        fault: "장애 내용",
        severity: "심각도",
        reportedAt: "보고 일시",
        status: "상태",
      },

      severity: {
        CRITICAL: "긴급",
        HIGH: "높음",
        MEDIUM: "중간",
        LOW: "낮음",
      },

      status: {
        OPEN: "미처리",
        IN_PROGRESS: "진행 중",
        RESOLVED: "해결됨",
        CLOSED: "종료",
      },
    },

    detail: {
      title: "유지보수 작업 상세",
      
      incident: {
        id: "장애 ID",
        reportedAt: "보고 일시",
        reportedBy: "보고자",
      },

      faultInfo: {
        title: "장애 정보",
        description: "설명",
        category: "카테고리",
        categories: {
          POWER: "전원 장애",
          COMMUNICATION: "통신 장애",
          DISPLAY: "디스플레이 장애",
          SENSOR: "센서 장애",
          SOFTWARE: "소프트웨어 오류",
          OTHER: "기타",
        },
        firstObserved: "최초 감지",
        lastObserved: "최종 감지",
      },

      actions: {
        title: "조치 내용",
        inspection: "점검",
        cleaning: "청소",
        adjustment: "조정",
        partsReplacement: "부품 교체",
        deviceReplacement: "단말 교체",
        other: "기타",
      },

      parts: {
        title: "부품 사용",
        partCode: "부품 코드",
        partName: "부품명",
        quantity: "수량",
        addPart: "부품 추가",
        removePart: "부품 제거",
      },

      documents: {
        title: "문서",
        completionNote: "완료 노트",
        photos: "사진",
        addPhoto: "사진 추가",
        removePhoto: "사진 삭제",
      },

      actions_button: {
        startMaintenance: "유지보수 시작",
        completeMaintenance: "유지보수 완료",
        cancelMaintenance: "유지보수 취소",
        saveProgress: "임시 저장",
      },

      approval: {
        title: "승인 상태",
        notSubmitted: "미제출",
        submitted: "제출됨",
        approved: "승인",
        rejected: "반려",
        rejectionReason: "반려 사유",
      },
    },

    messages: {
      startSuccess: "유지보수를 시작했습니다",
      completeSuccess: "유지보수가 완료되었습니다. 동기화 대기 중입니다",
      cancelConfirm: "유지보수를 취소하시겠습니까? 저장하지 않은 데이터는 손실됩니다",
      validation: {
        actionsRequired: "최소 1개의 조치를 선택해주세요",
        photosRequired: "최소 1장의 사진이 필요합니다",
      },
    },
  },

  // =========================================================================
  // 5. 철거/폐기
  // =========================================================================
  removal: {
    title: "철거 작업",
    
    list: {
      columnHeaders: {
        workOrder: "작업 지시",
        stop: "정류장",
        device: "단말",
        reason: "철거 사유",
        scheduled: "예정일",
        status: "상태",
      },
    },

    detail: {
      title: "철거 작업 상세",
      
      reason: {
        title: "철거 사유",
        END_OF_LIFE: "수명 만료",
        TECHNOLOGY_UPGRADE: "기술 개선",
        LOCATION_CHANGE: "위치 변경",
        CONTRACT_TERMINATION: "계약 종료",
        DAMAGE_REPAIR: "손상 수리",
        OTHER: "기타",
      },

      assetCondition: {
        title: "자산 상태",
        good: "양호",
        damaged: "손상",
        unusable: "사용 불가",
      },

      returnWarehouse: {
        title: "반납 창고",
        select: "창고 선택",
      },

      documents: {
        title: "문서",
        notes: "특이 사항",
        photos: "사진",
        addPhoto: "사진 추가",
        removePhoto: "사진 삭제",
      },

      actions_button: {
        startRemoval: "철거 시작",
        completeRemoval: "철거 완료",
        cancelRemoval: "철거 취소",
        saveProgress: "임시 저장",
      },

      approval: {
        title: "승인 상태",
        notSubmitted: "미제출",
        submitted: "제출됨",
        approved: "승인",
        rejected: "반려",
        rejectionReason: "반려 사유",
      },
    },

    disposal: {
      title: "폐기 처리",
      
      status: {
        PENDING: "폐기 대기",
        PROCESSING: "폐기 처리 중",
        COMPLETED: "폐기 완료",
      },

      form: {
        disposalDate: "폐기일",
        disposalMethod: "폐기 방법",
        disposalCompany: "폐기 업체",
        certificate: "폐기 증명서",
        uploadCertificate: "증명서 업로드",
      },

      actions_button: {
        requestDisposal: "폐기 신청",
        completeDisposal: "폐기 완료",
      },
    },

    messages: {
      startSuccess: "철거를 시작했습니다",
      completeSuccess: "철거가 완료되었습니다. 동기화 대기 중입니다",
      cancelConfirm: "철거를 취소하시겠습니까? 저장하지 않은 데이터는 손실됩니다",
      validation: {
        reasonRequired: "철거 사유를 선택해주세요",
        warehouseRequired: "반납 창고를 선택해주세요",
        photosRequired: "최소 1장의 사진이 필요합니다",
      },
    },
  },

  // =========================================================================
  // 6. 기업 권한/유형
  // =========================================================================
  company: {
    type: {
      INSTALLER: "설치/구축 기업",
      MAINTAINER: "유지보수 기업",
      BOTH: "통합 운영 기업",
    },

    permissions: {
      warehouseManagement: "창고 관리",
      receiving: "입고 처리",
      dispatch: "출고 처리",
      installWork: "설치 작업",
      maintenanceWork: "유지보수 작업",
      removalWork: "철거 작업",
      disposalProcess: "폐기 처리",
      inventoryView: "재고 조회",
      reportView: "보고서 조회",
    },

    accessDenied: "이 기능에 접근할 권한이 없습니다",
    accessDeniedDetail: "({company}) 기업은 {permission} 기능을 사용할 수 없습니다",
  },

  // =========================================================================
  // 7. Outbox 동기화
  // =========================================================================
  outbox: {
    title: "동기화 관리",
    
    status: {
      LOCAL_SAVED: "로컬 저장",
      QUEUED: "대기 중",
      SENDING: "전송 중",
      COMPLETED: "완료",
      FAILED: "실패",
      NETWORK_ERROR: "네트워크 오류",
      AUTO_RETRYING: "자동 재시도",
    },

    type: {
      INSTALL: "설치 완료",
      MAINTENANCE: "유지보수 완료",
      REPLACEMENT: "교체 완료",
      REMOVAL: "철거 완료",
      RELOCATION: "이전 완료",
      INSPECTION: "점검 완료",
      DISPOSAL: "폐기 처리",
      RECEIVING: "입고 처리",
      DISPATCH: "출고 처리",
      ASSET_STATUS: "자산 상태 변경",
      ETC: "기타",
    },

    indicator: {
      syncTitle: "동기화 현황",
      pending: "동기화 대기 중",
      syncing: "동기화 중",
      synced: "동기화 완료",
      error: "동기화 오류",
      offline: "오프라인 상태",
      itemsWaiting: "건 대기 중",
      itemsSynced: "건 완료됨",
      retry: "재시도",
    },

    detail: {
      columnHeaders: {
        type: "유형",
        status: "상태",
        createdAt: "생성일시",
        lastAttempt: "마지막 시도",
        retryCount: "재시도 횟수",
        action: "작업",
      },

      itemDetail: {
        title: "동기화 항목 상세",
        businessKey: "업무 키",
        idempotencyKey: "중복제거 키",
        schemaVersion: "스키마 버전",
        createdAt: "생성일시",
        updatedAt: "수정일시",
        retryCount: "재시도 횟수",
        retryMax: "최대 재시도",
        lastError: "마지막 오류",
        eventLog: "이벤트 로그",
        payload: "페이로드",
      },

      actions: {
        retry: "재시도",
        delete: "삭제",
        retry_confirm: "이 항목을 재시도하시겠습니까?",
        delete_confirm: "이 항목을 삭제하시겠습니까? 삭제된 항목은 복구할 수 없습니다",
        retry_success: "재시도를 시작했습니다",
        delete_success: "항목이 삭제되었습니다",
      },
    },

    network: {
      online: "온라인",
      offline: "오프라인",
      checkConnection: "네트워크 연결을 확인해주세요",
      willSyncWhenOnline: "온라인 복구 시 자동으로 동기화됩니다",
    },

    banner: {
      offlineMode: "오프라인 상태입니다. 완료된 작업은 온라인 복구 시 자동으로 전송됩니다",
      syncInProgress: "동기화 진행 중 ({count}건)",
      syncError: "동기화 오류 - 네트워크 연결을 확인해주세요",
      syncComplete: "동기화 완료",
    },
  },

  // =========================================================================
  // 8. 공통 UI
  // =========================================================================
  common: {
    action: {
      save: "저장",
      cancel: "취소",
      delete: "삭제",
      edit: "수정",
      create: "등록",
      search: "검색",
      filter: "필터",
      reset: "초기화",
      export: "내보내기",
      import: "불러오기",
      confirm: "확인",
      close: "닫기",
      back: "이전",
      next: "다음",
      apply: "적용",
      refresh: "새로고침",
      submit: "제출",
      approve: "승인",
      reject: "반려",
      download: "다운로드",
      upload: "업로드",
      add: "추가",
      remove: "제거",
      view: "보기",
      detail: "상세",
    },

    status: {
      active: "활성",
      inactive: "비활성",
      pending: "대기",
      approved: "승인",
      rejected: "반려",
      draft: "초안",
      published: "게시됨",
      archived: "보관",
      processing: "처리 중",
      completed: "완료",
      failed: "실패",
      cancelled: "취소됨",
    },

    label: {
      name: "이름",
      description: "설명",
      type: "유형",
      status: "상태",
      createdAt: "등록일시",
      updatedAt: "수정일시",
      createdBy: "등록자",
      modifiedBy: "수정자",
      id: "ID",
      code: "코드",
      date: "날짜",
      time: "시간",
      phone: "연락처",
      email: "이메일",
      address: "주소",
      remarks: "비고",
      notes: "특이 사항",
    },

    unit: {
      count: "개",
      percent: "%",
      device: "대",
      stop: "개소",
      hour: "시간",
      minute: "분",
      second: "초",
      day: "일",
      km: "km",
      meter: "m",
    },

    empty: {
      noData: "데이터가 없습니다",
      noResult: "검색 결과가 없습니다",
      noSelection: "선택된 항목이 없습니다",
      noItems: "항목이 없습니다",
      loadingError: "데이터를 불러올 수 없습니다",
    },

    confirm: {
      delete: "정말 삭제하시겠습니까?",
      cancel: "변경 사항이 저장되지 않습니다. 취소하시겠습니까?",
      unsaved: "저장하지 않은 변경 사항이 있습니다.",
      submit: "제출하시겠습니까?",
      approve: "승인하시겠습니까?",
      reject: "반려하시겠습니까?",
    },

    error: {
      required: "필수 입력 항목입니다",
      invalid: "올바르지 않은 형식입니다",
      network: "네트워크 오류가 발생했습니다",
      server: "서버 오류가 발생했습니다",
      timeout: "요청 시간이 초과되었습니다",
      permission: "접근 권한이 없습니다",
      notFound: "요청한 데이터를 찾을 수 없습니다",
    },

    success: {
      saved: "저장되었습니다",
      updated: "수정되었습니다",
      deleted: "삭제되었습니다",
      created: "등록되었습니다",
      completed: "완료되었습니다",
    },

    loading: "로드 중...",
    searching: "검색 중...",
    sending: "전송 중...",
    processing: "처리 중...",
  },

  // =========================================================================
  // 9. 내비게이션
  // =========================================================================
  nav: {
    dashboard: "대시보드",
    workOrders: "작업 지시",
    map: "지도",
    devices: "단말 관리",
    stops: "정류장",
    reports: "작업 이력",
    warehouse: "창고 관리",
    install: "설치 작업",
    maintenance: "유지보수",
    removal: "철거 작업",
    outbox: "동기화",
    profile: "프로필",
    settings: "설정",
    logout: "로그아웃",
    back: "뒤로 가기",
    home: "홈",
  },
} as const;

export type TabletI18nKey = typeof tabletKoKR;

/**
 * 헬퍼 함수: 중첩 키로 값 조회
 * @example
 *   getTabletText(tabletKoKR, 'dashboard.title')
 *   // → "현장 작업 대시보드"
 */
export function getTabletText(obj: Record<string, any>, path: string): string {
  return path.split('.').reduce((current, prop) => current?.[prop], obj) ?? path;
}

/**
 * 헬퍼 함수: Outbox 타입 라벨 조회
 */
export type OutboxType = 
  | "INSTALL"
  | "MAINTENANCE"
  | "REPLACEMENT"
  | "REMOVAL"
  | "RELOCATION"
  | "INSPECTION"
  | "DISPOSAL"
  | "RECEIVING"
  | "DISPATCH"
  | "ASSET_STATUS"
  | "ETC";

export function getOutboxTypeLabel(type: OutboxType): string {
  return tabletKoKR.outbox.type[type as keyof typeof tabletKoKR.outbox.type] ?? type;
}

/**
 * 헬퍼 함수: 기업 유형 라벨 조회
 */
export type CompanyType = "INSTALLER" | "MAINTAINER" | "BOTH";

export function getCompanyTypeLabel(type: CompanyType): string {
  return tabletKoKR.company.type[type];
}
