import type {
  AppSettings,
  AttendanceEntry,
  Child,
  ChildAttendanceEntry,
  DashboardSnapshot,
  ImportSummary,
  InitialImportPayload,
  JournalEntry,
  JournalTemplate,
  Person
} from '../types';
import { defaultJournalTemplateHtml } from './journalTemplates';
import { DB_URL, migrations } from './schema';

type BindValue = string | number | null;
type SqlRow = Record<string, unknown>;

interface DatabaseLike {
  execute(query: string, values?: BindValue[]): Promise<unknown>;
  select<T = SqlRow[]>(query: string, values?: BindValue[]): Promise<T>;
}

let databasePromise: Promise<DatabaseLike> | null = null;

const optionalChildColumns = [
  ['phone', 'TEXT NOT NULL DEFAULT ""'],
  ['resident_no', 'TEXT NOT NULL DEFAULT ""'],
  ['birth_date', 'TEXT NOT NULL DEFAULT ""'],
  ['age', 'TEXT NOT NULL DEFAULT ""'],
  ['address', 'TEXT NOT NULL DEFAULT ""'],
  ['use_type', 'TEXT NOT NULL DEFAULT ""'],
  ['income_level', 'TEXT NOT NULL DEFAULT ""'],
  ['guardian_name', 'TEXT NOT NULL DEFAULT ""'],
  ['guardian_relation', 'TEXT NOT NULL DEFAULT ""'],
  ['family_type', 'TEXT NOT NULL DEFAULT ""'],
  ['guardian_contact', 'TEXT NOT NULL DEFAULT ""'],
  ['manager', 'TEXT NOT NULL DEFAULT ""'],
  ['kids_id', 'TEXT NOT NULL DEFAULT ""']
] as const;

const optionalJournalColumns = [
  ['guidance_text', 'TEXT NOT NULL DEFAULT ""'],
  ['staff_text', 'TEXT NOT NULL DEFAULT ""'],
  ['child_text', 'TEXT NOT NULL DEFAULT ""'],
  ['visitor_text', 'TEXT NOT NULL DEFAULT ""'],
  ['facility_text', 'TEXT NOT NULL DEFAULT ""'],
  ['other_text', 'TEXT NOT NULL DEFAULT ""']
] as const;

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function getTauriDatabase(): Promise<DatabaseLike> {
  const sqlModule = await import('@tauri-apps/plugin-sql');
  return sqlModule.default.load(DB_URL) as Promise<DatabaseLike>;
}

function getBrowserFallbackDatabase(): DatabaseLike {
  const read = <T>(key: string, fallback: T): T => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) as T : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key: string, value: unknown) => {
    localStorage.setItem(key, JSON.stringify(value));
  };
  return {
    async execute(query) {
      if (query.startsWith('seed:people')) {
        write('people', JSON.parse(query.slice('seed:people'.length)));
      }
      if (query.startsWith('seed:journals')) {
        write('journals', JSON.parse(query.slice('seed:journals'.length)));
      }
      if (query.startsWith('seed:children')) {
        write('children', JSON.parse(query.slice('seed:children'.length)));
      }
      if (query.startsWith('seed:childAttendance')) {
        write('child_attendance', JSON.parse(query.slice('seed:childAttendance'.length)));
      }
      if (query.startsWith('replace:people')) {
        write('people', JSON.parse(query.slice('replace:people'.length)));
      }
      if (query.startsWith('replace:attendance')) {
        write('attendance', JSON.parse(query.slice('replace:attendance'.length)));
      }
      if (query.startsWith('replace:children')) {
        write('children', JSON.parse(query.slice('replace:children'.length)));
      }
      if (query.startsWith('save:child')) {
        const child = JSON.parse(query.slice('save:child'.length)) as Child;
        const children = read<Child[]>('children', []);
        const next = [
          ...children.filter((item) => item.id !== child.id),
          child
        ].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        write('children', next);
      }
      if (query.startsWith('replace:childAttendance')) {
        write('child_attendance', JSON.parse(query.slice('replace:childAttendance'.length)));
      }
      if (query.startsWith('save:childAttendance')) {
        const incoming = JSON.parse(query.slice('save:childAttendance'.length)) as ChildAttendanceEntry[];
        const childAttendance = read<ChildAttendanceEntry[]>('child_attendance', []);
        const byKey = new Map<string, ChildAttendanceEntry>();
        childAttendance.forEach((item) => byKey.set(`${item.childId}__${item.date}`, item));
        incoming.forEach((item) => byKey.set(`${item.childId}__${item.date}`, item));
        write('child_attendance', Array.from(byKey.values()).sort((a, b) => b.date.localeCompare(a.date)));
      }
      if (query.startsWith('delete:childAttendance')) {
        const payload = JSON.parse(query.slice('delete:childAttendance'.length)) as { childId: string; date: string };
        const childAttendance = read<ChildAttendanceEntry[]>('child_attendance', []);
        write('child_attendance', childAttendance.filter((item) => item.childId !== payload.childId || item.date !== payload.date));
      }
      if (query.startsWith('replace:journals')) {
        write('journals', JSON.parse(query.slice('replace:journals'.length)));
      }
      if (query.startsWith('appendMissing:journals')) {
        const incoming = JSON.parse(query.slice('appendMissing:journals'.length)) as JournalEntry[];
        const journals = read<JournalEntry[]>('journals', []);
        const existingDates = new Set(journals.map((journal) => journal.date));
        const next = [
          ...journals,
          ...incoming.filter((journal) => journal.date && !existingDates.has(journal.date))
        ];
        write('journals', next);
      }
      if (query.startsWith('save:journal')) {
        const journal = JSON.parse(query.slice('save:journal'.length)) as JournalEntry;
        const journals = read<JournalEntry[]>('journals', []);
        const next = [
          ...journals.filter((item) => item.id !== journal.id && item.date !== journal.date),
          journal
        ].sort((a, b) => b.date.localeCompare(a.date));
        write('journals', next);
      }
      if (query.startsWith('setting:')) {
        const payload = JSON.parse(query.slice('setting:'.length)) as { key: string; value: string };
        const settings = read<Record<string, string>>('app_settings', {});
        settings[payload.key] = payload.value;
        write('app_settings', settings);
      }
      if (query.startsWith('template:')) {
        const payload = JSON.parse(query.slice('template:'.length)) as JournalTemplate;
        const templates = read<JournalTemplate[]>('journal_templates', []);
        const next = templates.filter((template) => template.id !== payload.id);
        if (payload.isDefault) {
          next.forEach((template) => {
            template.isDefault = false;
          });
        }
        next.push(payload);
        write('journal_templates', next);
      }
      return { rowsAffected: 1 };
    },
    async select<T>(query: string) {
      if (query.includes('FROM people')) return read<Person[]>('people', []) as T;
      if (query.includes('COUNT(*) AS count FROM child_attendance')) return [{ count: read<ChildAttendanceEntry[]>('child_attendance', []).length }] as T;
      if (query.includes('FROM child_attendance')) {
        const childAttendance = read<ChildAttendanceEntry[]>('child_attendance', []);
        return [...childAttendance].sort((a, b) => b.date.localeCompare(a.date)) as T;
      }
      if (query.includes('FROM children')) {
        const children = read<Child[]>('children', []);
        return [...children].sort((a, b) => a.name.localeCompare(b.name)) as T;
      }
      if (query.includes('FROM journals')) {
        const journals = read<JournalEntry[]>('journals', []);
        return [...journals].sort((a, b) => b.date.localeCompare(a.date)) as T;
      }
      if (query.includes('FROM journal_templates')) return read<JournalTemplate[]>('journal_templates', []) as T;
          if (query.includes('FROM app_settings')) {
        const settings = read<Record<string, string>>('app_settings', {});
        return Object.keys(settings).map((key) => ({ key, value: settings[key] })) as T;
      }
      if (query.includes('COUNT(*) AS count FROM attendance')) return [{ count: read<AttendanceEntry[]>('attendance', []).length }] as T;
      if (query.includes('FROM attendance')) {
        const attendance = read<AttendanceEntry[]>('attendance', []);
        return [...attendance].sort((a, b) => b.date.localeCompare(a.date)) as T;
      }
      return [] as T;
    }
  };
}

