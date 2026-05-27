const SHEET_NAME = 'state';
const CELL = 'A1';
const CHUNK_START_ROW = 2;
const CHUNK_SIZE = 45000;
const BACKUP_SHEET_NAME = 'backups';
const BACKUP_CHUNK_SHEET_NAME = 'backup_chunks';
const MAX_BACKUPS = 80;

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action || '';
  const callback = params.callback || '';
  let response;

  if (action === 'backups') {
    response = { ok: true, backups: listBackups_() };
  } else if (action === 'backup') {
    response = { ok: true, data: readBackup_(params.id || '') };
  } else {
    response = { ok: true, data: readState_() };
  }

  const payload = JSON.stringify(response);

  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + payload + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return json_(response);
}

function doPost(e) {
  try {
    const body = e && e.parameter && e.parameter.payload
      ? e.parameter.payload
      : (e && e.postData && e.postData.contents ? e.postData.contents : '{}');
    const parsed = JSON.parse(body);

    if (parsed.action === 'restore' && parsed.id) {
      const backup = readBackup_(parsed.id);
      if (!backup || !Array.isArray(backup.entries)) {
        return json_({ ok: false, error: 'backup_not_found' });
      }

      writeState_(backup, 'restore:' + parsed.id);
      return json_({ ok: true, data: backup });
    }

    const data = parsed.data || parsed;

    if (!data || !Array.isArray(data.entries)) {
      return json_({ ok: false, error: 'invalid_payload' });
    }

    writeState_(data, parsed.action || 'save');
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

function writeState_(data, reason) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getSheet_();
    const previous = readStateNoLock_();
    if (previous && Array.isArray(previous.entries)) {
      appendBackup_(previous, 'before_' + (reason || 'save'));
    }

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
    appendBackup_(data, reason || 'save');
    pruneBackups_();
  } finally {
    lock.releaseLock();
  }
}

function readStateNoLock_() {
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

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  sheet.hideSheet();
  return sheet;
}

function getBackupSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BACKUP_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BACKUP_SHEET_NAME);
    sheet.appendRow([
      'id',
      'createdAt',
      'reason',
      'entries',
      'cardTransactions',
      'thirdMovements',
      'transfers',
      'total',
      'lastSync',
      'chunks'
    ]);
  }
  return sheet;
}

function getBackupChunkSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BACKUP_CHUNK_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(BACKUP_CHUNK_SHEET_NAME);
    sheet.appendRow(['backupId', 'chunkIndex', 'text']);
    sheet.hideSheet();
  }
  return sheet;
}

function appendBackup_(data, reason) {
  const text = JSON.stringify(data);
  const id = Utilities.getUuid();
  const now = new Date();
  const chunks = [];

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    chunks.push([id, chunks.length, text.slice(i, i + CHUNK_SIZE)]);
  }

  const entries = Array.isArray(data.entries) ? data.entries.length : 0;
  const cards = Array.isArray(data.cardTransactions) ? data.cardTransactions.length : 0;
  const third = Array.isArray(data.thirdMovements) ? data.thirdMovements.length : 0;
  const transfers = Array.isArray(data.transfers) ? data.transfers.length : 0;

  getBackupSheet_().appendRow([
    id,
    now,
    reason || 'save',
    entries,
    cards,
    third,
    transfers,
    entries + cards + third + transfers,
    data.lastSync || '',
    chunks.length
  ]);

  if (chunks.length) {
    const chunkSheet = getBackupChunkSheet_();
    chunkSheet
      .getRange(chunkSheet.getLastRow() + 1, 1, chunks.length, 3)
      .setValues(chunks);
  }
}

function listBackups_() {
  const sheet = getBackupSheet_();
  const last = sheet.getLastRow();
  if (last < 2) return [];
  const rows = sheet.getRange(2, 1, last - 1, 10).getValues();

  return rows
    .filter(function (row) { return row[0]; })
    .map(function (row) {
      return {
        id: row[0],
        createdAt: row[1],
        reason: row[2],
        entries: row[3],
        cardTransactions: row[4],
        thirdMovements: row[5],
        transfers: row[6],
        total: row[7],
        lastSync: row[8],
        chunks: row[9]
      };
    })
    .reverse();
}

function readBackup_(id) {
  if (!id) return null;
  const chunkSheet = getBackupChunkSheet_();
  const last = chunkSheet.getLastRow();
  if (last < 2) return null;
  const rows = chunkSheet.getRange(2, 1, last - 1, 3).getValues()
    .filter(function (row) { return row[0] === id; })
    .sort(function (a, b) { return Number(a[1]) - Number(b[1]); });

  if (!rows.length) return null;
  return JSON.parse(rows.map(function (row) { return row[2] || ''; }).join(''));
}

function pruneBackups_() {
  const backupSheet = getBackupSheet_();
  const last = backupSheet.getLastRow();
  if (last <= MAX_BACKUPS + 1) return;

  const rows = backupSheet.getRange(2, 1, last - 1, 10).getValues();
  const removeCount = rows.length - MAX_BACKUPS;
  const removeIds = rows.slice(0, removeCount).map(function (row) { return row[0]; });
  backupSheet.deleteRows(2, removeCount);

  const chunkSheet = getBackupChunkSheet_();
  for (let row = chunkSheet.getLastRow(); row >= 2; row--) {
    if (removeIds.indexOf(chunkSheet.getRange(row, 1).getValue()) !== -1) {
      chunkSheet.deleteRow(row);
    }
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
