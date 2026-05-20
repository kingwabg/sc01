const TELEGRAM_BOT_TOKEN_PROPERTY_KEY = 'SEOC_TELEGRAM_BOT_TOKEN';
const TELEGRAM_ALLOWED_CHAT_ID_PROPERTY_KEY = 'SEOC_TELEGRAM_ALLOWED_CHAT_ID';
const TELEGRAM_WEBHOOK_SECRET_PROPERTY_KEY = 'SEOC_TELEGRAM_WEBHOOK_SECRET';
const TELEGRAM_WEBAPP_URL_PROPERTY_KEY = 'SEOC_TELEGRAM_WEBAPP_URL';
const TELEGRAM_UPDATE_OFFSET_PROPERTY_KEY = 'SEOC_TELEGRAM_UPDATE_OFFSET';
const TELEGRAM_TASK_SHEET_NAME = 'TG_TASKS';
const TELEGRAM_TASK_HEADERS = [
  'ID',
  '접수일시',
  '상태',
  '채팅ID',
  '사용자',
  '메시지',
  '명령',
  '처리결과',
  '수정일시',
];

function doPost(e) {
  return handleTelegramWebhook_(e);
}

function setTelegramBotTokenPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '텔레그램 봇 토큰 설정',
    'BotFather에서 받은 봇 토큰을 입력해주세요.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    ui.alert('텔레그램 봇 토큰 설정을 취소했습니다.');
    return;
  }

  const token = String(response.getResponseText() || '').trim();
  if (!/^(\d+):[A-Za-z0-9_-]{20,}$/.test(token)) {
    ui.alert('봇 토큰 형식이 올바르지 않습니다. BotFather에서 받은 전체 토큰을 입력해주세요.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty(TELEGRAM_BOT_TOKEN_PROPERTY_KEY, token);
  ui.alert('텔레그램 봇 토큰을 저장했습니다.');
}

function setTelegramAllowedChatIdPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '텔레그램 허용 채팅ID 설정',
    '내 텔레그램 채팅ID를 입력해주세요. 모르면 봇에게 /chatid 를 보낸 뒤 상태 메뉴에서 확인할 수 있습니다.',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    ui.alert('텔레그램 허용 채팅ID 설정을 취소했습니다.');
    return;
  }

  const chatId = String(response.getResponseText() || '').trim();
  if (!/^-?\d+$/.test(chatId)) {
    ui.alert('채팅ID는 숫자여야 합니다.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty(TELEGRAM_ALLOWED_CHAT_ID_PROPERTY_KEY, chatId);
  ui.alert('텔레그램 허용 채팅ID를 저장했습니다.\n채팅ID: ' + chatId);
}

function setTelegramWebAppUrlPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    '텔레그램 웹앱 URL 설정',
    'Apps Script 웹앱 배포 URL을 입력해주세요. 예: https://script.google.com/macros/s/.../exec',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    ui.alert('텔레그램 웹앱 URL 설정을 취소했습니다.');
    return;
  }

  const url = normalizeTelegramWebAppUrl_(response.getResponseText());
  if (!url) {
    ui.alert('웹앱 URL 형식이 올바르지 않습니다.');
    return;
  }

  PropertiesService.getScriptProperties().setProperty(TELEGRAM_WEBAPP_URL_PROPERTY_KEY, url);
  ui.alert('텔레그램 웹앱 URL을 저장했습니다.\n' + url);
}

function clearTelegramAllowedChatId() {
  PropertiesService.getScriptProperties().deleteProperty(TELEGRAM_ALLOWED_CHAT_ID_PROPERTY_KEY);
  SpreadsheetApp.getUi().alert('텔레그램 허용 채팅ID를 비웠습니다. 다시 설정하기 전에는 /chatid 안내만 응답합니다.');
}

