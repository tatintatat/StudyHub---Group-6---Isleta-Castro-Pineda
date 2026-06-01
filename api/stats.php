<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid = $_SESSION['user_id'];

$subjects    = query_one("SELECT COUNT(*) AS cnt FROM subjects WHERE user_id=? AND deleted_at IS NULL",   [$uid]);
$flashcards  = query_one("SELECT COUNT(*) AS cnt FROM flashcards WHERE user_id=?", [$uid]);
$total_time  = query_one("SELECT COALESCE(SUM(duration_minutes),0) AS total FROM study_sessions WHERE user_id=?", [$uid]);
$user_info   = query_one("SELECT created_at FROM users WHERE id=?", [$uid]);
$posts_count = query_one("SELECT COUNT(*) AS cnt FROM posts WHERE user_id=?", [$uid]);
$likes_recv  = query_one("SELECT COALESCE(SUM(like_count),0) AS cnt FROM posts WHERE user_id=?", [$uid]);
$weekly_row  = query_one(
    "SELECT COALESCE(SUM(duration_minutes),0) AS s FROM study_sessions
     WHERE user_id=? AND session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
    [$uid]
);

$streak      = calculate_streak($uid);
$member_since = $user_info ? (string)$user_info['created_at'] : null;
$total_mins  = (int)($total_time['total'] ?? 0);
$weekly_mins = (int)($weekly_row['s'] ?? 0);

json_ok([
    'subjects'      => (int)($subjects['cnt']   ?? 0),
    'flashcards'    => (int)($flashcards['cnt'] ?? 0),
    'total_minutes' => $total_mins,
    'study_hours'   => round($total_mins / 60, 1),
    'streak'        => max($streak, 1),
    'score'         => 0,
    'created_at'    => $member_since,
    'member_since'  => $member_since,
    'posts'         => (int)($posts_count['cnt'] ?? 0),
    'likes'         => (int)($likes_recv['cnt']  ?? 0),
    'weekly_done'   => (int)floor($weekly_mins / 60), // whole hours, JS divides by 10
]);
