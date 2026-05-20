import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

const checks = [
  {
    label: 'RHWP source table move clamp',
    file: path.join(root, 'vendor', 'rhwp', 'rhwp-studio', 'src', 'engine', 'input-handler-table.ts'),
    optional: true,
    markers: [
      'function clampTableMoveDelta',
      'function clampTableResizeDelta',
      'function getPageContentBoundsPx',
      'const HWP_UNITS_PER_PAGE_PX = 75',
    ],
  },
  {
    label: 'Embedded RHWP bundle table move clamp',
    file: path.join(root, 'public', 'rhwp-studio', 'assets', 'index-DO4TqAjU.js'),
    markers: [
      'function __scClampTableMove',
      'function __scClampTableResize',
      '__SC_RHWP_PX_TO_HWP=75',
    ],
  },
  {
    label: 'Embedded RHWP cache version',
    file: path.join(root, 'public', 'rhwp-studio', 'index.html'),
    markers: ['seochang-session-native-10'],
  },
];

const failures = [];
const warnings = [];

for (const check of checks) {
  if (!fs.existsSync(check.file)) {
    const message = `${check.label}: 파일 없음 - ${path.relative(root, check.file)}`;
    if (check.optional) warnings.push(message);
    else failures.push(message);
    continue;
  }

  const text = fs.readFileSync(check.file, 'utf8');
  const missing = check.markers.filter((marker) => !text.includes(marker));
  if (missing.length) {
    failures.push(`${check.label}: 누락 - ${missing.join(', ')}`);
  }
}

if (failures.length) {
  console.error('RHWP 표 경계 가드 확인 실패');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('');
  console.error('표 이동/크기 조절이 편집용지 여백 밖으로 나가는 회귀를 막기 위해 이 가드는 필수입니다.');
  process.exit(1);
}

for (const warning of warnings) console.warn(`주의: ${warning}`);
console.log('RHWP 표 경계 가드 확인 완료');
