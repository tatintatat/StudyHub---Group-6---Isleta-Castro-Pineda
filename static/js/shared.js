/* ── StudyHub · Shared Feature Logic ── */
'use strict';

/* ══ HELPERS (also in nav.js — safe to redefine) ══ */
window.escapeHtml = function(t) {
  if (!t) return '';
  var d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
};
window.formatTimeAgo = function(ds) {
  var d = new Date(ds), now = new Date(), diff = Math.floor((now - d) / 1000);
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400)  return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* ══ SUBJECT COLOUR PICKER ══ */
var selectedSubjectColor = '#8b7cf8';
document.querySelectorAll('#subject-colors .color-option').forEach(function(opt) {
  opt.addEventListener('click', function() {
    document.querySelectorAll('#subject-colors .color-option').forEach(function(o) { o.classList.remove('selected'); });
    opt.classList.add('selected');
    selectedSubjectColor = opt.dataset.color;
  });
});

/* ══ OPEN/CLOSE MODALS ══ */
window.openSubjectModal = function() {
  document.getElementById('subject-modal').classList.add('active');
  setTimeout(function() { document.getElementById('subject-name-input').focus(); }, 80);
};
window.openFlashcardModal = function() {
  document.getElementById('flashcard-modal').classList.add('active');
  populateSubjectSelects();
  loadFlashcardList();
  setTimeout(function() { document.getElementById('flashcard-front').focus(); }, 80);
};
window.openTimerModal = function() {
  populateSubjectSelects();
  document.getElementById('timer-modal').classList.add('active');
};
window.openSessionModal = function() {
  populateSubjectSelects();
  document.getElementById('session-modal').classList.add('active');
};
window.openNotesModal = function() {
  document.getElementById('notes-modal').classList.add('active');
  setTimeout(function() { document.getElementById('quick-notes').focus(); }, 80);
};
window.openEditProfileModal = function() {
  var u = window.STUDYHUB_USER || {};
  document.getElementById('edit-first-name').value = u.firstName || '';
  document.getElementById('edit-last-name').value  = (u.name || '').split(' ').slice(1).join(' ');
  document.getElementById('edit-username').value   = u.username || '';
  document.getElementById('edit-profile-modal').classList.add('active');
  setTimeout(function() { document.getElementById('edit-first-name').focus(); }, 80);
};

/* ══ POPULATE SUBJECT SELECTS ══ */
function populateSubjectSelects() {
  fetch('/api/subjects').then(function(r) { return r.json(); }).then(function(subjects) {
    var opts = '<option value="">No subject</option>' + subjects.map(function(s) {
      return '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
    }).join('');
    ['timer-subject', 'session-subject', 'flashcard-subject'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.innerHTML = opts;
    });
  }).catch(function() {});
}
window.populateSubjectSelects = populateSubjectSelects;

/* ══ SUBMIT SUBJECT ══ */
window.submitSubject = async function() {
  var nameInput = document.getElementById('subject-name-input');
  var btn       = document.getElementById('subject-submit-btn');
  var name      = nameInput.value.trim();
  if (!name) { showToast('Please enter a subject name', 'error'); nameInput.focus(); return; }
  btn.disabled = true; btn.textContent = 'Adding…';
  try {
    var res = await fetch('/api/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, color: selectedSubjectColor })
    });
    if (res.ok) {
      showToast('Subject "' + name + '" added!', 'success');
      nameInput.value = '';
      selectedSubjectColor = '#8b7cf8';
      document.querySelectorAll('#subject-colors .color-option').forEach(function(o) { o.classList.remove('selected'); });
      var first = document.querySelector('#subject-colors .color-option');
      if (first) first.classList.add('selected');
      closeModal('subject-modal');
      if (typeof loadSubjects === 'function') loadSubjects();
      populateSubjectSelects();
      if (typeof loadDashboardStats === 'function') loadDashboardStats();
      if (typeof loadEduSubjects === 'function') loadEduSubjects();
    } else {
      var e = {}; try { e = await res.json(); } catch(_) {}
      showToast(e.message || e.error || 'Failed to add subject', 'error');
    }
  } catch(err) { showToast('Network error', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Add Subject'; }
};

/* ══ DELETE SUBJECT ══ */
window.deleteSubject = async function(id, subjectName) {
  SHConfirm.show({
    type: 'danger',
    icon: 'fa-trash',
    title: 'Delete Subject?',
    body: '"' + (subjectName || 'This subject') + '" will be moved to trash. You can restore it within 30 days.',
    confirmLabel: 'Move to Trash',
    onConfirm: async function() {
      try {
        var res = await fetch('/api/subjects/' + id, { method: 'DELETE' });
        if (res.ok) {
          if (window.SHTrash) {
            SHTrash.addItem({ id: id, name: subjectName || 'Subject #' + id, type: 'Subject', icon: '<i class="fa-solid fa-book-open" style="color:var(--a-blue)"></i>' });
          } else {
            showToast('Subject deleted', 'success');
          }
        } else { showToast('Failed to delete subject', 'error'); return; }
        if (typeof loadSubjects === 'function') loadSubjects();
        populateSubjectSelects();
        if (typeof loadDashboardStats === 'function') loadDashboardStats();
        if (typeof loadEduSubjects === 'function') loadEduSubjects();
      } catch(_) { showToast('Network error', 'error'); }
    }
  });
};

/* ══ SUBMIT SESSION ══ */
window.submitSession = async function() {
  var dur   = parseInt(document.getElementById('session-duration').value) || 0;
  var sid   = document.getElementById('session-subject').value;
  var notes = document.getElementById('session-notes').value.trim();
  if (dur < 1) { showToast('Please enter a valid duration', 'error'); return; }
  try {
    var res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_minutes: dur, subject_id: sid || null, notes: notes })
    });
    if (res.ok) {
      showToast('Session logged!', 'success');
      document.getElementById('session-duration').value = '30';
      document.getElementById('session-notes').value = '';
      closeModal('session-modal');
      if (typeof loadDashboardStats === 'function') loadDashboardStats();
      if (typeof buildActivityChart === 'function') buildActivityChart();
      if (typeof loadStudyLog === 'function') loadStudyLog();
      if (typeof loadReportsData === 'function') loadReportsData();
    } else {
      var e = {}; try { e = await res.json(); } catch(_) {}
      showToast(e.message || 'Failed to log session', 'error');
    }
  } catch(_) { showToast('Network error', 'error'); }
};

