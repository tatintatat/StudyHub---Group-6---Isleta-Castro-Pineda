<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$action = $_GET['action'] ?? '';

// ── GET conversations ────────────────────────────────────────────────────────
if ($action === 'conversations') {
    try {
        // Get all unique people this user has conversed with
        $partners = query_all(
            "SELECT DISTINCT CASE WHEN sender_id=? THEN receiver_id ELSE sender_id END AS partner_id
             FROM messages WHERE sender_id=? OR receiver_id=?",
            [$uid, $uid, $uid]
        );
        $convs = [];
        foreach ($partners as $p) {
            $pid = (int)$p['partner_id'];
            $user_row = query_one(
                "SELECT id, first_name, last_name, username, profile_picture FROM users WHERE id=?",
                [$pid]
            );
            if (!$user_row) continue;
            $last_msg = query_one(
                "SELECT body, created_at, sender_id FROM messages
                 WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
                 ORDER BY created_at DESC LIMIT 1",
                [$uid, $pid, $pid, $uid]
            );
            $unread = query_one(
                "SELECT COUNT(*) AS cnt FROM messages WHERE sender_id=? AND receiver_id=? AND is_read=0",
                [$pid, $uid]
            );
            $online_row = query_one(
                "SELECT last_active FROM users WHERE id=?", [$pid]
            );
            $is_online = false;
            if (!empty($online_row['last_active'])) {
                $is_online = (strtotime($online_row['last_active']) >= time() - 300);
            }
            $convs[] = [
                'id'              => $user_row['id'],
                'first_name'      => $user_row['first_name'],
                'last_name'       => $user_row['last_name'],
                'username'        => $user_row['username'],
                'profile_picture' => $user_row['profile_picture'],
                'last_message'    => $last_msg['body'] ?? '',
                'last_at_secs'    => ($last_msg && $last_msg['created_at']) ? max(0, time() - strtotime($last_msg['created_at'])) : null,
                'sender_id'       => $last_msg ? (int)$last_msg['sender_id'] : 0,
                'unread_count'    => (int)($unread['cnt'] ?? 0),
                'is_online'       => $is_online,
            ];
        }
        // Sort by last_at desc
        usort($convs, function($a, $b) {
            return strcmp($b['last_at'], $a['last_at']);
        });
        json_ok($convs);
    } catch (Exception $e) {
        json_ok([]);
    }
}

// ── GET unread count ─────────────────────────────────────────────────────────
if ($action === 'unread_count') {
    try {
        $row = query_one("SELECT COUNT(*) AS cnt FROM messages WHERE receiver_id=? AND is_read=0", [$uid]);
        json_ok(['count' => (int)($row['cnt'] ?? 0)]);
    } catch (Exception $e) {
        json_ok(['count' => 0]);
    }
}

// ── POST mark individual read ────────────────────────────────────────────────
if ($method === 'POST' && $id && $action === 'read') {
    try { db_execute("UPDATE messages SET is_read=1 WHERE id=? AND receiver_id=?", [$id, $uid]); } catch (Exception $e) {}
    json_ok(['ok' => true]);
}

// ── POST read all (optionally scoped to one user) ────────────────────────────
if ($method === 'POST' && $action === 'read_all') {
    $data  = get_json_body();
    $other = trim($data['user'] ?? '');
    try {
        if ($other) {
            $ou = query_one("SELECT id FROM users WHERE username=?", [$other]);
            if ($ou) db_execute("UPDATE messages SET is_read=1 WHERE receiver_id=? AND sender_id=?", [$uid, $ou['id']]);
        } else {
            db_execute("UPDATE messages SET is_read=1 WHERE receiver_id=?", [$uid]);
        }
    } catch (Exception $e) {}
    json_ok(['ok' => true]);
}

// ── GET message thread or inbox ──────────────────────────────────────────────
if ($method === 'GET') {
    $other = $_GET['user'] ?? '';
    if ($other) {
        $ou = query_one("SELECT id FROM users WHERE username=?", [$other]);
        if (!$ou) json_ok([]);
        $rows = query_all(
            "SELECT m.id, m.sender_id, m.receiver_id, m.body, m.is_read, m.created_at,
                    u.first_name, u.last_name, u.username, u.profile_picture
             FROM messages m JOIN users u ON m.sender_id=u.id
             WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
             ORDER BY m.created_at ASC LIMIT 100",
            [$uid, $ou['id'], $ou['id'], $uid]
        );
    } else {
        $rows = query_all(
            "SELECT m.id, m.sender_id, m.receiver_id, m.body, m.is_read, m.created_at,
                    u.first_name, u.last_name, u.username, u.profile_picture
             FROM messages m JOIN users u ON m.sender_id=u.id
             WHERE m.sender_id=? OR m.receiver_id=?
             ORDER BY m.created_at DESC LIMIT 50",
            [$uid, $uid]
        );
    }
    foreach ($rows as &$r) {
        $r['seconds_ago'] = !empty($r['created_at']) ? max(0, time() - strtotime($r['created_at'])) : 0;
        $r['created_at']  = $r['created_at'] ? (string)$r['created_at'] : null; // keep for date separators
        $r['is_read']    = (bool)$r['is_read'];
    }
    json_ok($rows);
}

// ── POST send message ────────────────────────────────────────────────────────
if ($method === 'POST') {
    $data     = get_json_body();
    $receiver = $data['to'] ?? '';
    $body     = trim($data['body'] ?? '');
    if (!$receiver || !$body) json_err('Recipient and body are required.');
    $ru = query_one("SELECT id FROM users WHERE username=?", [$receiver]);
    if (!$ru) json_err('User not found.', 404);
    $mid = db_execute("INSERT INTO messages (sender_id, receiver_id, body) VALUES (?,?,?)", [$uid, $ru['id'], $body]);

    // Create notification for receiver
    $sender = query_one("SELECT first_name, last_name, username FROM users WHERE id=?", [$uid]);
    $sender_name = trim(($sender['first_name'] ?? '') . ' ' . ($sender['last_name'] ?? '')) ?: ($sender['username'] ?? 'Someone');
    $preview = mb_substr($body, 0, 80);
    db_execute(
        "INSERT INTO notifications (user_id, title, body) VALUES (?,?,?)",
        [$ru['id'], $sender_name . ' sent you a message', $preview]
    );

    json_ok(['id' => $mid, 'message' => 'Sent.'], 201);
}

json_err('Method not allowed', 405);
