// ============================================================
// WEEKLY DIGEST WORKFLOW
// Trigger: Every Monday at 8am (time-based trigger in Apps Script)
// Purpose: Sends a full week summary email every Monday morning
//          Covers the Monday-to-Sunday week that just completed
//          Includes top 3 products, best day, WoW change,
//          and a count of how many alerts fired that week
// Dependencies: helpers.gs must be present in the same project
// ============================================================

function runWeeklyDigest() {

  const allRows = getSheetData('sales_data');

  // Calculate the date range: last Monday to last Sunday
  // i.e. the complete week that just finished
  const today     = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon ... 6=Sat

  // Go back to find last Monday
  const daysToLastMonday = dayOfWeek === 1 ? 7 : (dayOfWeek + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysToLastMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const weekStartStr = formatDateStandalone(weekStart);
  const weekEndStr   = formatDateStandalone(weekEnd);

  // Filter rows that fall within this week
  const weekRows = allRows.filter(r => {
    const d = parseDateFromSheet(r.date);
    return d >= weekStart && d <= weekEnd;
  });

  // Calculate the previous week for WoW comparison
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(weekStart.getDate() - 7);
  const prevWeekEnd = new Date(weekEnd);
  prevWeekEnd.setDate(weekEnd.getDate() - 7);

  const prevWeekRows = allRows.filter(r => {
    const d = parseDateFromSheet(r.date);
    return d >= prevWeekStart && d <= prevWeekEnd;
  });

  // ---- Calculations ----

  function sumRevenue(rows) {
    return rows.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);
  }

  function sumUnits(rows) {
    return rows.reduce((sum, r) => sum + parseInt(r.quantity || 0), 0);
  }

  function topBy(rows, field) {
    const grouped = {};
    rows.forEach(r => {
      const key = r[field];
      grouped[key] = (grouped[key] || 0) + parseFloat(r.revenue || 0);
    });
    const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : 'No data';
  }

  // Top 3 products by revenue this week
  function top3Products(rows) {
    const grouped = {};
    rows.forEach(r => {
      grouped[r.product] = (grouped[r.product] || 0) + parseFloat(r.revenue || 0);
    });
    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([product, revenue]) => ({ product, revenue }));
  }

  // Revenue by day — to find best day of the week
  function revenueByDay(rows) {
    const grouped = {};
    rows.forEach(r => {
      const d = formatDateStandalone(parseDateFromSheet(r.date));
      grouped[d] = (grouped[d] || 0) + parseFloat(r.revenue || 0);
    });
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  }

  const totalRevenue  = sumRevenue(weekRows);
  const totalUnits    = sumUnits(weekRows);
  const topProduct    = topBy(weekRows, 'product');
  const topRegion     = topBy(weekRows, 'region');
  const prevRevenue   = sumRevenue(prevWeekRows);
  const top3          = top3Products(weekRows);
  const byDay         = revenueByDay(weekRows);
  const bestDay       = byDay.length > 0 ? byDay[0][0] : 'No data';

  const wowChange = prevRevenue > 0
    ? ((totalRevenue - prevRevenue) / prevRevenue * 100)
    : null;

  const wowText = wowChange !== null
    ? `${wowChange >= 0 ? '+' : ''}${wowChange.toFixed(1)}%`
    : 'No previous week data';

  const wowColor = wowChange !== null && wowChange >= 0 ? '#16a34a' : '#dc2626';

  // ---- How many alerts fired this week ----
  const alertLogRows = getSheetData('alert_log');
  const alertsThisWeek = alertLogRows.filter(r => {
    const d = parseDateFromSheet(r.date_checked);
    return d >= weekStart && d <= weekEnd && r.alert_fired === true;
  }).length;

  // ---- Build top 3 products HTML rows ----
  const top3Rows = top3.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
      <td style="padding:10px 14px; border:1px solid #e5e7eb; font-size:13px;">${i + 1}. ${item.product}</td>
      <td style="padding:10px 14px; border:1px solid #e5e7eb; font-size:13px; font-weight:bold;">
        ₹${item.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
      </td>
    </tr>
  `).join('');

  // ---- Alert summary line ----
  const alertSummary = alertsThisWeek === 0
    ? `<p style="color:#16a34a; font-size:13px;">✓ No anomalies detected this week. All days within normal range.</p>`
    : `<p style="color:#dc2626; font-size:13px;"> ${alertsThisWeek} day${alertsThisWeek > 1 ? 's' : ''} triggered anomaly alerts this week. Check the dashboard for details.</p>`;

  // ---- HTML email body ----
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111;">

      <div style="background:#1e3a5f; padding:20px 28px; border-radius:8px 8px 0 0;">
        <p style="margin:0; color:#93c5fd; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Business Report Pipeline</p>
        <h1 style="margin:6px 0 0; color:#ffffff; font-size:22px;">Weekly Sales Digest</h1>
        <p style="margin:4px 0 0; color:#bfdbfe; font-size:13px;">${weekStartStr} to ${weekEndStr}</p>
      </div>

      <div style="background:#ffffff; border:1px solid #e5e7eb; border-top:none; padding:24px 28px;">

        <h2 style="font-size:15px; color:#374151; margin:0 0 14px;">Week at a glance</h2>

        <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
          <tr style="background:#f9fafb;">
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280; width:55%;">Total revenue</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:15px; font-weight:bold;">
              ₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </td>
          </tr>
          <tr>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Week-on-week change</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:15px; font-weight:bold; color:${wowColor};">
              ${wowText}
            </td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Total units sold</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:14px;">${totalUnits.toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Top product</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:14px;">${topProduct}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Top region</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:14px;">${topRegion}</td>
          </tr>
          <tr>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Best performing day</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:14px;">${bestDay}</td>
          </tr>
        </table>

        <h2 style="font-size:15px; color:#374151; margin:0 0 12px;">Top 3 products by revenue</h2>
        <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
          ${top3Rows}
        </table>

        <h2 style="font-size:15px; color:#374151; margin:0 0 10px;">Anomaly alerts this week</h2>
        ${alertSummary}

        <div style="margin-top:20px;">
          <a href="${DASHBOARD_URL}"
             style="display:inline-block; background:#1e3a5f; color:#ffffff; padding:12px 24px;
                    border-radius:6px; text-decoration:none; font-size:14px; font-weight:bold;">
            Open Live Dashboard →
          </a>
        </div>

        <p style="margin-top:28px; font-size:11px; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:16px;">
          Automated by Business Report Pipeline · Google Apps Script · Sent every Monday at 8am
        </p>

      </div>
    </div>
  `;

  // ---- Send the email ----
  GmailApp.sendEmail(
    ALERT_EMAIL,
    `Weekly Sales Digest - ${weekStartStr} to ${weekEndStr} - ₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} (${wowText} week-on-week)`,
    '',
    { htmlBody }
  );

  // ---- Write to weekly_kpis sheet ----
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('weekly_kpis');
  sheet.appendRow([
    new Date(),
    weekStartStr,
    weekEndStr,
    totalRevenue.toFixed(2),
    totalUnits,
    topProduct,
    topRegion,
    wowChange !== null ? wowChange.toFixed(2) : 'N/A',
    alertsThisWeek
  ]);
}
