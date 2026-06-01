/* ── StudyHub · Education Page (Redesigned) ── */
'use strict';

/* ══ STATE ══ */
var _currentSubject   = null;   // { id, name, color }
var _allSubjects      = [];
var _allFlashcards    = [];
var _eduAIGenCount    = 0;

/* ══ FEATURE TRACKER ══ */
function trackFeature(feature) {
  fetch('/api/feature-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature: feature })
  }).catch(function() {});
}

/* ══ TAB SWITCHING ══ */
document.querySelectorAll('.edu-tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.edu-tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.edu-tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    var panel = document.getElementById('etab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
    if (btn.dataset.tab === 'timer')    saLoadSessions();
    if (btn.dataset.tab === 'subjects') loadEduSubjects();
  });
});

/* Sub-tabs inside subject detail */
document.querySelectorAll('.subject-subtab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.subject-subtab').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.subject-subpanel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    var panel = document.getElementById('sdpanel-' + btn.dataset.subtab);
    if (panel) panel.classList.add('active');
  });
});

/* ══ STATS ══ */
function loadEduStats() {
  fetch('/api/stats')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var set = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
      set('edu-stat-subjects', d.subjects   || 0);
      set('edu-stat-cards',    d.flashcards || 0);
      set('edu-stat-mastered', d.flashcards ? Math.floor(d.flashcards * 0.4) : 0);
    })
    .catch(function() {});
}

/* ══ LOCAL STORAGE — Quiz persistence (per-user scoped, InfinityFree-safe) ══ */

// Returns a storage key scoped to the currently logged-in user.
// This guarantees quizzes from Account A are NEVER visible to Account B,
// even on the same browser.
function _quizStorageKey() {
  var uid = (window.STUDYHUB_USER && window.STUDYHUB_USER.id) ? String(window.STUDYHUB_USER.id) : null;
  if (!uid) return null; // not logged in — do not read or write
  // One-time migration: wipe the old unscoped 'sh_quizzes_v1' key
  // so it doesn't linger and confuse anything.
  if (localStorage.getItem('sh_quizzes_v1') !== null) {
    localStorage.removeItem('sh_quizzes_v1');
  }
  return 'sh_quizzes_v1_' + uid;
}

function getStoredQuizzes() {
  var key = _quizStorageKey();
  if (!key) return [];
  try {
    var raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}
function saveStoredQuizzes(arr) {
  var key = _quizStorageKey();
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch(e) {}
}
function getQuizzesForSubject(subjectId) {
  return getStoredQuizzes().filter(function(q) {
    return String(q.subject_id) === String(subjectId);
  });
}
function addStoredQuiz(quiz) {
  var arr = getStoredQuizzes();
  quiz.id = 'q_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
  arr.unshift(quiz);
  saveStoredQuizzes(arr);
  return quiz;
}
function deleteStoredQuiz(id) {
  var arr = getStoredQuizzes().filter(function(q) { return q.id !== id; });
  saveStoredQuizzes(arr);
}

// On page load: wipe any quiz localStorage keys that belong to OTHER users.
// Safety net in case logout didn't clean up (tab closed, session expired, etc.)
(function _purgeOtherUsersQuizData() {
  try {
    var myKey = _quizStorageKey();
    var toDelete = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('sh_quizzes_v1_') === 0 && k !== myKey) {
        toDelete.push(k);
      }
    }
    toDelete.forEach(function(k) { localStorage.removeItem(k); });
  } catch(_) {}
})();

// Clear any stale generation globals left over from a previous session/user.
// Without this, window._pfcSubj or window._curQuizSubj could still hold a
// subject ID from the last logged-in user, causing saved items to land in
// the wrong subject.
window._pfc          = [];
window._pfcSubj      = null;
window._curQuizItems = [];
window._curQuizType  = null;
window._curQuizSubj  = null;

/* ══ SUBJECTS ══ */
function loadEduSubjects() {
  fetch('/api/subjects')
    .then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(function(subjects) {
      _allSubjects = Array.isArray(subjects) ? subjects : [];
      /* Make sure subjects list view is visible (not detail view) */
      var listView   = document.getElementById('subjects-list-view');
      var detailView = document.getElementById('subject-detail-view');
      if (listView   && !_currentSubject) listView.style.display = '';
      if (detailView && !_currentSubject) { detailView.style.display = 'none'; detailView.classList.remove('active'); }
      renderSubjectFolders(_allSubjects);
      fillEduSubjectSelects(_allSubjects);
    })
    .catch(function(err) {
      var grid = document.getElementById('subjects-folder-grid');
      if (grid) grid.innerHTML =
        '<div class="edu-empty" style="grid-column:1/-1">' +
        '<i class="fa-solid fa-circle-exclamation"></i>' +
        '<p>Could not load subjects</p>' +
        '<span>Check your connection and refresh</span>' +
        '</div>' +
        '<div class="subject-add-card" onclick="openSubjectModal()">' +
        '<i class="fa-solid fa-plus"></i><span>New Subject</span>' +
        '</div>';
    });
}
window.loadEduSubjects = loadEduSubjects;

function fillEduSubjectSelects(subjects) {
  ['edu-gen-subject', 'sa-timer-subject'].forEach(function(id) {
    var el = document.getElementById(id); if (!el) return;
    var placeholder = id === 'edu-gen-subject' ? '\u2014 Select a subject \u2014' : 'No subject';
    el.innerHTML = '<option value="">' + placeholder + '</option>' +
      subjects.map(function(s) {
        return '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
      }).join('');
    // Clear validation state when user picks a subject
    if (id === 'edu-gen-subject') {
      el.addEventListener('change', function() {
        updateGenerateBtn();
      });
    }
  });
  /* also update the shared.js selects */
  if (typeof populateSubjectSelects === 'function') populateSubjectSelects();
  updateGenerateBtn();
}

