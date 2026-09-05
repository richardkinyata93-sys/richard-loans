 /*******************************************************
 * SYSTEM UTILITIES
 *******************************************************/


/**
 * Create an audit record.
 */
function audit_(action, sheetName, recordId, description) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.AUDIT);

  if (!sheet) return;

  const auditId = generateAuditId_();

  sheet.appendRow([
    auditId,
    new Date(),
    getCurrentUser_(),
    action,
    sheetName,
    recordId,
    description
  ]);
}


/**
 * Generate Audit ID.
 */
function generateAuditId_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName(SYSTEM.SHEETS.AUDIT);

  if (!sheet || sheet.getLastRow() < 2) {
    return 'AUD-00001';
  }

  const ids = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .filter(String);

  let highest = 0;

  ids.forEach(id => {
    const match = String(id).match(/^AUD-(\d+)$/i);

    if (match) {
      highest = Math.max(highest, Number(match[1]));
    }
  });

  return 'AUD-' + String(highest + 1).padStart(5, '0');
}


/**
 * Basic numeric validation.
 */
function requirePositiveNumber_(value, fieldName) {
  const number = Number(value);

  if (!isFinite(number) || number <= 0) {
    throw new Error(
      fieldName + ' must be greater than zero.'
    );
  }

  return number;
}


/**
 * Safely convert a value to date.
 */
function toDate_(value, fieldName) {
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    throw new Error(
      'Invalid date for ' + fieldName + '.'
    );
  }

  return date;
}