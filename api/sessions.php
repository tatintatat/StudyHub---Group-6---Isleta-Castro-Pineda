<?php
require_once __DIR__ . '/../includes/helpers.php';
require_auth_api();

$uid    = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// ── Weekly: [{day:"Mon", minutes:N}, ...] for past 7 days ──────────────────
if ($action === 'weekly') {
    $rows = query_all(
        "SELECT session_date, SUM(duration_minutes) AS total_minutes
         FROM study_sessions WHERE user_id=? AND session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY session_date ORDER BY session_date",
        [$uid]
    );
    $lookup = [];
    foreach ($rows as $r) $lookup[(string)$r['session_date']] = (int)$r['total_minutes'];
    $days_short = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    $out = [];
    for ($i = 6; $i >= 0; $i--) {
        $date  = date('Y-m-d', strtotime("-{$i} days"));
        $dow   = (int)date('N', strtotime($date)) - 1; // 0=Mon … 6=Sun
        $out[] = ['day' => $days_short[$dow], 'minutes' => $lookup[$date] ?? 0];
    }
    json_ok($out);
}

// ── Monthly: [{week:"Week 1", hours:N}, ...] last 4 weeks ──────────────────
if ($action === 'monthly') {
    $rows = query_all(
        "SELECT session_date, SUM(duration_minutes) AS total_minutes
         FROM study_sessions WHERE user_id=? AND session_date >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
         GROUP BY session_date ORDER BY session_date",
        [$uid]
    );
    $buckets = [0, 0, 0, 0]; // week4, week3, week2, week1 (oldest→newest)
    foreach ($rows as $r) {
        $days_ago = (int)floor((strtotime('today') - strtotime($r['session_date'])) / 86400);
        $idx = min(3, (int)floor($days_ago / 7));
        $buckets[3 - $idx] += (int)$r['total_minutes'];
    }
    $out = [];
    foreach (['Week 1','Week 2','Week 3','Week 4'] as $i => $label) {
        $out[] = ['week' => $label, 'hours' => round($buckets[$i] / 60, 1)];
    }
    json_ok($out);
}

// ── Heatmap: {"YYYY-MM-DD": minutes} ───────────────────────────────────────
if ($action === 'heatmap') {
    $rows = query_all(
        "SELECT session_date, SUM(duration_minutes) AS total_minutes
         FROM study_sessions WHERE user_id=? AND session_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
         GROUP BY session_date",
        [$uid]
    );
    $out = new stdClass();
    foreach ($rows as $r) $out->{(string)$r['session_date']} = (int)$r['total_minutes'];
    json_ok($out);
}

// ── Peak hours: {hour_int: minutes} ────────────────────────────────────────
if ($action === 'peak-hours') {
    $rows = query_all(
        "SELECT session_hour, SUM(duration_minutes) AS total_minutes
         FROM study_sessions WHERE user_id=? GROUP BY session_hour ORDER BY session_hour",
        [$uid]
    );
    $out = new stdClass();
    foreach ($rows as $r) $out->{(int)$r['session_hour']} = (int)$r['total_minutes'];
    json_ok($out);
}

// ── Subject breakdown: [{name, color, total, total_minutes}] ───────────────
if ($action === 'subject-breakdown') {
    $rows = query_all(
        "SELECT s.name, s.color, SUM(ss.duration_minutes) AS total_minutes
         FROM study_sessions ss JOIN subjects s ON ss.subject_id=s.id
         WHERE ss.user_id=? GROUP BY s.id, s.name, s.color ORDER BY total_minutes DESC",
        [$uid]
    );
    $out = [];
    foreach ($rows as $r) {
        $mins  = (int)$r['total_minutes'];
        $out[] = ['name' => $r['name'], 'color' => $r['color'],
                  'total' => $mins, 'total_minutes' => $mins];
    }
    json_ok($out);
}

// ── GET list ────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $rows = query_all(
        "SELECT ss.*, s.name AS subject_name, s.color AS subject_color
         FROM study_sessions ss LEFT JOIN subjects s ON ss.subject_id=s.id
         WHERE ss.user_id=? ORDER BY ss.session_date DESC, ss.created_at DESC LIMIT 100",
        [$uid]
    );
    foreach ($rows as &$r) {
        $r['session_date']      = (string)($r['session_date'] ?? '');
        $r['created_at']        = !empty($r['created_at']) ? (strtotime($r['created_at']) * 1000) : null;
        $r['duration_minutes']  = (int)($r['duration_minutes'] ?? 0);
    }
    json_ok($rows);
}

// ── POST ────────────────────────────────────────────────────────────────────
if ($method === 'POST') {
    $data     = get_json_body();
    $duration = (int)($data['duration_minutes'] ?? 0);
    $subj_id  = !empty($data['subject_id']) ? (int)$data['subject_id'] : null;
    $notes    = trim($data['notes'] ?? '');
    if ($duration < 1) json_err('Duration must be at least 1 minute.');
    $today = date('Y-m-d');
    $hour  = (int)date('G');
    $sid = db_execute(
        "INSERT INTO study_sessions (user_id, subject_id, duration_minutes, session_date, session_hour, notes)
         VALUES (?,?,?,?,?,?)",
        [$uid, $subj_id, $duration, $today, $hour, $notes]
    );
    db_execute("UPDATE users SET score=score+? WHERE id=?", [$duration, $uid]);
    json_ok(['id' => $sid, 'message' => 'Session logged.'], 201);
}

json_err('Method not allowed', 405);
