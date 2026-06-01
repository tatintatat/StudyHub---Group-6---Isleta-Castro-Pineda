<?php
require_once __DIR__ . '/includes/helpers.php';
require_auth_page();
$user = sh_current_user();
if (!$user) { session_destroy(); header('Location: /index.php'); exit; }
$active_page = 'statistics';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StudyHub — Statistics</title>
<link rel="stylesheet" href="/static/css/style.css?v=1779582994">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>


<?php include __DIR__ . '/includes/_nav.php'; ?>
<?php include __DIR__ . '/includes/_modals.php'; ?>

<div class="main-wrap">
  <div class="page-body active" id="view-statistics">

    <div class="page-header">
      <div class="page-header-left">
        <h1>Your <em>Statistics</em></h1>
        <div class="page-header-sub">Deep dive into your learning patterns and performance</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card c-blue">
        <div class="stat-icon"><i class="fa-solid fa-bullseye"></i></div>
        <div class="stat-val" id="stat-reviewed">0</div>
        <div class="stat-label">Cards flipped</div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-icon"><i class="fa-solid fa-lightbulb"></i></div>
        <div class="stat-val" id="stat-accuracy">0%</div>
        <div class="stat-label">Accuracy rate</div>
      </div>
      <div class="stat-card c-purple">
        <div class="stat-icon"><i class="fa-solid fa-bolt"></i></div>
        <div class="stat-val" id="stat-quizzes">0</div>
        <div class="stat-label">Quizzes completed</div>
      </div>
      <div class="stat-card c-amber">
        <div class="stat-icon"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
        <div class="stat-val" id="stat-ai-gen">0</div>
        <div class="stat-label">AI generations</div>
      </div>
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Streak History</div>
            <div class="card-subtitle">Last 30 days</div>
          </div>
        </div>
        <div id="heatmap"></div>
        <div style="display:flex;gap:8px;align-items:center;padding:0 20px 14px;font-size:11px;color:var(--txt-muted);">
          <span>Less</span>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(255,255,255,0.05);border:1px solid var(--border)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(139,124,248,0.2)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(139,124,248,0.5)"></div>
          <div style="width:12px;height:12px;border-radius:3px;background:rgba(139,124,248,0.85)"></div>
          <span>More</span>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Peak Study Hours</div>
            <div class="card-subtitle">When you study most</div>
          </div>
        </div>
        <div class="activity-chart" style="height:110px;" id="peak-hours-chart"></div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Performance</div>
            <div class="card-subtitle">Key learning metrics</div>
          </div>
        </div>
        <div>
          <div class="mini-stat-row"><span class="mini-stat-label">Avg. session</span><span class="mini-stat-val" id="perf-avg">— min</span></div>
          <div class="mini-stat-row"><span class="mini-stat-label">Total sessions</span><span class="mini-stat-val" id="perf-total">0</span></div>
          <div class="mini-stat-row"><span class="mini-stat-label">Longest streak</span><span class="mini-stat-val" id="perf-streak">1 day</span></div>
          <div class="mini-stat-row"><span class="mini-stat-label">Retention rate</span><span class="mini-stat-val" id="perf-retention">—</span></div>
          <div class="mini-stat-row"><span class="mini-stat-label">Total edu actions</span><span class="mini-stat-val" id="perf-edu-total">0</span></div>
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
<script src="/static/js/statistics.js?v=1779582994"></script>
</body>
</html>
