'use strict';

/* ── TAB SWITCHING ── */
document.querySelectorAll('.fbp-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.fbp-tab').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.fbp-tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    var panel = document.getElementById('ptab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
    if (btn.dataset.tab === 'activity') { loadProfileHeatmap(); loadProfileSessions(); }
    if (btn.dataset.tab === 'about')    { loadAboutStats(); }
  });
});

/* ── AVATAR UPLOAD ── */
document.getElementById('ava-file-input').addEventListener('change', async function() {
  var file = this.files[0]; if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Please select an image file', 'error'); return; }
  if (file.size > 10 * 1024 * 1024) { showToast('Image must be under 10MB', 'error'); return; }

  function compressImage(file, maxW, quality, cb) {
    var img = new Image();
    var url = URL.createObjectURL(file);
    img.onload = function() {
      URL.revokeObjectURL(url);
      var w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function() { cb(null); };
    img.src = url;
  }

  showToast('Uploading…', 'info');
  compressImage(file, 400, 0.82, async function(dataUrl) {
    if (!dataUrl) { showToast('Failed to process image', 'error'); return; }
    try {
      var res = await fetch('/api/profile/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: dataUrl })
      });
      var data = {};
      try { data = await res.json(); } catch(_) {}
      if (res.ok) {
        var imgTag = '<img src="' + (data.url || dataUrl) + '" alt="">';
        var avaEl = document.getElementById('profile-ava');
        if (avaEl) avaEl.innerHTML = imgTag;
        var miniAva = document.getElementById('create-ava-mini');
        if (miniAva) miniAva.innerHTML = imgTag;
        var navAva = document.getElementById('nav-user-ava');
        if (navAva) navAva.innerHTML = imgTag;
        showToast('Profile picture updated!', 'success');
      } else {
        showToast(data.error || 'Failed to upload image', 'error');
      }
    } catch(err) { showToast('Upload failed: ' + err.message, 'error'); }
  });
});

/* ── LOAD MY POSTS ── */
async function loadMyPosts() {
  var container = document.getElementById('profile-posts-list');
  try {
    var u = window.STUDYHUB_USER || {};
    var res = await fetch('/api/posts?filter=user&user=' + encodeURIComponent(u.username || ''));
    var posts = await res.json();
    var countEl = document.getElementById('pc-posts');
    if (countEl) countEl.textContent = posts.length;
    if (!posts || !posts.length) {
      container.innerHTML = '<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-pen-to-square empty-icon-fa"></i><div>No posts yet</div><div class="empty-sub"><a href="/community" style="color:var(--a-blue);">Share something with the community</a></div></div>';
      return;
    }
    var getTopicClass = function(t) {
      return { General:'topic-general',Math:'topic-math',Science:'topic-science',Notes:'topic-notes','Help Needed':'topic-help' }[t] || 'topic-general';
    };
    container.innerHTML = posts.map(function(p) {
      var av = p.profile_picture
        ? '<img src="' + p.profile_picture + '" class="post-avatar">'
        : '<div class="post-avatar-initials">' + (p.first_name ? p.first_name[0] : 'U') + (p.last_name ? p.last_name[0] : '') + '</div>';
      return '<div class="post-card">' +
        '<div class="post-header">' + av +
        '<div class="post-meta"><div class="post-author">' + escapeHtml(p.first_name + ' ' + p.last_name) + '</div>' +
        '<div class="post-handle">@' + p.username + ' · <span class="post-time">' + formatTimeAgo(p.created_at) + '</span></div></div>' +
        '<div class="post-topic-badge ' + getTopicClass(p.topic) + '">' + p.topic + '</div></div>' +
        '<div class="post-title">' + escapeHtml(p.title) + '</div>' +
        '<div class="post-body">' + escapeHtml(p.body) + '</div>' +
        '<div class="post-actions">' +
        '<span class="post-action-btn"><i class="fa-regular fa-heart"></i> ' + (p.like_count || 0) + '</span>' +
        '<span class="post-action-btn"><i class="fa-regular fa-comment"></i> ' + (p.comment_count || 0) + '</span></div></div>';
    }).join('');
  } catch(_) {
    container.innerHTML = '<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-triangle-exclamation empty-icon-fa"></i><div>Failed to load posts</div></div>';
  }
}