export async function getDatabase(): Promise<DatabaseLike> {
  if (!databasePromise) {
    databasePromise = isTauriRuntime() ? getTauriDatabase() : Promise.resolve(getBrowserFallbackDatabase());
  }
  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  if (isTauriRuntime()) {
    for (const migration of migrations) {
      await db.execute(migration);
    }
    const childColumnRows = await db.select<Array<{ name: string }>>('PRAGMA table_info(children)');
    const existingColumns = new Set(childColumnRows.map((row) => String(row.name)));
    for (const [columnName, columnType] of optionalChildColumns) {
      if (!existingColumns.has(columnName)) {
        await db.execute(`ALTER TABLE children ADD COLUMN ${columnName} ${columnType}`);
      }
    }
    const journalColumnRows = await db.select<Array<{ name: string }>>('PRAGMA table_info(journals)');
    const existingJournalColumns = new Set(journalColumnRows.map((row) => String(row.name)));
    for (const [columnName, columnType] of optionalJournalColumns) {
      if (!existingJournalColumns.has(columnName)) {
        await db.execute(`ALTER TABLE journals ADD COLUMN ${columnName} ${columnType}`);
      }
    }
  }
}

const defaultSettings: AppSettings = {
  initialized: false,
  sourceSpreadsheetId: '',
  sourceSpreadsheetUrl: '',
  sourceWebAppUrl: '',
  importedAt: '',
  sourceMode: 'empty'
};

function mapPerson(row: SqlRow): Person {
  return {
    id: String(row.id || ''),
    kind: row.kind === 'nonStaff' ? 'nonStaff' : 'staff',
    name: String(row.name || ''),
    role: String(row.role || ''),
    category: String(row.category || ''),
    status: String(row.status || ''),
    startedAt: String(row.started_at || row.startedAt || ''),
    endedAt: String(row.ended_at || row.endedAt || ''),
    email: String(row.email || ''),
    dutyText: String(row.duty_text || row.dutyText || '')
  };
}

function mapJournal(row: SqlRow): JournalEntry {
  return {
    id: String(row.id || ''),
    date: String(row.date || ''),
    operatingHours: String(row.operating_hours || row.operatingHours || ''),
    manager: String(row.manager || ''),
    capacity: Number(row.capacity || 0),
    enrolled: Number(row.enrolled || 0),
    presentChildren: Number(row.present_children || row.presentChildren || 0),
    absentChildren: Number(row.absent_children || row.absentChildren || 0),
    staffCount: Number(row.staff_count || row.staffCount || 0),
    teacherCount: Number(row.teacher_count || row.teacherCount || 0),
    publicServiceCount: Number(row.public_service_count || row.publicServiceCount || 0),
    otherVisitorCount: Number(row.other_visitor_count || row.otherVisitorCount || 0),
    guidanceText: String(row.guidance_text || row.guidanceText || ''),
    staffText: String(row.staff_text || row.staffText || ''),
    childText: String(row.child_text || row.childText || ''),
    visitorText: String(row.visitor_text || row.visitorText || ''),
    facilityText: String(row.facility_text || row.facilityText || ''),
    workText: String(row.work_text || row.workText || ''),
    otherText: String(row.other_text || row.otherText || ''),
    syncStatus: String(row.sync_status || row.syncStatus || 'pending') as JournalEntry['syncStatus']
  };
}

