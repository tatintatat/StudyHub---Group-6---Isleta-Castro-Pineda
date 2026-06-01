<?php
require_once __DIR__ . '/../includes/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }

$data       = get_json_body();
$first_name = trim($data['first_name'] ?? '');
$last_name  = trim($data['last_name']  ?? '');
$username   = strtolower(trim($data['username'] ?? ''));
$email      = strtolower(trim($data['email']    ?? ''));
$password   = $data['password'] ?? '';

if (!$first_name || !$last_name || !$username || !$email || !$password) {
    json_err('All fields are required.');
}
if (strlen($password) < 8) {
    json_err('Password must be at least 8 characters.');
}
if (query_one("SELECT id FROM users WHERE email = ?", [$email])) {
    json_err('Email is already registered.', 409);
}
if (query_one("SELECT id FROM users WHERE username = ?", [$username])) {
    json_err('Username is already taken.', 409);
}

$pw_hash = hash_password($password);
$user_id = db_execute(
    "INSERT INTO users (first_name, last_name, username, email, password_hash, auth_provider) VALUES (?,?,?,?,?,'local')",
    [$first_name, $last_name, $username, $email, $pw_hash]
);

json_ok(['message' => 'Account created! Please sign in.', 'redirect' => '/'], 201);
