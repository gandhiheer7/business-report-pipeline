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

## 4. (Optional) Generate mock test data
```bash
python data/generate_data.py
```

## 5. Verify
Check your inbox for the alert email shown in `alert_email.png` to confirm triggers fire correctly.
