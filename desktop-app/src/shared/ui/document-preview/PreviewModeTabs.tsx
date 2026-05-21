export type DocumentPreviewMode = 'html' | 'htmlEdit' | 'rhwp';

type PreviewModeTabsProps = {
  editable?: boolean;
  onChange: (value: DocumentPreviewMode) => void;
  value: DocumentPreviewMode;
};

export function PreviewModeTabs({ value, onChange, editable = false }: PreviewModeTabsProps) {
  return (
    <div className="document-preview-tabs" role="tablist" aria-label="문서 미리보기 방식">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'html'}
        className={value === 'html' ? 'active' : ''}
        onClick={() => onChange('html')}
      >
        미리보기
      </button>
      {editable && (
        <button
          type="button"
          role="tab"
          aria-selected={value === 'htmlEdit'}
          className={value === 'htmlEdit' ? 'active' : ''}
          onClick={() => onChange('htmlEdit')}
        >
          문서 편집
        </button>
      )}
      <button
        type="button"
        role="tab"
        aria-selected={value === 'rhwp'}
        className={value === 'rhwp' ? 'active' : ''}
        onClick={() => onChange('rhwp')}
      >
        RHWP 보기
      </button>
    </div>
  );
}
