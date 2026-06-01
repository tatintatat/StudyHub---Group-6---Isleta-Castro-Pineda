<?php
require_once __DIR__ . '/includes/helpers.php';
require_auth_page();
$user = sh_current_user();
if (!$user) { session_destroy(); header('Location: /index.php'); exit; }
$active_page = 'profile';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StudyHub — Profile</title>
<link rel="stylesheet" href="/static/css/style.css?v=1779582994">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>


<?php include __DIR__ . '/includes/_nav.php'; ?>
<?php include __DIR__ . '/includes/_modals.php'; ?>

<div class="main-wrap">
  <div class="page-body active">
    <div class="fbp-wrap">

      <!-- ── Cover + Avatar Row ── -->
      <div class="fbp-cover-section">
        <div class="fbp-cover-photo" id="profile-banner"></div>

        <div class="fbp-identity-row">
          <!-- Avatar -->
          <div class="fbp-ava-wrap">
            <div class="fbp-ava" id="profile-ava" onclick="document.getElementById('ava-file-input').click()">
              <?php if (!empty($user['profile_picture'])): ?>
                <img src="<?php echo htmlspecialchars($user['profile_picture']); ?>" alt="" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;">
              <?php else: ?>
                <?php echo htmlspecialchars(strtoupper(($user['first_name'][0] ?? 'U') . ($user['last_name'][0] ?? ''))); ?>
              <?php endif; ?>
            </div>
            <div class="fbp-ava-overlay" onclick="document.getElementById('ava-file-input').click()">
              <i class="fa-solid fa-camera"></i>
            </div>
            <input type="file" id="ava-file-input" accept="image/*" style="display:none;">
          </div>

          <!-- Name + stats -->
          <div class="fbp-identity-info">
            <h1 class="fbp-name" id="profile-name"><?php echo htmlspecialchars($user["first_name"] ?? ""); ?> <?php echo htmlspecialchars($user["last_name"] ?? ""); ?></h1>
            <div class="fbp-sub">
              <span><strong id="pc-followers">0</strong> followers</span>
              <span class="fbp-dot">·</span>
              <span><strong id="pc-following">0</strong> following</span>
            </div>
            <div class="fbp-handle" id="profile-handle">@<?php echo htmlspecialchars($user["username"] ?? ""); ?></div>
          </div>

          <!-- Action buttons -->
          <div class="fbp-actions">
            <button class="btn fbp-btn-primary" onclick="openEditProfileModal()">
              <i class="fa-solid fa-pen" style="margin-right:6px;"></i>Edit Profile
            </button>
            <button class="btn fbp-btn-secondary" onclick="openSessionModal()">
              <i class="fa-solid fa-clock" style="margin-right:6px;"></i>Log Session
            </button>
          </div>
        </div>
      </div>

      <!-- ── Facebook-style Tabs ── -->
      <div class="fbp-tabs-bar">
        <div class="fbp-tabs-left">
          <button class="fbp-tab active" data-tab="posts">
            <i class="fa-solid fa-table-cells-large"></i> All
          </button>
          <button class="fbp-tab" data-tab="about">
            <i class="fa-solid fa-circle-info"></i> About
          </button>
          <button class="fbp-tab" data-tab="activity">
            <i class="fa-solid fa-chart-line"></i> Activity
          </button>
          <button class="fbp-tab" data-tab="settings">
            <i class="fa-solid fa-gear"></i> Settings
          </button>
        </div>
        <div class="fbp-tabs-right">
          <div class="fbp-streak-pill">
            <i class="fa-solid fa-fire"></i>
            <span id="pc-streak">1</span> day streak
          </div>
        </div>
      </div>

      <!-- ── Body: two-column layout ── -->
      <div class="fbp-body">

        <!-- LEFT SIDEBAR -->
        <div class="fbp-sidebar">

          <!-- Intro card -->
          <div class="fbp-card">
            <div class="fbp-card-title">Intro</div>
            <div class="fbp-intro-row">
              <i class="fa-solid fa-user"></i>
              <span id="about-fullname"><?php echo htmlspecialchars($user["first_name"] ?? ""); ?> <?php echo htmlspecialchars($user["last_name"] ?? ""); ?></span>
            </div>
            <div class="fbp-intro-row">
              <i class="fa-solid fa-at"></i>
              <span id="about-uname">@<?php echo htmlspecialchars($user["username"] ?? ""); ?></span>
            </div>
            <div class="fbp-intro-row">
              <i class="fa-solid fa-envelope"></i>
              <span style="font-size:12px;"><?php echo htmlspecialchars($user["email"] ?? ""); ?></span>
            </div>
            <div class="fbp-intro-row">
              <i class="fa-solid fa-shield"></i>
              <span><?php echo htmlspecialchars(strtoupper($user["auth_provider"] ?? "")); ?></span>
            </div>
            <div class="fbp-intro-row">
              <i class="fa-solid fa-calendar"></i>
              <span>Joined <span id="about-since">—</span></span>
            </div>
            <button class="fbp-edit-details-btn" onclick="openEditProfileModal()">
              Edit details
            </button>
          </div>

          <!-- Study stats card -->
          <div class="fbp-card" style="margin-top:12px;">
            <div class="fbp-card-title">Study Stats</div>
            <div class="fbp-stat-grid">
              <div class="fbp-stat-box">
                <div class="fbp-stat-val" id="about-hours">0h</div>
                <div class="fbp-stat-lbl">Study Time</div>
              </div>
              <div class="fbp-stat-box">
                <div class="fbp-stat-val" id="about-subjects">0</div>
                <div class="fbp-stat-lbl">Subjects</div>
              </div>
              <div class="fbp-stat-box">
                <div class="fbp-stat-val" id="about-flashcards">0</div>
                <div class="fbp-stat-lbl">Flashcards</div>
              </div>
              <div class="fbp-stat-box">
                <div class="fbp-stat-val" id="about-streak">1</div>
                <div class="fbp-stat-lbl">Day Streak</div>
              </div>
            </div>
          </div>

          <!-- Recent sessions (like Highlights) -->
          <div class="fbp-card" style="margin-top:12px;">
            <div class="fbp-card-title-row">
              <span class="fbp-card-title">Recent Sessions</span>
              <button class="fbp-card-action" onclick="document.querySelector('[data-tab=activity]').click()">See all</button>
            </div>
            <div id="fbp-sidebar-sessions">
              <div style="padding:12px 0;text-align:center;color:var(--txt-muted);font-size:13px;">
                <i class="fa-solid fa-spinner fa-spin"></i>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT MAIN CONTENT -->
        <div class="fbp-main">

          <!-- Posts tab panel -->
          <div class="fbp-tab-panel active" id="ptab-posts">
            <!-- Create post box -->
            <div class="fbp-create-post-box">
              <div class="fbp-create-row">
                <div class="fbp-create-ava" id="create-ava-mini">
                  <?php if (!empty($user['profile_picture'])): ?>
                    <img src="<?php echo htmlspecialchars($user['profile_picture']); ?>" alt="" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;">
                  <?php else: ?>
                    <?php echo htmlspecialchars(strtoupper(($user['first_name'][0] ?? 'U') . ($user['last_name'][0] ?? ''))); ?>
                  <?php endif; ?>
                </div>
                <button class="fbp-create-prompt" onclick="document.querySelector('[href=\'/community\']')?.click()">
                  What's on your mind, <?php echo htmlspecialchars($user["first_name"] ?? ""); ?>?
                </button>
              </div>
              <div class="fbp-create-divider"></div>
              <div class="fbp-create-actions">
                <a href="/community" class="fbp-create-action">
                  <i class="fa-solid fa-photo-film" style="color:#45bd62;"></i> Photo/Post
                </a>
                <button class="fbp-create-action" onclick="openSessionModal()">
                  <i class="fa-solid fa-clock" style="color:#f7b928;"></i> Log Session
                </button>
                <a href="/flashcards" class="fbp-create-action">
                  <i class="fa-solid fa-layer-group" style="color:#f3425f;"></i> Flashcard
                </a>
              </div>
            </div>

            <!-- Posts filter row -->
            <div class="fbp-posts-header">
              <span class="fbp-posts-title">Posts</span>
              <div class="fbp-posts-filter">
                <button class="fbp-filter-btn active">
                  <i class="fa-solid fa-bars-staggered"></i> List view
                </button>
              </div>
            </div>

            <!-- Posts list -->
            <div id="profile-posts-list">
              <div class="empty-state" style="padding:3rem 0">
                <i class="fa-solid fa-spinner fa-spin empty-icon-fa"></i>
                <div>Loading posts…</div>
              </div>
            </div>
          </div>

          <!-- About tab panel -->
          <div class="fbp-tab-panel" id="ptab-about">
            <div class="fbp-card">
              <div class="fbp-card-title">Account Info</div>
              <div class="mini-stat-row"><span class="mini-stat-label">Full name</span><span class="mini-stat-val" id="about-fullname2"><?php echo htmlspecialchars($user["first_name"] ?? ""); ?> <?php echo htmlspecialchars($user["last_name"] ?? ""); ?></span></div>
              <div class="mini-stat-row"><span class="mini-stat-label">Username</span><span class="mini-stat-val">@<?php echo htmlspecialchars($user["username"] ?? ""); ?></span></div>
              <div class="mini-stat-row"><span class="mini-stat-label">Email</span><span class="mini-stat-val" style="font-size:12px;font-weight:400;"><?php echo htmlspecialchars($user["email"] ?? ""); ?></span></div>
              <div class="mini-stat-row"><span class="mini-stat-label">Auth method</span><span class="mini-stat-val"><?php echo htmlspecialchars(strtoupper($user["auth_provider"] ?? "")); ?></span></div>
              <div class="mini-stat-row"><span class="mini-stat-label">Member since</span><span class="mini-stat-val" id="about-since2">—</span></div>
            </div>
          </div>

          <!-- Activity tab panel -->
          <div class="fbp-tab-panel" id="ptab-activity">
            <div class="fbp-card" style="margin-bottom:16px;">
              <div class="fbp-card-title">Study Activity — Last 30 Days</div>
              <div id="profile-heatmap" style="display:grid;grid-template-columns:repeat(7,1fr);gap:5px;padding:14px 20px;"></div>
              <div style="display:flex;gap:8px;align-items:center;padding:0 20px 14px;font-size:11px;color:var(--txt-muted);">
                <span>Less</span>
                <div style="width:12px;height:12px;border-radius:3px;background:rgba(255,255,255,0.05);border:1px solid var(--border)"></div>
                <div style="width:12px;height:12px;border-radius:3px;background:rgba(59,158,255,0.2)"></div>
                <div style="width:12px;height:12px;border-radius:3px;background:rgba(59,158,255,0.5)"></div>
                <div style="width:12px;height:12px;border-radius:3px;background:rgba(59,158,255,0.85)"></div>
                <span>More</span>
              </div>
            </div>
            <div class="fbp-card">
              <div class="fbp-card-title">Recent Sessions</div>
              <div id="profile-sessions-log">
                <div class="empty-state" style="padding:2rem 0">
                  <i class="fa-solid fa-spinner fa-spin empty-icon-fa"></i>
                  <div>Loading…</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Settings tab panel -->
          <div class="fbp-tab-panel" id="ptab-settings">
            <div class="fbp-card" style="margin-bottom:12px;">
              <div class="fbp-card-title">Appearance</div>
              <div class="mini-stat-row" style="cursor:pointer;" onclick="document.getElementById('theme-btn').click()">
                <span class="mini-stat-label"><i class="fa-solid fa-moon" style="margin-right:8px;color:var(--a-blue);"></i>Dark Mode</span>
                <span class="mini-stat-val" id="settings-theme-label">Dark</span>
              </div>
            </div>
            <div class="fbp-card" style="margin-bottom:12px;">
              <div class="fbp-card-title">Edit Profile</div>
              <div style="padding:4px 0;">
                <div class="form-group">
                  <label class="form-label">First Name</label>
                  <input type="text" class="form-input" id="settings-first" value="<?php echo htmlspecialchars($user["first_name"] ?? ""); ?>">
                </div>
                <div class="form-group">
                  <label class="form-label">Last Name</label>
                  <input type="text" class="form-input" id="settings-last" value="<?php echo htmlspecialchars($user["last_name"] ?? ""); ?>">
                </div>
                <div class="form-group">
                  <label class="form-label">Username</label>
                  <input type="text" class="form-input" id="settings-username" value="<?php echo htmlspecialchars($user["username"] ?? ""); ?>">
                </div>
                <button class="btn btn-primary" style="margin-top:4px;" onclick="settingsSave()">
                  <i class="fa-solid fa-floppy-disk" style="margin-right:6px;"></i>Save Changes
                </button>
              </div>
            </div>
            <div class="fbp-card">
              <div class="fbp-card-title">Danger Zone</div>
              <div style="padding:4px 0;">
                <button class="btn" style="background:rgba(248,113,113,.1);color:var(--a-rose);border:1px solid rgba(248,113,113,.25);" onclick="signOut()">
                  <i class="fa-solid fa-arrow-right-from-bracket" style="margin-right:6px;"></i>Sign Out
                </button>
              </div>
            </div>
          </div>

        </div><!-- /fbp-main -->
      </div><!-- /fbp-body -->
    </div><!-- /fbp-wrap -->
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
<script src="/static/js/profile.js?v=1779582994"></script>
</body>
</html>