<?php
require_once __DIR__ . '/includes/helpers.php';
require_auth_page();
$user = sh_current_user();
if (!$user) { session_destroy(); header('Location: /index.php'); exit; }
$active_page = 'education';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>StudyHub — Education</title>
<link rel="stylesheet" href="/static/css/style.css?v=1779582994">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<style>
/* ══════════════════════════════════
   EDUCATION PAGE — REDESIGNED
   ══════════════════════════════════ */

/* ── Page Header ── */
.edu-page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.edu-page-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--txt-primary);
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}
.edu-page-title i { color: var(--a-violet); }
.edu-page-sub { font-size: 13px; color: var(--txt-muted); margin: 3px 0 0; }
.edu-upload-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, var(--a-violet), var(--a-blue));
  color: #fff; border: none; border-radius: var(--r-sm);
  font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 4px 14px rgba(139,124,248,0.3);
  transition: opacity 0.18s, transform 0.18s;
  white-space: nowrap;
}
.edu-upload-btn:hover { opacity: 0.88; transform: translateY(-1px); }

/* ── Stats Row ── */
.edu-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.edu-stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 16px 18px;
  display: flex; align-items: center; gap: 14px;
  transition: border-color var(--t-base);
}
.edu-stat-card:hover { border-color: var(--border-hover); }
.edu-stat-icon {
  width: 42px; height: 42px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 17px; flex-shrink: 0;
}
.edu-stat-violet .edu-stat-icon { background: rgba(139,124,248,0.15); color: #a78bfa; }
.edu-stat-blue   .edu-stat-icon { background: rgba(96,165,250,0.15);  color: #60a5fa; }
.edu-stat-green  .edu-stat-icon { background: rgba(52,211,153,0.15);  color: #34d399; }
.edu-stat-amber  .edu-stat-icon { background: rgba(251,191,36,0.15);  color: #fbbf24; }
.edu-stat-val { font-size: 22px; font-weight: 800; color: var(--txt-primary); line-height: 1; }
.edu-stat-lbl { font-size: 11px; color: var(--txt-muted); font-weight: 500; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }

/* ── Tab Bar ── */
.edu-tab-bar {
  display: flex;
  gap: 4px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 5px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.edu-tab-btn {
  flex: 1; min-width: 90px;
  padding: 10px 14px;
  border: none; border-radius: 10px;
  background: transparent; color: var(--txt-secondary);
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all var(--t-base) var(--ease);
  display: flex; align-items: center; justify-content: center; gap: 7px;
  white-space: nowrap;
}
.edu-tab-btn:hover { background: var(--bg-glass); color: var(--txt-primary); }
.edu-tab-btn.active { background: var(--a-blue); color: #fff; box-shadow: 0 4px 14px var(--glow-blue); }
.edu-tab-panel { display: none; }
.edu-tab-panel.active { display: block; animation: fadeInUp 0.3s var(--ease) both; }

/* ── Section Cards ── */
.edu-section-card { padding: 0; overflow: hidden; }
.edu-section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--border);
  gap: 12px; flex-wrap: wrap;
}
.edu-section-title {
  font-size: 15px; font-weight: 700; color: var(--txt-primary);
  display: flex; align-items: center; gap: 8px;
}
.edu-section-title i { color: var(--a-violet); }
.edu-section-body { padding: 20px 22px; }

.edu-add-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid var(--border); border-radius: 8px;
  background: transparent; color: var(--txt-primary);
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all var(--t-fast);
}
.edu-add-btn:hover { background: var(--bg-glass); border-color: var(--a-blue); color: var(--a-blue); }
.edu-add-btn-primary {
  background: linear-gradient(135deg, rgba(139,124,248,0.2), rgba(96,165,250,0.15));
  border-color: rgba(139,124,248,0.4); color: var(--a-violet);
}
.edu-add-btn-primary:hover { background: rgba(139,124,248,0.3); }

/* ── Empty State ── */
.edu-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 24px; gap: 10px; color: var(--txt-muted);
  text-align: center;
}
.edu-empty i { font-size: 32px; opacity: 0.35; }
.edu-empty p { font-size: 15px; font-weight: 600; color: var(--txt-secondary); margin: 0; }
.edu-empty span { font-size: 13px; }

/* ══════════════════════════════════
   SUBJECTS — FOLDER-STYLE
   ══════════════════════════════════ */

/* Back button when inside a subject */
.edu-back-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; border: 1px solid var(--border); border-radius: 8px;
  background: transparent; color: var(--txt-secondary);
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all var(--t-fast);
  margin-bottom: 16px;
}
.edu-back-btn:hover { color: var(--txt-primary); border-color: var(--border-hover); }

/* Subjects folder grid */
.subjects-folder-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
  padding: 20px 22px;
}
.subject-folder-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 18px 16px 14px;
  cursor: pointer;
  transition: border-color var(--t-base), transform var(--t-base), background var(--t-base);
  position: relative;
  animation: fadeInUp 0.35s var(--ease) both;
}
.subject-folder-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-3px);
  background: var(--bg-card);
}
.subject-folder-top {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px;
}
.subject-folder-icon {
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.subject-folder-name {
  font-size: 14px; font-weight: 700; color: var(--txt-primary);
  line-height: 1.3; flex: 1;
  word-break: break-word;
}
.subject-folder-footer {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px;
}
.subject-folder-counts {
  display: flex; gap: 8px; flex-wrap: wrap;
}
.subject-folder-badge {
  font-size: 10px; font-weight: 600; padding: 2px 8px;
  border-radius: 10px;
  display: flex; align-items: center; gap: 4px;
}
.sfc-cards  { background: rgba(96,165,250,0.1);  color: #60a5fa; }
.sfc-quizzes{ background: rgba(251,191,36,0.1);  color: #fbbf24; }
.subject-folder-del {
  width: 28px; height: 28px; border: none;
  background: transparent; color: var(--txt-muted);
  border-radius: 7px; cursor: pointer; font-size: 11px;
  transition: all var(--t-fast); flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
}
.subject-folder-card:hover .subject-folder-del { opacity: 1; }
.subject-folder-del:hover { background: rgba(248,113,113,0.12); color: var(--a-rose); }

/* Add folder card */
.subject-add-card {
  background: transparent;
  border: 2px dashed var(--border);
  border-radius: var(--r-md);
  padding: 18px 16px;
  cursor: pointer;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 8px; min-height: 110px;
  transition: all var(--t-base);
  color: var(--txt-muted);
}
.subject-add-card:hover {
  border-color: var(--a-violet);
  background: rgba(139,124,248,0.05);
  color: var(--a-violet);
}
.subject-add-card i { font-size: 22px; }
.subject-add-card span { font-size: 13px; font-weight: 600; }

/* ══════════════════════════════════
   SUBJECT DETAIL VIEW
   ══════════════════════════════════ */
#subject-detail-view { display: none; }
#subject-detail-view.active { display: block; animation: fadeInUp 0.3s var(--ease) both; }

.subject-detail-header {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 22px; border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}
.subject-detail-icon {
  width: 48px; height: 48px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; flex-shrink: 0;
}
.subject-detail-info { flex: 1; }
.subject-detail-name { font-size: 18px; font-weight: 800; color: var(--txt-primary); }
.subject-detail-meta { font-size: 12px; color: var(--txt-muted); margin-top: 2px; }
.subject-detail-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }

/* Sub-tabs inside subject detail */
.subject-subtabs {
  display: flex; gap: 0;
  border-bottom: 1px solid var(--border);
}
.subject-subtab {
  padding: 12px 20px; border: none; background: transparent;
  color: var(--txt-muted); font-size: 13px; font-weight: 600;
  cursor: pointer; border-bottom: 2px solid transparent;
  transition: all var(--t-fast); margin-bottom: -1px;
  display: flex; align-items: center; gap: 6px;
}
.subject-subtab:hover { color: var(--txt-primary); }
.subject-subtab.active { color: var(--a-violet); border-bottom-color: var(--a-violet); }
.subject-subpanel { display: none; padding: 20px 22px; }
.subject-subpanel.active { display: block; animation: fadeInUp 0.25s var(--ease) both; }

/* ══════════════════════════════════
   FLASHCARD GRID (inside subject)
   ══════════════════════════════════ */
.fc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.fc-card {
  perspective: 1000px;
  height: 150px;
  cursor: pointer;
  animation: fadeInUp 0.35s var(--ease) both;
}
.fc-card-inner {
  width: 100%; height: 100%;
  position: relative; transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.4,0,0.2,1);
  border-radius: var(--r-md);
}
.fc-card.flipped .fc-card-inner { transform: rotateY(180deg); }
.fc-front, .fc-back {
  position: absolute; inset: 0;
  backface-visibility: hidden;
  border-radius: var(--r-md);
  padding: 16px;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  text-align: center; gap: 8px;
  border: 1px solid var(--border);
}
.fc-front { background: var(--bg-card); }
.fc-back  {
  background: linear-gradient(135deg, rgba(52,211,153,0.08), rgba(52,211,153,0.03));
  transform: rotateY(180deg);
}
.fc-icon { font-size: 18px; color: var(--a-violet); }
.fc-back .fc-icon { color: var(--a-emerald); }
.fc-txt { font-size: 12px; font-weight: 500; color: var(--txt-primary); line-height: 1.45; }
.fc-del-btn {
  position: absolute; top: 7px; right: 7px;
  width: 22px; height: 22px; border: none; border-radius: 5px;
  background: rgba(248,113,113,0.1); color: var(--a-rose);
  font-size: 10px; cursor: pointer; z-index: 10;
  opacity: 0; transition: opacity var(--t-fast);
  display: flex; align-items: center; justify-content: center;
}
.fc-card:hover .fc-del-btn { opacity: 1; }

/* ══════════════════════════════════
   QUIZ LIST (inside subject)
   ══════════════════════════════════ */
.quiz-list { display: flex; flex-direction: column; gap: 10px; }
.quiz-list-item {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 14px 18px;
  display: flex; align-items: center; gap: 14px;
  animation: fadeInUp 0.3s var(--ease) both;
  transition: border-color var(--t-base);
}
.quiz-list-item:hover { border-color: var(--border-hover); }
.quiz-list-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: rgba(96,165,250,0.12); color: #60a5fa;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; flex-shrink: 0;
}
.quiz-list-info { flex: 1; }
.quiz-list-name { font-size: 13px; font-weight: 700; color: var(--txt-primary); }
.quiz-list-meta { font-size: 11px; color: var(--txt-muted); margin-top: 2px; }
.quiz-play-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border: 1px solid rgba(96,165,250,0.3);
  border-radius: 8px; background: rgba(96,165,250,0.1);
  color: #60a5fa; font-size: 12px; font-weight: 600;
  cursor: pointer; transition: all var(--t-fast); white-space: nowrap;
}
.quiz-play-btn:hover { background: rgba(96,165,250,0.2); transform: translateY(-1px); }
.quiz-del-btn {
  width: 30px; height: 30px; border: none; border-radius: 7px;
  background: transparent; color: var(--txt-muted); cursor: pointer;
  font-size: 11px; transition: all var(--t-fast);
  display: flex; align-items: center; justify-content: center;
}
.quiz-del-btn:hover { background: rgba(248,113,113,0.1); color: var(--a-rose); }

