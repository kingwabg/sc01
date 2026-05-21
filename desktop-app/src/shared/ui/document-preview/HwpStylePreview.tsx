type HwpStylePreviewProps = {
  html: string;
};

export function HwpStylePreview({ html }: HwpStylePreviewProps) {
  return (
    <div className="hwp-preview-shell">
      <div className="hwp-preview-body">
        <div className="hwp-preview-canvas">
          <div className="hwp-preview-page" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
      <div className="hwp-preview-status">
        <span>HTML 기반 보조 보기</span>
      </div>
    </div>
  );
}
