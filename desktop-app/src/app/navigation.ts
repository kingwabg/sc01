export type ViewKey =
  | 'dashboard'
  | 'journalStats'
  | 'journalCreate'
  | 'journalPrint'
  | 'journalQuickEdit'
  | 'templateManager'
  | 'staffRoster'
  | 'nonStaffRoster'
  | 'children'
  | 'childAttendance'
  | 'programPlans'
  | 'programJournals'
  | 'programEvaluations'
  | 'import'
  | 'telegram'
  | 'settings'
  | 'export';

export interface MenuItem {
  key: ViewKey;
  label: string;
}

export const menuGroups: Array<{ title: string; items: MenuItem[] }> = [
  {
    title: '기본',
    items: [
      { key: 'dashboard', label: '대시보드' }
    ]
  },
  {
    title: '운영일지',
    items: [
      { key: 'journalPrint', label: '운영일지' },
      { key: 'templateManager', label: '템플릿 만들기' }
    ]
  },
  {
    title: '인력',
    items: [
      { key: 'staffRoster', label: '종사자 현황' },
      { key: 'nonStaffRoster', label: '비종사자 현황' }
    ]
  },
  {
    title: '아동',
    items: [
      { key: 'children', label: '아동 목록' },
      { key: 'childAttendance', label: '아동 출결대장' }
    ]
  },
  {
    title: '프로그램',
    items: [
      { key: 'programPlans', label: '프로그램 계획' },
      { key: 'programJournals', label: '프로그램 일지' },
      { key: 'programEvaluations', label: '프로그램 평가' }
    ]
  },
  {
    title: '관리',
    items: [
      { key: 'import', label: '초기 이관' },
      { key: 'telegram', label: '텔레그램' },
      { key: 'settings', label: '기본 설정' },
      { key: 'export', label: '내보내기' }
    ]
  }
];

export const flatMenu = menuGroups.flatMap((group) => group.items);

export const yearOptions = [2024, 2025, 2026];