function showTelegramBotStatus() {
  const ui = SpreadsheetApp.getUi();
  const token = getTelegramBotToken_();
  const allowedChatId = getTelegramAllowedChatId_();
  const secret = getTelegramWebhookSecret_() || ensureTelegramWebhookSecret_();
  const serviceUrl = getTelegramWebAppUrl_();
  const taskSheet = getTelegramTaskSheet_(false);
  const pendingCount = taskSheet ? countTelegramTasksByStatus_('대기') : 0;
  const pollingCount = getTelegramPollingTriggerCount_();
  const lines = [
    '텔레그램 연동 상태',
    '',
    '봇 토큰: ' + (token ? '설정됨' : '미설정'),
    '허용 채팅ID: ' + (allowedChatId || '미설정'),
    '웹앱 URL: ' + (serviceUrl || '없음 - 배포가 필요합니다'),
    '웹훅 보안키: ' + (secret ? '설정됨' : '미설정'),
    '폴링 트리거: ' + (pollingCount ? pollingCount + '개 실행 중' : '꺼짐'),
    '대기 작업: ' + pendingCount + '건',
  ];

  if (token) {
    try {
      const webhookInfo = getTelegramWebhookInfo_();
      lines.push('');
      lines.push('Telegram webhook: ' + (webhookInfo.url || '미연결'));
      if (webhookInfo.last_error_message) {
        lines.push('마지막 오류: ' + webhookInfo.last_error_message);
      }
    } catch (error) {
      lines.push('');
      lines.push('Telegram 상태 확인 실패: ' + error.message);
    }
  }

  ui.alert(lines.join('\n'));
}

function setTelegramWebhook() {
  const ui = SpreadsheetApp.getUi();
  const token = getTelegramBotToken_();
  if (!token) {
    ui.alert('먼저 텔레그램 봇 토큰을 설정해주세요.');
    return;
  }

  const serviceUrl = getTelegramWebAppUrl_();
  if (!serviceUrl) {
    ui.alert('웹앱 URL을 찾지 못했습니다.\nApps Script에서 배포 > 새 배포 > 웹 앱으로 배포한 뒤 다시 실행해주세요.');
    return;
  }

  const secret = ensureTelegramWebhookSecret_();
  const webhookUrl = serviceUrl + (serviceUrl.indexOf('?') >= 0 ? '&' : '?') + 'telegramSecret=' + encodeURIComponent(secret);
  const result = callTelegramApi_('setWebhook', {
    url: webhookUrl,
    drop_pending_updates: false,
  });

  if (!result.ok) {
    ui.alert('텔레그램 웹훅 연결 실패:\n' + JSON.stringify(result, null, 2));
    return;
  }

  ui.alert('텔레그램 웹훅을 연결했습니다.\n이제 봇에게 /chatid 를 보내 채팅ID를 확인해주세요.');
}

function deleteTelegramWebhook() {
  const ui = SpreadsheetApp.getUi();
  if (!getTelegramBotToken_()) {
    ui.alert('설정된 텔레그램 봇 토큰이 없습니다.');
    return;
  }

  const result = callTelegramApi_('deleteWebhook', {
    drop_pending_updates: false,
  });

  if (!result.ok) {
    ui.alert('텔레그램 웹훅 해제 실패:\n' + JSON.stringify(result, null, 2));
    return;
  }

  ui.alert('텔레그램 웹훅을 해제했습니다.');
}

function installTelegramPollingTrigger() {
  const result = installTelegramPollingTrigger_(true);
  SpreadsheetApp.getUi().alert([
    '텔레그램 폴링 모드를 시작했습니다.',
    '기존 웹훅: ' + (result.webhookDeleted ? '해제됨' : '확인 필요'),
    '트리거: ' + result.triggerCount + '개',
    '이제 봇은 보통 1분 안에 새 메시지를 확인합니다.',
  ].join('\n'));
}

function removeTelegramPollingTrigger() {
  const result = removeTelegramPollingTrigger_();
  SpreadsheetApp.getUi().alert('텔레그램 폴링 트리거를 중지했습니다.\n삭제된 트리거: ' + result.removedCount + '개');
}

function openTelegramTaskSheet() {
  const sheet = getTelegramTaskSheet_(true);
  sheet.showSheet();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(sheet);
}

