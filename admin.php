<?php
require_once __DIR__ . '/includes/helpers.php';
require_auth_page();
$user = sh_current_user();
if (!$user) { session_destroy(); header('Location: /index.php'); exit; }
if (empty($user['is_admin'])) { header('Location: /community.php'); exit; }
$active_page = 'admin';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StudyHub — Admin</title>
<link rel="stylesheet" href="/static/css/style.css">
<link rel="stylesheet" href="/static/css/admin.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>

<?php include __DIR__ . '/includes/_nav.php'; ?>
<?php include __DIR__ . '/includes/_modals.php'; ?>

<div class="main-wrap">
  <div class="page-body active" id="view-admin">

    <div class="page-header">
      <div class="page-header-left">
        <h1>Admin <em>Panel</em></h1>
        <div class="page-header-sub">Moderate the community — review reports, manage posts &amp; replies</div>
      </div>
    </div>

    <!-- Stats row -->
    <div class="stats-grid" id="admin-stats-row">
      <div class="stat-card c-amber">
        <div class="stat-icon"><i class="fa-solid fa-flag"></i></div>
        <div class="stat-val" id="stat-pending">—</div>
        <div class="stat-label">Pending reports</div>
      </div>
      <div class="stat-card c-green">
        <div class="stat-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div class="stat-val" id="stat-accepted">—</div>
        <div class="stat-label">Accepted</div>
      </div>
      <div class="stat-card c-blue">
        <div class="stat-icon"><i class="fa-solid fa-circle-xmark"></i></div>
        <div class="stat-val" id="stat-rejected">—</div>
        <div class="stat-label">Rejected</div>
      </div>
      <div class="stat-card c-purple">
        <div class="stat-icon"><i class="fa-solid fa-users"></i></div>
        <div class="stat-val" id="stat-users">—</div>
        <div class="stat-label">Total users</div>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="feed-tabs" id="admin-tabs" style="margin-bottom:1.25rem;">
      <button class="feed-tab active" data-status="pending">
        <i class="fa-solid fa-clock" style="margin-right:6px;"></i>Pending
        <span class="admin-badge" id="badge-pending"></span>
      </button>
      <button class="feed-tab" data-status="accepted">
        <i class="fa-solid fa-check" style="margin-right:6px;"></i>Accepted
      </button>
      <button class="feed-tab" data-status="rejected">
        <i class="fa-solid fa-xmark" style="margin-right:6px;"></i>Rejected
      </button>
      <button class="feed-tab" data-status="all">All reports</button>
    </div>

    <!-- Reports list -->
    <div id="admin-reports-container">
      <div class="empty-state" style="padding:3rem 0">
        <i class="fa-solid fa-spinner fa-spin empty-icon-fa"></i>
        <div>Loading reports…</div>
      </div>
    </div>

  </div>
</div>

<!-- ── CONTENT PREVIEW MODAL ──────────────────────────── -->
<div class="adm-overlay" id="adm-overlay">
  <div class="adm-modal" id="adm-modal">
    <div class="adm-modal-header">
      <div class="adm-modal-title" id="adm-modal-title">Report Detail</div>
      <button class="adm-modal-close" id="adm-close-btn"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="adm-modal-body" id="adm-modal-body"></div>
    <div class="adm-modal-footer" id="adm-modal-footer"></div>
  </div>
</div>

<script>
  window.STUDYHUB_USER = {
    id: "<?php echo htmlspecialchars($user['id'] ?? ''); ?>",
    name: "<?php echo htmlspecialchars(($user['first_name'] ?? '').' '.($user['last_name'] ?? '')); ?>",
    firstName: "<?php echo htmlspecialchars($user['first_name'] ?? ''); ?>",
    username: "<?php echo htmlspecialchars($user['username'] ?? ''); ?>",
    email: "<?php echo htmlspecialchars($user['email'] ?? ''); ?>",
    avatar: "<?php echo htmlspecialchars($user['profile_picture'] ?? ''); ?>",
    initials: "<?php echo htmlspecialchars(strtoupper(($user['first_name'][0] ?? 'U').($user['last_name'][0] ?? ''))); ?>"
  };
</script>
<script src="/static/js/nav.js"></script>
<script src="/static/js/shared.js"></script>
<script src="/static/js/admin.js"></script>
</body>
</html>
