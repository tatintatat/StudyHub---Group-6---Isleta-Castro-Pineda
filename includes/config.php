<?php
// ── StudyHub Configuration ──────────────────────────────────────────────────

define('DB_HOST',             getenv('DB_HOST')             ?: 'sql104.infinityfree.com');
define('DB_USER',             getenv('DB_USER')             ?: 'if0_41941429');
define('DB_PASS',             getenv('DB_PASS')             ?: 'b8FWe2VtkZ');
define('DB_NAME',             getenv('DB_NAME')             ?: 'if0_41941429_studyhub');
define('DB_CHARSET',          'utf8mb4');

define('SECRET_KEY',          getenv('SECRET_KEY')          ?: 'studyhub-secret-2026');
define('GOOGLE_CLIENT_ID',    getenv('GOOGLE_CLIENT_ID')    ?: '266170872951-00lpnqq3981gkhgdcrm3sd42875faau4.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET',getenv('GOOGLE_CLIENT_SECRET')?: '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');
define('GOOGLE_REDIRECT_URI', getenv('GOOGLE_REDIRECT_URI') ?: 'https://studyhub-g6-isleta-castro-pineda.free.nf/auth/google/callback');
// AI is powered by Pollinations.AI — free, no API key required.

// ── Session setup (must be done BEFORE session_start) ──────────────────────
if (session_status() === PHP_SESSION_NONE) {

    // Detect HTTPS (InfinityFree may use a reverse proxy)
    $is_https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
             || (isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443)
             || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    // cookie_lifetime = 0 means the cookie is a session cookie:
    // the browser deletes it when all windows/tabs are closed.
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $is_https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    ini_set('session.use_strict_mode', 1);
    ini_set('session.gc_maxlifetime',  1800); // 30 min server-side inactivity timeout

    session_name('studyhub_session');
    session_start();
}

// ── Kill any session that has no login_time stamp ──────────────────────────
// Happens when a stale server-side session file outlives the browser cookie.
// Without this guard, returning users could stay logged in across restarts.
if (!empty($_SESSION['user_id']) && empty($_SESSION['login_time'])) {
    session_unset();
    session_destroy();

    // Restart a clean empty session so the rest of the request works normally
    session_start();
}
