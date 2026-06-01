<?php
@error_reporting(0);
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

// Update current user's last_active on every call
db_execute("UPDATE users SET last_active=NOW() WHERE id=?", [$_SESSION['user_id']]);

// 90s window: heartbeat=20s, so user must miss 4+ beats to appear offline
$rows = query_all(
    "SELECT id, first_name, last_name, username, profile_picture
     FROM users
     WHERE last_active >= DATE_SUB(NOW(), INTERVAL 90 SECOND)
       AND is_active = 1
     ORDER BY last_active DESC
     LIMIT 100",
    []
);

json_ok($rows);
