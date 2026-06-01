<?php
require_once __DIR__ . '/../includes/helpers.php';

// ── Helper: HTTP POST via cURL (more reliable than file_get_contents on shared hosting) ──
function sh_curl_post(string $url, array $fields): ?array {
    if (!function_exists('curl_init')) {
        // Fallback to file_get_contents if cURL not available
        $data = http_build_query($fields);
        $ctx  = stream_context_create(['http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\nContent-Length: " . strlen($data),
            'content'       => $data,
            'ignore_errors' => true,
            'timeout'       => 15,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        return $res ? json_decode($res, true) : null;
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query($fields),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return $res ? json_decode($res, true) : null;
}

function sh_curl_get(string $url, string $bearer_token): ?array {
    if (!function_exists('curl_init')) {
        $ctx = stream_context_create(['http' => [
            'method'        => 'GET',
            'header'        => "Authorization: Bearer {$bearer_token}",
            'ignore_errors' => true,
            'timeout'       => 15,
        ]]);
        $res = @file_get_contents($url, false, $ctx);
        return $res ? json_decode($res, true) : null;
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_HTTPHEADER     => ["Authorization: Bearer {$bearer_token}"],
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    return $res ? json_decode($res, true) : null;
}

// ── Validate state & code ──────────────────────────────────────────────────
$code  = $_GET['code']  ?? '';
$error = $_GET['error'] ?? '';

if ($error) {
    // User denied Google permission
    header('Location: /?error=google_denied');
    exit;
}

if (!$code) {
    header('Location: /?error=google_cancelled');
    exit;
}

// ── Exchange code for access token ────────────────────────────────────────
$tokens = sh_curl_post('https://oauth2.googleapis.com/token', [
    'code'          => $code,
    'client_id'     => GOOGLE_CLIENT_ID,
    'client_secret' => GOOGLE_CLIENT_SECRET,
    'redirect_uri'  => GOOGLE_REDIRECT_URI,
    'grant_type'    => 'authorization_code',
]);

$access_token = $tokens['access_token'] ?? '';
if (!$access_token) {
    $err_desc = $tokens['error_description'] ?? ($tokens['error'] ?? 'unknown');
    error_log("Google token exchange failed: $err_desc");
    header('Location: /?error=google_token_failed&reason=' . urlencode($err_desc));
    exit;
}

// ── Get user profile ───────────────────────────────────────────────────────
$info = sh_curl_get('https://www.googleapis.com/oauth2/v3/userinfo', $access_token);

if (empty($info['sub'])) {
    header('Location: /?error=google_profile_failed');
    exit;
}

$google_id = $info['sub'];
$email     = strtolower($info['email'] ?? '');
$first     = $info['given_name']  ?? 'User';
$last      = $info['family_name'] ?? '';
$picture   = $info['picture']     ?? '';

if (!$email) {
    header('Location: /?error=google_no_email');
    exit;
}

// ── Find or create user ────────────────────────────────────────────────────
try {
    $user = query_one("SELECT * FROM users WHERE google_id = ?", [$google_id]);
    if (!$user) {
        $user = query_one("SELECT * FROM users WHERE email = ?", [$email]);
    }

    if ($user) {
        // Existing user — update Google info
        db_execute(
            "UPDATE users SET google_id=?, auth_provider='google', last_login=NOW()" .
            ($picture ? ", profile_picture=?" : "") . " WHERE id=?",
            $picture
                ? [$google_id, $picture, $user['id']]
                : [$google_id, $user['id']]
        );
        $user_id   = $user['id'];
        $full_name = "{$user['first_name']} {$user['last_name']}";
    } else {
        // New user — generate unique username from email
        $base_username = preg_replace('/[^a-z0-9_]/', '_', strtolower(explode('@', $email)[0]));
        $base_username = substr($base_username, 0, 20) ?: 'user';
        $username      = $base_username;
        $n             = 1;
        while (query_one("SELECT id FROM users WHERE username=?", [$username])) {
            $username = $base_username . $n++;
        }
        $user_id = db_execute(
            "INSERT INTO users (first_name, last_name, username, email, google_id, auth_provider, profile_picture, is_active)
             VALUES (?,?,?,?,?,'google',?,1)",
            [$first, $last, $username, $email, $google_id, $picture]
        );
        $full_name = trim("$first $last") ?: $username;
    }
} catch (Exception $e) {
    error_log("Google auth DB error: " . $e->getMessage());
    header('Location: /?error=db_error');
    exit;
}

// ── Set session and redirect ───────────────────────────────────────────────
// Regenerate session ID to prevent session fixation across account switches
session_regenerate_id(true);

$_SESSION['user_id']    = $user_id;
$_SESSION['user_name']  = $full_name;
$_SESSION['user_email'] = $email;
$_SESSION['login_time'] = time();

header('Location: /dashboard');
exit;
