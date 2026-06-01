<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

// POST /api/report — submit a report
if ($method === 'POST') {
    $data         = get_json_body();
    $content_type = $data['content_type'] ?? '';
    $content_id   = (int)($data['content_id'] ?? 0);
    $reason       = $data['reason'] ?? 'other';
    $details      = trim($data['details'] ?? '');

    $allowed_types   = ['post', 'comment'];
    $allowed_reasons = ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'];

    if (!in_array($content_type, $allowed_types)) json_err('Invalid content type.', 400);
    if (!$content_id) json_err('Content ID required.', 400);
    if (!in_array($reason, $allowed_reasons)) $reason = 'other';

    // Check content exists
    if ($content_type === 'post') {
        $exists = query_one("SELECT id FROM posts WHERE id=?", [$content_id]);
    } else {
        $exists = query_one("SELECT id FROM comments WHERE id=?", [$content_id]);
    }
    if (!$exists) json_err('Content not found.', 404);

    // Prevent duplicate reports
    $already = query_one(
        "SELECT id FROM content_reports WHERE reporter_id=? AND content_type=? AND content_id=?",
        [$uid, $content_type, $content_id]
    );
    if ($already) json_err('You have already reported this content.', 409);

    db_execute(
        "INSERT INTO content_reports (reporter_id, content_type, content_id, reason, details) VALUES (?,?,?,?,?)",
        [$uid, $content_type, $content_id, $reason, $details]
    );

    json_ok(['message' => 'Report submitted. Our moderators will review it.']);
}

json_err('Method not allowed', 405);
