# Deployment Guide

## 1. Set up the Google Apps Script project
1. Go to [script.google.com](https://script.google.com) and create a new project.
2. Copy each `.gs` file from `apps_script/` into the Apps Script editor as separate files 
   (matching the names in this repo).
3. In `config.gs`, set your recipient email and Sheet ID. For anything sensitive, use 
   **Project Settings → Script Properties** (PropertiesService) instead of hardcoding.

## 2. Set up Time-Driven Triggers
1. In the Apps Script editor, click the **Triggers** (clock) icon.
2. Add a trigger for each function:
   - `sendDailyAlert` → Time-driven → Day timer
   - `sendMorningSnapshot` → Time-driven → Day timer
   - `sendWeeklyDigest` → Time-driven → Week timer
3. Authorize permissions when prompted.

## 3. Connect Looker Studio
Connect it via Looker Studio → Create → Data Source → Google Sheets → select the sheet used by this project

## 4. Generate mock test data
```bash
python data/generate_data.py
```
This has no external dependencies — it only uses Python's standard library (`csv`, `random`, `datetime`).

Running it produces two files in the `data/` folder:
- `sales_data.csv` — daily transaction-level sales across 6 products and 4 regions, with 
  weekday/weekend variance, regional bias, and seasonal uplift built in
- `targets.csv` — monthly revenue targets per product

**To load this into the pipeline:** open the Google Sheet used by this project → 
**File → Import → Upload** → select each CSV → choose "Replace current sheet" or "Insert new sheet" 
depending on which tab the Apps Script and Looker Studio dashboard are reading from.

## 5. Verify
Check your inbox for the alert email shown in `alert_email.png` to confirm triggers fire correctly.