/* ══ TIMER ══ */
var timerInterval = null, timerSeconds = 25*60, timerTotal = 25*60, timerRunning = false;

window.toggleTimer = function() {
  if (timerRunning) {
    clearInterval(timerInterval); timerRunning = false;
    document.getElementById('timer-play-icon').className = 'fa-solid fa-play';
    document.getElementById('timer-status').textContent = 'Paused';
  } else {
    timerRunning = true;
    document.getElementById('timer-play-icon').className = 'fa-solid fa-pause';
    document.getElementById('timer-status').textContent = 'Focusing…';
    timerInterval = setInterval(function() {
      if (timerSeconds > 0) { timerSeconds--; updateTimerDisplay(); }
      else {
        clearInterval(timerInterval); timerRunning = false;
        document.getElementById('timer-play-icon').className = 'fa-solid fa-play';
        document.getElementById('timer-status').textContent = 'Session complete!';
        showToast('Focus session complete!', 'success');
        saveSessionFromTimer();
      }
    }, 1000);
  }
};

function updateTimerDisplay() {
  var m = Math.floor(timerSeconds / 60), s = timerSeconds % 60;
  var disp = document.getElementById('timer-display');
  if (disp) disp.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  var circ = 2 * Math.PI * 70;
  var ring = document.getElementById('timer-progress-circle');
  if (ring) ring.style.strokeDashoffset = circ * (1 - timerSeconds / timerTotal);
}

window.resetTimer = function() {
  clearInterval(timerInterval); timerRunning = false; timerTotal = 25*60; timerSeconds = timerTotal;
  document.getElementById('timer-play-icon').className = 'fa-solid fa-play';
  document.getElementById('timer-status').textContent = 'Ready to focus?';
  document.querySelectorAll('.timer-preset').forEach(function(p) { p.classList.remove('active'); });
  var p25 = document.querySelector('.timer-preset[data-min="25"]');
  if (p25) p25.classList.add('active');
  updateTimerDisplay();
};

window.setTimerPreset = function(minutes) {
  clearInterval(timerInterval); timerRunning = false; timerTotal = minutes * 60; timerSeconds = timerTotal;
  document.getElementById('timer-play-icon').className = 'fa-solid fa-play';
  document.getElementById('timer-status').textContent = 'Ready to focus?';
  document.querySelectorAll('.timer-preset').forEach(function(p) { p.classList.remove('active'); });
  var preset = document.querySelector('.timer-preset[data-min="' + minutes + '"]');
  if (preset) preset.classList.add('active');
  updateTimerDisplay();
};

window.saveSessionFromTimer = async function() {
  var elapsed = timerTotal - timerSeconds;
  if (elapsed < 60) { showToast('Study for at least 1 minute to save', 'info'); return; }
  var sid = document.getElementById('timer-subject') ? document.getElementById('timer-subject').value : '';
  try {
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_minutes: Math.round(elapsed / 60), subject_id: sid || null, notes: 'Focus timer session' })
    });
    showToast('Session saved!', 'success');
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
    if (typeof buildActivityChart === 'function') buildActivityChart();
  } catch(_) { showToast('Failed to save session', 'error'); }
};

