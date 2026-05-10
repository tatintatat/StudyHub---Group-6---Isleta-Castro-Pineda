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
window.deleteSubject = async function(id) {
  if (!confirm('Delete this subject?')) return;
  try {
    var res = await fetch('/api/subjects/' + id, { method: 'DELETE' });
    if (res.ok) { showToast('Subject deleted', 'success'); }
    else { showToast('Failed to delete subject', 'error'); return; }
    if (typeof loadSubjects === 'function') loadSubjects();
    populateSubjectSelects();
    if (typeof loadDashboardStats === 'function') loadDashboardStats();
    if (typeof loadEduSubjects === 'function') loadEduSubjects();
  } catch(_) { showToast('Network error', 'error'); }
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

/* ══ USER PROFILE MODAL ══ */
window.viewUserProfile = async function(username) {
  try {
    var res = await fetch('/api/users/' + encodeURIComponent(username));
    if (!res.ok) { showToast('User not found', 'error'); return; }
    var user = await res.json();
    document.getElementById('upm-ava').innerHTML = user.profile_picture
      ? '<img src="' + user.profile_picture + '" alt="">'
      : '<span>' + (user.first_name ? user.first_name[0] : 'U') + (user.last_name ? user.last_name[0] : '') + '</span>';
    document.getElementById('upm-name').textContent    = user.first_name + ' ' + user.last_name;
    document.getElementById('upm-handle').textContent  = '@' + user.username;
    document.getElementById('upm-posts').textContent   = user.post_count || 0;
    document.getElementById('upm-followers').textContent = user.follower_count || 0;
    document.getElementById('upm-following').textContent = user.following_count || 0;
    var followBtn = document.getElementById('upm-follow-btn');
    followBtn.textContent = user.is_following ? 'Following' : 'Follow';
    followBtn.classList.toggle('following-state', !!user.is_following);
    followBtn.onclick = function() { window.toggleFollow(username); };
    var postsRes = await fetch('/api/posts?filter=user&user=' + encodeURIComponent(username));
    var posts = await postsRes.json();
    renderUserModalPosts(posts);
    document.getElementById('user-profile-modal').classList.add('active');
  } catch(_) { showToast('Failed to load user profile', 'error'); }
};

window.toggleFollow = async function(username) {
  try {
    var res  = await fetch('/api/users/' + encodeURIComponent(username) + '/follow', { method: 'POST' });
    var data = await res.json();
    var btn  = document.getElementById('upm-follow-btn');
    btn.textContent = data.following ? 'Following' : 'Follow';
    btn.classList.toggle('following-state', !!data.following);
    var fEl = document.getElementById('upm-followers');
    if (fEl) fEl.textContent = parseInt(fEl.textContent) + (data.following ? 1 : -1);
    showToast(data.following ? 'Now following @' + username : 'Unfollowed @' + username, data.following ? 'success' : 'info');
  } catch(_) { showToast('Failed to update follow status', 'error'); }
};

window.sendMessageToUser = function() {
  var handle = document.getElementById('upm-handle');
  if (handle) sendMessage(handle.textContent.substring(1));
};

window.sendMessage = async function(username) {
  var message = prompt('Send a message to @' + username + ':');
  if (!message || !message.trim()) return;
  try {
    var res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver: username, body: message.trim() })
    });
    if (res.ok) showToast('Message sent!', 'success');
    else showToast('Failed to send message', 'error');
  } catch(_) { showToast('Failed to send message', 'error'); }
};

function renderUserModalPosts(posts) {
  var c = document.getElementById('upm-posts-container');
  if (!c) return;
  if (!posts || !posts.length) {
    c.innerHTML = '<div class="empty-state" style="padding:2rem 0"><i class="fa-solid fa-file-lines empty-icon-fa"></i><div>No posts yet</div></div>'; return;
  }
  var getTopicClass = function(t) { return { General:'topic-general',Math:'topic-math',Science:'topic-science',Notes:'topic-notes','Help Needed':'topic-help' }[t] || 'topic-general'; };
  c.innerHTML = posts.map(function(p) {
    var av = p.profile_picture ? '<img src="'+p.profile_picture+'" class="post-avatar">' : '<div class="post-avatar-initials">'+(p.first_name?p.first_name[0]:'U')+(p.last_name?p.last_name[0]:'')+' </div>';
    return '<div class="post-card" style="margin-bottom:12px;"><div class="post-header">'+av+
      '<div class="post-meta"><div class="post-author">'+escapeHtml(p.first_name+' '+p.last_name)+'</div>'+
      '<div class="post-handle">@'+p.username+' · <span class="post-time">'+formatTimeAgo(p.created_at)+'</span></div></div>'+
      '<div class="post-topic-badge '+getTopicClass(p.topic)+'">'+p.topic+'</div></div>'+
      '<div class="post-title">'+escapeHtml(p.title)+'</div>'+
      '<div class="post-body">'+escapeHtml(p.body)+'</div></div>';
  }).join('');
}