/* ══════════════════════════════════
   QUIZ PLAYER (inline)
   ══════════════════════════════════ */
.quiz-player-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.75);
  display: none; align-items: center; justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease;
}
.quiz-player-overlay.active { display: flex; }
.quiz-player-box {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px; overflow: hidden;
  width: 100%; max-width: 540px;
  max-height: 90vh; overflow-y: auto;
  animation: slideUp 0.3s var(--ease) both;
}
@keyframes slideUp { from { transform:translateY(30px); opacity:0; } to { transform:translateY(0); opacity:1; } }
.quiz-player-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border);
}
.quiz-player-title { font-size: 15px; font-weight: 700; color: var(--txt-primary); }
.quiz-player-close {
  width: 30px; height: 30px; border: none; border-radius: 8px;
  background: var(--bg-surface); color: var(--txt-muted);
  cursor: pointer; font-size: 13px; transition: all var(--t-fast);
  display: flex; align-items: center; justify-content: center;
}
.quiz-player-close:hover { background: var(--bg-glass); color: var(--txt-primary); }
.quiz-player-body { padding: 20px; }

/* Quiz question styles */
.edu-quiz-meta { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
.edu-quiz-tag { font-size:11px;font-weight:700;color:var(--a-violet);background:rgba(139,124,248,0.12);padding:4px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px; }
.edu-quiz-ctr { font-size:13px;color:var(--txt-muted);font-weight:600; }
.edu-qprog { height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;margin-bottom:20px; }
.edu-qprog-fill { height:100%;background:linear-gradient(90deg,var(--a-violet),var(--a-blue));border-radius:2px;transition:width 0.4s ease; }
.edu-quiz-q { font-size:15px;font-weight:600;color:var(--txt-primary);line-height:1.6;margin-bottom:20px; }
.edu-quiz-opts { display:flex;flex-direction:column;gap:10px; }
.edu-quiz-opt {
  display:flex;align-items:center;gap:12px;
  padding:12px 16px;border:1px solid var(--border);border-radius:10px;
  background:var(--bg-surface);color:var(--txt-primary);
  font-size:13px;font-weight:500;cursor:pointer;text-align:left;
  transition:border-color 0.15s,background 0.15s,transform 0.12s;
}
.edu-quiz-opt:hover:not(:disabled) { border-color:var(--a-violet);background:rgba(139,124,248,0.07);transform:translateX(3px); }
.edu-quiz-opt.correct { border-color:#34d399!important;background:rgba(52,211,153,0.1)!important;color:#34d399!important; }
.edu-quiz-opt.wrong   { border-color:#f87171!important;background:rgba(248,113,113,0.1)!important;color:#f87171!important; }
.edu-opt-key { display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,0.07);font-size:11px;font-weight:700;flex-shrink:0; }
.edu-id-row { display:flex;gap:10px;align-items:center;flex-wrap:wrap; }
.edu-quiz-input { flex:1;min-width:180px;padding:11px 14px;background:var(--bg-input);border:1px solid var(--border);border-radius:10px;color:var(--txt-primary);font-size:13px; }
.edu-quiz-input:focus { outline:none;border-color:var(--a-violet); }
.edu-quiz-submit { padding:11px 20px;border:none;border-radius:10px;background:var(--a-violet);color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:opacity 0.18s;white-space:nowrap; }
.edu-quiz-submit:hover:not(:disabled) { opacity:0.86; }
.edu-quiz-submit:disabled { opacity:0.45;cursor:default; }
.edu-quiz-fb { display:flex;align-items:flex-start;gap:8px;margin-top:16px;padding:11px 14px;border-radius:10px;font-size:13px;font-weight:600;line-height:1.5; }
.edu-quiz-fb.fb-correct { background:rgba(52,211,153,0.1);color:#34d399; }
.edu-quiz-fb.fb-wrong   { background:rgba(248,113,113,0.1);color:#f87171; }
.edu-quiz-fb em { font-weight:400;font-style:normal;color:var(--txt-secondary);font-size:12px; }

/* Score screen */
.edu-score-wrap { display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px 0; }
.edu-score-chart { position:relative;width:130px;height:130px; }
.edu-score-text { text-align:center; }
.edu-score-btns { display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px; }

/* ══════════════════════════════════
   FOCUS TIMER
   ══════════════════════════════════ */
.timer-standalone {
  display:flex;flex-direction:column;align-items:center;padding:36px 20px;gap:24px;
}
.timer-circle { position:relative; }
.timer-circle svg { display:block; }
.timer-text {
  position:absolute;top:50%;left:50%;
  transform:translate(-50%,-50%);
  font-size:36px;font-weight:700;
  color:var(--txt-primary);letter-spacing:-1px;
}
.timer-label { font-size:14px;color:var(--txt-secondary);font-weight:500; }
.timer-controls { display:flex;gap:14px;align-items:center; }
.timer-presets { display:flex;gap:8px;flex-wrap:wrap;justify-content:center; }
.timer-sa-subject {
  width:100%;max-width:300px;padding:10px 14px;
  background:var(--bg-input);border:1px solid var(--border);
  border-radius:var(--r-sm);color:var(--txt-primary);font-size:13px;
}
.timer-sa-subject:focus { outline:none;border-color:var(--a-blue); }

/* ══════════════════════════════════
   AI GENERATOR
   ══════════════════════════════════ */
.edu-ai-card { padding: 0; overflow: hidden; }
.edu-ai-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px; border-bottom: 1px solid var(--border); gap: 12px; flex-wrap: wrap;
}
.edu-ai-title { display:flex;align-items:center;gap:12px; }
.edu-ai-badge {
  width:40px;height:40px;border-radius:12px;
  background:linear-gradient(135deg,rgba(139,124,248,0.2),rgba(96,165,250,0.15));
  display:flex;align-items:center;justify-content:center;
  color:var(--a-violet);font-size:17px;flex-shrink:0;
}
.edu-ai-name { font-size:15px;font-weight:700;color:var(--txt-primary); }
.edu-ai-desc { font-size:12px;color:var(--txt-muted);margin-top:2px; }
.edu-ai-status { display:flex;align-items:center;gap:7px;font-size:12px;color:var(--a-emerald);font-weight:600; }
.edu-ai-dot { width:8px;height:8px;border-radius:50%;background:var(--a-emerald);animation:pulse 2s infinite; }

.edu-dropzone {
  margin:20px;border:2px dashed var(--border);border-radius:var(--r-md);
  min-height:130px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:border-color var(--t-base),background var(--t-base);
  overflow:hidden;
}
.edu-dropzone:hover,.edu-dropzone.over { border-color:var(--a-violet);background:rgba(139,124,248,0.04); }
.edu-dropzone-inner { text-align:center;padding:28px 20px; }
.edu-dropzone-icon { font-size:28px;color:var(--txt-muted);margin-bottom:10px; }
.edu-dropzone-title { font-size:15px;font-weight:700;color:var(--txt-primary);margin-bottom:6px; }
.edu-dropzone-sub { font-size:13px;color:var(--txt-muted);margin-bottom:14px; }
.edu-browse-btn {
  padding:8px 18px;border:1px solid var(--border);border-radius:8px;
  background:transparent;color:var(--txt-secondary);font-size:13px;font-weight:600;cursor:pointer;
  transition:all var(--t-fast);
}
.edu-browse-btn:hover { border-color:var(--a-violet);color:var(--a-violet); }
.edu-file-preview {
  display:flex;align-items:center;gap:12px;padding:16px 20px;width:100%;
}
.edu-file-icon-wrap { font-size:28px;color:var(--a-blue);flex-shrink:0; }
.edu-file-info { flex:1;min-width:0; }
.edu-file-name { font-size:14px;font-weight:600;color:var(--txt-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
.edu-file-size { font-size:12px;color:var(--txt-muted);margin-top:2px; }
.edu-file-remove { width:32px;height:32px;border:none;border-radius:8px;background:rgba(248,113,113,0.1);color:var(--a-rose);cursor:pointer;font-size:13px;transition:background var(--t-fast);flex-shrink:0; }
.edu-file-remove:hover { background:rgba(248,113,113,0.2); }
.edu-gen-options { padding:0 20px 20px; }
.edu-gen-label-title { font-size:13px;font-weight:700;color:var(--txt-primary);margin-bottom:12px; }
.edu-gen-type-row { display:flex;gap:10px;margin-bottom:18px; }
.edu-gen-choice {
  flex:1;border:1px solid var(--border);border-radius:var(--r-md);
  cursor:pointer;overflow:hidden;transition:border-color var(--t-base);
}
.edu-gen-choice input { display:none; }
.edu-gen-choice.active { border-color:var(--a-violet);background:rgba(139,124,248,0.05); }
.edu-choice-inner { padding:14px;display:flex;flex-direction:column;gap:5px; }
.edu-choice-icon { width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;margin-bottom:4px; }
.edu-choice-label { font-size:13px;font-weight:700;color:var(--txt-primary); }
.edu-choice-sub { font-size:11px;color:var(--txt-muted); }
.edu-quiz-types { margin-bottom:16px; }
.edu-quiz-chips { display:flex;gap:8px;flex-wrap:wrap; }
.edu-chip { cursor:pointer; }
.edu-chip input { display:none; }
.edu-chip span {
  display:inline-flex;align-items:center;gap:5px;
  padding:7px 13px;border:1px solid var(--border);border-radius:20px;
  font-size:12px;font-weight:600;color:var(--txt-secondary);
  transition:all var(--t-fast);
}
.edu-chip:has(input:checked) span { border-color:var(--a-blue);background:rgba(96,165,250,0.12);color:#60a5fa; }
.edu-gen-row { display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px; }
.edu-field-label { font-size:11px;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:7px;display:block; }
.edu-filter-select {
  padding:9px 12px;background:var(--bg-input);border:1px solid var(--border);
  border-radius:var(--r-sm);color:var(--txt-primary);font-size:13px;cursor:pointer;
}
.edu-filter-select:focus { outline:none;border-color:var(--a-blue); }
.edu-mode-btn {
  display:inline-flex;align-items:center;gap:6px;padding:7px 16px;border-radius:8px;
  border:1px solid rgba(255,255,255,0.1);background:transparent;color:var(--txt-muted);
  font-size:13px;font-weight:600;cursor:pointer;transition:all 0.18s;
}
.edu-mode-btn.active { background:rgba(139,124,248,0.15);border-color:#8b7cf8;color:#a78bfa; }
.edu-mode-btn:hover:not(.active) { background:var(--bg-glass);color:var(--txt-primary); }
.edu-generate-btn {
  width:100%;padding:13px;border:none;border-radius:var(--r-sm);
  background:linear-gradient(135deg,var(--a-violet),var(--a-blue));
  color:#fff;font-size:14px;font-weight:700;cursor:pointer;
  display:flex;align-items:center;justify-content:center;gap:8px;
  box-shadow:0 4px 16px rgba(139,124,248,0.3);
  transition:opacity 0.18s,transform 0.18s;
}
.edu-generate-btn:hover:not(:disabled) { opacity:0.9;transform:translateY(-1px); }
.edu-generate-btn:disabled { opacity:0.5;cursor:default;transform:none; }
@keyframes eduWarnPulse {
  0%   { transform:scale(1);   background:rgba(248,113,113,0.10); }
  50%  { transform:scale(1.02);background:rgba(248,113,113,0.22); }
  100% { transform:scale(1);   background:rgba(248,113,113,0.10); }
}
.edu-progress-wrap { padding:20px;text-align:center; }
.edu-progress-label { font-size:14px;font-weight:600;color:var(--txt-primary);margin-bottom:12px; }
.edu-progress-track { height:6px;background:rgba(255,255,255,0.07);border-radius:3px;overflow:hidden;margin-bottom:8px; }
.edu-progress-fill { height:100%;background:linear-gradient(90deg,#8b7cf8,#3b9eff);border-radius:3px;transition:width 0.6s ease;width:0%; }
.edu-progress-sub { font-size:12px;color:var(--txt-muted); }

/* Results */
.edu-res-header { display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;flex-wrap:wrap; }
.edu-res-title { font-size:15px;font-weight:700;color:var(--txt-primary);display:flex;align-items:center;gap:8px; }
.edu-res-badge { font-size:11px;background:rgba(139,124,248,0.15);color:var(--a-violet);padding:2px 8px;border-radius:10px; }
.edu-fc-grid-res { display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px; }
.edu-save-btn {
  display:inline-flex;align-items:center;gap:6px;
  padding:9px 16px;border:1px solid rgba(52,211,153,0.35);border-radius:10px;
  background:rgba(52,211,153,0.1);color:#34d399;font-size:13px;font-weight:600;cursor:pointer;
  transition:all 0.18s;
}
.edu-save-btn:hover { background:rgba(52,211,153,0.2);transform:translateY(-1px); }
.edu-take-quiz-btn {
  display:inline-flex;align-items:center;gap:7px;
  padding:9px 16px;border:1px solid rgba(139,124,248,0.35);border-radius:10px;
  background:linear-gradient(135deg,rgba(139,124,248,0.14),rgba(96,165,250,0.1));
  color:var(--a-violet);font-size:13px;font-weight:600;cursor:pointer;transition:all 0.18s;
}
.edu-take-quiz-btn:hover { background:rgba(139,124,248,0.26);transform:translateY(-1px); }

/* ── Responsive ── */
@media (max-width: 768px) {
  .edu-stats-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .edu-tab-btn { font-size: 12px; padding: 8px 8px; }
  .edu-stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .subjects-folder-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 10px; padding: 14px; }
  .fc-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
  .edu-gen-row { grid-template-columns: 1fr; }
  .edu-gen-type-row { flex-direction: column; }
  .timer-text { font-size: 28px; }
}
</style>
</head>
<body>

<?php include __DIR__ . '/includes/_nav.php'; ?>
<?php include __DIR__ . '/includes/_modals.php'; ?>

<!-- Quiz Player Overlay -->
<div class="quiz-player-overlay" id="quiz-player-overlay">
  <div class="quiz-player-box">
    <div class="quiz-player-head">
      <div class="quiz-player-title" id="quiz-player-title">Quiz</div>
      <button class="quiz-player-close" onclick="closeQuizPlayer()"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="quiz-player-body" id="quiz-player-body"></div>
  </div>
</div>

<div class="main-wrap">
  <div class="page-body active" id="view-education">

    <!-- Page Header -->
    <div class="edu-page-header">
      <div>
        <h1 class="edu-page-title"><i class="fa-solid fa-brain"></i> Education Hub</h1>
        <p class="edu-page-sub">Subjects, flashcards, quizzes, and AI-powered study tools — all in one place</p>
      </div>
      <button class="edu-upload-btn" id="edu-upload-trigger">
        <i class="fa-solid fa-cloud-arrow-up"></i><span>Upload PPT / PDF</span>
      </button>
      <input type="file" id="edu-file-input" accept=".pptx,.ppt,.pdf" style="display:none;">
    </div>

    <!-- Stats Row -->
    <div class="edu-stats-row">
      <div class="edu-stat-card edu-stat-violet">
        <div class="edu-stat-icon"><i class="fa-solid fa-book-open"></i></div>
        <div><div class="edu-stat-val" id="edu-stat-subjects">0</div><div class="edu-stat-lbl">Subjects</div></div>
      </div>
      <div class="edu-stat-card edu-stat-blue">
        <div class="edu-stat-icon"><i class="fa-solid fa-layer-group"></i></div>
        <div><div class="edu-stat-val" id="edu-stat-cards">0</div><div class="edu-stat-lbl">Flashcards</div></div>
      </div>
      <div class="edu-stat-card edu-stat-green">
        <div class="edu-stat-icon"><i class="fa-solid fa-circle-check"></i></div>
        <div><div class="edu-stat-val" id="edu-stat-mastered">0</div><div class="edu-stat-lbl">Mastered</div></div>
      </div>
      <div class="edu-stat-card edu-stat-amber">
        <div class="edu-stat-icon"><i class="fa-solid fa-robot"></i></div>
        <div><div class="edu-stat-val" id="edu-stat-ai">0</div><div class="edu-stat-lbl">AI Generated</div></div>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="edu-tab-bar">
      <button class="edu-tab-btn active" data-tab="subjects">
        <i class="fa-solid fa-folder-open"></i> Subjects
      </button>
      <button class="edu-tab-btn" data-tab="timer">
        <i class="fa-solid fa-stopwatch"></i> Focus Timer
      </button>
      <button class="edu-tab-btn" data-tab="ai">
        <i class="fa-solid fa-wand-magic-sparkles"></i> AI Generator
      </button>

    </div>

    <!-- ── TAB: SUBJECTS ── -->
    <div class="edu-tab-panel active" id="etab-subjects">
      <!-- Subjects List View -->
      <div id="subjects-list-view">
        <div class="card edu-section-card">
          <div class="edu-section-header">
            <div class="edu-section-title"><i class="fa-solid fa-folder-open"></i> My Subjects</div>
            <div style="display:flex;gap:8px;align-items:center;">
              <button class="edu-add-btn" onclick="openSubjectModal()"><i class="fa-solid fa-plus"></i> New Subject</button>
            </div>
          </div>
          <div class="subjects-folder-grid" id="subjects-folder-grid">
            <div class="edu-empty" style="grid-column:1/-1">
              <i class="fa-solid fa-folder-open"></i>
              <p>No subjects yet</p>
              <span>Create a subject to organize your flashcards and quizzes</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Subject Detail View -->
      <div id="subject-detail-view">
        <button class="edu-back-btn" onclick="closeSubjectDetail()">
          <i class="fa-solid fa-arrow-left"></i> All Subjects
        </button>
        <div class="card edu-section-card">
          <div class="subject-detail-header">
            <div class="subject-detail-icon" id="sd-icon">
              <i class="fa-solid fa-folder-open"></i>
            </div>
            <div class="subject-detail-info">
              <div class="subject-detail-name" id="sd-name">Subject</div>
              <div class="subject-detail-meta" id="sd-meta">0 flashcards · 0 quizzes</div>
            </div>
            <div class="subject-detail-actions">
              <button class="edu-add-btn" onclick="openFlashcardModalForSubject()">
                <i class="fa-solid fa-plus"></i> Add Card
              </button>
              <button class="edu-add-btn edu-add-btn-primary" onclick="goToAIForSubject()">
                <i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI
              </button>
            </div>
          </div>

          <!-- Sub-tabs: Flashcards / Quizzes -->
          <div class="subject-subtabs">
            <button class="subject-subtab active" data-subtab="flashcards">
              <i class="fa-solid fa-layer-group"></i> Flashcards
              <span class="edu-res-badge" id="sd-fc-count" style="margin-left:4px;">0</span>
            </button>
            <button class="subject-subtab" data-subtab="quizzes">
              <i class="fa-solid fa-clipboard-question"></i> Quizzes
              <span class="edu-res-badge" id="sd-quiz-count" style="margin-left:4px;">0</span>
            </button>
          </div>

          <!-- Flashcards sub-panel -->
          <div class="subject-subpanel active" id="sdpanel-flashcards">
            <div class="fc-grid" id="sd-fc-grid">
              <div class="edu-empty" style="grid-column:1/-1">
                <i class="fa-solid fa-layer-group"></i>
                <p>No flashcards yet</p>
                <span>Add cards manually or use the AI Generator</span>
              </div>
            </div>
          </div>

          <!-- Quizzes sub-panel -->
          <div class="subject-subpanel" id="sdpanel-quizzes">
            <div class="quiz-list" id="sd-quiz-list">
              <div class="edu-empty">
                <i class="fa-solid fa-clipboard-question"></i>
                <p>No quizzes yet</p>
                <span>Generate a quiz from this subject's content using AI</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB: TIMER ── -->
    <div class="edu-tab-panel" id="etab-timer">
      <div class="card" style="max-width:540px;margin:0 auto;">
        <div class="card-header">
          <div class="card-title"><i class="fa-solid fa-stopwatch" style="color:var(--a-violet);margin-right:8px;"></i>Focus Timer</div>
        </div>
        <div class="timer-standalone">
          <div class="timer-circle">
            <svg width="200" height="200" viewBox="0 0 200 200">
              <defs>
                <linearGradient id="timerGradSA" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#8b7cf8"/>
                  <stop offset="100%" stop-color="#22d3ee"/>
                </linearGradient>
              </defs>
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="10"/>
              <circle cx="100" cy="100" r="88" fill="none" stroke="url(#timerGradSA)" stroke-width="10"
                stroke-linecap="round" stroke-dasharray="553" stroke-dashoffset="0"
                transform="rotate(-90 100 100)" id="sa-timer-ring"
                style="transition:stroke-dashoffset 1s linear;"/>
            </svg>
            <div class="timer-text" id="sa-timer-display">25:00</div>
          </div>
          <div class="timer-label" id="sa-timer-status">Ready to focus?</div>
          <div class="timer-controls">
            <button class="timer-btn timer-btn-secondary" onclick="saResetTimer()" title="Reset">
              <i class="fa-solid fa-rotate-left"></i>
            </button>
            <button class="timer-btn timer-btn-play" id="sa-timer-play-btn" onclick="saToggleTimer()">
              <i class="fa-solid fa-play" id="sa-timer-play-icon"></i>
            </button>
            <button class="timer-btn timer-btn-secondary" onclick="saSaveSession()" title="Save session">
              <i class="fa-solid fa-check"></i>
            </button>
          </div>
          <div class="timer-presets">
            <button class="timer-preset active" data-sapreset="25" onclick="saSetPreset(25)">25 min</button>
            <button class="timer-preset" data-sapreset="45" onclick="saSetPreset(45)">45 min</button>
            <button class="timer-preset" data-sapreset="60" onclick="saSetPreset(60)">60 min</button>
            <button class="timer-preset" data-sapreset="90" onclick="saSetPreset(90)">90 min</button>
          </div>
          <select class="timer-sa-subject" id="sa-timer-subject"><option value="">No subject</option></select>
        </div>
        <div style="padding:0 24px 24px;">
          <div style="font-size:12px;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Recent Sessions</div>
          <div id="sa-sessions-log"><div style="color:var(--txt-muted);font-size:13px;">No sessions yet</div></div>
        </div>
      </div>
    </div>

    <!-- ── TAB: AI GENERATOR ── -->
    <div class="edu-tab-panel" id="etab-ai">
      <div class="card edu-ai-card">
        <div class="edu-ai-header">
          <div class="edu-ai-title">
            <div class="edu-ai-badge"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
            <div>
              <div class="edu-ai-name">AI Study Generator</div>
              <div class="edu-ai-desc">Upload a PDF or PPTX, or paste text — AI will create quizzes or flashcards instantly</div>
            </div>
          </div>
          <div class="edu-ai-status">
            <span class="edu-ai-dot"></span> Free · No API Key
          </div>
        </div>

        <!-- Input mode toggle -->
        <div style="display:flex;gap:8px;padding:0 20px 12px;">
          <button class="edu-mode-btn active" id="edu-mode-file-btn" onclick="eduSwitchMode('file')">
            <i class="fa-solid fa-file-arrow-up"></i> Upload File
          </button>
          <button class="edu-mode-btn" id="edu-mode-text-btn" onclick="eduSwitchMode('text')">
            <i class="fa-solid fa-align-left"></i> Paste Text
          </button>
        </div>

        <!-- File upload mode -->
        <div id="edu-mode-file">
          <div class="edu-dropzone" id="edu-dropzone">
            <div class="edu-dropzone-inner" id="edu-dropzone-inner">
              <div class="edu-dropzone-icon"><i class="fa-solid fa-cloud-arrow-up"></i></div>
              <div class="edu-dropzone-title">Drop your file here</div>
              <div class="edu-dropzone-sub">Supports <strong>.pptx</strong>, <strong>.ppt</strong>, <strong>.pdf</strong></div>
              <button class="edu-browse-btn" onclick="document.getElementById('edu-file-input').click()">Browse Files</button>
            </div>
            <div class="edu-file-preview" id="edu-file-preview" style="display:none;">
              <div class="edu-file-icon-wrap"><i class="fa-solid fa-file-powerpoint" id="edu-file-icon-type"></i></div>
              <div class="edu-file-info">
                <div class="edu-file-name" id="edu-file-name">—</div>
                <div class="edu-file-size" id="edu-file-size">—</div>
              </div>
              <button class="edu-file-remove" onclick="eduClearFile()"><i class="fa-solid fa-xmark"></i></button>
            </div>
          </div>
        </div>

        <!-- Paste text mode -->
        <div id="edu-mode-text" style="display:none;padding:0 20px 12px;">
          <textarea id="edu-paste-text" placeholder="Paste your study material here… (notes, paragraphs, lecture text)" style="width:100%;min-height:140px;background:var(--bg-glass);border:1px dashed rgba(255,255,255,0.15);border-radius:12px;color:var(--txt-primary);padding:14px;font-size:13px;resize:vertical;box-sizing:border-box;outline:none;font-family:inherit;" oninput="eduOnPasteInput(this)"></textarea>
          <div style="font-size:12px;color:var(--txt-muted);margin-top:6px;" id="edu-paste-chars">0 characters</div>
        </div>

        <div class="edu-gen-options" id="edu-gen-options" style="display:none;">
          <div class="edu-gen-label-title">What do you want to generate?</div>
          <div class="edu-gen-type-row">
            <label class="edu-gen-choice active" id="edu-choice-fc">
              <input type="radio" name="edu_gen_type" value="flashcard" checked>
              <div class="edu-choice-inner">
                <div class="edu-choice-icon" style="background:rgba(139,124,248,0.15);color:#a78bfa"><i class="fa-solid fa-layer-group"></i></div>
                <div class="edu-choice-label">Flashcards</div>
                <div class="edu-choice-sub">Q&amp;A cards for review</div>
              </div>
            </label>
            <label class="edu-gen-choice" id="edu-choice-quiz">
              <input type="radio" name="edu_gen_type" value="quiz">
              <div class="edu-choice-inner">
                <div class="edu-choice-icon" style="background:rgba(96,165,250,0.15);color:#60a5fa"><i class="fa-solid fa-clipboard-question"></i></div>
                <div class="edu-choice-label">Quiz</div>
                <div class="edu-choice-sub">Test your knowledge</div>
              </div>
            </label>
          </div>

          <div class="edu-quiz-types" id="edu-quiz-types" style="display:none;">
            <div class="edu-gen-label-title" style="font-size:12px;margin-bottom:10px;">Quiz type</div>
            <div class="edu-quiz-chips">
              <label class="edu-chip active"><input type="radio" name="edu_quiz_type" value="mcq" checked><span><i class="fa-solid fa-list-ul"></i> Multiple Choice</span></label>
              <label class="edu-chip"><input type="radio" name="edu_quiz_type" value="truefalse"><span><i class="fa-solid fa-circle-half-stroke"></i> True / False</span></label>
              <label class="edu-chip"><input type="radio" name="edu_quiz_type" value="identification"><span><i class="fa-solid fa-pen-line"></i> Identification</span></label>
              <label class="edu-chip"><input type="radio" name="edu_quiz_type" value="mixed"><span><i class="fa-solid fa-shuffle"></i> Mixed</span></label>
            </div>
          </div>

          <div class="edu-gen-row">
            <div>
              <label class="edu-field-label">Number of items</label>
              <select class="edu-filter-select" id="edu-gen-count" style="width:100%;">
                <option value="5">5 items</option><option value="10" selected>10 items</option>
                <option value="15">15 items</option><option value="20">20 items</option>
              </select>
            </div>
            <div>
              <label class="edu-field-label">Subject <span style="color:#f87171;font-size:13px;">*</span></label>
              <select class="edu-filter-select" id="edu-gen-subject" style="width:100%;border-color:rgba(139,124,248,0.35);"><option value="">— Select a subject —</option></select>
              <div id="edu-subj-warn" style="display:none;align-items:center;gap:8px;background:rgba(248,113,113,0.10);border:1px solid rgba(248,113,113,0.30);border-radius:8px;padding:8px 12px;margin-top:8px;font-size:12px;color:#f87171;">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <span>Please select a subject before generating.</span>
              </div>
            </div>
          </div>

          <button class="edu-generate-btn" id="edu-generate-btn" onclick="eduGenerate()">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI
          </button>
          <div style="text-align:center;margin-top:10px;font-size:11px;color:var(--txt-muted);">
            <i class="fa-solid fa-lock" style="margin-right:4px;"></i>Powered by <strong>Pollinations.AI</strong> — free, no API key, no data stored
          </div>
        </div>

        <div class="edu-progress-wrap" id="edu-progress-wrap" style="display:none;">
          <div class="edu-progress-label" id="edu-progress-label">Starting…</div>
          <div class="edu-progress-track"><div class="edu-progress-fill" id="edu-progress-fill"></div></div>
          <div class="edu-progress-sub" id="edu-progress-sub">This may take 15–30 seconds…</div>
        </div>

        <div id="edu-results-wrap" style="display:none;padding:0 20px 20px;"></div>
      </div>
    </div>

  </div>
</div>

<!-- ── Subject Required Modal ── -->
<div class="modal-overlay" id="edu-subject-required-modal" style="z-index:9999;">
  <div class="modal" style="max-width:420px;text-align:center;">
    <div class="modal-header" style="justify-content:center;border-bottom:none;padding-bottom:0;">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(139,124,248,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
        <i class="fa-solid fa-folder-open" style="font-size:24px;color:#8b7cf8;"></i>
      </div>
    </div>
    <div class="modal-body" style="padding-top:0;">
      <div style="font-size:17px;font-weight:700;color:var(--txt-primary,#e8edf5);margin-bottom:8px;">Select a Subject First</div>
      <div style="font-size:13px;color:var(--txt-secondary,#6b7a99);margin-bottom:16px;line-height:1.5;">
        Pick a subject so your flashcards or quiz get saved to the right folder.
      </div>
      <!-- shown when user has subjects -->
      <select class="edu-filter-select" id="edu-modal-subject" style="width:100%;margin-bottom:16px;font-size:14px;">
        <option value="">&mdash; Select a subject &mdash;</option>
      </select>
      <!-- shown when user has NO subjects -->
      <div id="edu-modal-no-subj-note" style="display:none;background:rgba(139,124,248,0.10);border:1px solid rgba(139,124,248,0.25);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--txt-secondary,#6b7a99);line-height:1.5;text-align:left;">
        <i class="fa-solid fa-circle-info" style="color:#8b7cf8;margin-right:6px;"></i>
        You have no subjects yet. Click <strong style="color:var(--txt-primary,#e8edf5);">Create General &amp; Generate</strong> — a <em>General</em> subject folder will be created automatically.
      </div>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button class="btn btn-secondary" onclick="closeModal('edu-subject-required-modal')" style="flex:1;">Cancel</button>
        <button class="edu-generate-btn" id="edu-modal-confirm-btn" onclick="eduConfirmSubjectAndGenerate()" style="flex:2;padding:10px 16px;font-size:14px;">
          <i class="fa-solid fa-wand-magic-sparkles"></i> Generate
        </button>
      </div>
    </div>
  </div>
</div>

<script>
  window.STUDYHUB_USER = {
    id: "<?php echo htmlspecialchars($user['id'] ?? ''); ?>",
    name: "<?php echo htmlspecialchars(($user['first_name'] ?? '') . ' ' . ($user['last_name'] ?? '')); ?>",
    firstName: "<?php echo htmlspecialchars($user['first_name'] ?? ''); ?>",
    username: "<?php echo htmlspecialchars($user['username'] ?? ''); ?>",
    email: "<?php echo htmlspecialchars($user['email'] ?? ''); ?>",
    avatar: "<?php echo htmlspecialchars($user['profile_picture'] ?? ''); ?>",
    initials: "<?php echo htmlspecialchars(strtoupper(($user['first_name'][0] ?? 'U') . ($user['last_name'][0] ?? ''))); ?>"
  };
</script>
<script src="/static/js/nav.js?v=1779582994"></script>
<script src="/static/js/shared.js?v=1779582994"></script>
<script src="/static/js/education.js?v=1779582994"></script>
</body>
</html>