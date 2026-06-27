// ============================================================
// HELPER FUNCTIONS
// Shared utilities used by all three pipeline workflows
// ============================================================


// Reads a Google Sheet tab and returns rows as named objects
// e.g. { date: '2026-06-26', product: 'Laptop', revenue: 523485 }
// instead of raw arrays like ['2026-06-26', 'Laptop', 523485]
function getSheetData(sheetName) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const data  = sheet.getDataRange().getValues();

  const headers = data[0];
  const rows    = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}


// Converts any date format from Google Sheets into a YYYY-MM-DD string
// Handles three formats: Date objects, DD/MM/YYYY strings, YYYY-MM-DD strings
function formatDate(d) {
  if (d instanceof Date) {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const str = String(d).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts[0].length <= 2) {
      return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
  }

  const date = new Date(str);
  if (isNaN(date.getTime())) {
    throw new Error(`Cannot parse date: "${d}"`);
  }
  return date.toISOString().split('T')[0];
}


// Same as formatDate but accepts a Date object directly
// Used by weekly digest and morning snapshot for date arithmetic
function formatDateStandalone(d) {
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}


// Converts a value from Google Sheets into a proper JavaScript Date object
// Needed because Sheets returns dates inconsistently depending on cell format
function parseDateFromSheet(val) {
  if (val instanceof Date) return val;
  const str = String(val).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts[0].length <= 2) {
      return new Date(
        `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`
      );
    }
  }
  return new Date(str);
}


// Writes a row to the alert_log sheet after every pipeline run
// Runs regardless of whether an alert fired — creates a complete audit trail
function logRun(kpis) {
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('alert_log');

  const alertType = kpis.alerts && kpis.alerts.length > 0
    ? kpis.alerts.map(a => a.type).join(', ')
    : 'NONE';

  sheet.appendRow([
    new Date(),
    kpis.targetDate,
    kpis.todayRevenue,
    kpis.lastWkRevenue,
    kpis.wowChange !== null ? parseFloat(kpis.wowChange).toFixed(2) : 'N/A',
    alertType,
    kpis.alertFired,
    kpis.topProduct,
    kpis.topRegion
  ]);
}
