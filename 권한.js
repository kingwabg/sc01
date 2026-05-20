function onSelectionChange(e) {
  if (!e) return;

  const ss = e.source;
  const sheet = ss.getActiveSheet();
  const denySheet = ss.getSheetByName("권한없음");

  if (sheet.getName() === "관리자 시트" && denySheet) {
    ss.toast("관리자 시트 접근 감지");
    ss.setActiveSheet(denySheet);
  }
}
