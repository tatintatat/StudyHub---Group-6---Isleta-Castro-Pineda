<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }

$uid       = $_SESSION['user_id'];
$data      = get_json_body();
$first     = trim($data['first_name'] ?? '');
$last      = trim($data['last_name']  ?? '');
$username  = strtolower(trim($data['username'] ?? ''));

if (!$first || !$last || !$username) json_err('All fields are required.');

$existing = query_one("SELECT id FROM users WHERE username=? AND id != ?", [$username, $uid]);
if ($existing) json_err('Username is already taken.', 409);

db_execute("UPDATE users SET first_name=?, last_name=?, username=? WHERE id=?", [$first, $last, $username, $uid]);
$_SESSION['user_name'] = "$first $last";
json_ok(['message' => 'Profile updated.', 'first_name' => $first, 'last_name' => $last, 'username' => $username]);
