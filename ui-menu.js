function onOpen() {
  try {
    setupLogPrintMenu_();
    runOneTimeIntermediateCleanupOnOpen_();
  } catch (error) {
    Logger.log('onOpen menu setup failed: %s\n%s', error.message, error.stack || '');
    setupFallbackLogPrintMenu_();
  }
  try {
    warmStaffRosterDialogDataOnOpen_();
  } catch (error) {
    Logger.log('onOpen staff roster warmup failed: %s\n%s', error.message, error.stack || '');
  }
}

function setupLogPrintMenu_() {
  const ui = SpreadsheetApp.getUi();
  buildOperationsMenu_(ui).addToUi();
  buildStaffMenu_(ui).addToUi();
  buildTelegramMenu_(ui).addToUi();
  buildTemplateMenu_(ui).addToUi();
}

function setupFallbackLogPrintMenu_() {
  const ui = SpreadsheetApp.getUi();
  buildOperationsMenu_(ui, true).addToUi();
  buildStaffMenu_(ui).addToUi();
  buildTelegramMenu_(ui).addToUi();
  buildTemplateMenu_(ui).addToUi();
}

function rebuildLogPrintMenu() {
  setupLogPrintMenu_();
  SpreadsheetApp.getUi().alert('메뉴를 다시 만들었습니다. 스프레드시트를 새로고침하면 정상 메뉴로 보일 수 있습니다.');
}

function buildOperationsMenu_(ui, includeRebuildItem) {
  const menu = ui
    .createMenu('운영일지')
    .addItem(LOG_PRINT_CONFIG.ATTENDANCE_STATS_DIALOG_MENU_ITEM_NAME, 'showAttendanceStatsDialog')
    .addSeparator()
    .addItem('기본 설정', 'createAutomationSettingsSheet');

  if (includeRebuildItem) {
    menu
      .addSeparator()
      .addItem('메뉴 다시 만들기', 'rebuildLogPrintMenu');
  }
  return menu;
}

function buildStaffMenu_(ui) {
  const menu = ui
    .createMenu('종사자')
    .addItem('종사자 / 비종사자 현황', 'showStaffRosterDialog');

  if (canShowStaffRosterAdminMenu_()) {
    menu
      .addSeparator()
      .addItem('현재 계정을 전체 관리자로 지정', 'setCurrentUserAsStaffRosterAdmin')
      .addItem('비종사자 부관리자 이메일 지정', 'setNonStaffRosterManagerEmailPrompt')
      .addItem('현재 계정을 비종사자 부관리자로 지정', 'setCurrentUserAsNonStaffRosterManager')
      .addItem('비종사자 부관리자 해제', 'clearNonStaffRosterManager')
      .addSeparator()
      .addItem('출결 DB 분리/마이그레이션', 'migrateStaffRosterDailyAttendanceToDbMenu')
      .addItem('출결 서버 저장 큐 처리', 'processStaffRosterAttendancePatchQueueMenu')
      .addItem('출결 서버 저장 트리거 설치', 'installStaffRosterAttendanceQueueTrigger')
      .addSeparator()
      .addItem('관리자 상태 확인', 'showStaffRosterAdminStatus');
  }

  return menu;
}

function canShowStaffRosterAdminMenu_() {
  try {
    const context = getStaffRosterAdminContext_();
    return !!(context && context.canManage);
  } catch (error) {
    Logger.log('canShowStaffRosterAdminMenu_ failed: %s', error.message);
    return false;
  }
}

function buildTemplateMenu_(ui) {
  return ui
    .createMenu('템플릿')
    .addItem(LOG_PRINT_CONFIG.TEMPLATE_SYNC_MENU_ITEM_NAME, 'syncTemplateSetup');
}

function buildTelegramMenu_(ui) {
  const menu = ui
    .createMenu('텔레그램')
    .addItem('연동 상태 확인', 'showTelegramBotStatus')
    .addItem('작업함 열기', 'openTelegramTaskSheet')
    .addItem('오늘 요약 테스트 발송', 'testSendTelegramTodayMessage');

  if (canShowStaffRosterAdminMenu_()) {
    menu
      .addSeparator()
      .addItem('봇 토큰 설정', 'setTelegramBotTokenPrompt')
      .addItem('허용 채팅ID 설정', 'setTelegramAllowedChatIdPrompt')
      .addItem('허용 채팅ID 비우기', 'clearTelegramAllowedChatId')
      .addItem('웹앱 URL 직접 설정', 'setTelegramWebAppUrlPrompt')
      .addSeparator()
      .addItem('폴링 모드 시작', 'installTelegramPollingTrigger')
      .addItem('폴링 모드 중지', 'removeTelegramPollingTrigger')
      .addItem('웹훅 해제', 'deleteTelegramWebhook');
  }

  return menu;
}

function runOneTimeIntermediateCleanupOnOpen_() {
  const properties = PropertiesService.getDocumentProperties();
  const alreadyCleaned = String(properties.getProperty(ONE_TIME_INTERMEDIATE_CLEANUP_PROPERTY_KEY) || '').trim() === 'done';
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!alreadyCleaned) {
    hideIntermediateSheets_(spreadsheet);
    properties.setProperty(ONE_TIME_INTERMEDIATE_CLEANUP_PROPERTY_KEY, 'done');
  }

  const inventorySheet = spreadsheet.getSheetByName('시트현황');
  if (inventorySheet) {
    spreadsheet.deleteSheet(inventorySheet);
  }
}

function printSelectedRowsWithTemplate() {
  showLogPreview();
}

function syncTemplateSetup() {
  try {
    formatTemplateSheet_();
    analyzeTemplateSheet();
    buildTemplateMappingTable();
    buildTemplateSuggestions();
    applySuggestionsToMapping();
    rebuildTemplateMarkersFromSchema();
    ensureSecondTemplateBindings_();
    hideTemplateLastColumn();
    hideTemplateSchemaSheet_();
    touchTemplateSyncVersion_();
    clearAllTemplatePreviewPdfCaches_();
  } catch (error) {
    Logger.log('syncTemplateSetup failed: %s\n%s', error.message, error.stack || '');
    SpreadsheetApp.getUi().alert('템플릿 동기화 중 일부 단계가 실패했습니다: ' + error.message);
  }
}
