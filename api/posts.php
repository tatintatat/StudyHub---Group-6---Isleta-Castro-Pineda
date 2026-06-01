<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$action = $_GET['action'] ?? '';

// POST /api/posts/{id}/like
if ($method === 'POST' && $id && $action === 'like') {
    $existing = query_one("SELECT id FROM post_likes WHERE user_id=? AND post_id=?", [$uid, $id]);
    if ($existing) {
        db_execute("DELETE FROM post_likes WHERE user_id=? AND post_id=?", [$uid, $id]);
        db_execute("UPDATE posts SET like_count=GREATEST(like_count-1,0) WHERE id=?", [$id]);
        $liked = false;
    } else {
        db_execute("INSERT INTO post_likes (user_id, post_id) VALUES (?,?)", [$uid, $id]);
        db_execute("UPDATE posts SET like_count=like_count+1 WHERE id=?", [$id]);
        $liked = true;
    }
    $count = query_one("SELECT like_count FROM posts WHERE id=?", [$id]);
    json_ok(['liked' => $liked, 'count' => (int)($count['like_count'] ?? 0)]);
}

// DELETE /api/posts/{id}
if ($method === 'DELETE' && $id) {
    $post = query_one("SELECT id FROM posts WHERE id=? AND user_id=?", [$id, $uid]);
    if (!$post) json_err('Not found.', 404);
    db_execute("DELETE FROM posts WHERE id=?", [$id]);
    json_ok(['message' => 'Post deleted.']);
}

// GET /api/posts
if ($method === 'GET') {
    $filter_  = $_GET['filter'] ?? 'all';
    $topic    = $_GET['topic']  ?? 'all';
    $target_u = trim($_GET['user'] ?? '');

    $base   = "SELECT p.*, u.first_name, u.last_name, u.username, u.profile_picture,
                (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id=p.id AND pl.user_id=?) AS user_liked,
                (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) AS comment_count,
                TIMESTAMPDIFF(SECOND, p.created_at, NOW()) AS seconds_ago
                FROM posts p JOIN users u ON p.user_id=u.id";
    $params = [$uid];
    $conds  = [];

    if ($filter_ === 'my') {
        $conds[] = "p.user_id=?"; $params[] = $uid;
    } elseif ($filter_ === 'user' && $target_u) {
        $target = query_one("SELECT id FROM users WHERE username=?", [$target_u]);
        if ($target) { $conds[] = "p.user_id=?"; $params[] = $target['id']; }
        else json_ok([]);
    } elseif ($filter_ === 'following') {
        $conds[] = "p.user_id IN (SELECT following_id FROM follows WHERE follower_id=?)";
        $params[] = $uid;
    }

    if ($topic && $topic !== 'all') {
        $conds[] = "p.topic=?"; $params[] = $topic;
    }

    if ($conds) $base .= " WHERE " . implode(" AND ", $conds);
    $base .= " ORDER BY p.created_at DESC LIMIT 50";

    $rows = query_all($base, $params);
    foreach ($rows as &$r) {
        $r['user_liked'] = (bool)$r['user_liked'];
        if (isset($r['seconds_ago'])) $r['seconds_ago'] = (int)$r['seconds_ago'];
    }
    json_ok($rows);
}

// POST /api/posts
if ($method === 'POST') {
    $data  = get_json_body();
    $title = trim($data['title'] ?? '');
    $body  = trim($data['body']  ?? '');
    $topic = $data['topic'] ?? 'General';
    if (!$title || !$body) json_err('Title and body are required.');
    $allowed = ['General','Math','Science','Notes','Help Needed'];
    if (!in_array($topic, $allowed)) $topic = 'General';
    $pid = db_execute(
        "INSERT INTO posts (user_id, title, body, topic) VALUES (?,?,?,?)",
        [$uid, $title, $body, $topic]
    );
    db_execute("UPDATE users SET score=score+10 WHERE id=?", [$uid]);
    json_ok(['id' => $pid, 'message' => 'Post created.'], 201);
}

json_err('Method not allowed', 405);
