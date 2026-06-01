<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$id     = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Ensure deleted_at column exists (safe to run every request — MySQL no-ops if already exists)
try {
    db_execute("ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL");
} catch (Exception $e) {
    // Ignore — column may already exist or DB may not support IF NOT EXISTS
    try {
        db_execute("ALTER TABLE subjects ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL");
    } catch (Exception $e2) { /* already exists */ }
}

// GET /api/subjects?trash=1  — list soft-deleted subjects
if ($method === 'GET' && isset($_GET['trash'])) {
    $rows = query_all(
        "SELECT * FROM subjects WHERE user_id=? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC", [$uid]
    );
    foreach ($rows as &$r) {
        if (isset($r['created_at'])) $r['created_at'] = $r['created_at'] ? (strtotime($r['created_at']) * 1000) : null;
        if (isset($r['deleted_at'])) $r['deleted_at'] = $r['deleted_at'] ? (strtotime($r['deleted_at']) * 1000) : null;
    }
    json_ok($rows);
}

// GET /api/subjects  — list active subjects only
if ($method === 'GET' && !$id) {
    $rows = query_all(
        "SELECT * FROM subjects WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC", [$uid]
    );
    foreach ($rows as &$r) {
        if (isset($r['created_at'])) $r['created_at'] = $r['created_at'] ? (strtotime($r['created_at']) * 1000) : null;
    }
    json_ok($rows);
}

// POST /api/subjects  — create subject
if ($method === 'POST' && !$id) {
    $data  = get_json_body();
    $name  = trim($data['name'] ?? '');
    $color = $data['color'] ?? '#8b7cf8';
    if (!$name) json_err('Subject name is required.');
    $sid = db_execute(
        "INSERT INTO subjects (user_id, name, color) VALUES (?,?,?)", [$uid, $name, $color]
    );
    json_ok(['id' => $sid, 'name' => $name, 'color' => $color], 201);
}

// POST /api/subjects/{id}?action=restore  — restore from trash
if ($method === 'POST' && $id && $action === 'restore') {
    $subject = query_one("SELECT id FROM subjects WHERE id=? AND user_id=?", [$id, $uid]);
    if (!$subject) json_err('Subject not found.', 404);
    db_execute("UPDATE subjects SET deleted_at=NULL WHERE id=?", [$id]);
    json_ok(['message' => 'Subject restored.']);
}

// DELETE /api/subjects/{id}?action=purge  — permanent delete from trash
if ($method === 'DELETE' && $id && $action === 'purge') {
    $subject = query_one("SELECT id FROM subjects WHERE id=? AND user_id=?", [$id, $uid]);
    if (!$subject) json_err('Subject not found.', 404);
    db_execute("DELETE FROM subjects WHERE id=?", [$id]);
    json_ok(['message' => 'Subject permanently deleted.']);
}

// DELETE /api/subjects/{id}  — soft delete (move to trash)
if ($method === 'DELETE' && $id) {
    $subject = query_one("SELECT id FROM subjects WHERE id=? AND user_id=?", [$id, $uid]);
    if (!$subject) json_err('Subject not found.', 404);
    db_execute("UPDATE subjects SET deleted_at=NOW() WHERE id=?", [$id]);
    json_ok(['message' => 'Subject moved to trash.']);
}

json_err('Method not allowed', 405);