function _buildFolderHTML(subjects, fcCounts, qCounts) {
  fcCounts = fcCounts || {};
  qCounts  = qCounts  || {};
  if (!subjects.length) {
    return '<div class="edu-empty" style="grid-column:1/-1">' +
           '<i class="fa-solid fa-folder-open"></i>' +
           '<p>No subjects yet</p>' +
           '<span>Create a subject to organise your flashcards and quizzes</span>' +
           '</div>' +
           '<div class="subject-add-card" onclick="openSubjectModal()">' +
           '<i class="fa-solid fa-plus"></i><span>New Subject</span>' +
           '</div>';
  }
  var html = subjects.map(function(s, i) {
    var fc  = fcCounts[s.id] || 0;
    var qc  = qCounts[s.id]  || 0;
    var bg  = s.color || '#8b7cf8';
    var sn  = (s.name || '').replace(/\\/g, '').replace(/'/g, '').replace(/"/g, '');
    return '<div class="subject-folder-card" style="animation-delay:' + (i * 0.05) + 's" onclick="openSubjectDetail(' + s.id + ')">' +
      '<div class="subject-folder-top">' +
        '<div class="subject-folder-icon" style="background:' + bg + '22;color:' + bg + '">' +
          '<i class="fa-solid fa-folder-open"></i>' +
        '</div>' +
        '<div class="subject-folder-name">' + escapeHtml(s.name) + '</div>' +
      '</div>' +
      '<div class="subject-folder-footer">' +
        '<div class="subject-folder-counts">' +
          '<span class="subject-folder-badge sfc-cards"><i class="fa-solid fa-layer-group"></i> ' + fc + '</span>' +
          '<span class="subject-folder-badge sfc-quizzes"><i class="fa-solid fa-clipboard-question"></i> ' + qc + '</span>' +
        '</div>' +
        '<button class="subject-folder-del" onclick="event.stopPropagation();deleteSubjectEdu(' + s.id + ',\'' + sn + '\')" title="Delete subject">' +
          '<i class="fa-solid fa-trash"></i>' +
        '</button>' +
      '</div>' +
    '</div>';
  }).join('');
  html += '<div class="subject-add-card" onclick="openSubjectModal()">' +
          '<i class="fa-solid fa-plus"></i><span>New Subject</span>' +
          '</div>';
  return html;
}

function renderSubjectFolders(subjects) {
  var grid = document.getElementById('subjects-folder-grid');
  if (!grid) return;

  /* Render immediately with whatever counts we already have in memory */
  var fcCounts = {};
  _allFlashcards.forEach(function(c) {
    if (c.subject_id) fcCounts[c.subject_id] = (fcCounts[c.subject_id] || 0) + 1;
  });
  var qCounts = {};
  getStoredQuizzes().forEach(function(q) {
    if (q.subject_id) qCounts[q.subject_id] = (qCounts[q.subject_id] || 0) + 1;
  });
  grid.innerHTML = _buildFolderHTML(subjects, fcCounts, qCounts);

  /* Then silently refresh counts from server */
  fetch('/api/flashcards')
    .then(function(r) { return r.json(); })
    .then(function(cards) {
      _allFlashcards = cards || [];
      var fcC = {};
      _allFlashcards.forEach(function(c) {
        if (c.subject_id) fcC[c.subject_id] = (fcC[c.subject_id] || 0) + 1;
      });
      var qC = {};
      getStoredQuizzes().forEach(function(q) {
        if (q.subject_id) qC[q.subject_id] = (qC[q.subject_id] || 0) + 1;
      });
      /* Only re-render if grid is still showing (not inside a detail view) */
      var detailActive = document.getElementById('subject-detail-view');
      if (detailActive && detailActive.style.display === 'block') return;
      grid.innerHTML = _buildFolderHTML(subjects, fcC, qC);
    })
    .catch(function() { /* counts already shown, ignore */ });
}

/* ── Open subject detail (folder drill-down) ── */
window.openSubjectDetail = function(subjectId) {
  var subject = _allSubjects.find(function(s) { return String(s.id) === String(subjectId); });
  if (!subject) return;
  _currentSubject = subject;

  /* Update header */
  var bg = subject.color || '#8b7cf8';
  var icon   = document.getElementById('sd-icon');
  var name   = document.getElementById('sd-name');
  var meta   = document.getElementById('sd-meta');
  if (icon)  { icon.style.background = bg + '22'; icon.style.color = bg; }
  if (name)  name.textContent = subject.name;

  /* Switch view */
  var listView   = document.getElementById('subjects-list-view');
  var detailView = document.getElementById('subject-detail-view');
  if (listView)   listView.style.display = 'none';
  if (detailView) { detailView.style.display = 'block'; detailView.classList.add('active'); }

  /* Reset to flashcards subtab */
  document.querySelectorAll('.subject-subtab').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.subject-subpanel').forEach(function(p) { p.classList.remove('active'); });
  var fcTab = document.querySelector('[data-subtab="flashcards"]');
  var fcPanel = document.getElementById('sdpanel-flashcards');
  if (fcTab)   fcTab.classList.add('active');
  if (fcPanel) fcPanel.classList.add('active');

  loadSubjectFlashcards(subjectId);
  loadSubjectQuizzes(subjectId);

  /* Update AI generator subject pre-selection */
  var genSubj = document.getElementById('edu-gen-subject');
  if (genSubj) genSubj.value = subjectId;
};

window.closeSubjectDetail = function() {
  _currentSubject = null;
  var listView   = document.getElementById('subjects-list-view');
  var detailView = document.getElementById('subject-detail-view');
  if (listView)   listView.style.display = '';
  if (detailView) { detailView.style.display = 'none'; detailView.classList.remove('active'); }
  loadEduSubjects();
};

window.goToAIForSubject = function() {
  /* Switch to AI tab and pre-select the current subject */
  document.querySelectorAll('.edu-tab-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelectorAll('.edu-tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var aiBtn   = document.querySelector('[data-tab="ai"]');
  var aiPanel = document.getElementById('etab-ai');
  if (aiBtn)   aiBtn.classList.add('active');
  if (aiPanel) aiPanel.classList.add('active');
  if (_currentSubject) {
    var genSubj = document.getElementById('edu-gen-subject');
    if (genSubj) genSubj.value = _currentSubject.id;
  }
};

window.openFlashcardModalForSubject = function() {
  openFlashcardModal();
  if (_currentSubject) {
    setTimeout(function() {
      var sel = document.getElementById('flashcard-subject');
      if (sel) sel.value = _currentSubject.id;
    }, 100);
  }
};

/* ── Flashcards inside a subject ── */
function loadSubjectFlashcards(subjectId) {
  fetch('/api/flashcards?subject_id=' + subjectId)
    .then(function(r) { return r.json(); })
    .then(function(cards) {
      renderSubjectFlashcards(cards || []);
      var cntEl = document.getElementById('sd-fc-count');
      if (cntEl) cntEl.textContent = (cards || []).length;
      updateSubjectMeta();
    })
    .catch(function() {});
}
window.loadSubjectFlashcards = loadSubjectFlashcards;

function renderSubjectFlashcards(cards) {
  var grid = document.getElementById('sd-fc-grid'); if (!grid) return;
  if (!cards.length) {
    grid.innerHTML =
      '<div class="edu-empty" style="grid-column:1/-1">' +
      '<i class="fa-solid fa-layer-group"></i>' +
      '<p>No flashcards yet</p>' +
      '<span>Add cards manually or use the AI Generator</span>' +
      '</div>';
    return;
  }
  grid.innerHTML = cards.map(function(c, i) {
    return '<div class="fc-card" onclick="this.classList.toggle(\'flipped\');trackFeature(\'flashcard_flip\')" style="animation-delay:' + (i * 0.04) + 's">' +
      '<div class="fc-card-inner">' +
        '<div class="fc-front"><div class="fc-icon"><i class="fa-solid fa-question"></i></div><div class="fc-txt">' + escapeHtml(c.front) + '</div></div>' +
        '<div class="fc-back"><div class="fc-icon"><i class="fa-solid fa-lightbulb"></i></div><div class="fc-txt">' + escapeHtml(c.back) + '</div></div>' +
      '</div>' +
      '<button class="fc-del-btn" onclick="event.stopPropagation();deleteFCEdu(' + c.id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
    '</div>';
  }).join('');
}

/* ── Quizzes inside a subject ── */
function loadSubjectQuizzes(subjectId) {
  var quizzes = getQuizzesForSubject(subjectId);
  renderSubjectQuizzes(quizzes);
  var cntEl = document.getElementById('sd-quiz-count');
  if (cntEl) cntEl.textContent = quizzes.length;
  updateSubjectMeta();
}

function renderSubjectQuizzes(quizzes) {
  var list = document.getElementById('sd-quiz-list'); if (!list) return;
  if (!quizzes.length) {
    list.innerHTML =
      '<div class="edu-empty">' +
      '<i class="fa-solid fa-clipboard-question"></i>' +
      '<p>No quizzes yet</p>' +
      '<span>Generate a quiz from this subject using the AI Generator</span>' +
      '</div>';
    return;
  }
  var typeLabels = { mcq: 'Multiple Choice', truefalse: 'True/False', identification: 'Identification', mixed: 'Mixed', flashcard: 'Flashcard Quiz' };
  list.innerHTML = quizzes.map(function(q, i) {
    var label = typeLabels[q.quiz_type] || 'Quiz';
    var date  = q.created_at ? new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return '<div class="quiz-list-item" style="animation-delay:' + (i * 0.05) + 's">' +
      '<div class="quiz-list-icon"><i class="fa-solid fa-clipboard-question"></i></div>' +
      '<div class="quiz-list-info">' +
        '<div class="quiz-list-name">' + escapeHtml(q.title || 'Quiz') + '</div>' +
        '<div class="quiz-list-meta">' + label + ' · ' + (q.items ? q.items.length : 0) + ' items' + (date ? ' · ' + date : '') + '</div>' +
      '</div>' +
      '<button class="quiz-play-btn" onclick="playStoredQuiz(\'' + q.id + '\')"><i class="fa-solid fa-play"></i> Play</button>' +
      '<button class="quiz-del-btn" onclick="deleteQuizItem(\'' + q.id + '\')" title="Delete quiz"><i class="fa-solid fa-trash"></i></button>' +
    '</div>';
  }).join('');
}

function updateSubjectMeta() {
  if (!_currentSubject) return;
  var fcCount  = parseInt((document.getElementById('sd-fc-count')   || {}).textContent  || '0');
  var qCount   = parseInt((document.getElementById('sd-quiz-count') || {}).textContent || '0');
  var metaEl   = document.getElementById('sd-meta');
  if (metaEl) metaEl.textContent = fcCount + ' flashcard' + (fcCount !== 1 ? 's' : '') + ' · ' + qCount + ' quiz' + (qCount !== 1 ? 'zes' : '');
}

/* ── Delete subject ── */
window.deleteSubjectEdu = function(sid, sname) {
  SHConfirm.show({
    type: 'danger', icon: 'fa-trash', title: 'Move to Trash?',
    body: '"' + (sname || 'This subject') + '" will be moved to Trash. You can restore it from the Trash Bin in the navigation bar.',
    confirmLabel: 'Move to Trash',
    onConfirm: function() {
      fetch('/api/subjects/' + sid, { method: 'DELETE' })
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          /* Add to SHTrash modal so it shows up in the trash bin */
          if (window.SHTrash) {
            SHTrash.addItem({ id: sid, name: sname || 'Subject #' + sid, type: 'Subject', icon: '<i class="fa-solid fa-book-open" style="color:var(--a-blue)"></i>' });
          } else {
            showToast('Subject moved to trash', 'success');
          }
          /* Also remove quizzes for this subject from localStorage */
          var remaining = getStoredQuizzes().filter(function(q) { return String(q.subject_id) !== String(sid); });
          saveStoredQuizzes(remaining);
          loadEduSubjects();
          loadEduStats();
        })
        .catch(function(e) { showToast('Failed to move to trash: ' + e.message, 'error'); });
    }
  });
};

