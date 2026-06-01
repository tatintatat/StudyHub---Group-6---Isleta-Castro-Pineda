<?php require_once __DIR__ . '/../includes/helpers.php'; require_auth_api();
$rows = query_all("SELECT u.id, u.first_name, u.last_name, u.username, u.profile_picture, u.score,
    (SELECT COUNT(*) FROM posts WHERE user_id=u.id) AS post_count,
    (SELECT COALESCE(SUM(like_count),0) FROM posts WHERE user_id=u.id) AS like_count
    FROM users u WHERE u.is_active=1 ORDER BY u.score DESC LIMIT 20");
json_ok($rows);
