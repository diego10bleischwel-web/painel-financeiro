const SHEET_NAME = 'state';
const CELL = 'A1';
const CHUNK_START_ROW = 2;
const CHUNK_SIZE = 45000;

function doGet(e) {
  const callback = e.parameter.callback || '';
  const data = readState_();
  const payload = JSON.stringify({ ok: true, data });

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + payload + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_({ ok: true, data });
}

function doPost(e) {
  try {
    const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    const parsed = JSON.parse(body);
    const data = parsed.data || parsed;

    if (!data || !Array.isArray(data.entries)) {
      return json_({ ok: false, error: 'invalid_payload' });
    }

    writeState_(data);
    return json_({ ok: true, data });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function readState_() {
  const sheet = getSheet_();
  const raw = sheet.getRange(CELL).getValue();
  if (!raw) return null;
  const parsed = JSON.parse(raw);

  if (parsed && parsed.chunked && parsed.count) {
    const values = sheet
      .getRange(CHUNK_START_ROW, 1, Number(parsed.count), 1)
      .getValues()
      .map(function (row) { return row[0] || ''; })
      .join('');
    return JSON.parse(values);
  }

  return parsed;
}

function writeState_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_();
    const text = JSON.stringify(data);
    const chunks = [];

    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push([text.slice(i, i + CHUNK_SIZE)]);
    }

    sheet.getRange(CELL).setValue(JSON.stringify({
      chunked: true,
      count: chunks.length,
      updatedAt: new Date().toISOString()
    }));

    if (chunks.length) {
      sheet.getRange(CHUNK_START_ROW, 1, chunks.length, 1).setValues(chunks);
    }

    const clearRows = Math.max(0, sheet.getLastRow() - (CHUNK_START_ROW + chunks.length - 1));
    if (clearRows) {
      sheet.getRange(CHUNK_START_ROW + chunks.length, 1, clearRows, 1).clearContent();
    }

    sheet.getRange('B1').setValue(new Date());
  } finally {
    lock.releaseLock();
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.hideSheet();
  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
