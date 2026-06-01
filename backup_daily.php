<?php
/**
 * StudyHub — DAILY Backup
 * ───────────────────────
 * Saves to:  /backups/daily/
 * Keeps:     7 files  (= last 7 days)
 * Schedule:  Every day at 3:00 AM  →  https://cron-job.org
 *
 * cron-job.org URL:
 *   https://yourdomain.free.nf/backup_daily.php?token=YOUR_SECRET
 * Schedule: Daily at 03:00 (0 3 * * *)
 */

// ── Config ─────────────────────────────────────────────────────────
define('BACKUP_SECRET',      'CHANGE_ME_TO_SOMETHING_RANDOM_1234'); // ← CHANGE THIS (same in all 3 files)
define('BACKUP_TYPE',        'Daily');
define('BACKUP_SUBDIR',      __DIR__ . '/backups/daily');
define('BACKUP_KEEP',        7);      // 7 × 1 day = last 7 days
define('BACKUP_COMPRESS',    true);
define('MAX_EXEC_SECONDS',   60);

// Optional Telegram notifications (leave blank to disable)
define('TELEGRAM_BOT_TOKEN', '');
define('TELEGRAM_CHAT_ID',   '');

// ── Run ────────────────────────────────────────────────────────────
require_once __DIR__ . '/backup_engine.php';
