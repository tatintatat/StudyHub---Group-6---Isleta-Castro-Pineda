<?php require_once __DIR__ . '/../includes/helpers.php'; require_auth_api();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }
db_execute("UPDATE users SET last_active=NOW() WHERE id=?", [$_SESSION['user_id']]);
json_ok(['ok' => true]);
