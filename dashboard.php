<?php
require_once __DIR__ . '/includes/helpers.php';
require_auth_page();
$user = sh_current_user();
if (!$user) { session_destroy(); header('Location: /index.php'); exit; }
$active_page = 'dashboard';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StudyHub — Dashboard</title>
<link rel="stylesheet" href="/static/css/style.css?v=1779582994">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>


<?php include __DIR__ . '/includes/_nav.php'; ?>

<!-- Modals shared across all pages -->
<?php include __DIR__ . '/includes/_modals.php'; ?>

<div class="main-wrap">
  <div class="page-body active" id="view-dashboard">

    <div class="page-header">
      <div class="page-header-left">
        <h1>Good day, <em><?php echo htmlspecialchars($user["first_name"] ?? ""); ?></em></h1>
        <div class="page-header-sub">Here's what's happening with your studies today</div>
      </div>
      <div class="date-chip">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span id="today-date">—</span>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card c-blue">
        <div class="stat-delta delta-zero" id="delta-subjects">New</div>
        <div class="stat-icon"><i class="fa-solid fa-book-open"></i></div>
        <div class="stat-val" id="dash-subjects">0</div>
        <div class="stat-label">Subjects</div>
      </div>
      <div class="stat-card c-purple">
        <div class="stat-delta delta-zero" id="delta-flashcards">New</div>
        <div class="stat-icon"><i class="fa-solid fa-layer-group"></i></div>
        <div class="stat-val" id="dash-flashcards">0</div>
        <div class="stat-label">Flashcards</div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-delta delta-zero" id="delta-hours">New</div>
        <div class="stat-icon"><i class="fa-solid fa-clock"></i></div>
        <div class="stat-val" id="dash-hours">0h</div>
        <div class="stat-label">Study Hours</div>
      </div>
      <div class="stat-card c-amber">
        <div class="stat-delta delta-up" id="delta-streak">Active</div>
        <div class="stat-icon"><i class="fa-solid fa-fire"></i></div>
        <div class="stat-val" id="dash-streak">1</div>
        <div class="stat-label">Day Streak</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Weekly Activity</div>
            <div class="card-subtitle">Study minutes per day</div>
          </div>
          <a class="card-action" href="/reports">View all</a>
        </div>
        <div class="activity-chart" id="activity-chart"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Weekly Goal</div>
            <div class="card-subtitle">10 hours target</div>
          </div>
        </div>
        <div class="goal-ring-wrap">
          <div class="goal-ring">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#8b7cf8"/>
                  <stop offset="100%" stop-color="#22d3ee"/>
                </linearGradient>
              </defs>
              <circle class="goal-ring-bg" cx="50" cy="50" r="45"/>
              <circle class="goal-ring-fill" cx="50" cy="50" r="45" id="ring-fill"/>
            </svg>
            <div class="goal-ring-label">
              <div class="goal-pct" id="goal-pct">0%</div>
              <div class="goal-unit">done</div>
            </div>
          </div>
          <div class="goal-info">
            <div class="goal-title" id="goal-title">0 / 10 hrs studied</div>
            <div class="goal-bar-wrap"><div class="goal-bar-fill" id="goal-bar" style="width:0%"></div></div>
            <div class="goal-sub" id="goal-sub">Keep going — you can do this!</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-3">
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">My Subjects</div>
            <div class="card-subtitle">Active courses</div>
          </div>
          <a class="card-action" href="/education">+ Add</a>
        </div>
        <div class="subject-list" id="subject-list">
          <div class="empty-state">
            <i class="fa-solid fa-book-open empty-icon-fa"></i>
            <div>No subjects yet</div>
            <div class="empty-sub">Add your first subject to start tracking</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Recent Activity</div>
            <div class="card-subtitle">What you've been up to</div>
          </div>
        </div>
        <div class="activity-list" id="activity-list">
          <div class="activity-item">
            <div class="act-dot-icon" style="background:rgba(139,124,248,0.1)">
              <i class="fa-solid fa-star" style="color:var(--a-violet);font-size:13px;"></i>
            </div>
            <div class="act-text">
              <div class="act-title">Account created</div>
              <div class="act-time">Just now — Welcome to StudyHub!</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-title">Streak</div>
            <div class="card-subtitle">Consecutive study days</div>
          </div>
        </div>
        <div class="streak-wrap">
          <div class="streak-num" id="streak-num">1</div>
          <div class="streak-label"><i class="fa-solid fa-fire" style="color:var(--a-amber);margin-right:4px;"></i>day streak</div>
          <div class="streak-days" id="streak-days"></div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Quick Actions</div>
        </div>
        <div class="quick-actions">
          <button class="qa-btn" onclick="openTimerModal()">
            <div class="qa-icon" style="background:rgba(139,124,248,0.12)"><i class="fa-solid fa-play" style="color:var(--a-violet);font-size:12px;"></i></div>
            Start Session
          </button>
          <button class="qa-btn" onclick="openFlashcardModal()">
            <div class="qa-icon" style="background:rgba(99,102,241,0.12)"><i class="fa-solid fa-layer-group" style="color:var(--a-indigo);font-size:12px;"></i></div>
            New Flashcard
          </button>
          <button class="qa-btn" onclick="openNotesModal()">
            <div class="qa-icon" style="background:rgba(52,211,153,0.12)"><i class="fa-solid fa-pen-to-square" style="color:var(--a-emerald);font-size:12px;"></i></div>
            Take Notes
          </button>
          <a class="qa-btn" href="/reports" style="text-decoration:none;">
            <div class="qa-icon" style="background:rgba(251,191,36,0.12)"><i class="fa-solid fa-chart-line" style="color:var(--a-amber);font-size:12px;"></i></div>
            View Reports
          </a>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">Account Overview</div>
        </div>
        <div>
          <div class="mini-stat-row">
            <span class="mini-stat-label">Username</span>
            <span class="mini-stat-val"><?php echo htmlspecialchars($user["username"] ?? ""); ?></span>
          </div>
          <div class="mini-stat-row">
            <span class="mini-stat-label">Email</span>
            <span class="mini-stat-val" style="font-size:12px;font-weight:400;"><?php echo htmlspecialchars($user["email"] ?? ""); ?></span>
          </div>
          <div class="mini-stat-row">
            <span class="mini-stat-label">Member since</span>
            <span class="mini-stat-val" style="font-size:12px;font-weight:400;" id="member-since">—</span>
          </div>
          <div class="mini-stat-row">
            <span class="mini-stat-label">Auth method</span>
            <span class="mini-stat-val" style="font-size:12px;"><?php echo htmlspecialchars(strtoupper($user["auth_provider"] ?? "")); ?></span>
          </div>
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
<script src="/static/js/dashboard.js?v=1779582994"></script>
</body>
</html>
