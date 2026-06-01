<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_err('Method not allowed', 405); }

$uid = $_SESSION['user_id'];
$url = '';

$ct = $_SERVER['CONTENT_TYPE'] ?? '';
if (str_contains($ct, 'application/json')) {
    $data = get_json_body();
    $url  = trim($data['url'] ?? $data['avatar_data'] ?? '');
}

if (!$url && isset($_FILES['photo'])) {
    $f    = $_FILES['photo'];
    $b64  = base64_encode(file_get_contents($f['tmp_name']));
    $mime = $f['type'] ?: 'image/jpeg';
    $url  = "data:{$mime};base64,{$b64}";
}

if (!$url) json_err('No photo provided.');
if (!str_starts_with($url, 'data:image/') && !str_starts_with($url, 'http')) {
    json_err('Invalid image data.');
}

try {
    db_execute("UPDATE users SET profile_picture=? WHERE id=?", [$url, $uid]);
} catch (Exception $e) {
    json_err('Database error saving photo.', 500);
}

json_ok(['url' => $url, 'message' => 'Profile photo updated.']);
