// ============================================================
// MORNING SNAPSHOT WORKFLOW
// Trigger: Every day at 9am (time-based trigger in Apps Script)
// Purpose: Sends yesterday's KPI summary before the workday starts
//          Covers the previous calendar day's complete sales data
//          Includes revenue, units, top product, top region,
//          revenue per unit, and week-on-week comparison
//          Sends regardless of performance — always-on briefing
// Dependencies: helpers.gs must be present in the same project
// ============================================================

function runMorningSnapshot() {

  const allRows  = getSheetData('sales_data');
  const today    = new Date();

  // Yesterday's date
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Same day previous week — for comparison
  const prevWeekSameDay = new Date(yesterday);
  prevWeekSameDay.setDate(yesterday.getDate() - 7);

  const yesterdayStr    = formatDateStandalone(yesterday);
  const prevWeekStr     = formatDateStandalone(prevWeekSameDay);

  // Filter rows
  const yesterdayRows = allRows.filter(r => {
    const d = parseDateFromSheet(r.date);
    return formatDateStandalone(d) === yesterdayStr;
  });

  const prevWeekRows = allRows.filter(r => {
    const d = parseDateFromSheet(r.date);
    return formatDateStandalone(d) === prevWeekStr;
  });

  // Calculations
  const totalRevenue  = yesterdayRows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0);
  const totalUnits    = yesterdayRows.reduce((s, r) => s + parseInt(r.quantity || 0), 0);
  const prevRevenue   = prevWeekRows.reduce((s, r) => s + parseFloat(r.revenue || 0), 0);

  // Top product
  const productMap = {};
  yesterdayRows.forEach(r => {
    productMap[r.product] = (productMap[r.product] || 0) + parseFloat(r.revenue || 0);
  });
  const topProduct = Object.entries(productMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data';

  // Top region
  const regionMap = {};
  yesterdayRows.forEach(r => {
    regionMap[r.region] = (regionMap[r.region] || 0) + parseFloat(r.revenue || 0);
  });
  const topRegion = Object.entries(regionMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No data';

  // Week-on-week change
  const wowChange = prevRevenue > 0
    ? ((totalRevenue - prevRevenue) / prevRevenue * 100)
    : null;

  const wowText  = wowChange !== null
    ? `${wowChange >= 0 ? '+' : ''}${wowChange.toFixed(1)}% vs same day last week`
    : 'No comparison data available';

  const wowColor = wowChange !== null && wowChange >= 0 ? '#16a34a' : '#dc2626';

  // Revenue per unit — the profitability signal
  const revenuePerUnit = totalUnits > 0
    ? (totalRevenue / totalUnits).toFixed(0)
    : 0;

  // Day of week name — makes the email feel natural
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayName  = dayNames[yesterday.getDay()];

  // No data handling — if yesterday had no entries, still send but flag it
  const noData = yesterdayRows.length === 0;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; color: #111;">

      <div style="background:#1e3a5f; padding:20px 28px; border-radius:8px 8px 0 0;">
        <p style="margin:0; color:#93c5fd; font-size:12px; text-transform:uppercase; letter-spacing:1px;">Business Report Pipeline</p>
        <h1 style="margin:6px 0 0; color:#ffffff; font-size:22px;">Morning Snapshot</h1>
        <p style="margin:4px 0 0; color:#bfdbfe; font-size:13px;">${dayName}, ${yesterdayStr}</p>
      </div>

      <div style="background:#ffffff; border:1px solid #e5e7eb; border-top:none; padding:24px 28px;">

        ${noData ? `
          <div style="background:#fef9c3; border-left:4px solid #ca8a04; padding:12px 16px; margin-bottom:20px; font-size:13px; color:#854d0e;">
            ⚠ No sales data found for ${yesterdayStr}. Please verify that yesterday's data has been entered into the sheet.
          </div>
        ` : ''}

        <p style="font-size:13px; color:#6b7280; margin:0 0 16px;">
          Here is a quick summary of yesterday's sales performance.
        </p>

        <!-- Headline numbers — 2 big KPI boxes -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
          <tr>
            <td style="width:50%; padding:16px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; text-align:center; vertical-align:top;">
              <p style="margin:0; font-size:11px; color:#0369a1; text-transform:uppercase; letter-spacing:0.5px;">Total revenue</p>
              <p style="margin:6px 0 0; font-size:22px; font-weight:bold; color:#0c4a6e;">
                ₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <p style="margin:4px 0 0; font-size:12px; color:${wowColor}; font-weight:bold;">${wowText}</p>
            </td>
            <td style="width:4%;"></td>
            <td style="width:46%; padding:16px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; text-align:center; vertical-align:top;">
              <p style="margin:0; font-size:11px; color:#15803d; text-transform:uppercase; letter-spacing:0.5px;">Units sold</p>
              <p style="margin:6px 0 0; font-size:22px; font-weight:bold; color:#14532d;">${totalUnits.toLocaleString('en-IN')}</p>
              <p style="margin:4px 0 0; font-size:12px; color:#6b7280;">₹${parseInt(revenuePerUnit).toLocaleString('en-IN')} per unit avg</p>
            </td>
          </tr>
        </table>

        <!-- Detail rows -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:24px;">
          <tr style="background:#f9fafb;">
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280; width:55%;">Top product yesterday</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:14px; font-weight:bold;">${topProduct}</td>
          </tr>
          <tr>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Top region yesterday</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:14px; font-weight:bold;">${topRegion}</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Revenue per unit</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:14px;">₹${parseInt(revenuePerUnit).toLocaleString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#6b7280;">Comparison date</td>
            <td style="padding:11px 14px; border:1px solid #e5e7eb; font-size:13px; color:#9ca3af;">${prevWeekStr} — ₹${prevRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
          </tr>
        </table>

        <div style="margin-top:4px;">
          <a href="${DASHBOARD_URL}"
             style="display:inline-block; background:#1e3a5f; color:#ffffff; padding:12px 24px;
                    border-radius:6px; text-decoration:none; font-size:14px; font-weight:bold;">
            Open Live Dashboard →
          </a>
        </div>

        <p style="margin-top:28px; font-size:11px; color:#9ca3af; border-top:1px solid #f3f4f6; padding-top:16px;">
          Automated by Business Report Pipeline · Google Apps Script · Delivered every morning at 9am
        </p>

      </div>
    </div>
  `;

  GmailApp.sendEmail(
    ALERT_EMAIL,
    `Morning Snapshot - ${dayName} ${yesterdayStr} - ₹${totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} revenue - ${topProduct} led, ${topRegion} region`,
    '',
    { htmlBody }
  );
}