function mapAttendance(row: SqlRow): AttendanceEntry {
  return {
    id: String(row.id || ''),
    personId: String(row.person_id || row.personId || ''),
    personKind: row.person_kind === 'nonStaff' || row.personKind === 'nonStaff' ? 'nonStaff' : 'staff',
    date: String(row.date || ''),
    yearMonth: String(row.year_month || row.yearMonth || ''),
    status: String(row.status || 'present') as AttendanceEntry['status'],
    memo: String(row.memo || ''),
    syncedAt: String(row.synced_at || row.syncedAt || '')
  };
}

function mapChild(row: SqlRow): Child {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    gender: String(row.gender || ''),
    phone: String(row.phone || ''),
    residentNo: String(row.resident_no || row.residentNo || ''),
    birthDate: String(row.birth_date || row.birthDate || ''),
    age: String(row.age || ''),
    school: String(row.school || ''),
    grade: String(row.grade || ''),
    address: String(row.address || ''),
    useType: String(row.use_type || row.useType || ''),
    incomeLevel: String(row.income_level || row.incomeLevel || ''),
    guardianName: String(row.guardian_name || row.guardianName || ''),
    guardianRelation: String(row.guardian_relation || row.guardianRelation || ''),
    familyType: String(row.family_type || row.familyType || ''),
    guardianContact: String(row.guardian_contact || row.guardianContact || ''),
    vulnerableType: String(row.vulnerable_type || row.vulnerableType || ''),
    status: String(row.status || '재원'),
    joinedAt: String(row.joined_at || row.joinedAt || ''),
    leftAt: String(row.left_at || row.leftAt || ''),
    manager: String(row.manager || ''),
    kidsId: String(row.kids_id || row.kidsId || ''),
    memo: String(row.memo || '')
  };
}

function mapChildAttendance(row: SqlRow): ChildAttendanceEntry {
  return {
    id: String(row.id || ''),
    childId: String(row.child_id || row.childId || ''),
    date: String(row.date || ''),
    yearMonth: String(row.year_month || row.yearMonth || ''),
    status: String(row.status || 'present') as ChildAttendanceEntry['status'],
    memo: String(row.memo || ''),
    syncedAt: String(row.synced_at || row.syncedAt || '')
  };
}

function mapJournalTemplate(row: SqlRow): JournalTemplate {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    groupName: String(row.group_name || row.groupName || '일지'),
    html: String(row.html || ''),
    isDefault: Boolean(Number(row.is_default ?? row.isDefault ?? 0)),
    updatedAt: String(row.updated_at || row.updatedAt || '')
  };
}

function normalizeDate(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';
  const iso = text.match(/^(\d{4})[-./년\s]+(\d{1,2})[-./월\s]+(\d{1,2})/);
  if (!iso) return text;
  return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
}

function normalizePerson(input: Partial<Person>, index: number): Person {
  const kind = input.kind === 'nonStaff' ? 'nonStaff' : 'staff';
  const name = String(input.name || '').trim();
  const fallbackId = `${kind}-${name || `person-${index}`}`.replace(/\s+/g, '-');
  return {
    id: String(input.id || fallbackId),
    kind,
    name,
    role: String(input.role || ''),
    category: String(input.category || ''),
    status: String(input.status || (kind === 'staff' ? '재직' : '활동')),
    startedAt: normalizeDate(input.startedAt),
    endedAt: normalizeDate(input.endedAt),
    email: String(input.email || ''),
    dutyText: String(input.dutyText || '')
  };
}

function normalizeAttendance(input: Partial<AttendanceEntry>, index: number): AttendanceEntry {
  const date = normalizeDate(input.date);
  const personKind = input.personKind === 'nonStaff' ? 'nonStaff' : 'staff';
  const status = input.status || 'present';
  return {
    id: String(input.id || `attendance-${personKind}-${input.personId || index}-${date}`),
    personId: String(input.personId || ''),
    personKind,
    date,
    yearMonth: String(input.yearMonth || date.slice(0, 7)),
    status,
    memo: String(input.memo || ''),
    syncedAt: String(input.syncedAt || '')
  };
}

function normalizeChild(input: Partial<Child>, index: number): Child {
  const name = String(input.name || '').trim();
  return {
    id: String(input.id || `child-${name || index}`.replace(/\s+/g, '-')),
    name,
    gender: String(input.gender || ''),
    phone: String(input.phone || ''),
    residentNo: String(input.residentNo || ''),
    birthDate: normalizeDate(input.birthDate),
    age: String(input.age || ''),
    school: String(input.school || ''),
    grade: String(input.grade || ''),
    address: String(input.address || ''),
    useType: String(input.useType || ''),
    incomeLevel: String(input.incomeLevel || ''),
    guardianName: String(input.guardianName || ''),
    guardianRelation: String(input.guardianRelation || ''),
    familyType: String(input.familyType || ''),
    guardianContact: String(input.guardianContact || ''),
    vulnerableType: String(input.vulnerableType || ''),
    status: String(input.status || '재원'),
    joinedAt: normalizeDate(input.joinedAt),
    leftAt: normalizeDate(input.leftAt),
    manager: String(input.manager || ''),
    kidsId: String(input.kidsId || ''),
    memo: String(input.memo || '')
  };
}

const childColumnNames = [
  'id',
  'name',
  'gender',
  'phone',
  'resident_no',
  'birth_date',
  'age',
  'school',
  'grade',
  'address',
  'use_type',
  'income_level',
  'guardian_name',
  'guardian_relation',
  'family_type',
  'guardian_contact',
  'vulnerable_type',
  'status',
  'joined_at',
  'left_at',
  'manager',
  'kids_id',
  'memo'
];

const childInsertColumns = childColumnNames.join(', ');

const childInsertPlaceholders = Array.from({ length: 23 }, (_, index) => `$${index + 1}`).join(', ');