/* ── Delete flashcard ── */
window.deleteFCEdu = function(id) {
  SHConfirm.show({
    type: 'danger', icon: 'fa-layer-group', title: 'Delete Flashcard?',
    body: 'This flashcard will be permanently deleted.',
    confirmLabel: 'Move to Trash',
    onConfirm: function() {
      fetch('/api/flashcards/' + id, { method: 'DELETE' })
        .then(function() {
          showToast('Flashcard deleted', 'success');
          if (_currentSubject) loadSubjectFlashcards(_currentSubject.id);
          loadEduStats();
        })
        .catch(function() { showToast('Failed', 'error'); });
    }
  });
};

/* ── Delete quiz ── */
window.deleteQuizItem = function(id) {
  SHConfirm.show({
    type: 'danger', icon: 'fa-clipboard-question', title: 'Delete Quiz?',
    body: 'This quiz will be permanently removed.',
    confirmLabel: 'Move to Trash',
    onConfirm: function() {
      deleteStoredQuiz(id);
      showToast('Quiz deleted', 'success');
      if (_currentSubject) loadSubjectQuizzes(_currentSubject.id);
      renderSubjectFolders(_allSubjects); /* refresh badge count */
    }
  });
};

/* ── Play stored quiz ── */
window.playStoredQuiz = function(id) {
  var quiz = getStoredQuizzes().find(function(q) { return q.id === id; });
  if (!quiz || !quiz.items || !quiz.items.length) { showToast('Quiz not found', 'error'); return; }
  openQuizPlayer(quiz.title || 'Quiz', { idx: 0, score: 0, items: quiz.items });
};

/* ══ STANDALONE TIMER ══ */
var saTotal = 25 * 60, saSeconds = 25 * 60, saRunning = false, saInterval = null;
var saCirc  = 2 * Math.PI * 88;  /* circumference for r=88 */

function saUpdateDisplay() {
  var m = Math.floor(saSeconds / 60), s = saSeconds % 60;
  var disp = document.getElementById('sa-timer-display');
  if (disp) disp.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  var ring = document.getElementById('sa-timer-ring');
  if (ring) ring.style.strokeDashoffset = saCirc * (1 - saSeconds / saTotal);
}

window.saToggleTimer = function() {
  if (saRunning) {
    clearInterval(saInterval); saRunning = false;
    document.getElementById('sa-timer-play-icon').className = 'fa-solid fa-play';
    document.getElementById('sa-timer-status').textContent = 'Paused';
  } else {
    saRunning = true;
    document.getElementById('sa-timer-play-icon').className = 'fa-solid fa-pause';
    document.getElementById('sa-timer-status').textContent = 'Focusing\u2026';
    saInterval = setInterval(function() {
      if (saSeconds > 0) { saSeconds--; saUpdateDisplay(); }
      else {
        clearInterval(saInterval); saRunning = false;
        document.getElementById('sa-timer-play-icon').className = 'fa-solid fa-play';
        document.getElementById('sa-timer-status').textContent = 'Session complete! \uD83C\uDF89';
        showToast('Focus session complete!', 'success');
        saSaveSession();
      }
    }, 1000);
  }
};

