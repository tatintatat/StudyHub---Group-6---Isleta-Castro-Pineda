<?php
require_once __DIR__ . '/config.php';

// ── PDO connection (singleton per request) ─────────────────────────────────
function get_db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'mysql:host=%s;dbname=%s;charset=%s',
            DB_HOST, DB_NAME, DB_CHARSET
        );
        $opts = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $opts);
    }
    return $pdo;
}

// ── Query helpers ──────────────────────────────────────────────────────────
function query_one(string $sql, array $params = []): ?array {
    $stmt = get_db()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row ?: null;
}

function query_all(string $sql, array $params = []): array {
    $stmt = get_db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function db_execute(string $sql, array $params = []): int {
    $pdo  = get_db();
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return (int)$pdo->lastInsertId();
}

// ── Run migrations on first load ───────────────────────────────────────────
function run_migrations(): void {
    try {
        $db = get_db();

        // profile_picture column size upgrade
        $row = query_one("SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'profile_picture'");
        if ($row && in_array(strtolower($row['DATA_TYPE']), ['varchar','tinytext','text'])) {
            $db->exec("ALTER TABLE users MODIFY COLUMN profile_picture MEDIUMTEXT");
        }

        $col_exists = function(string $table, string $col) use ($db): bool {
            $stmt = $db->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?");
            $stmt->execute([$table, $col]);
            return (bool)$stmt->fetchColumn();
        };

        $missing_cols = [
            ['users','score',         "ALTER TABLE users ADD COLUMN score INT DEFAULT 0"],
            ['users','last_login',    "ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL"],
            ['users','last_active',   "ALTER TABLE users ADD COLUMN last_active TIMESTAMP NULL"],
            ['users','is_active',     "ALTER TABLE users ADD COLUMN is_active TINYINT(1) DEFAULT 1"],
            ['users','google_id',     "ALTER TABLE users ADD COLUMN google_id VARCHAR(255)"],
            ['users','auth_provider', "ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local'"],
        ];
        foreach ($missing_cols as [$t, $c, $sql]) {
            if (!$col_exists($t, $c)) {
                try { $db->exec($sql); } catch (Exception $e) {}
            }
        }

        $db->exec("CREATE TABLE IF NOT EXISTS follows (
            id INT AUTO_INCREMENT PRIMARY KEY,
            follower_id INT NOT NULL,
            following_id INT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_follow (follower_id, following_id),
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        $db->exec("CREATE TABLE IF NOT EXISTS feature_usage (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            feature ENUM('flashcard_flip','flashcard_create','ai_generate','quiz_attempt','quiz_complete','timer_session','subject_create') NOT NULL,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");

        // Messages table — try with foreign keys first, fall back without
        try {
            $db->exec("CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                body TEXT NOT NULL,
                is_read TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
            )");
        } catch (Exception $e) {
            try {
                $db->exec("CREATE TABLE IF NOT EXISTS messages (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    sender_id INT NOT NULL,
                    receiver_id INT NOT NULL,
                    body TEXT NOT NULL,
                    is_read TINYINT(1) DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )");
            } catch (Exception $e2) {}
        }

        if (!$col_exists('messages', 'is_read')) {
            try { $db->exec("ALTER TABLE messages ADD COLUMN is_read TINYINT(1) DEFAULT 0"); } catch (Exception $e) {}
        }

    } catch (Exception $e) {
        // DB might not be set up yet — that's fine
    }
}

try { run_migrations(); } catch (Exception $e) { /* non-fatal */ }
