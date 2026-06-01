<?php require_once __DIR__ . '/../includes/helpers.php'; require_auth_api();
$q = trim($_GET['q'] ?? '');
if (strlen($q) < 2) { json_ok(['users' => [], 'posts' => []]); }
$like  = "%$q%";
$users = query_all("SELECT id, first_name, last_name, username, profile_picture FROM users
    WHERE (first_name LIKE ? OR last_name LIKE ? OR username LIKE ?) AND is_active=1 LIMIT 10", [$like, $like, $like]);
$posts = query_all("SELECT p.id, p.title, p.topic, u.username, u.first_name, u.last_name
    FROM posts p JOIN users u ON p.user_id=u.id
    WHERE p.title LIKE ? OR p.body LIKE ? ORDER BY p.created_at DESC LIMIT 10", [$like, $like]);
json_ok(['users' => $users, 'posts' => $posts]);