const childUpdateAssignments = childColumnNames
  .filter((columnName) => columnName !== 'id')
  .map((columnName) => `${columnName} = excluded.${columnName}`)
  .join(', ');

function childBindValues(child: Child): BindValue[] {
  return [
    child.id,
    child.name,
    child.gender,
    child.phone || '',
    child.residentNo || '',
    child.birthDate || '',
    child.age || '',
    child.school,
    child.grade,
    child.address || '',
    child.useType || '',
    child.incomeLevel || '',
    child.guardianName || '',
    child.guardianRelation || '',
    child.familyType || '',
    child.guardianContact || '',
    child.vulnerableType || '',
    child.status,
    child.joinedAt,
    child.leftAt || '',
    child.manager || '',
    child.kidsId || '',
    child.memo || ''
  ];
}

function normalizeChildAttendance(input: Partial<ChildAttendanceEntry>, index: number): ChildAttendanceEntry {
  const date = normalizeDate(input.date);
  const status = input.status || 'present';
  return {
    id: String(input.id || `child-attendance-${input.childId || index}-${date}`),
    childId: String(input.childId || ''),
    date,
    yearMonth: String(input.yearMonth || date.slice(0, 7)),
    status,
    memo: String(input.memo || ''),
    syncedAt: String(input.syncedAt || '')
  };
}

function normalizeChildNameKey(value: unknown) {
  return String(value || '').replace(/\s+/g, '').toLowerCase();
}

function stableChildId(name: string) {
  return `child-${String(name || 'unknown')
    .replace(/\s+/g, '')
    .replace(/[^\w가-힣-]/g, '')}`;
}

function childFillScore(child: Child) {
  return [
    child.gender,
    child.phone,
    child.residentNo,
    child.birthDate,
    child.age,
    child.school,
    child.grade,
    child.address,
    child.useType,
    child.incomeLevel,
    child.guardianName,
    child.guardianRelation,
    child.familyType,
    child.guardianContact,
    child.vulnerableType,
    child.joinedAt,
    child.leftAt,
    child.manager,
    child.kidsId,
    child.memo
  ].filter((value) => String(value || '').trim()).length;
}

function mergeChildRecord(base: Child, incoming: Child): Child {
  const primary = childFillScore(incoming) > childFillScore(base) ? incoming : base;
  const secondary = primary === incoming ? base : incoming;
  const next: Child = { ...primary };
  const fillKeys: Array<keyof Child> = [
    'gender',
    'phone',
    'residentNo',
    'birthDate',
    'age',
    'school',
    'grade',
    'address',
    'useType',
    'incomeLevel',
    'guardianName',
    'guardianRelation',
    'familyType',
    'guardianContact',
    'vulnerableType',
    'manager',
    'kidsId',
    'memo'
  ];
  fillKeys.forEach((key) => {
    if (!String(next[key] || '').trim() && String(secondary[key] || '').trim()) {
      (next as unknown as Record<string, unknown>)[key] = secondary[key];
    }
  });
  if (incoming.joinedAt && (!next.joinedAt || incoming.joinedAt < next.joinedAt)) {
    next.joinedAt = incoming.joinedAt;
  }
  if (base.status === '재원' && childFillScore(base) > 6) {
    next.status = '재원';
    next.leftAt = '';
  } else if (incoming.status === '재원' && childFillScore(incoming) > 6) {
    next.status = '재원';
    next.leftAt = '';
  } else if (base.status === '퇴소' || incoming.status === '퇴소') {
    next.status = '퇴소';
    next.leftAt = incoming.leftAt || base.leftAt || next.leftAt || '';
  } else if (base.status === '대기' || incoming.status === '대기') {
    next.status = '대기';
    next.leftAt = '';
  } else {
    next.status = next.status || incoming.status || base.status || '재원';
    next.leftAt = incoming.leftAt || base.leftAt || next.leftAt || '';
  }
  next.id = stableChildId(next.name);
  return next;
}

function dedupeChildrenAndAttendance(
  children: Child[],
  childAttendance: ChildAttendanceEntry[]
): { children: Child[]; childAttendance: ChildAttendanceEntry[]; idMap: Record<string, string> } {
  const groups = new Map<string, { child: Child; oldIds: string[] }>();
  const idMap: Record<string, string> = {};

  children.forEach((child) => {
    const key = normalizeChildNameKey(child.name);
    if (!key) return;
    const nextChild = { ...child, id: stableChildId(child.name) };
    const existing = groups.get(key);
    if (existing) {
      existing.child = mergeChildRecord(existing.child, nextChild);
      existing.oldIds.push(child.id);
    } else {
      groups.set(key, { child: nextChild, oldIds: [child.id] });
    }
  });

  const dedupedChildren = Array.from(groups.values())
    .map((group) => {
      group.child.id = stableChildId(group.child.name);
      group.oldIds.forEach((oldId) => {
        idMap[oldId] = group.child.id;
      });
      return group.child;
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'ko'));

  const seenAttendance = new Set<string>();
  const dedupedAttendance = childAttendance
    .map((item) => {
      const nextChildId = idMap[item.childId] || item.childId;
      const nextDate = normalizeDate(item.date);
      return {
        ...item,
        childId: nextChildId,
        date: nextDate,
        yearMonth: item.yearMonth || nextDate.slice(0, 7),
        id: `child-attendance-${nextChildId}-${nextDate}`
      };
    })
    .filter((item) => {
      if (!item.childId || !item.date) return false;
      const key = `${item.childId}|${item.date}`;
      if (seenAttendance.has(key)) return false;
      seenAttendance.add(key);
      return true;
    });

  return { children: dedupedChildren, childAttendance: dedupedAttendance, idMap };
}

