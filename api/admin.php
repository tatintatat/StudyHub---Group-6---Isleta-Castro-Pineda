<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Admin check ────────────────────────────────────────────────────────────
$me = query_one("SELECT is_admin FROM users WHERE id=?", [$uid]);
if (!$me || !$me['is_admin']) json_err('Forbidden.', 403);

// ── GET /api/admin?action=reports ─ list pending/all reports ───────────────
if ($method === 'GET' && $action === 'reports') {
    $status = $_GET['status'] ?? 'pending'; // pending|accepted|rejected|all
    $allowed = ['pending', 'accepted', 'rejected', 'all'];
    if (!in_array($status, $allowed)) $status = 'pending';

    $where  = $status !== 'all' ? "WHERE r.status=?" : "WHERE 1";
    $params = $status !== 'all' ? [$status] : [];

    $rows = query_all(
        "SELECT r.*,
            reporter.username AS reporter_username,
            reporter.first_name AS reporter_first_name,
            reporter.last_name  AS reporter_last_name,
            reviewer.username   AS reviewer_username,
            -- Post data (if post report)
            p.title   AS post_title,
            p.body    AS post_body,
            p.user_id AS post_owner_id,
            pu.username AS post_owner_username,
            pu.first_name AS post_owner_first,
            pu.last_name  AS post_owner_last,
            -- Comment data (if comment report)
            c.body    AS comment_body,
            c.user_id AS comment_owner_id,
            cu.username AS comment_owner_username,
            cu.first_name AS comment_owner_first,
            cu.last_name  AS comment_owner_last
         FROM content_reports r
         JOIN users reporter ON reporter.id = r.reporter_id
         LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
         LEFT JOIN posts p    ON r.content_type='post'    AND p.id = r.content_id
         LEFT JOIN users pu   ON pu.id = p.user_id
         LEFT JOIN comments c ON r.content_type='comment' AND c.id = r.content_id
         LEFT JOIN users cu   ON cu.id = c.user_id
         $where
         ORDER BY r.created_at DESC LIMIT 100",
        $params
    );
    json_ok($rows);
}

// ── GET /api/admin?action=stats ─ summary counts ───────────────────────────
if ($method === 'GET' && $action === 'stats') {
    $pending  = query_one("SELECT COUNT(*) AS n FROM content_reports WHERE status='pending'")['n']  ?? 0;
    $accepted = query_one("SELECT COUNT(*) AS n FROM content_reports WHERE status='accepted'")['n'] ?? 0;
    $rejected = query_one("SELECT COUNT(*) AS n FROM content_reports WHERE status='rejected'")['n'] ?? 0;
    $posts    = query_one("SELECT COUNT(*) AS n FROM posts")['n']    ?? 0;
    $comments = query_one("SELECT COUNT(*) AS n FROM comments")['n'] ?? 0;
    $users    = query_one("SELECT COUNT(*) AS n FROM users")['n']    ?? 0;
    json_ok(compact('pending', 'accepted', 'rejected', 'posts', 'comments', 'users'));
}

// ── POST /api/admin?action=review ─ accept or reject a report ──────────────
if ($method === 'POST' && $action === 'review') {
    $data      = get_json_body();
    $report_id = (int)($data['report_id'] ?? 0);
    $verdict   = $data['verdict'] ?? ''; // 'accepted' | 'rejected'

    if (!$report_id) json_err('Report ID required.', 400);
    if (!in_array($verdict, ['accepted', 'rejected'])) json_err('Invalid verdict.', 400);

    $report = query_one("SELECT * FROM content_reports WHERE id=?", [$report_id]);
    if (!$report) json_err('Report not found.', 404);

    db_execute(
        "UPDATE content_reports SET status=?, reviewed_by=?, reviewed_at=NOW() WHERE id=?",
        [$verdict, $uid, $report_id]
    );

    json_ok(['message' => 'Report ' . $verdict . '.']);
}

// ── DELETE /api/admin?action=delete_post&id={id} ───────────────────────────
if ($method === 'DELETE' && $action === 'delete_post') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_err('Post ID required.', 400);
    $post = query_one("SELECT id FROM posts WHERE id=?", [$id]);
    if (!$post) json_err('Post not found.', 404);

    // Mark related pending reports as accepted (content removed)
    db_execute(
        "UPDATE content_reports SET status='accepted', reviewed_by=?, reviewed_at=NOW() WHERE content_type='post' AND content_id=? AND status='pending'",
        [$uid, $id]
    );
    db_execute("DELETE FROM posts WHERE id=?", [$id]);
    json_ok(['message' => 'Post deleted by admin.']);
}

// ── DELETE /api/admin?action=delete_comment&id={id} ────────────────────────
if ($method === 'DELETE' && $action === 'delete_comment') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) json_err('Comment ID required.', 400);
    $comment = query_one("SELECT id, post_id FROM comments WHERE id=?", [$id]);
    if (!$comment) json_err('Comment not found.', 404);

    db_execute(
        "UPDATE content_reports SET status='accepted', reviewed_by=?, reviewed_at=NOW() WHERE content_type='comment' AND content_id=? AND status='pending'",
        [$uid, $id]
    );
    db_execute("DELETE FROM comments WHERE id=?", [$id]);
    db_execute("UPDATE posts SET comment_count=GREATEST(comment_count-1,0) WHERE id=?", [$comment['post_id']]);
    json_ok(['message' => 'Comment deleted by admin.']);
}

json_err('Not found', 404);