function testSendTelegramTodayMessage() {
  const ui = SpreadsheetApp.getUi();
  const chatId = getTelegramAllowedChatId_();
  if (!chatId) {
    ui.alert('허용 채팅ID가 없습니다. 봇에게 /chatid 를 보낸 뒤 채팅ID를 설정해주세요.');
    return;
  }

  const message = getAssistantTodayTelegramMessage();
  sendTelegramMessage_(chatId, message || '오늘 운영일지 메시지를 만들지 못했습니다.');
  ui.alert('텔레그램으로 오늘 운영일지 요약을 보냈습니다.');
}

function handleTelegramWebhook_(e) {
  const output = function(payload) {
    return ContentService
      .createTextOutput(JSON.stringify(payload || { ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  };

  try {
    if (!isValidTelegramWebhookRequest_(e)) {
      return output({ ok: false, error: 'invalid-secret' });
    }

    const update = parseTelegramUpdate_(e);
    if (!update) {
      return output({ ok: true, skipped: true });
    }

    return output(processTelegramUpdate_(update));
  } catch (error) {
    Logger.log('handleTelegramWebhook_ failed: %s\n%s', error.message, error.stack || '');
    return output({ ok: false, error: error.message });
  }
}

function pollTelegramUpdates() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) {
    return {
      ok: false,
      skipped: true,
      reason: 'locked',
    };
  }

  try {
    if (!getTelegramBotToken_()) {
      return {
        ok: false,
        error: 'token-missing',
      };
    }

    const properties = PropertiesService.getScriptProperties();
    const offset = Number(properties.getProperty(TELEGRAM_UPDATE_OFFSET_PROPERTY_KEY) || '0') || 0;
    const result = callTelegramApi_('getUpdates', {
      offset: offset,
      limit: 20,
      timeout: 0,
      allowed_updates: ['message', 'edited_message', 'callback_query'],
    });

    if (!result.ok) {
      throw new Error(result.description || 'Telegram getUpdates failed');
    }

    const updates = result.result || [];
    updates.forEach(function(payload) {
      const nextOffset = Number(payload.update_id || 0) + 1;
      try {
        const update = normalizeTelegramUpdate_(payload);
        if (update) {
          processTelegramUpdate_(update);
        }
      } catch (error) {
        Logger.log('pollTelegramUpdates item failed: %s\n%s', error.message, error.stack || '');
      }
      if (nextOffset > 0) {
        properties.setProperty(TELEGRAM_UPDATE_OFFSET_PROPERTY_KEY, String(nextOffset));
      }
    });

    return {
      ok: true,
      processed: updates.length,
    };
  } finally {
    lock.releaseLock();
  }
}

function processTelegramUpdate_(update) {
  const chatId = String(update && update.chatId || '').trim();
  const text = String(update && update.text || '').trim();
  if (!chatId || !text) {
    return {
      ok: true,
      skipped: true,
    };
  }

  const allowedChatId = getTelegramAllowedChatId_();
  if (!allowedChatId) {
    if (isTelegramAllowCommand_(text)) {
      PropertiesService.getScriptProperties().setProperty(TELEGRAM_ALLOWED_CHAT_ID_PROPERTY_KEY, chatId);
      sendTelegramMessage_(chatId, [
        '허용 채팅ID를 등록했습니다.',
        '채팅ID: ' + chatId,
        '',
        '이제 /status, 오늘, 업무 지시를 사용할 수 있습니다.',
      ].join('\n'));
      return {
        ok: true,
        chatId: chatId,
        allowed: true,
      };
    }

    sendTelegramMessage_(chatId, [
      '채팅ID: ' + chatId,
      '아직 이 봇에 허용 채팅ID가 설정되지 않았습니다.',
      '스프레드시트 메뉴에서 텔레그램 > 허용 채팅ID 설정에 위 숫자를 넣거나, 이 채팅방에서 /allow 를 보내주세요.',
    ].join('\n'));
    return {
      ok: true,
      chatId: chatId,
      setupRequired: true,
    };
  }

  if (chatId !== allowedChatId) {
    return {
      ok: false,
      error: 'chat-not-allowed',
      chatId: chatId,
    };
  }

  const reply = handleTelegramCommand_(update);
  if (reply) {
    sendTelegramMessage_(chatId, reply);
  }

  return {
    ok: true,
  };
}

function handleTelegramCommand_(update) {
  const text = String(update.text || '').trim();
  const lowerText = text.toLowerCase();
  const chatId = String(update.chatId || '').trim();

  if (lowerText === '/start' || lowerText === '/help' || text === '도움말') {
    return buildTelegramHelpText_();
  }

  if (lowerText === '/chatid' || text === '채팅ID') {
    return '채팅ID: ' + chatId;
  }

  if (isTelegramAllowCommand_(text)) {
    PropertiesService.getScriptProperties().setProperty(TELEGRAM_ALLOWED_CHAT_ID_PROPERTY_KEY, chatId);
    return [
      '허용 채팅ID를 다시 등록했습니다.',
      '채팅ID: ' + chatId,
    ].join('\n');
  }

  if (lowerText === '/status' || lowerText.indexOf('/status ') === 0 || text === '상태') {
    const extraRequest = text.replace(/^\/status\s*/i, '').trim();
    if (extraRequest) {
      if (isTelegramTodayReportRequest_(extraRequest)) {
        return [
          buildTelegramStatusText_(),
          '',
          buildTelegramTodayWorkReport_(),
        ].join('\n');
      }

      const task = appendTelegramTask_(extraRequest, update, '접수됨: /status 뒤에 붙은 추가 요청입니다.');
      return [
        buildTelegramStatusText_(),
        '',
        '추가 요청도 작업함에 접수했습니다.',
        'ID: ' + task.id,
        '내용: ' + task.text,
      ].join('\n');
    }
    return buildTelegramStatusText_();
  }

  if (lowerText === '/today' || text === '오늘' || text === '오늘요약') {
    return getAssistantTodayTelegramMessage();
  }

  if (lowerText === '/report' || lowerText.indexOf('/report ') === 0 || isTelegramTodayReportRequest_(text)) {
    return buildTelegramTodayWorkReport_();
  }

  if (lowerText === '/tasks' || text === '작업목록') {
    return buildTelegramTaskListText_();
  }

  if (/^\/done\s+/i.test(text) || /^완료\s+/.test(text)) {
    const taskId = text.replace(/^\/done\s+/i, '').replace(/^완료\s+/, '').trim();
    return markTelegramTaskDone_(taskId, update);
  }

  const taskText = text.replace(/^\/task\s+/i, '').replace(/^작업\s+/, '').trim();
  const task = appendTelegramTask_(taskText || text, update, '접수됨: 작업 요청 대기. 제가 확인 후 처리합니다.');
  return [
    '작업함에 접수했습니다.',
    'ID: ' + task.id,
    '내용: ' + task.text,
    '',
    '스프레드시트의 TG_TASKS 시트에서 확인할 수 있습니다.',
  ].join('\n');
}

function buildTelegramHelpText_() {
  return [
    '서창 운영일지 텔레그램 봇',
    '',
    '/today 또는 오늘: 오늘 운영일지 점검 메시지',
    '/report 또는 "오늘 뭐 했는지 보고": 오늘 보고 요약',
    '/tasks: 대기 작업 목록',
    '/task 내용: 작업함에 지시 저장',
    '작업 내용만 보내도 작업함에 저장됩니다.',
    '/done 작업ID: 작업 완료 처리',
    '/status: 연동 상태',
    '/chatid: 현재 채팅ID 확인',
  ].join('\n');
}

function buildTelegramStatusText_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const taskSheet = getTelegramTaskSheet_(true);
  return [
    '연동 상태: 정상',
    '기준 연도: ' + selectedYear,
    '대기 작업: ' + countTelegramTasksByStatus_('대기') + '건',
    '작업함: ' + taskSheet.getName(),
    '스프레드시트: ' + spreadsheet.getUrl(),
  ].join('\n');
}