function normalizeJournal(input: Partial<JournalEntry>, index: number): JournalEntry {
  const date = normalizeDate(input.date);
  return {
    id: String(input.id || `journal-${date || index}`),
    date,
    operatingHours: String(input.operatingHours || ''),
    manager: String(input.manager || ''),
    capacity: Number(input.capacity || 35),
    enrolled: Number(input.enrolled || 0),
    presentChildren: Number(input.presentChildren || 0),
    absentChildren: Number(input.absentChildren || 0),
    staffCount: Number(input.staffCount || 0),
    teacherCount: Number(input.teacherCount || 0),
    publicServiceCount: Number(input.publicServiceCount || 0),
    otherVisitorCount: Number(input.otherVisitorCount || 0),
    guidanceText: String(input.guidanceText || ''),
    staffText: String(input.staffText || ''),
    childText: String(input.childText || ''),
    visitorText: String(input.visitorText || ''),
    facilityText: String(input.facilityText || ''),
    workText: String(input.workText || ''),
    otherText: String(input.otherText || ''),
    syncStatus: input.syncStatus || 'pending'
  };
}

const journalInsertColumns = [
  'id',
  'date',
  'operating_hours',
  'manager',
  'capacity',
  'enrolled',
  'present_children',
  'absent_children',
  'staff_count',
  'teacher_count',
  'public_service_count',
  'other_visitor_count',
  'guidance_text',
  'staff_text',
  'child_text',
  'visitor_text',
  'facility_text',
  'work_text',
  'other_text',
  'sync_status'
].join(', ');

const journalInsertPlaceholders = Array.from({ length: 20 }, (_, index) => `$${index + 1}`).join(', ');

const journalUpdateAssignments = [
  'date = excluded.date',
  'operating_hours = excluded.operating_hours',
  'manager = excluded.manager',
  'capacity = excluded.capacity',
  'enrolled = excluded.enrolled',
  'present_children = excluded.present_children',
  'absent_children = excluded.absent_children',
  'staff_count = excluded.staff_count',
  'teacher_count = excluded.teacher_count',
  'public_service_count = excluded.public_service_count',
  'other_visitor_count = excluded.other_visitor_count',
  'guidance_text = excluded.guidance_text',
  'staff_text = excluded.staff_text',
  'child_text = excluded.child_text',
  'visitor_text = excluded.visitor_text',
  'facility_text = excluded.facility_text',
  'work_text = excluded.work_text',
  'other_text = excluded.other_text',
  'updated_at = CURRENT_TIMESTAMP',
  'sync_status = excluded.sync_status'
].join(', ');

function journalBindValues(journal: JournalEntry, syncStatus = journal.syncStatus || 'pending'): BindValue[] {
  return [
    journal.id,
    journal.date,
    journal.operatingHours,
    journal.manager,
    journal.capacity,
    journal.enrolled,
    journal.presentChildren,
    journal.absentChildren,
    journal.staffCount,
    journal.teacherCount,
    journal.publicServiceCount,
    journal.otherVisitorCount,
    journal.guidanceText || '',
    journal.staffText || '',
    journal.childText || '',
    journal.visitorText || '',
    journal.facilityText || '',
    journal.workText || '',
    journal.otherText || '',
    syncStatus
  ];
}

