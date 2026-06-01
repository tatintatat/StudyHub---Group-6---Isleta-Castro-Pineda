<?php
@error_reporting(0);
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$username = trim($_GET['username'] ?? '');
if (!$username) { json_err('Username required.'); }

$row = query_one(
    "SELECT last_active FROM users WHERE username = ? AND is_active = 1",
    [$username]
);

if (!$row) { json_ok(['online' => false]); }

$last = $row['last_active'] ? strtotime($row['last_active']) : 0;
$online = $last && (time() - $last) <= 60;   // 45s window matches heartbeat cadence

json_ok(['online' => $online, 'last_active' => $row['last_active']]);