function buildTelegramTodayWorkReport_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const selectedYear = resolveWorkingYear_(spreadsheet);
  const todayMessage = getAssistantTodayTelegramMessage();
  const todaysTasks = getTelegramTasksByDate_(new Date(), 8);
  const lines = [
    '[오늘 보고]',
    '기준 연도: ' + selectedYear,
    '',
    '운영일지 점검:',
    todayMessage || '오늘 운영일지 점검 메시지를 만들지 못했습니다.',
  ];

  lines.push('');
  lines.push('텔레그램 작업 접수: ' + todaysTasks.length + '건');
  if (todaysTasks.length) {
    todaysTasks.forEach(function(task) {
      lines.push('- ' + task.createdAt + ' / ' + task.status + ' / ' + task.text);
    });
  } else {
    lines.push('- 오늘 접수된 텔레그램 작업이 없습니다.');
  }

  return lines.join('\n');
}

function buildTelegramTaskListText_() {
  const tasks = getTelegramTasksByStatus_('대기', 8);
  if (!tasks.length) {
    return '대기 중인 텔레그램 작업이 없습니다.';
  }

  const lines = ['대기 작업 ' + tasks.length + '건'];
  tasks.forEach(function(task) {
    lines.push('- ' + task.id + ' / ' + task.createdAt + ' / ' + task.text);
  });
  return lines.join('\n');
}