/* ── LOAD STATS FOR COUNTERS ── */
async function loadProfileStats() {
  try {
    var res   = await fetch('/api/stats');
    var stats = await res.json();
    var set   = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set('pc-streak', stats.streak || 1);
    var since = stats.member_since
      ? new Date(stats.member_since).toLocaleDateString('en-US', { month:'long', year:'numeric' })
      : '—';
    set('about-since', since);
    set('about-since2', since);
    var u = window.STUDYHUB_USER || {};
    if (u.username) {
      var ures = await fetch('/api/users/' + encodeURIComponent(u.username));
      var ud   = await ures.json();
      set('pc-followers', ud.follower_count  || 0);
      set('pc-following', ud.following_count || 0);
    }
  } catch(_) {}
}

/* ── ABOUT STATS ── */
async function loadAboutStats() {
  try {
    var res   = await fetch('/api/stats');
    var stats = await res.json();
    var set   = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set('about-hours',      (stats.study_hours || 0) + 'h');
    set('about-subjects',   stats.subjects    || 0);
    set('about-flashcards', stats.flashcards  || 0);
    var sv = stats.streak || 1;
    set('about-streak', sv);
    var since = stats.member_since
      ? new Date(stats.member_since).toLocaleDateString('en-US', { month:'long', day:'numeric', year:'numeric' })
      : '—';
    set('about-since', since);
    set('about-since2', since);
  } catch(_) {}
}

/* ── SIDEBAR SESSIONS (mini list) ── */
async function loadSidebarSessions() {
  var el = document.getElementById('fbp-sidebar-sessions'); if (!el) return;
  try {
    var res = await fetch('/api/sessions');
    var sessions = await res.json();
    if (!sessions || !sessions.length) {
      el.innerHTML = '<div style="padding:8px 0;font-size:13px;color:var(--txt-muted);">No sessions yet.</div>';
      return;
    }
    el.innerHTML = sessions.slice(0, 5).map(function(s) {
      var color = s.subject_color || '#3b9eff';
      var name  = s.subject_name  || 'General';
      var h = Math.floor(s.duration_minutes / 60), m = s.duration_minutes % 60;
      var t = h > 0 ? h + 'h ' + m + 'm' : m + ' min';
      return '<div class="fbp-session-item">' +
        '<div class="fbp-session-dot" style="background:' + color + '"></div>' +
        '<span class="fbp-session-name">' + escapeHtml(name) + '</span>' +
        '<span class="fbp-session-dur">' + t + '</span></div>';
    }).join('');
  } catch(_) {}
}

/* ── HEATMAP ── */
async function loadProfileHeatmap() {
  var el = document.getElementById('profile-heatmap'); if (!el) return;
  try {
    var res  = await fetch('/api/sessions/heatmap');
    var data = await res.json();
    renderHeatmapEl(el, data);
  } catch(_) { renderHeatmapEl(el, {}); }
}

function renderHeatmapEl(el, data) {
  var cells = [];
  for (var i = 29; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var key = d.toISOString().split('T')[0], mins = data[key] || 0;
    var isToday = (i === 0);
    var bg = mins > 90 ? 'rgba(59,158,255,0.85)' : mins > 60 ? 'rgba(59,158,255,0.6)' : mins > 30 ? 'rgba(59,158,255,0.4)' : mins > 0 ? 'rgba(59,158,255,0.2)' : 'rgba(255,255,255,0.04)';
    var border = isToday ? 'border:1.5px solid var(--a-blue);box-shadow:0 0 0 1.5px var(--a-blue);' : 'border:1px solid rgba(255,255,255,0.06);';
    cells.push('<div class="heatmap-cell" style="background:' + bg + ';' + border + '" title="' + d.toDateString() + ': ' + mins + ' min"></div>');
  }
  var rem = 30 % 7;
  if (rem) for (var p = 0; p < 7 - rem; p++) cells.unshift('<div style="aspect-ratio:1;opacity:0;"></div>');
  el.innerHTML = cells.join('');
}

