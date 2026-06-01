/* ── StudyHub · Admin Panel ── */
'use strict';

var _adminStatus = 'pending';

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══ STATS ══════════════════════════════════════════════ */
async function loadAdminStats() {
  try {
    var d = await (await fetch('/api/admin?action=stats')).json();
    var set = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set('stat-pending',  d.pending);
    set('stat-accepted', d.accepted);
    set('stat-rejected', d.rejected);
    set('stat-users',    d.users);
    var badge = document.getElementById('badge-pending');
    if (badge) { badge.textContent = d.pending > 0 ? d.pending : ''; badge.style.display = d.pending > 0 ? '' : 'none'; }
  } catch(_) {}
}

/* ══ REPORT LIST ════════════════════════════════════════ */
function _reasonLabel(r) {
  return { spam: '🚫 Spam', harassment: '😠 Harassment', inappropriate: '⚠️ Inappropriate',
           misinformation: '❌ Misinformation', other: '📋 Other' }[r] || r;
}
function _statusBadge(s) {
  var cls = { pending: 'badge-pending', accepted: 'badge-accepted', rejected: 'badge-rejected' }[s] || '';
  return '<span class="adm-status-badge ' + cls + '">' + _esc(s) + '</span>';
}
function _timeAgo(ts) {
  if (!ts) return '';
  var s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

function renderReports(reports) {
  var c = document.getElementById('admin-reports-container');
  if (!reports || !reports.length) {
    c.innerHTML = '<div class="empty-state" style="padding:3rem 0">' +
      '<i class="fa-solid fa-shield-halved empty-icon-fa"></i>' +
      '<div>No ' + _adminStatus + ' reports</div>' +
      '<div class="empty-sub">All clear here.</div></div>';
    return;
  }

  c.innerHTML = reports.map(function(r) {
    var isPost = r.content_type === 'post';
    var contentPreview = isPost
      ? ('<strong>' + _esc(r.post_title || '(deleted)') + '</strong><br><span class="adm-preview-text">' + _esc((r.post_body || '').substring(0, 120)) + '</span>')
      : ('<span class="adm-preview-text">' + _esc((r.comment_body || '(deleted)').substring(0, 160)) + '</span>');
    var owner = isPost
      ? (r.post_owner_username ? '@' + r.post_owner_first + ' ' + r.post_owner_last : '(deleted)')
      : (r.comment_owner_username ? '@' + r.comment_owner_first + ' ' + r.comment_owner_last : '(deleted)');
    var contentId = isPost ? r.content_id : r.content_id;
    var deleteAction = isPost ? 'delete_post' : 'delete_comment';

    return '<div class="adm-report-card" id="adm-report-' + r.id + '">' +
      '<div class="adm-report-top">' +
        '<div class="adm-report-meta">' +
          '<span class="adm-type-tag ' + (isPost ? 'tag-post' : 'tag-comment') + '">' +
            '<i class="fa-solid ' + (isPost ? 'fa-newspaper' : 'fa-comment') + '"></i> ' +
            (isPost ? 'Post' : 'Comment') + '</span>' +
          _statusBadge(r.status) +
          '<span class="adm-reason-tag">' + _reasonLabel(r.reason) + '</span>' +
        '</div>' +
        '<div class="adm-report-time">' + _timeAgo(r.created_at) + '</div>' +
      '</div>' +

      '<div class="adm-content-box">' + contentPreview + '</div>' +

      '<div class="adm-report-info">' +
        '<span><i class="fa-solid fa-user"></i> By <strong>' + _esc(owner) + '</strong></span>' +
        '<span><i class="fa-solid fa-flag"></i> Reported by <strong>@' + _esc(r.reporter_username) + '</strong></span>' +
        (r.details ? '<span><i class="fa-solid fa-comment-dots"></i> ' + _esc(r.details.substring(0,80)) + '</span>' : '') +
      '</div>' +

      '<div class="adm-report-actions">' +
        '<button class="adm-btn adm-btn-view" onclick="openReportModal(' + JSON.stringify(r).replace(/</g,'\\u003c').replace(/>/g,'\\u003e') + ')">'+
          '<i class="fa-solid fa-eye"></i> View</button>' +
        (r.status === 'pending' ? (
          '<button class="adm-btn adm-btn-accept" onclick="reviewReport(' + r.id + ',\'accepted\')">' +
            '<i class="fa-solid fa-check"></i> Accept</button>' +
          '<button class="adm-btn adm-btn-reject" onclick="reviewReport(' + r.id + ',\'rejected\')">' +
            '<i class="fa-solid fa-xmark"></i> Reject</button>'
        ) : '') +
        (r.content_type === 'post' && r.post_title
          ? '<button class="adm-btn adm-btn-delete" onclick="adminDelete(\'post\',' + r.content_id + ',' + r.id + ')">' +
            '<i class="fa-solid fa-trash"></i> Delete Post</button>' : '') +
        (r.content_type === 'comment' && r.comment_body
          ? '<button class="adm-btn adm-btn-delete" onclick="adminDelete(\'comment\',' + r.content_id + ',' + r.id + ')">' +
            '<i class="fa-solid fa-trash"></i> Delete Reply</button>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

async function loadReports(status) {
  _adminStatus = status || 'pending';
  var c = document.getElementById('admin-reports-container');
  c.innerHTML = '<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-spinner fa-spin empty-icon-fa"></i><div>Loading…</div></div>';
  try {
    var reports = await (await fetch('/api/admin?action=reports&status=' + _adminStatus)).json();
    renderReports(Array.isArray(reports) ? reports : []);
  } catch(_) {
    c.innerHTML = '<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-triangle-exclamation empty-icon-fa"></i><div>Failed to load</div></div>';
  }
}

/* ══ ACTIONS ════════════════════════════════════════════ */
window.reviewReport = async function(reportId, verdict) {
  var card = document.getElementById('adm-report-' + reportId);
  if (card) card.style.opacity = '0.5';
  try {
    var res = await fetch('/api/admin?action=review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, verdict: verdict })
    });
    var d = await res.json();
    if (!res.ok) { showToast(d.error || 'Error', 'error'); if (card) card.style.opacity = ''; return; }
    showToast('Report ' + verdict, verdict === 'accepted' ? 'success' : 'info');
    if (card) {
      card.style.transition = 'opacity .3s, max-height .4s, margin .4s';
      card.style.opacity = '0';
      card.style.maxHeight = '0';
      card.style.overflow = 'hidden';
      setTimeout(function() { if (card.parentNode) card.parentNode.removeChild(card); loadAdminStats(); }, 400);
    }
    // Close modal if open
    closeAdmModal();
  } catch(_) { showToast('Request failed', 'error'); if (card) card.style.opacity = ''; }
};

window.adminDelete = async function(type, contentId, reportId) {
  if (!confirm('Permanently delete this ' + type + '? This cannot be undone.')) return;
  var card = document.getElementById('adm-report-' + reportId);
  if (card) card.style.opacity = '0.5';
  try {
    var res = await fetch('/api/admin?action=delete_' + type + '&id=' + contentId, { method: 'DELETE' });
    var d = await res.json();
    if (!res.ok) { showToast(d.error || 'Error', 'error'); if (card) card.style.opacity = ''; return; }
    showToast((type === 'post' ? 'Post' : 'Reply') + ' deleted.', 'success');
    loadReports(_adminStatus);
    loadAdminStats();
    closeAdmModal();
  } catch(_) { showToast('Request failed', 'error'); if (card) card.style.opacity = ''; }
};

/* ══ DETAIL MODAL ═══════════════════════════════════════ */
window.openReportModal = function(r) {
  var isPost = r.content_type === 'post';
  var body = document.getElementById('adm-modal-body');
  var footer = document.getElementById('adm-modal-footer');
  document.getElementById('adm-modal-title').textContent = 'Report #' + r.id + ' — ' + (isPost ? 'Post' : 'Comment');

  var owner = isPost
    ? ((r.post_owner_first || '') + ' ' + (r.post_owner_last || '') + ' (@' + (r.post_owner_username || 'deleted') + ')')
    : ((r.comment_owner_first || '') + ' ' + (r.comment_owner_last || '') + ' (@' + (r.comment_owner_username || 'deleted') + ')');

  body.innerHTML =
    '<div class="adm-detail-section">' +
      '<div class="adm-detail-label">Content (' + r.content_type + ')</div>' +
      (isPost
        ? '<div class="adm-detail-title">' + _esc(r.post_title || '(deleted)') + '</div>' +
          '<div class="adm-detail-text">' + _esc(r.post_body || '') + '</div>'
        : '<div class="adm-detail-text">' + _esc(r.comment_body || '(deleted)') + '</div>') +
    '</div>' +
    '<div class="adm-detail-grid">' +
      '<div><span class="adm-detail-label">Author</span><div>' + _esc(owner) + '</div></div>' +
      '<div><span class="adm-detail-label">Reported by</span><div>@' + _esc(r.reporter_username) + '</div></div>' +
      '<div><span class="adm-detail-label">Reason</span><div>' + _esc(r.reason) + '</div></div>' +
      '<div><span class="adm-detail-label">Status</span><div>' + _statusBadge(r.status) + '</div></div>' +
      '<div><span class="adm-detail-label">Reported</span><div>' + _timeAgo(r.created_at) + '</div></div>' +
      (r.reviewed_by ? '<div><span class="adm-detail-label">Reviewed by</span><div>@' + _esc(r.reviewer_username || '') + '</div></div>' : '') +
    '</div>' +
    (r.details ? '<div class="adm-detail-section"><div class="adm-detail-label">Reporter note</div><div class="adm-detail-text">' + _esc(r.details) + '</div></div>' : '');

  // Footer buttons
  var btns = '';
  if (r.status === 'pending') {
    btns +=
      '<button class="adm-btn adm-btn-accept" onclick="reviewReport(' + r.id + ',\'accepted\')">' +
        '<i class="fa-solid fa-check"></i> Accept report</button>' +
      '<button class="adm-btn adm-btn-reject" onclick="reviewReport(' + r.id + ',\'rejected\')">' +
        '<i class="fa-solid fa-xmark"></i> Reject report</button>';
  }
  if (isPost && r.post_title) {
    btns += '<button class="adm-btn adm-btn-delete" onclick="adminDelete(\'post\',' + r.content_id + ',' + r.id + ')">' +
      '<i class="fa-solid fa-trash"></i> Delete post</button>';
  }
  if (!isPost && r.comment_body) {
    btns += '<button class="adm-btn adm-btn-delete" onclick="adminDelete(\'comment\',' + r.content_id + ',' + r.id + ')">' +
      '<i class="fa-solid fa-trash"></i> Delete reply</button>';
  }
  footer.innerHTML = btns;

  document.getElementById('adm-overlay').classList.add('active');
};

function closeAdmModal() {
  document.getElementById('adm-overlay').classList.remove('active');
}
window.closeAdmModal = closeAdmModal;

document.getElementById('adm-close-btn').addEventListener('click', closeAdmModal);
document.getElementById('adm-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeAdmModal();
});

/* ══ TABS ════════════════════════════════════════════════ */
document.getElementById('admin-tabs').addEventListener('click', function(e) {
  var btn = e.target.closest('.feed-tab');
  if (!btn) return;
  document.querySelectorAll('#admin-tabs .feed-tab').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  loadReports(btn.dataset.status);
});

/* ══ INIT ════════════════════════════════════════════════ */
loadAdminStats();
loadReports('pending');