function appendTelegramTask_(text, update, resultText) {
  const sheet = getTelegramTaskSheet_(true);
  const now = new Date();
  const id = buildTelegramTaskId_();
  const userName = buildTelegramUserName_(update);
  const command = detectTelegramCommandName_(text);
  const safeText = String(text || '').trim();
  const safeResult = String(resultText || '').trim();

  sheet.appendRow([
    id,
    now,
    '대기',
    String(update.chatId || ''),
    userName,
    safeText,
    command,
    safeResult,
    now,
  ]);
  sheet.getRange(sheet.getLastRow(), 1, 1, TELEGRAM_TASK_HEADERS.length).setWrap(true);
  return {
    id: id,
    text: safeText,
  };
}

function getTelegramTasksByDate_(targetDate, limit) {
  const sheet = getTelegramTaskSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const targetKey = Utilities.formatDate(targetDate || new Date(), Session.getScriptTimeZone(), 'yyyy. M. d');
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, TELEGRAM_TASK_HEADERS.length).getDisplayValues();
  const tasks = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    const createdAt = String(row[1] || '').trim();
    if (createdAt.indexOf(targetKey) !== 0) {
      continue;
    }
    tasks.push({
      id: String(row[0] || '').trim(),
      createdAt: createdAt,
      status: String(row[2] || '').trim(),
      text: String(row[5] || '').trim(),
    });
    if (tasks.length >= limit) {
      break;
    }
  }
  return tasks;
}

function markTelegramTaskDone_(taskId, update) {
  const safeTaskId = String(taskId || '').trim();
  if (!safeTaskId) {
    return '완료 처리할 작업ID를 입력해주세요.';
  }

  const sheet = getTelegramTaskSheet_(false);
  if (!sheet) {
    return '작업함 시트를 찾지 못했습니다.';
  }

  const values = sheet.getDataRange().getDisplayValues();
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    if (String(values[rowIndex][0] || '').trim() === safeTaskId) {
      sheet.getRange(rowIndex + 1, 3).setValue('완료');
      sheet.getRange(rowIndex + 1, 8).setValue('텔레그램 완료 처리: ' + buildTelegramUserName_(update));
      sheet.getRange(rowIndex + 1, 9).setValue(new Date());
      return '작업을 완료 처리했습니다.\nID: ' + safeTaskId;
    }
  }

  return '해당 작업ID를 찾지 못했습니다.\nID: ' + safeTaskId;
}

function getTelegramTasksByStatus_(status, limit) {
  const sheet = getTelegramTaskSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, TELEGRAM_TASK_HEADERS.length).getDisplayValues();
  const tasks = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    if (String(row[2] || '').trim() !== status) {
      continue;
    }
    tasks.push({
      id: String(row[0] || '').trim(),
      createdAt: String(row[1] || '').trim(),
      text: String(row[5] || '').trim(),
    });
    if (tasks.length >= limit) {
      break;
    }
  }
  return tasks;
}

