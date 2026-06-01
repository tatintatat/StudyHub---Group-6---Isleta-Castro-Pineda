<?php
/**
 * StudyHub Backup Manager — Admin Page
 * Upload to: /backup_manager.php
 */

require_once __DIR__ . '/includes/helpers.php';
require_auth_page();
$user = sh_current_user();
if (!$user) { session_destroy(); header('Location: /index.php'); exit; }
if (empty($user['is_admin'])) { header('Location: /community.php'); exit; }

define('BACKUP_SECRET', 'CHANGE_ME_TO_SOMETHING_RANDOM_1234'); // ← Must match all 3 backup files
define('BASE_DIR',      __DIR__ . '/backups');

$host      = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'];
$schedules = [
    'hourly' => [
        'label'    => 'Hourly',
        'icon'     => 'fa-clock',
        'color'    => '#89dceb',
        'subdir'   => BASE_DIR . '/hourly',
        'file'     => 'backup_hourly.php',
        'keep'     => 24,
        'cron'     => '0 * * * *',
        'desc'     => 'Every hour — keeps last 24',
        'schedule' => 'Every 1 hour',
    ],
    'daily'  => [
        'label'    => 'Daily',
        'icon'     => 'fa-calendar-day',
        'color'    => '#a6e3a1',
        'subdir'   => BASE_DIR . '/daily',
        'file'     => 'backup_daily.php',
        'keep'     => 7,
        'cron'     => '0 3 * * *',
        'desc'     => 'Every day at 3:00 AM — keeps last 7',
        'schedule' => 'Every day at 03:00',
    ],
    'weekly' => [
        'label'    => 'Weekly',
        'icon'     => 'fa-calendar-week',
        'color'    => '#cba6f7',
        'subdir'   => BASE_DIR . '/weekly',
        'file'     => 'backup_weekly.php',
        'keep'     => 4,
        'cron'     => '0 2 * * 0',
        'desc'     => 'Every Sunday at 2:00 AM — keeps last 4',
        'schedule' => 'Every Sunday at 02:00',
    ],
];

// ── Handle download ────────────────────────────────────────────────
if (isset($_GET['download'], $_GET['type']) && array_key_exists($_GET['type'], $schedules)) {
    $type = $_GET['type'];
    $file = basename($_GET['download']);
    $path = $schedules[$type]['subdir'] . '/' . $file;
    if (file_exists($path) && str_starts_with($file, 'studyhub_')) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $file . '"');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: no-cache');
        readfile($path);
        exit;
    }
}

// ── Handle delete ──────────────────────────────────────────────────
$flash = '';
if (isset($_GET['delete'], $_GET['type']) && array_key_exists($_GET['type'], $schedules)) {
    $type = $_GET['type'];
    $file = basename($_GET['delete']);
    $path = $schedules[$type]['subdir'] . '/' . $file;
    if (file_exists($path) && str_starts_with($file, 'studyhub_')) {
        unlink($path);
        $flash = "Deleted: $file";
    }
}

// ── Load backup file lists ─────────────────────────────────────────
function load_backups(string $dir, string $slug): array {
    if (!is_dir($dir)) return [];
    $files = glob($dir . "/studyhub_{$slug}_*.sql*") ?: [];
    usort($files, fn($a,$b) => filemtime($b) - filemtime($a));
    return array_map(fn($f) => [
        'name' => basename($f),
        'size' => fmt_bytes(filesize($f)),
        'date' => date('M d, Y g:i A', filemtime($f)),
    ], $files);
}

function fmt_bytes(int $b): string {
    if ($b >= 1048576) return round($b/1048576,2).' MB';
    if ($b >= 1024)    return round($b/1024,2).' KB';
    return $b.' B';
}

$backups = [];
foreach ($schedules as $key => $s) {
    $backups[$key] = load_backups($s['subdir'], $key);
}

