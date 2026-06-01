<?php
require_once __DIR__ . '/../includes/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }

$data       = get_json_body();
$identifier = strtolower(trim($data['identifier'] ?? ''));
$password   = $data['password'] ?? '';

if (!$identifier || !$password) {
    json_err('Please fill in all fields.');
}

$user = query_one(
    "SELECT * FROM users WHERE (email = ? OR username = ?) AND auth_provider = 'local'",
    [$identifier, $identifier]
);

if (!$user || !verify_password($password, $user['password_hash'])) {
    json_err('Invalid credentials.', 401);
}

db_execute("UPDATE users SET last_login = NOW() WHERE id = ?", [$user['id']]);

// Regenerate session ID on login — prevents session fixation where a previous
// user's session ID cookie is reused by the next person who logs in on the same browser.
// delete_old_session = true ensures the old server-side session file is removed.
session_regenerate_id(true);

$_SESSION['user_id']    = $user['id'];
$_SESSION['user_name']  = "{$user['first_name']} {$user['last_name']}";
$_SESSION['user_email'] = $user['email'];
$_SESSION['login_time'] = time();
json_ok(['message' => 'Logged in!', 'redirect' => '/dashboard']);
