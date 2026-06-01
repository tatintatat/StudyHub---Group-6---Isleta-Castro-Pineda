<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id'])     ? (int)$_GET['id']     : 0;
$action = $_GET['action'] ?? '';

// POST /api/flashcards/{id}/review
if ($method === 'POST' && $id && $action === 'review') {
    $data    = get_json_body();
    $correct = !empty($data['correct']);
    $card = query_one("SELECT id FROM flashcards WHERE id=? AND user_id=?", [$id, $uid]);
    if (!$card) json_err('Not found.', 404);
    if ($correct) {
        db_execute("UPDATE flashcards SET review_count=review_count+1, correct_count=correct_count+1 WHERE id=?", [$id]);
    } else {
        db_execute("UPDATE flashcards SET review_count=review_count+1 WHERE id=?", [$id]);
    }
    json_ok(['message' => 'Reviewed.']);
}

// DELETE /api/flashcards/{id}
if ($method === 'DELETE' && $id) {
    $card = query_one("SELECT id FROM flashcards WHERE id=? AND user_id=?", [$id, $uid]);
    if (!$card) json_err('Not found.', 404);
    db_execute("DELETE FROM flashcards WHERE id=?", [$id]);
    json_ok(['message' => 'Deleted.']);
}

// GET /api/flashcards
if ($method === 'GET') {
    $subj = $_GET['subject_id'] ?? '';
    if ($subj) {
        $rows = query_all(
            "SELECT f.*, s.name AS subject_name FROM flashcards f LEFT JOIN subjects s ON f.subject_id=s.id
             WHERE f.user_id=? AND f.subject_id=? ORDER BY f.created_at DESC",
            [$uid, (int)$subj]
        );
    } else {
        $rows = query_all(
            "SELECT f.*, s.name AS subject_name FROM flashcards f LEFT JOIN subjects s ON f.subject_id=s.id
             WHERE f.user_id=? ORDER BY f.created_at DESC",
            [$uid]
        );
    }
    foreach ($rows as &$r) {
        if (isset($r['created_at'])) $r['created_at'] = $r['created_at'] ? (strtotime($r['created_at']) * 1000) : null;
    }
    json_ok($rows);
}

// POST /api/flashcards
if ($method === 'POST') {
    $data    = get_json_body();
    $front   = trim($data['front']  ?? '');
    $back    = trim($data['back']   ?? '');
    $subj_id = !empty($data['subject_id']) ? (int)$data['subject_id'] : null;
    if (!$front || !$back) json_err('Front and back are required.');
    $fid = db_execute(
        "INSERT INTO flashcards (user_id, subject_id, front, back) VALUES (?,?,?,?)",
        [$uid, $subj_id, $front, $back]
    );
    json_ok(['id' => $fid, 'front' => $front, 'back' => $back], 201);
}

json_err('Method not allowed', 405);