window.saResetTimer = function() {
  clearInterval(saInterval); saRunning = false; saSeconds = saTotal;
  document.getElementById('sa-timer-play-icon').className = 'fa-solid fa-play';
  document.getElementById('sa-timer-status').textContent = 'Ready to focus?';
  document.querySelectorAll('[data-sapreset]').forEach(function(p) { p.classList.remove('active'); });
  var p25 = document.querySelector('[data-sapreset="25"]'); if (p25) p25.classList.add('active');
  saTotal = 25 * 60; saSeconds = saTotal;
  saUpdateDisplay();
};

window.saSetPreset = function(minutes) {
  clearInterval(saInterval); saRunning = false; saTotal = minutes * 60; saSeconds = saTotal;
  document.getElementById('sa-timer-play-icon').className = 'fa-solid fa-play';
  document.getElementById('sa-timer-status').textContent = 'Ready to focus?';
  document.querySelectorAll('[data-sapreset]').forEach(function(p) { p.classList.remove('active'); });
  var pb = document.querySelector('[data-sapreset="' + minutes + '"]'); if (pb) pb.classList.add('active');
  saUpdateDisplay();
};

window.saSaveSession = async function() {
  var elapsed = saTotal - saSeconds;
  if (elapsed < 60) { showToast('Study at least 1 minute to save', 'info'); return; }
  var sid = (document.getElementById('sa-timer-subject') || {}).value || '';
  try {
    trackFeature('timer_session');
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_minutes: Math.round(elapsed / 60), subject_id: sid || null, notes: 'Focus timer session' })
    });
    showToast('Session saved!', 'success');
    saLoadSessions();
    loadEduStats();
  } catch(_) { showToast('Failed to save', 'error'); }
};

async function saLoadSessions() {
  var el = document.getElementById('sa-sessions-log'); if (!el) return;
  try {
    var res      = await fetch('/api/sessions');
    var sessions = await res.json();
    if (!sessions || !sessions.length) {
      el.innerHTML = '<div style="color:var(--txt-muted);font-size:13px;">No sessions yet</div>';
      return;
    }
    el.innerHTML = sessions.slice(0, 5).map(function(s) {
      var color   = s.subject_color || '#8b7cf8';
      var name    = s.subject_name  || 'General';
      var date    = new Date(s.session_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      var h = Math.floor(s.duration_minutes / 60), m = s.duration_minutes % 60;
      var timeStr = h > 0 ? h + 'h ' + m + 'm' : m + ' min';
      return '<div class="log-item">' +
        '<div class="log-color" style="background:' + color + '"></div>' +
        '<div class="log-info"><div class="log-subject">' + escapeHtml(name) + '</div>' +
        '<div class="log-meta">' + date + '</div></div>' +
        '<div class="log-duration">' + timeStr + '</div></div>';
    }).join('');
  } catch(_) {}
}

saUpdateDisplay();


/* ══════════════════════════════════════════════════════════════════
   AI GENERATOR — Pollinations.AI backend (free, no API key)
   All AI calls go through /api/ai/* PHP endpoints.
   ══════════════════════════════════════════════════════════════════ */

var eduState = { file: null, text: null, generating: false };
var _eduAIGenCount = 0;

/* ── Drop-zone & file input ── */
var _dz = document.getElementById('edu-dropzone');
if (_dz) {
  _dz.addEventListener('dragover',  function(e) { e.preventDefault(); _dz.classList.add('over'); });
  _dz.addEventListener('dragleave', function()  { _dz.classList.remove('over'); });
  _dz.addEventListener('drop', function(e) {
    e.preventDefault(); _dz.classList.remove('over');
    var f = e.dataTransfer.files[0]; if (f) eduSetFile(f);
  });
}
var _eduFI = document.getElementById('edu-file-input');
if (_eduFI) _eduFI.addEventListener('change', function() { if (this.files[0]) eduSetFile(this.files[0]); });

var _eduUT = document.getElementById('edu-upload-trigger');
if (_eduUT) _eduUT.addEventListener('click', function() {
  switchToAITab();
  setTimeout(function() { document.getElementById('edu-file-input').click(); }, 100);
});

function switchToAITab() {
  document.querySelectorAll('.edu-tab-btn').forEach(function(b)  { b.classList.remove('active'); });
  document.querySelectorAll('.edu-tab-panel').forEach(function(p) { p.classList.remove('active'); });
  var aiBtn   = document.querySelector('[data-tab="ai"]');
  var aiPanel = document.getElementById('etab-ai');
  if (aiBtn)   aiBtn.classList.add('active');
  if (aiPanel) aiPanel.classList.add('active');
}

function eduSetFile(file) {
  if (!file.name.match(/\.(pptx?|pdf)$/i)) { showToast('Please upload .pptx or .pdf', 'error'); return; }
  eduState.file = file;
  document.getElementById('edu-dropzone-inner').style.display = 'none';
  var fp = document.getElementById('edu-file-preview');
  fp.style.display = 'flex';
  document.getElementById('edu-file-name').textContent = file.name;
  document.getElementById('edu-file-size').textContent = (file.size / 1024).toFixed(1) + ' KB';
  var ic = document.getElementById('edu-file-icon-type');
  if (ic) ic.className = file.name.match(/\.pdf$/i) ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file-powerpoint';
  document.getElementById('edu-gen-options').style.display = 'block';
  updateGenerateBtn();
  switchToAITab();
}

window.eduClearFile = function() {
  eduState.file = null;
  eduState.text = null;
  document.getElementById('edu-dropzone-inner').style.display  = '';
  document.getElementById('edu-file-preview').style.display    = 'none';
  document.getElementById('edu-gen-options').style.display     = 'none';
  document.getElementById('edu-results-wrap').style.display    = 'none';
  var fi = document.getElementById('edu-file-input'); if (fi) fi.value = '';
  /* hide paste area if visible */
  var pa = document.getElementById('edu-paste-area'); if (pa) pa.style.display = 'none';
};

/* ── Choice card toggles ── */
document.querySelectorAll('.edu-gen-choice input').forEach(function(r) {
  r.addEventListener('change', function() {
    document.querySelectorAll('.edu-gen-choice').forEach(function(c) { c.classList.remove('active'); });
    this.closest('.edu-gen-choice').classList.add('active');
    var qt = document.getElementById('edu-quiz-types');
    if (qt) qt.style.display = this.value === 'quiz' ? 'block' : 'none';
  });
});
document.querySelectorAll('.edu-chip input').forEach(function(r) {
  r.addEventListener('change', function() {
    document.querySelectorAll('.edu-chip').forEach(function(c) { c.classList.remove('active'); });
    this.closest('.edu-chip').classList.add('active');
  });
});

/* ══════════════════════════════════════════════════════════════════
   BACKEND AI CALL — Upload file directly to server for text extraction
   then send extracted text to Pollinations.AI (free, no API key).
   NO client-side AI — all processing done via Pollinations.AI on the server.
   ══════════════════════════════════════════════════════════════════ */

async function callBackendAI(file, genType, quizType, count, setStatus) {
  setStatus('Uploading file to server\u2026', 25);

  /* Build multipart form — server handles text extraction */
  var fd = new FormData();
  fd.append('file',      file);
  fd.append('gen_type',  genType);
  fd.append('quiz_type', quizType);
  fd.append('count',     count);

  setStatus('Extracting text from file\u2026', 45);

  // 90-second timeout — Pollinations.AI can be slow on free tier
  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 90000);

  var res;
  try {
    res = await fetch('/api/ai/generate-file', {
      method: 'POST',
      body:   fd,
      signal: controller.signal
    });
  } catch(e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('Generation timed out. Please try again with a shorter document.');
    throw new Error('Network error. Check your connection and try again.');
  }
  clearTimeout(timer);

  setStatus('AI is generating your ' + (genType === 'quiz' ? 'quiz' : 'flashcards') + '\u2026', 70);

  var data = await res.json().catch(function() { return {}; });

  if (!res.ok) {
    var msg = data.error || ('Server error ' + res.status);
    throw new Error(msg);
  }

  if (!data.items || !data.items.length) {
    throw new Error('AI returned no items. Try a file with more readable text.');
  }

  return data.items;
}

