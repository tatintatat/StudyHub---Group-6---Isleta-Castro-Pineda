<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$action = $_GET['action'] ?? '';

// POST /api/notifications/read-all
if ($method === 'POST' && $action === 'read-all') {
    db_execute("UPDATE notifications SET is_read=1 WHERE user_id=?", [$uid]);
    json_ok(['message' => 'All marked as read.']);
}

// POST /api/notifications/{id}/read
if ($method === 'POST' && $id && $action === 'read') {
    db_execute("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", [$id, $uid]);
    json_ok(['message' => 'Marked as read.']);
}

// GET /api/notifications
if ($method === 'GET') {
    $rows = query_all(
        "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30", [$uid]
    );
    $unread = query_one(
        "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=? AND is_read=0", [$uid]
    );
    foreach ($rows as &$r) {
        if (isset($r['created_at'])) $r['created_at'] = $r['created_at'] ? (strtotime($r['created_at']) * 1000) : null;
    }
    json_ok(['notifications' => $rows, 'unread' => (int)($unread['cnt'] ?? 0)]);
}

json_err('Method not allowed', 405);
