// ============================================================
// DAILY ALERT WORKFLOW
// Trigger: Every day at 6pm (time-based trigger in Apps Script)
// Purpose: Detects revenue anomalies and fires alert emails
//          Only sends email when a threshold is breached
//          Always logs the run to alert_log regardless
// ============================================================


function calculateKPIs(allRows, targetDate) {

  const targetStr   = formatDate(targetDate);
  const lastWeekStr = formatDate(
    new Date(targetDate - 7 * 24 * 60 * 60 * 1000)
  );

  const todayRows    = allRows.filter(r => formatDate(r.date) === targetStr);
  const lastWeekRows = allRows.filter(r => formatDate(r.date) === lastWeekStr);

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

  const todayRevenue  = sumRevenue(todayRows);
  const lastWkRevenue = sumRevenue(lastWeekRows);
  const todayUnits    = sumUnits(todayRows);
  const topProduct    = topBy(todayRows, 'product');
  const topRegion     = topBy(todayRows, 'region');

  const wowChange = lastWkRevenue > 0
    ? ((todayRevenue - lastWkRevenue) / lastWkRevenue * 100)
    : null;

  const alerts = [];

  if (todayRevenue <= NO_SALES_THRESHOLD) {
    alerts.push({
      type    : 'NO_SALES',
      message : 'No sales recorded today. Verify that data has been entered into the sheet.'
    });
  }

  if (wowChange !== null && wowChange < REVENUE_DROP_THRESHOLD) {
    alerts.push({
      type    : 'REVENUE_DROP',
      message : `Revenue is down ${Math.abs(wowChange).toFixed(1)}% compared to the same day last week.`
    });
  }

  return {
    targetDate   : targetStr,
    lastWeekDate : lastWeekStr,
    todayRevenue,
    lastWkRevenue,
    todayUnits,
    topProduct,
    topRegion,
    wowChange,
    alertFired   : alerts.length > 0,
    alerts
  };
}


function sendAlertEmail(kpis) {

  const changeColor  = kpis.wowChange >= 0 ? '#16a34a' : '#dc2626';
  const changePrefix = kpis.wowChange >= 0 ? '+' : '';
  const changeText   = kpis.wowChange !== null
    ? `${changePrefix}${kpis.wowChange.toFixed(1)}%`
    : 'N/A (no data last week)';

  const alertRows = kpis.alerts.map(a => `
    <tr>
      <td style="padding:12px 16px; background:#fef2f2; border-left:4px solid #dc2626;
                 color:#991b1b; font-size:14px;">
        ⚠ ${a.message}
      </td>
    </tr>
  `).join('');

  const htmlBody = `
    <div style="font-family:Arial,sans-serif; max-width:620px; margin:0 auto; color:#111;">
      <div style="background:#1e3a5f; padding:20px 28px; border-radius:8px 8px 0 0;">
        <p style="margin:0; color:#93c5fd; font-size:12px;
                  text-transform:uppercase; letter-spacing:1px;">
          Business Report Pipeline
        </p>
        <h1 style="margin:6px 0 0; color:#ffffff; font-size:22px;">Daily Sales Alert</h1>
        <p style="margin:4px 0 0; color:#bfdbfe; font-size:13px;">${kpis.targetDate}</p>
      </div>

      <div style="background:#ffffff; border:1px solid #e5e7eb;
                  border-top:none; padding:24px 28px;">
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          ${alertRows}
        </table>

        <h2 style="font-size:15px; color:#374151; margin:0 0 12px;">Today's numbers</h2>

        <table style="width:100%; border-collapse:collapse;">
          <tr style="background:#f9fafb;">
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:13px; color:#6b7280;">Today's revenue</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:14px; font-weight:bold;">
              ₹${kpis.todayRevenue.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr>
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:13px; color:#6b7280;">Same day last week</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:14px;">
              ₹${kpis.lastWkRevenue.toLocaleString('en-IN')}
            </td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:13px; color:#6b7280;">Week-on-week change</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:14px; font-weight:bold; color:${changeColor};">
              ${changeText}
            </td>
          </tr>
          <tr>
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:13px; color:#6b7280;">Units sold today</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:14px;">${kpis.todayUnits}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:13px; color:#6b7280;">Top product today</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:14px;">${kpis.topProduct}</td>
          </tr>
          <tr>
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:13px; color:#6b7280;">Top region today</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb;
                       font-size:14px;">${kpis.topRegion}</td>
          </tr>
        </table>

        <div style="margin-top:24px;">
          <a href="${DASHBOARD_URL}"
             style="display:inline-block; background:#1e3a5f; color:#ffffff;
                    padding:12px 24px; border-radius:6px; text-decoration:none;
                    font-size:14px; font-weight:bold;">
            Open Live Dashboard →
          </a>
        </div>

        <p style="margin-top:28px; font-size:11px; color:#9ca3af;
                  border-top:1px solid #f3f4f6; padding-top:16px;">
          Automated by Business Report Pipeline · Google Apps Script · Runs daily at 6pm
        </p>
      </div>
    </div>
  `;

  GmailApp.sendEmail(
    ALERT_EMAIL,
    `⚠ Sales Alert — ${kpis.targetDate} — Revenue ${kpis.wowChange !== null ? kpis.wowChange.toFixed(1) + '% week-on-week change' : 'No comparison data'}`,
    '',
    { htmlBody }
  );
}


// Master function — this is what the 6pm trigger calls
function runDailyAlert() {
  const today   = new Date();
  const allRows = getSheetData('sales_data');
  const kpis    = calculateKPIs(allRows, today);

  if (kpis.alertFired) {
    sendAlertEmail(kpis);
  }

  logRun(kpis);
}
