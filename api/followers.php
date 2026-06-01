<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid      = $_SESSION['user_id'];
$method   = $_SERVER['REQUEST_METHOD'];
$action   = $_GET['action'] ?? '';
$username = $_GET['username'] ?? '';

// GET counts
if ($action === 'counts') {
    try {
        $followers = query_one("SELECT COUNT(*) AS cnt FROM follows WHERE following_id=?", [$uid]);
        $following = query_one("SELECT COUNT(*) AS cnt FROM follows WHERE follower_id=?",  [$uid]);
        json_ok(['followers' => (int)($followers['cnt'] ?? 0), 'following' => (int)($following['cnt'] ?? 0)]);
    } catch (Exception $e) {
        json_ok(['followers' => 0, 'following' => 0]);
    }
}

// POST /api/users/{username}/follow
if ($method === 'POST' && $action === 'follow' && $username) {
    $target = query_one("SELECT id FROM users WHERE username=?", [$username]);
    if (!$target) json_err('User not found.', 404);
    if ($target['id'] == $uid) json_err('Cannot follow yourself.', 400);
    $existing = query_one("SELECT id FROM follows WHERE follower_id=? AND following_id=?", [$uid, $target['id']]);
    if ($existing) {
        db_execute("DELETE FROM follows WHERE follower_id=? AND following_id=?", [$uid, $target['id']]);
        json_ok(['following' => false]);
    } else {
        db_execute("INSERT INTO follows (follower_id, following_id) VALUES (?,?)", [$uid, $target['id']]);
        json_ok(['following' => true]);
    }
}

json_err('Method not allowed', 405);