/* ── Text-input fallback: paste text directly ── */
async function callBackendAIText(text, genType, quizType, count, setStatus) {
  setStatus('Sending text to AI\u2026', 40);

  var controller = new AbortController();
  var timer = setTimeout(function() { controller.abort(); }, 90000);

  var res;
  try {
    res = await fetch('/api/ai/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text, gen_type: genType, quiz_type: quizType, count: count }),
      signal: controller.signal
    });
  } catch(e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error('Generation timed out. Please try again with less text.');
    throw new Error('Network error. Check your connection and try again.');
  }
  clearTimeout(timer);

  setStatus('AI is generating your ' + (genType === 'quiz' ? 'quiz' : 'flashcards') + '\u2026', 70);

  var data = await res.json().catch(function() { return {}; });

  if (!res.ok) throw new Error(data.error || ('Server error ' + res.status));
  if (!data.items || !data.items.length) throw new Error('AI returned no items. Please try again.');
  return data.items;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN GENERATE FUNCTION
   ══════════════════════════════════════════════════════════════════ */

/* ── Generate button state: disabled when no subject selected ── */
function updateGenerateBtn(flash) {
  var sel = document.getElementById('edu-gen-subject');
  var btn = document.getElementById('edu-generate-btn');
  var warn = document.getElementById('edu-subj-warn');
  if (!sel || !btn) return;
  var hasSubject = sel.value && sel.value !== '';
  if (hasSubject) {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.cursor = '';
    if (warn) warn.style.display = 'none';
  } else {
    btn.disabled = true;
    btn.style.opacity = '0.45';
    btn.style.cursor = 'not-allowed';
    if (warn) {
      warn.style.display = 'flex';
      if (flash) {
        warn.style.animation = 'none';
        warn.offsetHeight; // reflow
        warn.style.animation = 'eduWarnPulse 0.4s ease';
      }
    }
  }
}
window.updateGenerateBtn = updateGenerateBtn;

window.eduGenerate = async function() {
  if (!eduState.file && !eduState.text) { showToast('Please upload a file or paste text first', 'error'); return; }
  if (eduState.generating) return;

  // Subject is required
  var subjId = (document.getElementById('edu-gen-subject') || {}).value || null;
  if (!subjId) {
    updateGenerateBtn(true); // flash the warning
    return;
  }


  eduState.generating = true;

  var genType  = (document.querySelector('input[name="edu_gen_type"]:checked')  || {}).value || 'flashcard';
  var quizType = (document.querySelector('input[name="edu_quiz_type"]:checked') || {}).value || 'mcq';
  var count    = parseInt((document.getElementById('edu-gen-count')    || {}).value || '10');

  trackFeature('ai_generate');

  var btn = document.getElementById('edu-generate-btn');
  btn.disabled  = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating\u2026';
  document.getElementById('edu-gen-options').style.display = 'none';

  var pw = document.getElementById('edu-progress-wrap');
  var pf = document.getElementById('edu-progress-fill');
  var pl = document.getElementById('edu-progress-label');
  pw.style.display = 'block';
  pf.style.width   = '5%';
  pl.textContent   = 'Starting\u2026';

  function setStatus(msg, pct) {
    pl.textContent = msg;
    if (pct !== undefined) pf.style.width = pct + '%';
  }

  function resetUI(msg) {
    pw.style.display = 'none';
    document.getElementById('edu-gen-options').style.display = 'block';
    updateGenerateBtn();
    eduState.generating = false;
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI';
    if (msg) showToast(msg, 'error');
  }

  try {
    var items;

    if (eduState.file) {
      /* File upload path — server extracts text, calls Pollinations.AI */
      items = await callBackendAI(eduState.file, genType, quizType, count, setStatus);
    } else {
      /* Text paste path — send text directly to Pollinations.AI */
      var pasteText = (document.getElementById('edu-paste-text') || {}).value || '';
      if (!pasteText.trim() || pasteText.trim().length < 80) {
        resetUI('Not enough text. Paste at least a few sentences.');
        return;
      }
      items = await callBackendAIText(pasteText.trim(), genType, quizType, count, setStatus);
    }

    /* Validate */
    setStatus('Parsing response\u2026', 90);
    if (!items || !items.length) {
      resetUI('AI returned an empty response. Please try again.');
      return;
    }

    /* Done */
    setStatus('Done!', 100);
    await new Promise(function(r) { setTimeout(r, 250); });
    pw.style.display = 'none';
    document.getElementById('edu-gen-options').style.display = 'block';
    updateGenerateBtn();
    eduState.generating = false;
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI';

    _eduAIGenCount += items.length;
    var aiEl = document.getElementById('edu-stat-ai');
    if (aiEl) aiEl.textContent = _eduAIGenCount;

    eduRenderResults(items, genType, quizType, subjId);

  } catch (err) {
    resetUI(err.message || 'Generation failed. Please try again.');
  }
};

/* ══════════════════════════════════════════════════════════════════
   RESULTS RENDERING
   ══════════════════════════════════════════════════════════════════ */