function countTelegramTasksByStatus_(status) {
  const sheet = getTelegramTaskSheet_(false);
  if (!sheet || sheet.getLastRow() < 2) {
    return 0;
  }

  return sheet.getRange(2, 3, sheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .reduce(function(count, row) {
      return count + (String(row[0] || '').trim() === status ? 1 : 0);
    }, 0);
}

function getTelegramTaskSheet_(createIfMissing) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(TELEGRAM_TASK_SHEET_NAME);
  if (!sheet && createIfMissing) {
    sheet = spreadsheet.insertSheet(TELEGRAM_TASK_SHEET_NAME);
    sheet.getRange(1, 1, 1, TELEGRAM_TASK_HEADERS.length)
      .setValues([TELEGRAM_TASK_HEADERS])
      .setFontWeight('bold')
      .setBackground('#eaf2ff')
      .setFontColor('#102033');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 1, 110);
    sheet.setColumnWidths(2, 1, 170);
    sheet.setColumnWidths(3, 1, 90);
    sheet.setColumnWidths(4, 1, 140);
    sheet.setColumnWidths(5, 1, 160);
    sheet.setColumnWidths(6, 1, 520);
    sheet.setColumnWidths(7, 1, 120);
    sheet.setColumnWidths(8, 1, 260);
    sheet.setColumnWidths(9, 1, 170);
    sheet.hideSheet();
  }
  return sheet;
}

function parseTelegramUpdate_(e) {
  const raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
  if (!raw) {
    return null;
  }

  return normalizeTelegramUpdate_(JSON.parse(raw));
}

function normalizeTelegramUpdate_(payload) {
  const message = payload.message || payload.edited_message || (payload.callback_query && payload.callback_query.message) || null;
  if (!message) {
    return null;
  }

  const from = payload.callback_query && payload.callback_query.from ? payload.callback_query.from : message.from || {};
  return {
    updateId: payload.update_id || '',
    chatId: message.chat && message.chat.id !== undefined ? message.chat.id : '',
    text: message.text || message.caption || '',
    userId: from.id || '',
    username: from.username || '',
    firstName: from.first_name || '',
    lastName: from.last_name || '',
  };
}

function isValidTelegramWebhookRequest_(e) {
  const secret = getTelegramWebhookSecret_();
  if (!secret) {
    return true;
  }
  const incoming = String(e && e.parameter && e.parameter.telegramSecret || '').trim();
  return incoming === secret;
}

function getTelegramBotToken_() {
  return String(PropertiesService.getScriptProperties().getProperty(TELEGRAM_BOT_TOKEN_PROPERTY_KEY) || '').trim();
}

function getTelegramAllowedChatId_() {
  return String(PropertiesService.getScriptProperties().getProperty(TELEGRAM_ALLOWED_CHAT_ID_PROPERTY_KEY) || '').trim();
}

function getTelegramWebhookSecret_() {
  return String(PropertiesService.getScriptProperties().getProperty(TELEGRAM_WEBHOOK_SECRET_PROPERTY_KEY) || '').trim();
}

function ensureTelegramWebhookSecret_() {
  const properties = PropertiesService.getScriptProperties();
  let secret = String(properties.getProperty(TELEGRAM_WEBHOOK_SECRET_PROPERTY_KEY) || '').trim();
  if (!secret) {
    secret = Utilities.getUuid().replace(/-/g, '');
    properties.setProperty(TELEGRAM_WEBHOOK_SECRET_PROPERTY_KEY, secret);
  }
  return secret;
}

function getTelegramWebAppUrl_() {
  const storedUrl = normalizeTelegramWebAppUrl_(PropertiesService.getScriptProperties().getProperty(TELEGRAM_WEBAPP_URL_PROPERTY_KEY));
  if (storedUrl) {
    return storedUrl;
  }

  try {
    return normalizeTelegramWebAppUrl_(ScriptApp.getService().getUrl());
  } catch (error) {
    Logger.log('getTelegramWebAppUrl_ failed: %s', error.message);
    return '';
  }
}

