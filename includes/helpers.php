<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

// ── JSON response helpers ──────────────────────────────────────────────────
function json_ok($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    // stdClass → keep as-is; array → encode directly
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_err(string $msg, int $status = 400): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => $msg]);
    exit;
}

// ── Get JSON request body ──────────────────────────────────────────────────
function get_json_body(): array {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// ── Auth checks ────────────────────────────────────────────────────────────
function require_auth_api(): void {
    if (empty($_SESSION['user_id'])) {
        json_err('Unauthorized', 401);
    }
}

function require_auth_page(): void {
    if (empty($_SESSION['user_id'])) {
        header('Location: /index.php');
        exit;
    }
}

function sh_current_user(): ?array {
    if (empty($_SESSION['user_id'])) return null;
    return query_one("SELECT * FROM users WHERE id = ?", [$_SESSION['user_id']]);
}

// ── Password helpers ───────────────────────────────────────────────────────
function hash_password(string $pw): string {
    return password_hash($pw, PASSWORD_BCRYPT);
}

function verify_password(string $pw, string $hash): bool {
    return password_verify($pw, $hash);
}

// ── Streak calculator ──────────────────────────────────────────────────────
function calculate_streak(int $user_id): int {
    $rows = query_all(
        "SELECT DISTINCT session_date FROM study_sessions WHERE user_id=? ORDER BY session_date DESC LIMIT 365",
        [$user_id]
    );
    $streak = 0;
    if (!$rows) return $streak;
    $check = new DateTime('today');
    foreach ($rows as $r) {
        $d = new DateTime($r['session_date']);
        if ($d == $check) {
            $streak++;
            $check->modify('-1 day');
        } else {
            break;
        }
    }
    return $streak;
}