function eduRenderResults(items, genType, quizType, subjId) {
  var wrap = document.getElementById('edu-results-wrap');
  wrap.innerHTML    = '';
  wrap.style.display = 'block';
  if (genType === 'flashcard') {
    _renderFlashcardResults(items, subjId, wrap);
  } else {
    _renderQuizResults(items, quizType, subjId, wrap);
  }
  setTimeout(function() { wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
}

/* ── Flashcard grid ── */
function _renderFlashcardResults(items, subjId, wrap) {
  window._pfc     = items;
  window._pfcSubj = subjId;
  wrap.innerHTML =
    '<div class="edu-res-header">' +
      '<div class="edu-res-title"><i class="fa-solid fa-layer-group"></i> Generated Flashcards <span class="edu-res-badge">' + items.length + '</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button class="edu-take-quiz-btn" onclick="eduStartFlashcardQuiz()">' +
          '<i class="fa-solid fa-clipboard-question"></i> Take a Quiz' +
        '</button>' +
        '<button class="edu-save-btn" id="edu-save-fc-btn" onclick="eduSaveFC()">' +
          '<i class="fa-solid fa-floppy-disk"></i> Save All' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<p style="font-size:13px;color:var(--txt-muted,#888);margin:0 0 12px;">Click any card to flip it</p>' +
    '<div class="edu-fc-grid-res">' +
      items.map(function(c, i) {
        return '<div class="fc-card" onclick="this.classList.toggle(\'flipped\')" style="animation-delay:' + (i * 0.04) + 's">' +
          '<div class="fc-card-inner">' +
            '<div class="fc-front"><div class="fc-icon"><i class="fa-solid fa-question"></i></div><div class="fc-txt">' + escapeHtml(c.front) + '</div></div>' +
            '<div class="fc-back"><div class="fc-icon"><i class="fa-solid fa-lightbulb"></i></div><div class="fc-txt">' + escapeHtml(c.back) + '</div></div>' +
          '</div></div>';
      }).join('') +
    '</div>';
}

/* ── Quiz results ── */
function _renderQuizResults(items, quizType, subjId, wrap) {
  window._curQuizItems = items;
  window._curQuizType  = quizType;
  window._curQuizSubj  = subjId;

  var typeLabels = { mcq: 'Multiple Choice', truefalse: 'True/False', identification: 'Identification', mixed: 'Mixed' };
  var typeLabel  = typeLabels[quizType] || 'Quiz';

  wrap.innerHTML =
    '<div class="edu-res-header">' +
      '<div class="edu-res-title"><i class="fa-solid fa-clipboard-question"></i> Generated Quiz <span class="edu-res-badge">' + items.length + ' questions</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button class="edu-take-quiz-btn" onclick="eduPlayGeneratedQuiz()">' +
          '<i class="fa-solid fa-play"></i> Play Quiz' +
        '</button>' +
        '<button class="edu-save-btn" id="edu-save-quiz-btn" onclick="eduSaveQuiz(window._curQuizItems,window._curQuizType,window._curQuizSubj)">' +
          '<i class="fa-solid fa-floppy-disk"></i> Save Quiz' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div style="padding:12px 0 4px;">' +
      items.map(function(q, i) {
        var typeTag = { mcq: 'MCQ', truefalse: 'T/F', identification: 'ID', mixed: 'Mixed' }[q.type] || 'Q';
        return '<div style="padding:10px 14px;margin-bottom:8px;background:var(--bg-glass,rgba(255,255,255,0.04));border-radius:10px;border:1px solid rgba(255,255,255,0.07);">' +
          '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
            '<span style="font-size:11px;font-weight:700;color:var(--a-violet,#8b7cf8);background:rgba(139,124,248,0.12);padding:2px 7px;border-radius:20px;">' + typeTag + '</span>' +
            '<span style="font-size:12px;color:var(--txt-muted,#888);">Q' + (i + 1) + '</span>' +
          '</div>' +
          '<div style="font-size:14px;color:var(--txt-primary,#fff);font-weight:500;">' + escapeHtml(q.question) + '</div>' +
        '</div>';
      }).join('') +
    '</div>';

  /* Auto-open the quiz player right away */
  setTimeout(function() { eduPlayGeneratedQuiz(); }, 300);
}

window.eduPlayGeneratedQuiz = function() {
  var items = window._curQuizItems;
  if (!items || !items.length) return;
  openQuizPlayer('Generated Quiz', { idx: 0, score: 0, items: items });
};

/* ── Convert flashcards → identification quiz ── */
window.eduStartFlashcardQuiz = function() {
  var cards = window._pfc || []; if (!cards.length) return;
  var quizItems = cards.map(function(c) {
    return { question: c.front, type: 'identification', options: [], answer: c.back, explanation: '' };
  });
  for (var i = quizItems.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = quizItems[i]; quizItems[i] = quizItems[j]; quizItems[j] = tmp;
  }
  openQuizPlayer('Flashcard Quiz', { idx: 0, score: 0, items: quizItems });
};

/* ══════════════════════════════════════════════════════════════════
   QUIZ ENGINE
   ══════════════════════════════════════════════════════════════════ */

function quizOptionsHTML(q) {
  if (q.type === 'identification') {
    return '<div class="edu-id-row">' +
      '<input type="text" class="edu-quiz-input" id="eq-input" placeholder="Type your answer\u2026" autocomplete="off">' +
      '<button class="edu-quiz-submit" id="eq-submit-btn" onclick="eduSubmitAnswer()">Submit</button>' +
    '</div>';
  }
  return '<div class="edu-quiz-opts">' +
    (q.options || []).map(function(o, oi) {
      var safeO = String(o).replace(/\\/g,'\\\\').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
      return '<button class="edu-quiz-opt" data-val="' + safeO + '" onclick="eduPickAnswer(this)">' +
        '<span class="edu-opt-key">' + String.fromCharCode(65 + oi) + '</span>' +
        '<span>' + escapeHtml(o) + '</span>' +
      '</button>';
    }).join('') +
  '</div>';
}

function renderQuizInContainer(state, container) {
  var q   = state.items[state.idx];
  var tot = state.items.length;
  var pct = (state.idx / tot) * 100;
  var tl  = { mcq:'Multiple Choice', truefalse:'True / False', identification:'Identification' }[q.type||'mcq'] || 'Quiz';
  container.innerHTML =
    '<div class="edu-quiz-meta">' +
      '<span class="edu-quiz-tag">' + tl + '</span>' +
      '<span class="edu-quiz-ctr">' + (state.idx + 1) + ' / ' + tot + '</span>' +
    '</div>' +
    '<div class="edu-qprog"><div class="edu-qprog-fill" style="width:' + pct + '%"></div></div>' +
    '<div class="edu-quiz-q">' + escapeHtml(q.question) + '</div>' +
    quizOptionsHTML(q) +
    '<div class="edu-quiz-fb" id="eq-fb" style="display:none"></div>';
  window._curQS  = state;
  window._curCon = container;
  var inp = document.getElementById('eq-input');
  if (inp) { inp.focus(); inp.addEventListener('keydown', function(e) { if (e.key==='Enter') eduSubmitAnswer(); }); }
}

function _advanceQuiz() {
  var state = window._curQS, con = window._curCon;
  state.idx++;
  if (state.idx >= state.items.length) showQuizScore(state, con);
  else renderQuizInContainer(state, con);
}

window.eduPickAnswer = function(btn) {
  if (btn.disabled) return;
  document.querySelectorAll('.edu-quiz-opt').forEach(function(b) { b.disabled = true; });
  var state  = window._curQS, q = state.items[state.idx];
  var chosen = btn.dataset.val || btn.querySelector('span:last-child').textContent.trim();
  var ans    = (q.answer || '').trim().toLowerCase();
  var chk    = chosen.trim().toLowerCase().replace(/^[a-d]\)\s*/i,'');
  var correct = chk === ans || chosen.trim().toLowerCase() === ans;
  btn.classList.add(correct ? 'correct' : 'wrong');
  if (!correct) {
    document.querySelectorAll('.edu-quiz-opt').forEach(function(b) {
      var bv = (b.dataset.val || b.querySelector('span:last-child').textContent).trim().toLowerCase().replace(/^[a-d]\)\s*/i,'');
      if (bv === ans || (b.dataset.val||'').trim().toLowerCase() === ans) b.classList.add('correct');
    });
  }
  if (correct) state.score++;
  _showQuizFeedback(correct, q);
  setTimeout(_advanceQuiz, 1400);
};

