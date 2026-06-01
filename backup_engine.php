<?php
/**
 * backup_engine.php — Shared backup engine for StudyHub
 * ──────────────────────────────────────────────────────
 * NOT called directly. Included by:
 *   backup_hourly.php  → /backups/hourly/   keeps 24
 *   backup_daily.php   → /backups/daily/    keeps 7
 *   backup_weekly.php  → /backups/weekly/   keeps 4
 *
 * Each caller defines:
 *   BACKUP_SECRET, BACKUP_TYPE, BACKUP_SUBDIR, BACKUP_KEEP,
 *   BACKUP_COMPRESS, MAX_EXEC_SECONDS,
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

if (!defined('BACKUP_TYPE')) {
    http_response_code(403); die('Direct access not allowed.');
}

require_once __DIR__ . '/includes/config.php';

// ── Entry point ────────────────────────────────────────────────────

$is_cli = (PHP_SAPI === 'cli');

if (!$is_cli) {
    $token = $_GET['token'] ?? '';
    if (!hash_equals(BACKUP_SECRET, $token)) {
        http_response_code(403); die('Forbidden');
    }
    header('Content-Type: text/plain; charset=utf-8');
}

@set_time_limit(MAX_EXEC_SECONDS);

engine_run_backup();

// ── Core ───────────────────────────────────────────────────────────

function engine_run_backup(): void
{
    $log   = [];
    $start = microtime(true);
    $type  = BACKUP_TYPE;
    $dir   = BACKUP_SUBDIR;

    out("StudyHub {$type} Backup", $log);
    out("Started: " . date('Y-m-d H:i:s'), $log);

    // 1. Ensure sub-directory exists and is protected
    if (!is_dir($dir)) {
        if (!mkdir($dir, 0755, true)) {
            engine_fatal("Cannot create backup directory: $dir", $log);
        }
    }
    $htaccess = $dir . '/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "Order Deny,Allow\nDeny from all\n");
    }

    // 2. Connect
    try {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME);
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        out("Connected: " . DB_NAME . " @ " . DB_HOST, $log);
    } catch (PDOException $e) {
        engine_fatal("DB connection failed: " . $e->getMessage(), $log);
        return;
    }

    // 3. Tables
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    out("Tables: " . implode(', ', $tables), $log);

    // 4. Dump
    $sql = engine_build_dump($pdo, $tables, $log);

    // 5. Write
    $slug      = strtolower($type);
    $timestamp = date('Y-m-d_H-i-s');
    $ext       = BACKUP_COMPRESS ? '.sql.gz' : '.sql';
    $filename  = "studyhub_{$slug}_{$timestamp}{$ext}";
    $filepath  = $dir . '/' . $filename;

    if (BACKUP_COMPRESS) {
        $gz = gzopen($filepath, 'wb9');
        if (!$gz) engine_fatal("Cannot write gzip: $filepath", $log);
        gzwrite($gz, $sql);
        gzclose($gz);
    } else {
        file_put_contents($filepath, $sql);
    }

    $size = engine_fmt($filepath);
    out("Saved: $filename ($size)", $log);

    // 6. Rotate
    engine_rotate($dir, $slug, $log);

    // 7. Summary
    $elapsed = round(microtime(true) - $start, 2);
    $summary = "✅ {$type} backup done in {$elapsed}s — $filename ($size)";
    out($summary, $log);

    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        engine_telegram("*StudyHub {$type} Backup*\n{$summary}\n" . date('Y-m-d H:i:s'), $log);
    }
}

// ── SQL dump builder ───────────────────────────────────────────────

function engine_build_dump(PDO $pdo, array $tables, array &$log): string
{
    $lines = [
        "-- StudyHub Database Backup",
        "-- Type    : " . BACKUP_TYPE,
        "-- Generated: " . date('Y-m-d H:i:s'),
        "-- Database : " . DB_NAME,
        "-- Host     : " . DB_HOST,
        "",
        "SET FOREIGN_KEY_CHECKS=0;",
        "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';",
        "SET NAMES utf8mb4;",
        "",
    ];

    foreach ($tables as $table) {
        out("  Exporting: $table", $log);
        $create  = $pdo->query("SHOW CREATE TABLE `$table`")->fetch();
        $lines[] = "-- ── $table ──────────────────────────────";
        $lines[] = "DROP TABLE IF EXISTS `$table`;";
        $lines[] = $create['Create Table'] . ";";
        $lines[] = "";

        $count = (int)$pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
        out("    rows: $count", $log);

        if ($count === 0) { $lines[] = "-- (empty)"; $lines[] = ""; continue; }

        $chunk = 500; $offset = 0;
        while ($offset < $count) {
            $rows = $pdo->query("SELECT * FROM `$table` LIMIT $chunk OFFSET $offset")
                        ->fetchAll(PDO::FETCH_NUM);
            if (empty($rows)) break;

            $cols     = array_map(fn($c) => "`{$c['Field']}`",
                            $pdo->query("SHOW COLUMNS FROM `$table`")->fetchAll());
            $col_list = implode(', ', $cols);

            $vg = [];
            foreach ($rows as $row) {
                $vals = array_map(fn($v) => $v === null ? 'NULL' : $pdo->quote($v), $row);
                $vg[] = '(' . implode(', ', $vals) . ')';
            }
            $lines[] = "INSERT INTO `$table` ($col_list) VALUES";
            $lines[] = implode(",\n", $vg) . ";";
            $offset += $chunk;
        }
        $lines[] = "";
    }

    $lines[] = "SET FOREIGN_KEY_CHECKS=1;";
    $lines[] = "-- End of backup";
    return implode("\n", $lines);
}

// ── Rotation ───────────────────────────────────────────────────────

function engine_rotate(string $dir, string $slug, array &$log): void
{
    $files = glob($dir . "/studyhub_{$slug}_*.sql*") ?: [];
    usort($files, fn($a, $b) => filemtime($a) - filemtime($b));
    $del = count($files) - BACKUP_KEEP;
    for ($i = 0; $i < $del; $i++) {
        unlink($files[$i]);
        out("  Deleted old: " . basename($files[$i]), $log);
    }
}

// ── Telegram ───────────────────────────────────────────────────────

function engine_telegram(string $msg, array &$log): void
{
    $url  = "https://api.telegram.org/bot" . TELEGRAM_BOT_TOKEN . "/sendMessage";
    $body = json_encode(['chat_id' => TELEGRAM_CHAT_ID, 'text' => $msg, 'parse_mode' => 'Markdown']);
    $ctx  = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\n",
        'content' => $body,
        'timeout' => 5,
    ]]);
    $ok = @file_get_contents($url, false, $ctx);
    out($ok ? "Telegram sent." : "Telegram failed (non-fatal).", $log);
}

// ── Helpers ────────────────────────────────────────────────────────

function out(string $msg, array &$log): void
{
    $line = "[" . date('H:i:s') . "] $msg";
    $log[] = $line;
    echo $line . "\n";
    if (ob_get_level()) ob_flush();
    flush();
}

function engine_fatal(string $msg, array &$log): void
{
    out("FATAL: $msg", $log);
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        engine_telegram("❌ *StudyHub " . BACKUP_TYPE . " Backup FAILED*\n$msg", $log);
    }
    exit(1);
}

function engine_fmt(string $path): string
{
    $b = filesize($path);
    if ($b >= 1048576) return round($b / 1048576, 2) . ' MB';
    if ($b >= 1024)    return round($b / 1024, 2) . ' KB';
    return $b . ' B';
}
