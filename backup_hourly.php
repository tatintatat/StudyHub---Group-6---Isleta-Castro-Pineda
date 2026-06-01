<?php
/**
 * StudyHub — HOURLY Backup
 * ────────────────────────
 * Saves to:  /backups/hourly/
 * Keeps:     24 files  (= last 24 hours)
 * Schedule:  Every hour  →  https://cron-job.org
 *
 * cron-job.org URL:
 *   https://yourdomain.free.nf/backup_hourly.php?token=YOUR_SECRET
 * Schedule: Every hour (0 * * * *)
 */

// ── Config ─────────────────────────────────────────────────────────
define('BACKUP_SECRET',      'CHANGE_ME_TO_SOMETHING_RANDOM_1234'); // ← CHANGE THIS (same in all 3 files)
define('BACKUP_TYPE',        'Hourly');
define('BACKUP_SUBDIR',      __DIR__ . '/backups/hourly');
define('BACKUP_KEEP',        24);     // 24 × 1 hour = last 24 hours
define('BACKUP_COMPRESS',    true);
define('MAX_EXEC_SECONDS',   60);

// Optional Telegram notifications (leave blank to disable)
define('TELEGRAM_BOT_TOKEN', '');
define('TELEGRAM_CHAT_ID',   '');

// ── Run ────────────────────────────────────────────────────────────
require_once __DIR__ . '/backup_engine.php';
