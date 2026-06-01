<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

$ALLOWED = ['flashcard_flip','flashcard_create','ai_generate','quiz_attempt','quiz_complete','timer_session','subject_create'];

// GET stats
if ($action === 'stats') {
    $rows   = query_all("SELECT feature, COUNT(*) AS cnt FROM feature_usage WHERE user_id=? GROUP BY feature", [$uid]);
    $counts = [];
    foreach ($rows as $r) $counts[$r['feature']] = (int)$r['cnt'];

    $weekly = query_all("SELECT DATE(used_at) AS day, COUNT(*) AS cnt FROM feature_usage
        WHERE user_id=? AND used_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(used_at) ORDER BY day", [$uid]);
    $weekly_total = array_sum(array_column($weekly, 'cnt'));

    json_ok([
        'flashcards_flipped' => $counts['flashcard_flip']   ?? 0,
        'flashcards_created' => $counts['flashcard_create'] ?? 0,
        'ai_generations'     => $counts['ai_generate']      ?? 0,
        'quizzes_attempted'  => $counts['quiz_attempt']     ?? 0,
        'quizzes_completed'  => $counts['quiz_complete']    ?? 0,
        'timer_sessions'     => $counts['timer_session']    ?? 0,
        'total_edu_actions'  => array_sum($counts),
        'weekly_edu_actions' => $weekly_total,
        'by_feature'         => $counts,
    ]);
}

// POST log usage
if ($method === 'POST') {
    $data    = get_json_body();
    $feature = $data['feature'] ?? '';
    if (!in_array($feature, $ALLOWED)) json_err('invalid feature', 400);
    db_execute("INSERT INTO feature_usage (user_id, feature) VALUES (?,?)", [$uid, $feature]);
    json_ok(['ok' => true]);
}

json_err('Method not allowed', 405);
