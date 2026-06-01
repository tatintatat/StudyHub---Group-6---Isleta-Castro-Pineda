<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid      = $_SESSION['user_id'];
$username = $_GET['username'] ?? '';
if (!$username) json_err('Username required.', 400);

$user = query_one(
    "SELECT id, first_name, last_name, username, profile_picture, score, created_at, last_active
     FROM users WHERE username=? AND is_active=1",
    [$username]
);
if (!$user) json_err('User not found.', 404);

$user['created_at']  = $user['created_at']  ? (string)$user['created_at']  : null;
$user['is_online']          = $user['last_active'] && (time() - strtotime($user['last_active'])) < 300;
$user['secs_since_active']  = $user['last_active'] ? max(0, time() - strtotime($user['last_active'])) : null;
$user['last_active']        = $user['last_active'] ? (string)$user['last_active'] : null;

// Follow counts - with both field name variants for JS compatibility
try {
    $followers    = query_one("SELECT COUNT(*) AS cnt FROM follows WHERE following_id=?", [$user['id']]);
    $following    = query_one("SELECT COUNT(*) AS cnt FROM follows WHERE follower_id=?",  [$user['id']]);
    $is_following = query_one("SELECT id FROM follows WHERE follower_id=? AND following_id=?", [$uid, $user['id']]);
    $fc = (int)($followers['cnt'] ?? 0);
    $fg = (int)($following['cnt'] ?? 0);
    $user['followers_count']  = $fc; // used by community.js
    $user['following_count']  = $fg; // used by community.js
    $user['follower_count']   = $fc; // used by profile.js
    $user['following_count2'] = $fg; // alias
    $user['is_following']     = (bool)$is_following;
} catch (Exception $e) {
    $user['followers_count'] = 0;
    $user['following_count'] = 0;
    $user['follower_count']  = 0;
    $user['is_following']    = false;
}

$posts = query_one("SELECT COUNT(*) AS cnt FROM posts WHERE user_id=?", [$user['id']]);
$user['posts_count'] = (int)($posts['cnt'] ?? 0);
$user['streak']      = calculate_streak($user['id']);
$user['score']       = (int)($user['score'] ?? 0);

json_ok($user);
