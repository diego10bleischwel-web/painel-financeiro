const SHEET_NAME = 'state';
const CELL = 'A1';

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
  const body = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
  const parsed = JSON.parse(body);
  const data = parsed.data || parsed;

  if (!data || !Array.isArray(data.items)) {
    return json_({ ok: false, error: 'invalid_payload' });
  }

  writeState_(data);
  return json_({ ok: true, data });
}

function readState_() {
  const sheet = getSheet_();
  const raw = sheet.getRange(CELL).getValue();
  if (!raw) return null;
  return JSON.parse(raw);
}

function writeState_(data) {
  const sheet = getSheet_();
  sheet.getRange(CELL).setValue(JSON.stringify(data));
  sheet.getRange('B1').setValue(new Date());
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