async function setSetting(key: string, value: string) {
  const db = await getDatabase();
  if (isTauriRuntime()) {
    await db.execute(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
  } else {
    await db.execute('setting:' + JSON.stringify({ key, value }));
  }
}

async function ensureDefaultJournalTemplate() {
  await initializeDatabase();
  const db = await getDatabase();
  const existing = await db.select<SqlRow[]>('SELECT * FROM journal_templates');
  if (existing.length) return;
  const defaultTemplate: JournalTemplate = {
    id: 'default-daily-journal',
    name: '기본 운영일지',
    groupName: '일지',
    html: defaultJournalTemplateHtml,
    isDefault: true
  };
  await saveJournalTemplate(defaultTemplate);
}

export async function loadAppSettings(): Promise<AppSettings> {
  await initializeDatabase();
  const db = await getDatabase();
  const rows = await db.select<Array<{ key: string; value: string }>>('SELECT key, value FROM app_settings');
  const lookup = rows.reduce<Record<string, string>>((acc, row) => {
    acc[String(row.key)] = String(row.value || '');
    return acc;
  }, {});
  return {
    initialized: lookup.initialized === 'true',
    sourceSpreadsheetId: lookup.sourceSpreadsheetId || '',
    sourceSpreadsheetUrl: lookup.sourceSpreadsheetUrl || '',
    sourceWebAppUrl: lookup.sourceWebAppUrl || '',
    importedAt: lookup.importedAt || '',
    sourceMode: (lookup.sourceMode as AppSettings['sourceMode']) || 'empty'
  };
}

export async function seedDemoDataIfEmpty() {
  const db = await getDatabase();
  const existing = await db.select<SqlRow[]>('SELECT * FROM people');
  if (existing.length) return;
  const settings = await loadAppSettings();
  if (settings.initialized) return;
  const staff: Person[] = [
    { id: 'staff-wang-sihyeong', kind: 'staff', name: '왕시형', role: '센터장', category: '사회복지사', status: '재직', startedAt: '2020-03-01' },
    { id: 'staff-wang-junha', kind: 'staff', name: '왕준하', role: '팀장', category: '사회복지사', status: '재직', startedAt: '2024-01-01' },
    { id: 'staff-choi-haeun', kind: 'staff', name: '최하은', role: '사회복지사', category: '사회복지사', status: '재직', startedAt: '2024-07-01' }
  ];
  const nonStaff: Person[] = [
    { id: 'nonstaff-kim-hongmae', kind: 'nonStaff', name: '김홍매', role: '기초학습(수)', category: '교사', status: '활동', startedAt: '2026-01-02', dutyText: '수학 기초학습 지도' },
    { id: 'nonstaff-no-jihyeon', kind: 'nonStaff', name: '노지현', role: '사회복무요원', category: '공익', status: '활동', startedAt: '2026-01-02', dutyText: '등원 아동 발열 체크 및 환경 정리' }
  ];
  const journals: JournalEntry[] = [
    { id: 'journal-2026-01-02', date: '2026-01-02', operatingHours: '09:00 ~ 18:00 (방학중)', manager: '윤희빈', capacity: 35, enrolled: 34, presentChildren: 28, absentChildren: 6, staffCount: 2, teacherCount: 1, publicServiceCount: 1, otherVisitorCount: 0, workText: '* [기초학습(수) 김홍매] 수학 기초학습 지도', syncStatus: 'pending' }
  ];
  const children: Child[] = [
    { id: 'child-kim-hana', name: '김하나', gender: '여', school: '대운초', grade: '초등 2', vulnerableType: '일반', status: '재원', joinedAt: '2026-01-02' },
    { id: 'child-guk-huiseon', name: '국희선', gender: '남', school: '대운초', grade: '초등 3', vulnerableType: '일반', status: '재원', joinedAt: '2026-01-02' },
    { id: 'child-lee-sian', name: '이시안', gender: '남', school: '대운초', grade: '초등 3', vulnerableType: '일반', status: '재원', joinedAt: '2026-01-02' }
  ];
  const childAttendance: ChildAttendanceEntry[] = [
    { id: 'child-attendance-kim-hana-2026-01-02', childId: 'child-kim-hana', date: '2026-01-02', yearMonth: '2026-01', status: 'absent', memo: '감기 증상으로 결석' },
    { id: 'child-attendance-guk-huiseon-2026-01-02', childId: 'child-guk-huiseon', date: '2026-01-02', yearMonth: '2026-01', status: 'present' },
    { id: 'child-attendance-lee-sian-2026-01-02', childId: 'child-lee-sian', date: '2026-01-02', yearMonth: '2026-01', status: 'present' }
  ];
  if (isTauriRuntime()) {
    for (const person of [...staff, ...nonStaff]) {
      await db.execute(
        `INSERT INTO people (id, kind, name, role, category, status, started_at, ended_at, email, duty_text)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [person.id, person.kind, person.name, person.role, person.category, person.status, person.startedAt, person.endedAt || '', person.email || '', person.dutyText || '']
      );
    }
    for (const journal of journals) {
      await db.execute(
        `INSERT INTO journals (${journalInsertColumns})
         VALUES (${journalInsertPlaceholders})`,
        journalBindValues(journal)
      );
    }
    for (const child of children) {
      await db.execute(
        `INSERT INTO children (${childInsertColumns})
         VALUES (${childInsertPlaceholders})`,
        childBindValues(child)
      );
    }
    for (const item of childAttendance) {
      await db.execute(
        `INSERT OR REPLACE INTO child_attendance (id, child_id, date, year_month, status, memo, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [item.id, item.childId, item.date, item.yearMonth, item.status, item.memo || '', item.syncedAt || 'demo']
      );
    }
  } else {
    await db.execute('seed:people' + JSON.stringify([...staff, ...nonStaff]));
    await db.execute('seed:journals' + JSON.stringify(journals));
    await db.execute('seed:children' + JSON.stringify(children));
    await db.execute('seed:childAttendance' + JSON.stringify(childAttendance));
  }
  await setSetting('initialized', 'true');
  await setSetting('sourceMode', 'demo');
  await setSetting('importedAt', new Date().toISOString());
}

async function seedDemoChildrenIfEmpty() {
  const db = await getDatabase();
  const settings = await loadAppSettings();
  if (settings.sourceMode !== 'demo') return;
  const existing = await db.select<SqlRow[]>('SELECT * FROM children');
  if (existing.length) return;
  const children: Child[] = [
    { id: 'child-kim-hana', name: '김하나', gender: '여', school: '대운초', grade: '초등 2', vulnerableType: '일반', status: '재원', joinedAt: '2026-01-02' },
    { id: 'child-guk-huiseon', name: '국희선', gender: '남', school: '대운초', grade: '초등 3', vulnerableType: '일반', status: '재원', joinedAt: '2026-01-02' },
    { id: 'child-lee-sian', name: '이시안', gender: '남', school: '대운초', grade: '초등 3', vulnerableType: '일반', status: '재원', joinedAt: '2026-01-02' }
  ];
  const childAttendance: ChildAttendanceEntry[] = [
    { id: 'child-attendance-kim-hana-2026-01-02', childId: 'child-kim-hana', date: '2026-01-02', yearMonth: '2026-01', status: 'absent', memo: '감기 증상으로 결석' },
    { id: 'child-attendance-guk-huiseon-2026-01-02', childId: 'child-guk-huiseon', date: '2026-01-02', yearMonth: '2026-01', status: 'present' },
    { id: 'child-attendance-lee-sian-2026-01-02', childId: 'child-lee-sian', date: '2026-01-02', yearMonth: '2026-01', status: 'present' }
  ];
  if (isTauriRuntime()) {
    for (const child of children) {
      await db.execute(
        `INSERT INTO children (${childInsertColumns})
         VALUES (${childInsertPlaceholders})`,
        childBindValues(child)
      );
    }
    for (const item of childAttendance) {
      await db.execute(
        `INSERT OR REPLACE INTO child_attendance (id, child_id, date, year_month, status, memo, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [item.id, item.childId, item.date, item.yearMonth, item.status, item.memo || '', item.syncedAt || 'demo']
      );
    }
  } else {
    await db.execute('seed:children' + JSON.stringify(children));
    await db.execute('seed:childAttendance' + JSON.stringify(childAttendance));
  }
}

export async function replaceLocalDatabaseFromImport(
  payload: InitialImportPayload,
  sourceMode: AppSettings['sourceMode'],
  sourceWebAppUrl = ''
): Promise<ImportSummary> {
  await initializeDatabase();
  const db = await getDatabase();
  const people = (payload.people || []).map(normalizePerson).filter((person) => person.name);
  const attendance = (payload.attendance || []).map(normalizeAttendance).filter((item) => item.personId && item.date);
  const hasChildPayload = Array.isArray(payload.children) || Array.isArray(payload.childAttendance);
  const rawChildren = (payload.children || []).map(normalizeChild).filter((child) => child.name);
  const rawChildAttendance = (payload.childAttendance || []).map(normalizeChildAttendance).filter((item) => item.childId && item.date);
  const dedupedChildPayload = dedupeChildrenAndAttendance(rawChildren, rawChildAttendance);
  const children = dedupedChildPayload.children;
  const childAttendance = dedupedChildPayload.childAttendance;
  const journals = (payload.journals || []).map(normalizeJournal).filter((journal) => journal.date);

  if (isTauriRuntime()) {
    await db.execute('DELETE FROM attendance');
    await db.execute('DELETE FROM journals');
    await db.execute('DELETE FROM people');
    if (hasChildPayload) {
      await db.execute('DELETE FROM child_attendance');
      await db.execute('DELETE FROM children');
    }
    for (const person of people) {
      await db.execute(
        `INSERT INTO people (id, kind, name, role, category, status, started_at, ended_at, email, duty_text, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'synced')`,
        [person.id, person.kind, person.name, person.role, person.category, person.status, person.startedAt, person.endedAt || '', person.email || '', person.dutyText || '']
      );
    }
    for (const item of attendance) {
      await db.execute(
        `INSERT OR REPLACE INTO attendance (id, person_id, person_kind, date, year_month, status, memo, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [item.id, item.personId, item.personKind, item.date, item.yearMonth, item.status, item.memo || '', item.syncedAt || 'imported']
      );
    }
    if (hasChildPayload) {
      for (const child of children) {
        await db.execute(
          `INSERT INTO children (${childInsertColumns}, sync_status)
           VALUES (${childInsertPlaceholders}, 'synced')`,
          childBindValues(child)
        );
      }
      for (const item of childAttendance) {
        await db.execute(
          `INSERT OR REPLACE INTO child_attendance (id, child_id, date, year_month, status, memo, synced_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [item.id, item.childId, item.date, item.yearMonth, item.status, item.memo || '', item.syncedAt || 'imported']
        );
      }
    }
    for (const journal of journals) {
      await db.execute(
        `INSERT OR REPLACE INTO journals (${journalInsertColumns})
         VALUES (${journalInsertPlaceholders})`,
        journalBindValues(journal, 'synced')
      );
    }
  } else {
    await db.execute('replace:people' + JSON.stringify(people));
    await db.execute('replace:attendance' + JSON.stringify(attendance));
    if (hasChildPayload) {
      await db.execute('replace:children' + JSON.stringify(children));
      await db.execute('replace:childAttendance' + JSON.stringify(childAttendance));
    }
    await db.execute('replace:journals' + JSON.stringify(journals));
  }

  const importedAt = new Date().toISOString();
  await setSetting('initialized', 'true');
  await setSetting('sourceMode', sourceMode);
  await setSetting('importedAt', importedAt);
  await setSetting('sourceSpreadsheetId', payload.sourceSpreadsheetId || '');
  await setSetting('sourceSpreadsheetUrl', payload.sourceSpreadsheetUrl || '');
  await setSetting('sourceWebAppUrl', sourceWebAppUrl);

  return {
    peopleCount: people.length,
    staffCount: people.filter((person) => person.kind === 'staff').length,
    nonStaffCount: people.filter((person) => person.kind === 'nonStaff').length,
    childCount: children.length,
    attendanceCount: attendance.length,
    childAttendanceCount: childAttendance.length,
    journalCount: journals.length,
    importedAt,
    sourceMode
  };
}

export async function loadJournalTemplates(): Promise<JournalTemplate[]> {
  await initializeDatabase();
  await ensureDefaultJournalTemplate();
  const db = await getDatabase();
  return (await db.select<SqlRow[]>('SELECT * FROM journal_templates ORDER BY is_default DESC, group_name, name')).map(mapJournalTemplate);
}

export async function saveJournalTemplate(template: JournalTemplate): Promise<void> {
  await initializeDatabase();
  const db = await getDatabase();
  const next: JournalTemplate = {
    ...template,
    id: template.id || `template-${Date.now()}`,
    name: template.name || '이름 없는 템플릿',
    groupName: template.groupName || '일지',
    html: template.html || defaultJournalTemplateHtml,
    isDefault: Boolean(template.isDefault)
  };
  if (isTauriRuntime()) {
    if (next.isDefault) {
      await db.execute('UPDATE journal_templates SET is_default = 0');
    }
    await db.execute(
      `INSERT INTO journal_templates (id, name, group_name, html, is_default, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         group_name = excluded.group_name,
         html = excluded.html,
         is_default = excluded.is_default,
         updated_at = CURRENT_TIMESTAMP`,
      [next.id, next.name, next.groupName, next.html, next.isDefault ? 1 : 0]
    );
  } else {
    await db.execute('template:' + JSON.stringify({ ...next, updatedAt: new Date().toISOString() }));
  }
}

export async function saveGeneratedJournals(journals: JournalEntry[]): Promise<{ created: number }> {
  await initializeDatabase();
  const db = await getDatabase();
  const rows = journals
    .map(normalizeJournal)
    .filter((journal) => journal.date);
  if (!rows.length) return { created: 0 };

  if (isTauriRuntime()) {
    for (const journal of rows) {
      await db.execute(
        `INSERT OR IGNORE INTO journals (${journalInsertColumns})
         VALUES (${journalInsertPlaceholders})`,
        journalBindValues(journal, 'pending')
      );
    }
  } else {
    await db.execute('appendMissing:journals' + JSON.stringify(rows));
  }

  return { created: rows.length };
}

export async function saveJournalEntry(journal: JournalEntry): Promise<JournalEntry> {
  await initializeDatabase();
  const db = await getDatabase();
  const next = normalizeJournal({ ...journal, syncStatus: 'pending' }, 0);
  if (!next.date) {
    throw new Error('운영일지 일자는 비워둘 수 없습니다.');
  }

  if (isTauriRuntime()) {
    await db.execute(
      `INSERT INTO journals (${journalInsertColumns})
       VALUES (${journalInsertPlaceholders})
       ON CONFLICT(id) DO UPDATE SET ${journalUpdateAssignments}`,
      journalBindValues(next, 'pending')
    );
  } else {
    await db.execute('save:journal' + JSON.stringify(next));
  }

  return next;
}

export async function saveChildRecord(child: Child): Promise<Child> {
  await initializeDatabase();
  const db = await getDatabase();
  const next = normalizeChild(child, 0);
  if (!next.name.trim()) {
    throw new Error('아동 이름은 비워둘 수 없습니다.');
  }
  if (isTauriRuntime()) {
    await db.execute(
      `INSERT INTO children (${childInsertColumns}, sync_status)
       VALUES (${childInsertPlaceholders}, 'pending')
       ON CONFLICT(id) DO UPDATE SET
         ${childUpdateAssignments},
         updated_at = CURRENT_TIMESTAMP,
         sync_status = 'pending'`,
      childBindValues(next)
    );
  } else {
    await db.execute('save:child' + JSON.stringify(next));
  }
  return next;
}

export async function saveChildAttendanceEntries(entries: ChildAttendanceEntry[]): Promise<{ saved: number }> {
  await initializeDatabase();
  const db = await getDatabase();
  const rows = entries
    .map(normalizeChildAttendance)
    .filter((item) => item.childId && item.date);
  if (!rows.length) return { saved: 0 };

  if (isTauriRuntime()) {
    for (const item of rows) {
      await db.execute(
        `INSERT OR REPLACE INTO child_attendance (id, child_id, date, year_month, status, memo, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [item.id, item.childId, item.date, item.yearMonth, item.status, item.memo || '', item.syncedAt || 'local']
      );
    }
  } else {
    await db.execute('save:childAttendance' + JSON.stringify(rows));
  }

  return { saved: rows.length };
}

export async function deleteChildAttendanceEntry(childId: string, date: string): Promise<{ deleted: number }> {
  await initializeDatabase();
  const db = await getDatabase();
  if (!childId || !date) return { deleted: 0 };

  if (isTauriRuntime()) {
    await db.execute(
      'DELETE FROM child_attendance WHERE child_id = $1 AND date = $2',
      [childId, date]
    );
  } else {
    await db.execute('delete:childAttendance' + JSON.stringify({ childId, date }));
  }

  return { deleted: 1 };
}

export async function rebuildDedupedChildrenFromLocalData(): Promise<{ before: number; after: number; removed: number }> {
  await initializeDatabase();
  const db = await getDatabase();
  const existingChildren = (await db.select<SqlRow[]>('SELECT * FROM children ORDER BY joined_at, name')).map(mapChild);
  const existingChildAttendance = (await db.select<SqlRow[]>('SELECT * FROM child_attendance ORDER BY date')).map(mapChildAttendance);
  const deduped = dedupeChildrenAndAttendance(existingChildren, existingChildAttendance);

  if (isTauriRuntime()) {
    await db.execute('DELETE FROM child_attendance');
    await db.execute('DELETE FROM children');
    for (const child of deduped.children) {
      await db.execute(
        `INSERT INTO children (${childInsertColumns}, sync_status)
         VALUES (${childInsertPlaceholders}, 'synced')`,
        childBindValues(child)
      );
    }
    for (const item of deduped.childAttendance) {
      await db.execute(
        `INSERT OR REPLACE INTO child_attendance (id, child_id, date, year_month, status, memo, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [item.id, item.childId, item.date, item.yearMonth, item.status, item.memo || '', item.syncedAt || 'deduped']
      );
    }
  } else {
    await db.execute('replace:children' + JSON.stringify(deduped.children));
    await db.execute('replace:childAttendance' + JSON.stringify(deduped.childAttendance));
  }

  return {
    before: existingChildren.length,
    after: deduped.children.length,
    removed: Math.max(existingChildren.length - deduped.children.length, 0)
  };
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot> {
  await initializeDatabase();
  await seedDemoDataIfEmpty();
  await seedDemoChildrenIfEmpty();
  const db = await getDatabase();
  const people = (await db.select<SqlRow[]>('SELECT * FROM people ORDER BY kind, started_at, name')).map(mapPerson);
  const children = (await db.select<SqlRow[]>('SELECT * FROM children ORDER BY status, joined_at, name')).map(mapChild);
  const journals = (await db.select<SqlRow[]>('SELECT * FROM journals ORDER BY date DESC')).map(mapJournal);
  const attendance = (await db.select<SqlRow[]>('SELECT * FROM attendance ORDER BY date DESC')).map(mapAttendance);
  const childAttendance = (await db.select<SqlRow[]>('SELECT * FROM child_attendance ORDER BY date DESC')).map(mapChildAttendance);
  const attendanceRows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM attendance');
  const childAttendanceRows = await db.select<Array<{ count: number }>>('SELECT COUNT(*) AS count FROM child_attendance');
  return {
    staff: people.filter((person) => person.kind === 'staff'),
    nonStaff: people.filter((person) => person.kind === 'nonStaff'),
    children,
    journals,
    attendance,
    childAttendance,
    attendanceCount: Number(attendanceRows[0]?.count || 0),
    childAttendanceCount: Number(childAttendanceRows[0]?.count || 0),
    unsyncedCount: journals.filter((journal) => journal.syncStatus !== 'synced').length,
    settings: await loadAppSettings()
  };
}
