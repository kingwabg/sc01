import { useMemo, useState } from 'react';

type ProgramPlanActionIcon = 'file' | 'folder' | 'hash' | 'label';

const programPlanSamples = [
  {
    id: 'annual-plan',
    title: '연간 프로그램 계획',
    subtitle: '기초학습, 문화체험, 미술활동 연간 운영 흐름',
    meta: '2026',
    status: '기본',
    description: '연간 운영 방향, 월별 프로그램, 담당자 배치 기준을 한 번에 정리하는 계획입니다.'
  },
  {
    id: 'basic-learning',
    title: '기초학습 지도 계획',
    subtitle: '저학년 수학·국어 보충 / 주 2회',
    meta: '학기중',
    status: '작성중',
    description: '참여 아동별 학습 수준과 보충 과제를 운영일지 업무내용과 연결할 예정입니다.'
  },
  {
    id: 'fun-art',
    title: 'FUN FUN 미술프로그램',
    subtitle: '창의미술 / 담당 김성은 / 고학년 중심',
    meta: '방학중',
    status: '검토',
    description: '프로그램 계획, 일지, 평가까지 이어지는 대표 샘플 계획입니다.'
  },
  {
    id: 'sports-play',
    title: '신체활동 프로그램',
    subtitle: '실내 놀이·체육 / 안전지도 포함',
    meta: '월간',
    status: '초안',
    description: '하절기와 동절기 활동 제한을 고려해 대체 활동까지 함께 관리합니다.'
  }
];

const programPlanQuickActions: Array<{
  icon: ProgramPlanActionIcon;
  label: string;
  helper: string;
}> = [
  { icon: 'file', label: '새 계획서 만들기', helper: '프로그램명, 목표, 대상, 일정 입력' },
  { icon: 'folder', label: '새 분류 만들기', helper: '방학중, 학기중, 특화사업 그룹화' },
  { icon: 'hash', label: '태그 추가', helper: '기초학습, 미술, 체육 같은 검색 태그' },
  { icon: 'label', label: '라벨 추가', helper: '진행중, 평가필요, 제출완료 상태 표시' }
];

function ProgramSearchIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ProgramFolderIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function ProgramFilePlusIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ProgramFolderPlusIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function ProgramHashIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  );
}

function ProgramTagIcon() {
  return (
    <svg className="program-command-icon" fill="none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function ProgramActionIcon({ icon }: { icon: ProgramPlanActionIcon }) {
  if (icon === 'folder') return <ProgramFolderPlusIcon />;
  if (icon === 'hash') return <ProgramHashIcon />;
  if (icon === 'label') return <ProgramTagIcon />;
  return <ProgramFilePlusIcon />;
}

export function ProgramPlansPage() {
  const [query, setQuery] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState(programPlanSamples[0].id);

  const filteredPlans = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return programPlanSamples;
    return programPlanSamples.filter((plan) => (
      `${plan.title} ${plan.subtitle} ${plan.meta} ${plan.status}`.toLowerCase().includes(normalized)
    ));
  }, [query]);

  const selectedPlan = programPlanSamples.find((plan) => plan.id === selectedPlanId) || filteredPlans[0] || programPlanSamples[0];

  return (
    <section className="program-plans-workspace">
      <div className="program-command-card">
        <div className="program-search-row">
          <ProgramSearchIcon />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="프로그램 계획 검색..."
          />
        </div>

        <div className="program-command-section">
          <div className="program-section-title">최근 계획</div>
          <div className="program-command-list">
            {filteredPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={`program-command-item ${selectedPlan.id === plan.id ? 'active' : ''}`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <ProgramFolderIcon />
                <span>
                  <strong>{plan.title}</strong>
                  <em>{plan.subtitle}</em>
                </span>
                <small>{plan.meta}</small>
              </button>
            ))}
            {!filteredPlans.length && (
              <div className="program-empty-command">검색 결과가 없습니다.</div>
            )}
          </div>
        </div>

        <div className="program-command-section">
          <div className="program-section-title">빠른 작업</div>
          <div className="program-command-list">
            {programPlanQuickActions.map((action) => (
              <button key={action.label} type="button" className="program-command-item action">
                <ProgramActionIcon icon={action.icon} />
                <span>
                  <strong>{action.label}</strong>
                  <em>{action.helper}</em>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel program-plan-detail-panel">
        <span className="eyebrow">프로그램 계획</span>
        <div className="program-detail-head">
          <div>
            <h2>{selectedPlan.title}</h2>
            <p>{selectedPlan.description}</p>
          </div>
          <span className="program-status-pill">{selectedPlan.status}</span>
        </div>
        <div className="program-plan-metrics">
          <div>
            <span>분류</span>
            <strong>{selectedPlan.meta}</strong>
          </div>
          <div>
            <span>담당</span>
            <strong>미지정</strong>
          </div>
          <div>
            <span>연동</span>
            <strong>운영일지 준비</strong>
          </div>
        </div>
        <div className="program-plan-next">
          <strong>다음 연결</strong>
          <span>계획서 입력, 대상 아동, 담당자, 프로그램 일지, 평가 항목을 순서대로 붙이면 됩니다.</span>
        </div>
      </div>
    </section>
  );
}


