<?php
require_once __DIR__ . '/includes/helpers.php';
require_auth_page();
$user = sh_current_user();
if (!$user) { session_destroy(); header('Location: /index.php'); exit; }
$active_page = 'reports';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StudyHub — Reports</title>
<link rel="stylesheet" href="/static/css/style.css?v=1779582994">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>


<?php include __DIR__ . '/includes/_nav.php'; ?>
<?php include __DIR__ . '/includes/_modals.php'; ?>

<div class="main-wrap">
  <div class="page-body active" id="view-reports">

    <div class="page-header">
      <div class="page-header-left">
        <h1>Study <em>Reports</em></h1>
        <div class="page-header-sub">Detailed breakdown of your learning performance</div>
      </div>
      <button class="post-btn" onclick="openSessionModal()">
        <i class="fa-solid fa-plus" style="margin-right:6px;"></i>Log Session
      </button>
    </div>

    <div class="stats-grid">
      <div class="stat-card c-blue">
        <div class="stat-icon"><i class="fa-solid fa-calendar-days"></i></div>
        <div class="stat-val" id="report-sessions">0</div>
        <div class="stat-label">Sessions this month</div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-icon"><i class="fa-solid fa-hourglass-half"></i></div>
        <div class="stat-val" id="report-total">0h</div>
        <div class="stat-label">Total study time</div>
      </div>
      <div class="stat-card c-purple">
        <div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div class="stat-val" id="report-goal">0%</div>
        <div class="stat-label">Goal completion</div>
      </div>
      <div class="stat-card c-amber">
        <div class="stat-icon"><i class="fa-solid fa-trophy"></i></div>
        <div class="stat-val" id="report-best">—</div>
        <div class="stat-label">Best day</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Monthly Overview</div>
            <div class="card-subtitle">Study hours per week</div>
          </div>
        </div>
        <div class="activity-chart" style="height:120px;" id="report-monthly-chart">
          <div class="act-col"><div class="act-bar-wrap"><div class="act-bar empty"></div></div><div class="act-day">W1</div></div>
          <div class="act-col"><div class="act-bar-wrap"><div class="act-bar empty"></div></div><div class="act-day">W2</div></div>
          <div class="act-col"><div class="act-bar-wrap"><div class="act-bar empty"></div></div><div class="act-day">W3</div></div>
          <div class="act-col"><div class="act-bar-wrap"><div class="act-bar empty"></div></div><div class="act-day">W4</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Subject Breakdown</div>
            <div class="card-subtitle">Time per subject</div>
          </div>
        </div>
        <div id="subject-breakdown">
          <div class="empty-state" style="padding:2rem 0">
            <i class="fa-solid fa-chart-pie empty-icon-fa"></i>
            <div>No data yet</div>
            <div class="empty-sub">Add subjects and start studying</div>
          </div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:2rem;">
      <div class="card-header">
        <div>
          <div class="card-title">Education Activity</div>
          <div class="card-subtitle">Your usage of learning features</div>
        </div>
      </div>
      <div class="stats-grid" style="padding:16px 20px 20px;">
        <div class="stat-card c-purple">
          <div class="stat-icon"><i class="fa-solid fa-layer-group"></i></div>
          <div class="stat-val" id="report-edu-flips">0</div>
          <div class="stat-label">Flashcards flipped</div>
        </div>
        <div class="stat-card c-blue">
          <div class="stat-icon"><i class="fa-solid fa-circle-question"></i></div>
          <div class="stat-val" id="report-edu-quizzes">0</div>
          <div class="stat-label">Quizzes completed</div>
        </div>
        <div class="stat-card c-green">
          <div class="stat-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
          <div class="stat-val" id="report-edu-ai">0</div>
          <div class="stat-label">AI generations</div>
        </div>
        <div class="stat-card c-amber">
          <div class="stat-icon"><i class="fa-solid fa-clock"></i></div>
          <div class="stat-val" id="report-edu-timer">0</div>
          <div class="stat-label">Timer sessions</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:2rem;">
      <div class="card-header">
        <div>
          <div class="card-title">Study Log</div>
          <div class="card-subtitle">All your sessions in one place</div>
        </div>
        <a class="card-action" href="#" onclick="openSessionModal();return false;">+ Log Session</a>
      </div>
      <div id="study-log-reports">
        <div class="empty-state" style="padding:2rem 0">
          <i class="fa-solid fa-clipboard-list empty-icon-fa"></i>
          <div>No sessions recorded yet</div>
          <div class="empty-sub">Start logging your study sessions to track progress</div>
        </div>
      </div>
    </div>

  </div>
</div>

<script>
  window.STUDYHUB_USER = {
    id: "<?php echo htmlspecialchars($user["id"] ?? ""); ?>", name: "<?php echo htmlspecialchars($user["first_name"] ?? ""); ?> <?php echo htmlspecialchars($user["last_name"] ?? ""); ?>",
    firstName: "<?php echo htmlspecialchars($user["first_name"] ?? ""); ?>", username: "<?php echo htmlspecialchars($user["username"] ?? ""); ?>",
    email: "<?php echo htmlspecialchars($user["email"] ?? ""); ?>", avatar: "<?php echo htmlspecialchars($user["profile_picture"] ?? ""); ?>",
    initials: "<?php echo htmlspecialchars(strtoupper(($user["first_name"][0] ?? "U") . ($user["last_name"][0] ?? ""))); ?>"
  };
</script>
<script src="/static/js/nav.js?v=1779582994"></script>
<script src="/static/js/shared.js?v=1779582994"></script>
<script src="/static/js/reports.js?v=1779582994"></script>
</body>
</html>