window.eduSubmitAnswer = function() {
  var inp = document.getElementById('eq-input');
  if (!inp || !inp.value.trim()) { showToast('Type an answer first','info'); return; }
  var state   = window._curQS, q = state.items[state.idx];
  var userAns = inp.value.trim().toLowerCase();
  var realAns = (q.answer || '').trim().toLowerCase();
  var correct = userAns === realAns
    || realAns.replace(/[^a-z0-9\s]/g,'').includes(userAns.replace(/[^a-z0-9\s]/g,''))
    || (userAns.length > 3 && realAns.replace(/[^a-z0-9\s]/g,'').startsWith(userAns.replace(/[^a-z0-9\s]/g,'')));
  if (correct) state.score++;
  inp.disabled = true;
  var sb = document.getElementById('eq-submit-btn'); if (sb) sb.disabled = true;
  _showQuizFeedback(correct, q);
  setTimeout(_advanceQuiz, 1500);
};

function _showQuizFeedback(correct, q) {
  var fb = document.getElementById('eq-fb'); if (!fb) return;
  fb.style.display = 'flex';
  fb.className     = 'edu-quiz-fb ' + (correct ? 'fb-correct' : 'fb-wrong');
  fb.innerHTML = correct
    ? '<i class="fa-solid fa-circle-check"></i><span>Correct!' + (q.explanation ? ' <em>' + escapeHtml(q.explanation) + '</em>' : '') + '</span>'
    : '<i class="fa-solid fa-circle-xmark"></i><span>Answer: <strong>' + escapeHtml(q.answer) + '</strong>' + (q.explanation ? ' \u2014 <em>' + escapeHtml(q.explanation) + '</em>' : '') + '</span>';
}

function showQuizScore(state, con) {
  trackFeature('quiz_complete');
  var pct   = Math.round(state.score / state.items.length * 100);
  var col   = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
  var grade = pct >= 90 ? 'Excellent! \uD83C\uDF89' : pct >= 75 ? 'Great job! \uD83D\uDC4F' : pct >= 50 ? 'Good effort! \uD83D\uDCDA' : 'Keep studying! \uD83D\uDCAA';
  var dash  = 326.7, fill = dash * pct / 100;
  con.innerHTML =
    '<div class="edu-score-wrap">' +
      '<div class="edu-score-chart">' +
        '<svg width="130" height="130" viewBox="0 0 130 130">' +
          '<circle cx="65" cy="65" r="55" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>' +
          '<circle cx="65" cy="65" r="55" fill="none" stroke="' + col + '" stroke-width="10" stroke-linecap="round"' +
            ' stroke-dasharray="' + dash + '" stroke-dashoffset="' + (dash - fill) + '"' +
            ' transform="rotate(-90 65 65)" style="transition:stroke-dashoffset 1.1s ease"/>' +
        '</svg>' +
        '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;">' +
          '<div style="font-size:26px;font-weight:800;color:' + col + ';">' + pct + '%</div>' +
        '</div>' +
      '</div>' +
      '<div class="edu-score-text">' +
        '<div style="font-size:20px;font-weight:700;color:var(--txt-primary);">' + grade + '</div>' +
        '<div style="font-size:14px;color:var(--txt-secondary);margin-top:4px;">' + state.score + ' / ' + state.items.length + ' correct</div>' +
        '<div class="edu-score-btns">' +
          '<button class="edu-add-btn" onclick="retryCurrentQuiz()"><i class="fa-solid fa-rotate-right"></i> Retry</button>' +
          '<button class="edu-browse-btn" onclick="closeQuizPlayer()"><i class="fa-solid fa-xmark"></i> Close</button>' +
        '</div>' +
      '</div>' +
    '</div>';
}

window.retryCurrentQuiz = function() {
  if (!window._curQS) return;
  window._curQS.idx = 0; window._curQS.score = 0;
  renderQuizInContainer(window._curQS, window._curCon);
};

function openQuizPlayer(title, state) {
  trackFeature('quiz_attempt');
  var overlay = document.getElementById('quiz-player-overlay');
  var body    = document.getElementById('quiz-player-body');
  var titleEl = document.getElementById('quiz-player-title');
  if (!overlay || !body) return;
  titleEl.textContent = title || 'Quiz';
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  renderQuizInContainer(state, body);
}
window.openQuizPlayer = openQuizPlayer;

function closeQuizPlayer() {
  var overlay = document.getElementById('quiz-player-overlay');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
}
window.closeQuizPlayer = closeQuizPlayer;

/* ══════════════════════════════════════════════════════════════════
   SAVE FLASHCARDS
   ══════════════════════════════════════════════════════════════════ */

window.eduSaveFC = async function() {
  var cards = window._pfc || [], sid = window._pfcSubj || null;
  if (!cards.length) return;
  var btn = document.getElementById('edu-save-fc-btn');
  // Already saved — block re-save
  if (btn && btn.dataset.saved === '1') return;
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving\u2026'; }
  var saved = 0, failed = 0;
  for (var i = 0; i < cards.length; i++) {
    try {
      var res = await fetch('/api/flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front: cards[i].front, back: cards[i].back, subject_id: sid || null })
      });
      if (res.ok) { saved++; trackFeature('flashcard_create'); }
      else { failed++; }
    } catch(e) { failed++; }
  }
  if (saved > 0) {
    showToast(saved + ' flashcard' + (saved > 1 ? 's' : '') + ' saved!', 'success');
    window._pfc = [];
    if (btn) {
      btn.dataset.saved = '1';
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Saved!';
      btn.style.opacity = '0.55';
      btn.style.cursor = 'not-allowed';
      btn.onclick = null;
    }
  } else {
    if (failed > 0) showToast(failed + ' card(s) failed to save. Please try again.', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save All'; }
  }
  loadEduStats();
  if (sid && _currentSubject && String(_currentSubject.id) === String(sid)) loadSubjectFlashcards(sid);
  if (_allSubjects.length) renderSubjectFolders(_allSubjects);
};

