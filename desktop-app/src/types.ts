export type PersonKind = 'staff' | 'nonStaff';
export type AttendanceStatus = 'present' | 'leave' | 'absent' | 'official' | 'substitute';
export type ChildAttendanceStatus = 'present' | 'absent' | 'official' | 'substitute' | 'other';
export type SyncStatus = 'idle' | 'pending' | 'synced' | 'failed';

export interface Person {
  id: string;
  kind: PersonKind;
  name: string;
  role: string;
  category: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  email?: string;
  dutyText?: string;
}

export interface AttendanceEntry {
  id: string;
  personId: string;
  personKind: PersonKind;
  date: string;
  yearMonth: string;
  status: AttendanceStatus;
  memo?: string;
  syncedAt?: string;
}

export interface Child {
  id: string;
  name: string;
  gender: string;
  phone?: string;
  residentNo?: string;
  birthDate?: string;
  age?: string;
  school: string;
  grade: string;
  address?: string;
  useType?: string;
  incomeLevel?: string;
  guardianName?: string;
  guardianRelation?: string;
  familyType?: string;
  guardianContact?: string;
  vulnerableType?: string;
  status: string;
  joinedAt: string;
  leftAt?: string;
  manager?: string;
  kidsId?: string;
  memo?: string;
}

export interface ChildYearRecord {
  id: string;
  childId: string;
  year: number;
  name: string;
  gender: string;
  phone?: string;
  residentNo?: string;
  birthDate?: string;
  age?: string;
  school: string;
  grade: string;
  address?: string;
  useType?: string;
  incomeLevel?: string;
  guardianName?: string;
  guardianRelation?: string;
  familyType?: string;
  guardianContact?: string;
  vulnerableType?: string;
  status: string;
  joinedAt: string;
  leftAt?: string;
  manager?: string;
  kidsId?: string;
  memo?: string;
}

export interface ChildAttendanceEntry {
  id: string;
  childId: string;
  date: string;
  yearMonth: string;
  status: ChildAttendanceStatus;
  memo?: string;
  syncedAt?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  operatingHours: string;
  manager: string;
  capacity: number;
  enrolled: number;
  presentChildren: number;
  absentChildren: number;
  staffCount: number;
  teacherCount: number;
  publicServiceCount: number;
  otherVisitorCount: number;
  guidanceText?: string;
  staffText?: string;
  childText?: string;
  visitorText?: string;
  facilityText?: string;
  workText?: string;
  otherText?: string;
  syncStatus: SyncStatus;
}

export interface JournalTemplate {
  id: string;
  name: string;
  groupName: string;
  html: string;
  isDefault: boolean;
  updatedAt?: string;
}

export interface DashboardSnapshot {
  staff: Person[];
  nonStaff: Person[];
  children: Child[];
  childYearRecords: ChildYearRecord[];
  journals: JournalEntry[];
  attendance: AttendanceEntry[];
  childAttendance: ChildAttendanceEntry[];
  attendanceCount: number;
  childAttendanceCount: number;
  unsyncedCount: number;
  settings: AppSettings;
}

export interface AppSettings {
  initialized: boolean;
  sourceSpreadsheetId: string;
  sourceSpreadsheetUrl: string;
  sourceWebAppUrl: string;
  importedAt: string;
  sourceMode: 'demo' | 'spreadsheet' | 'manual' | 'empty';
}

export interface InitialImportPayload {
  people?: Person[];
  attendance?: AttendanceEntry[];
  children?: Child[];
  childYearRecords?: ChildYearRecord[];
  childAttendance?: ChildAttendanceEntry[];
  journals?: JournalEntry[];
  sourceSpreadsheetId?: string;
  sourceSpreadsheetUrl?: string;
  exportedAt?: string;
  years?: number[];
}

export interface ImportSummary {
  peopleCount: number;
  staffCount: number;
  nonStaffCount: number;
  childCount: number;
  attendanceCount: number;
  childAttendanceCount: number;
  journalCount: number;
  importedAt: string;
  sourceMode: AppSettings['sourceMode'];
}