/* Init timer display */
updateTimerDisplay();

/* ══ FLASHCARDS ══ */
window.submitFlashcard = async function() {
  var fi  = document.getElementById('flashcard-front');
  var bi  = document.getElementById('flashcard-back');
  var btn = document.getElementById('flashcard-submit-btn');
  var front = fi.value.trim(), back = bi.value.trim();
  var sid = document.getElementById('flashcard-subject') ? document.getElementById('flashcard-subject').value : '';
  if (!front || !back) { showToast('Please fill in both the question and answer', 'error'); if (!front) fi.focus(); else bi.focus(); return; }
  btn.disabled = true; btn.textContent = 'Creating…';
  try {
    var res = await fetch('/api/flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ front: front, back: back, subject_id: sid || null })
    });
    if (res.ok) {
      showToast('Flashcard created!', 'success');
      fi.value = ''; bi.value = ''; fi.focus();
      loadFlashcardList();
      if (typeof loadDashboardStats === 'function') loadDashboardStats();
      if (typeof loadEduFlashcards === 'function') loadEduFlashcards();
    } else {
      var e = {}; try { e = await res.json(); } catch(_) {}
      showToast(e.message || 'Failed to create flashcard', 'error');
    }
  } catch(_) { showToast('Network error', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Create Flashcard'; }
};

function loadFlashcardList() {
  fetch('/api/flashcards').then(function(r) { return r.json(); }).then(function(cards) {
    var section = document.getElementById('flashcard-list-section');
    var list    = document.getElementById('flashcard-list');
    if (!section || !list) return;
    if (cards && cards.length) {
      section.style.display = 'block';
      list.innerHTML = cards.slice(0, 5).map(function(c) {
        return '<div class="mini-stat-row" style="padding:8px 0;"><span class="mini-stat-label">' + escapeHtml(c.front.substring(0, 30)) + '</span><span class="mini-stat-val" style="font-size:11px;">' + (c.review_count || 0) + ' reviews</span></div>';
      }).join('');
    } else { section.style.display = 'none'; }
  }).catch(function() {});
}

/* ══ NOTES ══ */
var notesArea = document.getElementById('quick-notes');
if (notesArea) notesArea.addEventListener('input', function() {
  var cc = document.getElementById('notes-char-count');
  if (cc) cc.textContent = this.value.length + ' characters';
});

window.saveNotes = function() {
  var text = document.getElementById('quick-notes').value;
  if (!text.trim()) { showToast('Write something first!', 'info'); return; }
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  a.download = 'study-notes-' + new Date().toISOString().split('T')[0] + '.txt';
  a.click();
  showToast('Notes downloaded!', 'success');
};

/* ══ EDIT PROFILE SUBMIT ══ */
window.submitEditProfile = async function() {
  var firstName = document.getElementById('edit-first-name').value.trim();
  var lastName  = document.getElementById('edit-last-name').value.trim();
  var username  = document.getElementById('edit-username').value.trim().toLowerCase();
  var btn = document.getElementById('edit-profile-submit-btn');
  if (!firstName || !lastName || !username) { showToast('All fields are required', 'error'); return; }
  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    var res = await fetch('/api/profile/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, username: username })
    });
    if (res.ok) {
      var u = window.STUDYHUB_USER || {};
      u.name = firstName + ' ' + lastName; u.firstName = firstName;
      u.username = username; u.initials = (firstName[0] || '') + (lastName[0] || '');
      window.STUDYHUB_USER = u;
      var navName = document.querySelector('.nav-user-name');
      if (navName) navName.textContent = firstName;
      closeModal('edit-profile-modal');
      showToast('Profile updated!', 'success');
      if (typeof renderProfileUI === 'function') renderProfileUI();
    } else {
      var e = {}; try { e = await res.json(); } catch(_) {}
      showToast(e.error || 'Failed to update profile', 'error');
    }
  } catch(_) { showToast('Network error', 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Save Changes'; }
};

/* ══ USER PROFILE MODAL ══
   NOTE: viewUserProfile, sendMessage, toggleFollow are defined in community.js
   for the community page. This shared.js stub is intentionally left empty so
   community.js (loaded after shared.js) provides the authoritative versions.
   For other pages that include shared.js without community.js, provide fallbacks. */
if (typeof window.viewUserProfile === 'undefined') {
  window.viewUserProfile = async function(username) {
    try {
      var res = await fetch('/api/users/' + encodeURIComponent(username));
      if (!res.ok) { showToast('User not found', 'error'); return; }
      var user = await res.json();
      var modal = document.getElementById('user-profile-modal');
      if (!modal) { showToast('Profile modal not available', 'info'); return; }
      var avaEl = document.getElementById('legacy-upm-ava');
      if (avaEl) avaEl.innerHTML = user.profile_picture
        ? '<img src="' + user.profile_picture + '" alt="">'
        : '<span>' + (user.first_name ? user.first_name[0] : 'U') + (user.last_name ? user.last_name[0] : '') + '</span>';
      var nameEl = document.getElementById('legacy-upm-name');
      if (nameEl) nameEl.textContent = user.first_name + ' ' + user.last_name;
      var handleEl = document.getElementById('legacy-upm-handle');
      if (handleEl) handleEl.textContent = '@' + user.username;
      var postsEl = document.getElementById('legacy-upm-posts');
      if (postsEl) postsEl.textContent = user.posts_count || 0;
      var followersEl = document.getElementById('legacy-upm-followers');
      if (followersEl) followersEl.textContent = user.followers_count || 0;
      var followingEl = document.getElementById('legacy-upm-following');
      if (followingEl) followingEl.textContent = user.following_count || 0;
      var followBtn = document.getElementById('legacy-upm-follow-btn');
      if (followBtn) {
        followBtn.textContent = user.is_following ? 'Following' : 'Follow';
        followBtn.classList.toggle('following-state', !!user.is_following);
        followBtn.onclick = function() { window.toggleFollow(username); };
      }
      modal.classList.add('active');
    } catch(_) { showToast('Failed to load user profile', 'error'); }
  };
}

if (typeof window.toggleFollow === 'undefined') {
  window.toggleFollow = async function(username) {
    try {
      var res  = await fetch('/api/users/' + encodeURIComponent(username) + '/follow', { method: 'POST' });
      var data = await res.json();
      var btn  = document.getElementById('legacy-upm-follow-btn');
      if (btn) {
        btn.textContent = data.following ? 'Following' : 'Follow';
        btn.classList.toggle('following-state', !!data.following);
      }
      showToast(data.following ? 'Now following @' + username : 'Unfollowed @' + username, data.following ? 'success' : 'info');
    } catch(_) { showToast('Failed to update follow status', 'error'); }
  };
}

if (typeof window.sendMessage === 'undefined') {
  window.sendMessage = async function(username) {
    /* Use a custom modal instead of prompt() which is blocked in iframes */
    var message = await new Promise(function(resolve) {
      var existing = document.getElementById('sh-msg-modal');
      if (existing) existing.remove();
      var overlay = document.createElement('div');
      overlay.id = 'sh-msg-modal';
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:inherit';
      overlay.innerHTML = '<div style="background:var(--bg-surface,#1e2130);border:1px solid var(--border,#2d3148);border-radius:16px;padding:28px;max-width:400px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">' +
        '<h3 style="margin:0 0 12px;color:var(--txt-primary,#fff);font-size:16px;"><i class="fa-solid fa-paper-plane" style="color:#6c8bef;margin-right:8px;"></i>Message @' + username + '</h3>' +
        '<textarea id="sh-msg-input" rows="3" placeholder="Type your message..." style="width:100%;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--border,#2d3148);background:var(--bg-glass,#151726);color:var(--txt-primary,#fff);font-size:14px;resize:vertical;margin-bottom:12px;outline:none;"></textarea>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
        '<button id="sh-msg-cancel" style="padding:8px 16px;border-radius:8px;border:1px solid var(--border,#2d3148);background:transparent;color:var(--txt-secondary,#9aa3c2);cursor:pointer;font-size:13px;">Cancel</button>' +
        '<button id="sh-msg-send" style="padding:8px 16px;border-radius:8px;border:none;background:#6c8bef;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">Send</button>' +
        '</div></div>';
      document.body.appendChild(overlay);
      var ta = document.getElementById('sh-msg-input');
      ta.focus();
      document.getElementById('sh-msg-send').onclick = function() { overlay.remove(); resolve(ta.value); };
      document.getElementById('sh-msg-cancel').onclick = function() { overlay.remove(); resolve(''); };
      overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); resolve(''); } };
    });
    if (!message || !message.trim()) return;
    try {
      var res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: username, body: message.trim() })
      });
      if (res.ok) showToast('Message sent!', 'success');
      else showToast('Failed to send message', 'error');
    } catch(_) { showToast('Failed to send message', 'error'); }
  };
}

window.sendMessageToUser = function() {
  var handle = document.getElementById('upm-handle');
  if (handle && typeof window.sendMessage === 'function')
    window.sendMessage(handle.textContent.replace(/^@/, ''));
};