/* ══════════════════════════════════════════════════════════════════
   SAVE QUIZ
   ══════════════════════════════════════════════════════════════════ */


/* ══════════════════════════════════════════════════════════════════
   SUBJECT-REQUIRED MODAL
   ══════════════════════════════════════════════════════════════════ */

function eduOpenSubjectModal() {
  var sel = document.getElementById('edu-modal-subject');
  var noSubjNote = document.getElementById('edu-modal-no-subj-note');
  var confirmBtn = document.getElementById('edu-modal-confirm-btn');

  if (window._allSubjects && _allSubjects.length) {
    // Has subjects — show picker
    sel.innerHTML = '<option value="">— Select a subject —</option>' +
      _allSubjects.map(function(s) {
        return '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
      }).join('');
    sel.style.display = '';
    if (noSubjNote) noSubjNote.style.display = 'none';
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate'; }
    // Pre-select if already chosen
    var mainSel = document.getElementById('edu-gen-subject');
    if (mainSel && mainSel.value) sel.value = mainSel.value;
  } else {
    // No subjects at all — show message and auto-create on confirm
    sel.style.display = 'none';
    if (noSubjNote) noSubjNote.style.display = 'block';
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = '<i class="fa-solid fa-folder-plus"></i> Create General & Generate'; }
  }

  var overlay = document.getElementById('edu-subject-required-modal');
  if (overlay) overlay.classList.add('active');
}

window.eduConfirmSubjectAndGenerate = async function() {
  var sel = document.getElementById('edu-modal-subject');
  var noSubjNote = document.getElementById('edu-modal-no-subj-note');
  var confirmBtn = document.getElementById('edu-modal-confirm-btn');

  // No subjects exist — auto-create "General"
  if (noSubjNote && noSubjNote.style.display !== 'none') {
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating…'; }
    try {
      var res = await fetch('/api/subjects', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name: 'General', color: '#8b7cf8' })
      });
      var data = await res.json();
      if (res.ok && data.id) {
        var newSubj = { id: data.id, name: 'General', color: '#8b7cf8' };
        _allSubjects.unshift(newSubj);
        fillEduSubjectSelects(_allSubjects);
        var mainSel = document.getElementById('edu-gen-subject');
        if (mainSel) mainSel.value = newSubj.id;
        closeModal('edu-subject-required-modal');
        window.eduGenerate();
      } else {
        showToast('Could not create subject. Please try again.', 'error');
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = '<i class="fa-solid fa-folder-plus"></i> Create General & Generate'; }
      }
    } catch(e) {
      showToast('Network error. Please try again.', 'error');
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = '<i class="fa-solid fa-folder-plus"></i> Create General & Generate'; }
    }
    return;
  }

  // Has subjects — validate selection
  var subjId = sel ? (sel.value || null) : null;
  if (!subjId) {
    sel.style.borderColor = '#f87171';
    sel.focus();
    return;
  }
  sel.style.borderColor = '';

  // Sync to main dropdown
  var mainSel = document.getElementById('edu-gen-subject');
  if (mainSel) mainSel.value = subjId;

  closeModal('edu-subject-required-modal');
  window.eduGenerate();
};

window.eduSaveQuiz = function(items, quizType, subjId, titleOverride) {
  var subjName = '';
  if (subjId) {
    var s = _allSubjects.find(function(x) { return String(x.id) === String(subjId); });
    if (s) subjName = s.name;
  }
  var typeLabel = { mcq:'Multiple Choice', truefalse:'True/False', identification:'Identification', mixed:'Mixed' }[quizType] || 'Quiz';
  var title = titleOverride || (subjName ? subjName + ' \u2014 ' + typeLabel : typeLabel + ' Quiz');
  var quiz  = addStoredQuiz({
    title: title, subject_id: subjId || null,
    quiz_type: quizType, items: items, created_at: new Date().toISOString()
  });
  showToast('Quiz "' + quiz.title + '" saved!', 'success');
  if (subjId && _currentSubject && String(_currentSubject.id) === String(subjId)) loadSubjectQuizzes(subjId);
  if (_allSubjects.length) renderSubjectFolders(_allSubjects);
  return quiz;
};

/* ══════════════════════════════════════════════════════════════════
   INPUT MODE SWITCHING — File upload vs Paste text
   ══════════════════════════════════════════════════════════════════ */

window.eduSwitchMode = function(mode) {
  var fileDiv = document.getElementById('edu-mode-file');
  var textDiv = document.getElementById('edu-mode-text');
  var fileBtn = document.getElementById('edu-mode-file-btn');
  var textBtn = document.getElementById('edu-mode-text-btn');
  var genOpts = document.getElementById('edu-gen-options');
  var results = document.getElementById('edu-results-wrap');

  /* reset state */
  eduState.file = null;
  eduState.text = null;
  if (results) results.style.display = 'none';

  if (mode === 'file') {
    if (fileDiv) fileDiv.style.display = '';
    if (textDiv) textDiv.style.display = 'none';
    if (fileBtn) fileBtn.classList.add('active');
    if (textBtn) textBtn.classList.remove('active');
    if (genOpts) genOpts.style.display = 'none';
    /* reset dropzone */
    var dzi = document.getElementById('edu-dropzone-inner');
    var dfp = document.getElementById('edu-file-preview');
    if (dzi) dzi.style.display = '';
    if (dfp) dfp.style.display = 'none';
  } else {
    if (fileDiv) fileDiv.style.display = 'none';
    if (textDiv) textDiv.style.display = '';
    if (fileBtn) fileBtn.classList.remove('active');
    if (textBtn) textBtn.classList.add('active');
    /* show gen options if textarea has enough text */
    var ta = document.getElementById('edu-paste-text');
    if (ta && ta.value.trim().length >= 80) {
      eduState.text = ta.value.trim();
      if (genOpts) genOpts.style.display = 'block';
    } else {
      if (genOpts) genOpts.style.display = 'none';
    }
    if (ta) ta.focus();
  }
};

window.eduOnPasteInput = function(ta) {
  var charEl = document.getElementById('edu-paste-chars');
  if (charEl) charEl.textContent = ta.value.length + ' characters';
  var genOpts = document.getElementById('edu-gen-options');
  if (ta.value.trim().length >= 80) {
    eduState.text = ta.value.trim();
    if (genOpts) genOpts.style.display = 'block';
  } else {
    eduState.text = null;
    if (genOpts) genOpts.style.display = 'none';
  }
};

/* ══ INIT ══ */
loadEduSubjects();
loadEduStats();
saLoadSessions();