/* ── SESSIONS (activity tab) ── */
async function loadProfileSessions() {
  var el = document.getElementById('profile-sessions-log'); if (!el) return;
  try {
    var res = await fetch('/api/sessions');
    var sessions = await res.json();
    if (!sessions || !sessions.length) {
      el.innerHTML = '<div class="empty-state" style="padding:2rem 0"><i class="fa-solid fa-clipboard-list empty-icon-fa"></i><div>No sessions yet</div></div>';
      return;
    }
    el.innerHTML = '<div class="log-list">' + sessions.slice(0, 10).map(function(s) {
      var color = s.subject_color || '#3b9eff';
      var name  = s.subject_name  || 'General';
      var date  = new Date(s.session_date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
      var h = Math.floor(s.duration_minutes / 60), m = s.duration_minutes % 60;
      var t = h > 0 ? h + 'h ' + m + 'm' : m + ' min';
      return '<div class="log-item"><div class="log-color" style="background:' + color + '"></div>' +
        '<div class="log-info"><div class="log-subject">' + escapeHtml(name) + '</div><div class="log-meta">' + date + (s.notes ? ' — ' + escapeHtml(s.notes.substring(0, 40)) : '') + '</div></div>' +
        '<div class="log-duration">' + t + '</div></div>';
    }).join('') + '</div>';
  } catch(_) {}
}

/* ── SETTINGS SAVE ── */
window.settingsSave = async function() {
  var firstName = document.getElementById('settings-first').value.trim();
  var lastName  = document.getElementById('settings-last').value.trim();
  var username  = document.getElementById('settings-username').value.trim().toLowerCase();
  if (!firstName || !lastName || !username) { showToast('All fields required', 'error'); return; }
  try {
    var res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, username: username })
    });
    if (res.ok) {
      showToast('Profile updated!', 'success');
      var set = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
      set('profile-name', firstName + ' ' + lastName);
      set('profile-handle', '@' + username);
      set('about-fullname', firstName + ' ' + lastName);
      set('about-fullname2', firstName + ' ' + lastName);
      set('about-uname', '@' + username);
      var navName = document.querySelector('.nav-user-name');
      if (navName) navName.textContent = firstName;
      window.STUDYHUB_USER.name = firstName + ' ' + lastName;
      window.STUDYHUB_USER.firstName = firstName;
      window.STUDYHUB_USER.username  = username;
    } else {
      var e = {}; try { e = await res.json(); } catch(_) {}
      showToast(e.error || 'Failed to update profile', 'error');
    }
  } catch(_) { showToast('Network error', 'error'); }
};

/* ── SETTINGS THEME LABEL ── */
var settingsThemeLabel = document.getElementById('settings-theme-label');
function updateThemeLabel() {
  var isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  if (settingsThemeLabel) settingsThemeLabel.textContent = isDark ? 'Dark' : 'Light';
}
updateThemeLabel();
var themeBtn = document.getElementById('theme-btn');
if (themeBtn) themeBtn.addEventListener('click', function() { setTimeout(updateThemeLabel, 50); });

/* ── SIGN OUT ── */
window.signOut = async function() {
  SHConfirm.show({
    type: 'warning',
    icon: 'fa-arrow-right-from-bracket',
    title: 'Sign Out?',
    body: 'You will be logged out of StudyHub. Any unsaved changes may be lost.',
    confirmLabel: 'Sign Out',
    onConfirm: async function() {
      await fetch('/api/logout', { method: 'POST' }).catch(function() {});
      window.location.href = '/';
    }
  });
};

window.renderProfileUI = function() {
  var u = window.STUDYHUB_USER || {};
  var set = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
  set('profile-name', u.name || '');
  set('profile-handle', '@' + (u.username || ''));
};

/* ── INIT ── */
loadMyPosts();
loadProfileStats();
loadAboutStats();
loadSidebarSessions();
populateSubjectSelects();