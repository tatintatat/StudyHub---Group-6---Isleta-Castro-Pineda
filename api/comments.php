<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid     = $_SESSION['user_id'];
$method  = $_SERVER['REQUEST_METHOD'];
$post_id = isset($_GET['post_id']) ? (int)$_GET['post_id'] : 0;

if (!$post_id) json_err('Post ID required.', 400);

// GET /api/posts/{id}/comments
if ($method === 'GET') {
    $rows = query_all(
        "SELECT c.*, u.first_name, u.last_name, u.username, u.profile_picture,
         TIMESTAMPDIFF(SECOND, c.created_at, NOW()) AS seconds_ago
         FROM comments c JOIN users u ON c.user_id=u.id
         WHERE c.post_id=? ORDER BY c.created_at ASC", [$post_id]
    );
    foreach ($rows as &$r) {
        if (isset($r['seconds_ago'])) $r['seconds_ago'] = (int)$r['seconds_ago'];
    }
    json_ok($rows);
}

// POST /api/posts/{id}/comments
if ($method === 'POST') {
    $data = get_json_body();
    $body = trim($data['body'] ?? '');
    if (!$body) json_err('Comment body is required.');
    $cid = db_execute(
        "INSERT INTO comments (post_id, user_id, body) VALUES (?,?,?)",
        [$post_id, $uid, $body]
    );
    db_execute("UPDATE posts SET comment_count=comment_count+1 WHERE id=?", [$post_id]);
    json_ok(['id' => $cid, 'message' => 'Comment added.'], 201);
}

json_err('Method not allowed', 405);
