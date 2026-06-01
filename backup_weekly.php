<?php
/**
 * StudyHub — WEEKLY Backup
 * ────────────────────────
 * Saves to:  /backups/weekly/
 * Keeps:     4 files  (= last 4 weeks / ~1 month)
 * Schedule:  Every Sunday at 2:00 AM  →  https://cron-job.org
 *
 * cron-job.org URL:
 *   https://yourdomain.free.nf/backup_weekly.php?token=YOUR_SECRET
 * Schedule: Every Sunday at 02:00 (0 2 * * 0)
 */

// ── Config ─────────────────────────────────────────────────────────
define('BACKUP_SECRET',      'CHANGE_ME_TO_SOMETHING_RANDOM_1234'); // ← CHANGE THIS (same in all 3 files)
define('BACKUP_TYPE',        'Weekly');
define('BACKUP_SUBDIR',      __DIR__ . '/backups/weekly');
define('BACKUP_KEEP',        4);      // 4 × 1 week = last 4 weeks
define('BACKUP_COMPRESS',    true);
define('MAX_EXEC_SECONDS',   90);     // weekly = larger DB possible

// Optional Telegram notifications (leave blank to disable)
define('TELEGRAM_BOT_TOKEN', '');
define('TELEGRAM_CHAT_ID',   '');

// ── Run ────────────────────────────────────────────────────────────
require_once __DIR__ . '/backup_engine.php';