function normalizeTelegramWebAppUrl_(value) {
  const url = String(value || '').trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/?#]+\/exec$/i.test(url)) {
    return '';
  }
  return url;
}

function sendTelegramMessage_(chatId, text) {
  const safeText = String(text || '').trim();
  if (!safeText) {
    return null;
  }
  return callTelegramApi_('sendMessage', {
    chat_id: String(chatId || '').trim(),
    text: safeText.slice(0, 3900),
    disable_web_page_preview: true,
  });
}

function getTelegramWebhookInfo_() {
  const result = callTelegramApi_('getWebhookInfo', {});
  return result && result.result ? result.result : {};
}

function installTelegramPollingTrigger_(dropPendingUpdates) {
  if (!getTelegramBotToken_()) {
    throw new Error('텔레그램 봇 토큰이 설정되지 않았습니다.');
  }

  const deleteResult = callTelegramApi_('deleteWebhook', {
    drop_pending_updates: dropPendingUpdates !== false,
  });

  removeTelegramPollingTrigger_();
  ScriptApp.newTrigger('pollTelegramUpdates')
    .timeBased()
    .everyMinutes(1)
    .create();

  return {
    ok: true,
    webhookDeleted: !!(deleteResult && deleteResult.ok),
    triggerCount: getTelegramPollingTriggerCount_(),
  };
}

function removeTelegramPollingTrigger_() {
  const triggers = ScriptApp.getProjectTriggers();
  let removedCount = 0;
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction && trigger.getHandlerFunction() === 'pollTelegramUpdates') {
      ScriptApp.deleteTrigger(trigger);
      removedCount += 1;
    }
  });
  return {
    ok: true,
    removedCount: removedCount,
  };
}

function getTelegramPollingTriggerCount_() {
  return ScriptApp.getProjectTriggers().filter(function(trigger) {
    return trigger.getHandlerFunction && trigger.getHandlerFunction() === 'pollTelegramUpdates';
  }).length;
}

function callTelegramApi_(method, payload) {
  const token = getTelegramBotToken_();
  if (!token) {
    throw new Error('텔레그램 봇 토큰이 설정되지 않았습니다.');
  }

  const response = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true,
  });
  const text = response.getContentText();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch (error) {
    result = {
      ok: false,
      description: text,
    };
  }

  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) {
    result.ok = false;
    result.httpStatus = response.getResponseCode();
  }
  return result;
}

function buildTelegramTaskId_() {
  return Utilities.getUuid().split('-')[0].toUpperCase();
}

function buildTelegramUserName_(update) {
  const nameParts = [update.firstName, update.lastName].filter(Boolean).join(' ').trim();
  const username = update.username ? '@' + update.username : '';
  return [nameParts, username].filter(Boolean).join(' ').trim() || String(update.userId || '').trim() || '-';
}

function isTelegramAllowCommand_(text) {
  const normalized = String(text || '').trim().toLowerCase();
  return normalized === '/allow' || normalized === '허용' || normalized === '허용하기';
}

function isTelegramTodayReportRequest_(text) {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const hasToday = normalized.indexOf('오늘') >= 0 || normalized.indexOf('today') >= 0;
  const hasReportVerb = normalized.indexOf('보고') >= 0
    || normalized.indexOf('정리') >= 0
    || normalized.indexOf('뭘 했') >= 0
    || normalized.indexOf('뭐 했') >= 0
    || normalized.indexOf('무엇') >= 0
    || normalized.indexOf('한 일') >= 0
    || normalized.indexOf('report') >= 0;

  return hasToday && hasReportVerb;
}

function detectTelegramCommandName_(text) {
  const raw = String(text || '').trim();
  if (/^\//.test(raw)) {
    return raw.split(/\s+/)[0];
  }
  if (/^작업\s+/.test(raw)) {
    return '작업';
  }
  return '메시지';
}