$active_page = 'admin';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StudyHub — Backup Manager</title>
<link rel="stylesheet" href="/static/css/style.css">
<link rel="stylesheet" href="/static/css/admin.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
:root {
  --card-bg: #1e1e2e;
  --border:  #2e2e42;
  --muted:   #6c7086;
  --sub:     #a6adc8;
  --txt:     #cdd6f4;
  --hover:   #252535;
  --code-bg: #151520;
}
.bm-wrap  { max-width: 960px; margin: 0 auto; padding: 0 16px 60px; }
.bm-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:12px; }
.bm-header h1 { margin:0; font-size:1.5rem; color:var(--txt); }
.bm-header h1 em { color:#89b4fa; font-style:normal; }
.back-btn { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px; background:#252535; color:var(--sub); font-size:.85rem; text-decoration:none; border:1px solid var(--border); }
.back-btn:hover { color:var(--txt); }

/* Tab strip */
.tab-strip { display:flex; gap:0; margin-bottom:24px; border-bottom:2px solid var(--border); }
.tab-btn {
  padding:10px 22px; cursor:pointer; background:none; border:none;
  color:var(--muted); font-size:.9rem; font-family:inherit;
  border-bottom:2px solid transparent; margin-bottom:-2px;
  display:flex; align-items:center; gap:7px; transition:.15s;
}
.tab-btn:hover { color:var(--txt); }
.tab-btn.active { color:var(--tab-color,#89b4fa); border-bottom-color:var(--tab-color,#89b4fa); }

/* Cards */
.card { background:var(--card-bg); border:1px solid var(--border); border-radius:12px; padding:22px; margin-bottom:20px; }
.card-title { display:flex; align-items:center; gap:8px; font-size:1rem; font-weight:600; color:var(--txt); margin:0 0 14px; }
.card-title small { font-size:.75rem; color:var(--muted); font-weight:400; }

/* Schedule banner */
.sch-banner { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:18px; }
.sch-pill { background:#1a1a2e; border:1px solid var(--border); border-radius:20px; padding:5px 14px; font-size:.8rem; color:var(--sub); display:flex; align-items:center; gap:6px; }
.sch-pill i { font-size:.7rem; }

/* Run button */
.run-btn { display:inline-flex; align-items:center; gap:8px; padding:9px 20px; border-radius:8px; font-size:.85rem; font-weight:600; border:none; cursor:pointer; transition:.15s; color:#1e1e2e; }
.run-btn:hover { opacity:.88; }
.run-btn:disabled { opacity:.5; cursor:wait; }
.run-output { display:none; margin-top:14px; background:var(--code-bg); border:1px solid var(--border); border-radius:8px; padding:14px; font-family:monospace; font-size:.78rem; color:#a6e3a1; white-space:pre-wrap; max-height:260px; overflow-y:auto; }

/* Backup table */
.backup-table { width:100%; border-collapse:collapse; }
.backup-table th { text-align:left; padding:9px 12px; font-size:.75rem; color:var(--muted); border-bottom:1px solid var(--border); text-transform:uppercase; letter-spacing:.05em; }
.backup-table td { padding:11px 12px; font-size:.875rem; color:var(--txt); border-bottom:1px solid #1a1a2a; vertical-align:middle; }
.backup-table tr:last-child td { border-bottom:none; }
.backup-table tr:hover td { background:var(--hover); }
.badge { font-size:.68rem; background:#313244; color:#89b4fa; border-radius:4px; padding:2px 6px; margin-left:5px; }
.act-btn { display:inline-flex; align-items:center; gap:5px; padding:5px 11px; border-radius:6px; font-size:.78rem; border:none; cursor:pointer; text-decoration:none; margin-right:4px; transition:.15s; }
.act-btn:hover { opacity:.8; }
.btn-dl  { background:#1e4a70; color:#7ec8f0; }
.btn-del { background:#3d1a1a; color:#f38ba8; border:1px solid #5c2020; }
.empty-state { text-align:center; padding:36px; color:var(--muted); }
.empty-state i { font-size:1.8rem; margin-bottom:10px; display:block; }

/* Setup */
.url-box { background:var(--code-bg); border:1px solid var(--border); border-radius:6px; padding:10px 14px; font-family:monospace; font-size:.78rem; color:#a6e3a1; word-break:break-all; margin:8px 0 14px; }
.steps { list-style:none; padding:0; margin:0; }
.steps li { display:flex; gap:10px; align-items:flex-start; padding:6px 0; color:var(--sub); font-size:.875rem; }
.step-n { background:#89b4fa; color:#1e1e2e; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:.68rem; font-weight:700; flex-shrink:0; margin-top:2px; }
.note-box { border-radius:7px; padding:10px 14px; font-size:.82rem; margin-top:12px; }
.note-box.info { background:#1a2a3a; border:1px solid #2a4a5a; color:#74c7ec; }
.note-box.warn { background:#2a2a1a; border:1px solid #4a4a2a; color:#f9e2af; }
.note-box a { color:inherit; }
.tab-panel { display:none; } .tab-panel.active { display:block; }

/* Flash */
.flash { border-radius:8px; padding:11px 15px; margin-bottom:18px; font-size:.875rem; background:#1a3a2a; border:1px solid #2a5a3a; color:#a6e3a1; }

/* Summary row */
.summary-row { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:24px; }
.sum-card { background:var(--card-bg); border:1px solid var(--border); border-radius:10px; padding:16px; text-align:center; }
.sum-card .sum-num { font-size:1.6rem; font-weight:700; }
.sum-card .sum-lbl { font-size:.75rem; color:var(--muted); margin-top:3px; }
@media(max-width:600px) { .summary-row { grid-template-columns:1fr; } }
</style>
</head>
<body>

<?php include __DIR__ . '/includes/_nav.php'; ?>
<?php include __DIR__ . '/includes/_modals.php'; ?>

<div class="main-wrap">
<div class="bm-wrap">

  <div class="bm-header">
    <h1><i class="fa-solid fa-database" style="color:#89b4fa;margin-right:8px"></i>Backup <em>Manager</em></h1>
    <a href="/admin.php" class="back-btn"><i class="fa-solid fa-arrow-left"></i> Admin Panel</a>
  </div>

  <?php if ($flash): ?>
  <div class="flash"><i class="fa-solid fa-check-circle"></i> <?= htmlspecialchars($flash) ?></div>
  <?php endif; ?>

  <!-- Summary -->
  <div class="summary-row">
    <?php foreach ($schedules as $key => $s): $cnt = count($backups[$key]); ?>
    <div class="sum-card">
      <div class="sum-num" style="color:<?= $s['color'] ?>"><?= $cnt ?></div>
      <div class="sum-lbl"><i class="fa-solid <?= $s['icon'] ?>" style="color:<?= $s['color'] ?>"></i> <?= $s['label'] ?> backup<?= $cnt!==1?'s':'' ?></div>
    </div>
    <?php endforeach; ?>
  </div>

  <!-- Tabs -->
  <div class="tab-strip">
    <?php foreach ($schedules as $key => $s): ?>
    <button class="tab-btn <?= $key==='hourly'?'active':'' ?>"
            style="--tab-color:<?= $s['color'] ?>"
            onclick="switchTab('<?= $key ?>')">
      <i class="fa-solid <?= $s['icon'] ?>"></i> <?= $s['label'] ?>
    </button>
    <?php endforeach; ?>
  </div>

  <!-- Tab panels -->
  <?php foreach ($schedules as $key => $s): ?>
  <div class="tab-panel <?= $key==='hourly'?'active':'' ?>" id="tab-<?= $key ?>">

    <!-- Run backup -->
    <div class="card">
      <div class="card-title">
        <i class="fa-solid <?= $s['icon'] ?>" style="color:<?= $s['color'] ?>"></i>
        <?= $s['label'] ?> Backup
        <small>— <?= $s['desc'] ?></small>
      </div>
      <div class="sch-banner">
        <div class="sch-pill"><i class="fa-solid fa-repeat"></i> <?= $s['schedule'] ?></div>
        <div class="sch-pill"><i class="fa-solid fa-layer-group"></i> Keeps last <?= $s['keep'] ?></div>
        <div class="sch-pill"><i class="fa-solid fa-file-zipper"></i> gzip compressed</div>
      </div>
      <button class="run-btn" style="background:<?= $s['color'] ?>"
              onclick="runBackup('<?= $key ?>', '<?= $s['file'] ?>', this)">
        <i class="fa-solid fa-play"></i> Run Now
      </button>
      <div class="run-output" id="out-<?= $key ?>"></div>
    </div>

    <!-- Backup list -->
    <div class="card">
      <div class="card-title">
        <i class="fa-solid fa-archive" style="color:var(--muted)"></i>
        <?= $s['label'] ?> Backup Files
        <small>(<?= count($backups[$key]) ?> / <?= $s['keep'] ?>)</small>
      </div>

      <?php if (empty($backups[$key])): ?>
      <div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        No <?= strtolower($s['label']) ?> backups yet — run one above!
      </div>
      <?php else: ?>
      <table class="backup-table">
        <thead><tr><th>File</th><th>Date</th><th>Size</th><th>Actions</th></tr></thead>
        <tbody>
          <?php foreach ($backups[$key] as $b): ?>
          <tr>
            <td>
              <?= htmlspecialchars($b['name']) ?>
              <?php if (str_ends_with($b['name'], '.gz')): ?>
              <span class="badge">gz</span>
              <?php endif; ?>
            </td>
            <td><?= $b['date'] ?></td>
            <td><?= $b['size'] ?></td>
            <td>
              <a href="?type=<?= $key ?>&download=<?= urlencode($b['name']) ?>" class="act-btn btn-dl">
                <i class="fa-solid fa-download"></i> Download
              </a>
              <a href="?type=<?= $key ?>&delete=<?= urlencode($b['name']) ?>" class="act-btn btn-del"
                 onclick="return confirm('Delete this backup?')">
                <i class="fa-solid fa-trash"></i>
              </a>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>

    <!-- cron-job.org setup -->
    <div class="card">
      <div class="card-title"><i class="fa-solid fa-robot" style="color:#f9e2af"></i> Auto-Schedule This (cron-job.org — free)</div>
      <div class="url-box"><?= htmlspecialchars($host . '/' . $s['file'] . '?token=' . BACKUP_SECRET) ?></div>
      <ul class="steps">
        <li><span class="step-n">1</span> Go to <a href="https://cron-job.org" target="_blank" style="color:#89b4fa">cron-job.org</a> → create a free account</li>
        <li><span class="step-n">2</span> Click <strong>Create Cronjob</strong> → paste the URL above</li>
        <li><span class="step-n">3</span> Set the schedule: <strong><?= $s['schedule'] ?></strong> &nbsp;<code style="background:#252535;padding:2px 7px;border-radius:4px;font-size:.78rem"><?= $s['cron'] ?></code></li>
        <li><span class="step-n">4</span> Save — done! This script will run automatically.</li>
      </ul>
      <div class="note-box info" style="margin-top:12px">
        <i class="fa-solid fa-shield-halved"></i>
        <strong>Tip:</strong> You need 3 separate cronjobs on cron-job.org — one per script.
        All 3 use the same secret token but different URLs and schedules.
      </div>
    </div>

  </div>
  <?php endforeach; ?>

  <!-- Global setup note -->
  <div class="note-box warn">
    <i class="fa-solid fa-triangle-exclamation"></i>
    <strong>First time?</strong> Make sure the <code>/backups/</code> folder exists on your server,
    and that <code>BACKUP_SECRET</code> is set to the same value in all 4 PHP files
    (<code>backup_hourly.php</code>, <code>backup_daily.php</code>, <code>backup_weekly.php</code>, <code>backup_manager.php</code>).
  </div>

</div>
</div>

<script>
function switchTab(key) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`#tab-${key}`).classList.add('active');
  // find matching tab button
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.getAttribute('onclick').includes(`'${key}'`)) b.classList.add('active');
  });
}

async function runBackup(type, file, btn) {
  const out = document.getElementById('out-' + type);
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running…';
  out.style.display = 'block';
  out.textContent = '';

  try {
    const token = <?= json_encode(BACKUP_SECRET) ?>;
    const res = await fetch(`/${file}?token=${encodeURIComponent(token)}`);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      out.textContent += dec.decode(value);
      out.scrollTop = out.scrollHeight;
    }
    setTimeout(() => location.reload(), 1200);
  } catch(e) {
    out.textContent += '\nError: ' + e.message;
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-play"></i> Run Now';
}
</script>

</body>
</html>
