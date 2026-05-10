/* ── StudyHub · Education Page ── */
'use strict';

/* ══ TAB SWITCHING ══ */
document.querySelectorAll('.edu-tab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.edu-tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.edu-tab-panel').forEach(function(p) { p.classList.remove('active'); });
    btn.classList.add('active');
    var panel = document.getElementById('etab-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
    if (btn.dataset.tab === 'timer') saLoadSessions();
    if (btn.dataset.tab === 'flashcards') loadEduFlashcards();
    if (btn.dataset.tab === 'subjects') loadEduSubjects();
  });
});

/* ══ STATS ══ */
function loadEduStats() {
  fetch('/api/stats').then(function(r) { return r.json(); }).then(function(d) {
    var set = function(id, v) { var e = document.getElementById(id); if (e) e.textContent = v; };
    set('edu-stat-subjects', d.subjects  || 0);
    set('edu-stat-cards',    d.flashcards || 0);
    set('edu-stat-mastered', Math.floor((d.flashcards || 0) * 0.4));
  }).catch(function() {});
}

/* ══ SUBJECTS ══ */
function loadEduSubjects() {
  fetch('/api/subjects').then(function(r) { return r.json(); }).then(function(subjects) {
    renderEduSubjects(subjects || []);
    fillEduSubjectSelects(subjects || []);
  }).catch(function() {});
}
window.loadEduSubjects = loadEduSubjects;

function fillEduSubjectSelects(subjects) {
  ['fc-subject-filter', 'edu-gen-subject', 'sa-timer-subject'].forEach(function(id) {
    var el = document.getElementById(id); if (!el) return;
    var blank = id === 'fc-subject-filter' ? '<option value="">All Subjects</option>' : '<option value="">No subject</option>';
    el.innerHTML = blank + subjects.map(function(s) {
      return '<option value="' + s.id + '">' + escapeHtml(s.name) + '</option>';
    }).join('');
  });
}

function renderEduSubjects(subjects) {
  var grid = document.getElementById('subjects-mgmt-grid'); if (!grid) return;
  if (!subjects.length) {
    grid.innerHTML = '<div class="edu-empty" style="grid-column:1/-1"><i class="fa-solid fa-book-open"></i><p>No subjects yet</p><span>Add your first subject to get started</span></div>';
    return;
  }
  grid.innerHTML = subjects.map(function(s, i) {
    return '<div class="subject-mgmt-card" style="animation-delay:' + (i * 0.05) + 's">' +
      '<div class="subject-mgmt-dot" style="background:' + s.color + ';box-shadow:0 0 8px ' + s.color + '50;"></div>' +
      '<div><div class="subject-mgmt-name">' + escapeHtml(s.name) + '</div>' +
      '<div class="subject-mgmt-count" id="smc-' + s.id + '">Loading…</div></div>' +
      '<button class="subject-mgmt-del" onclick="deleteSubjectEdu(' + s.id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
      '</div>';
  }).join('');
  /* Count cards per subject */
  fetch('/api/flashcards').then(function(r) { return r.json(); }).then(function(cards) {
    var counts = {};
    (cards || []).forEach(function(c) { if (c.subject_id) counts[c.subject_id] = (counts[c.subject_id] || 0) + 1; });
    subjects.forEach(function(s) {
      var el = document.getElementById('smc-' + s.id);
      if (el) el.textContent = (counts[s.id] || 0) + ' flashcard' + ((counts[s.id] || 0) !== 1 ? 's' : '');
    });
  }).catch(function() {});
}

window.deleteSubjectEdu = function(sid) {
  if (!confirm('Delete this subject? Flashcards in it will become unassigned.')) return;
  fetch('/api/subjects/' + sid, { method: 'DELETE' }).then(function() {
    showToast('Subject deleted', 'success');
    loadEduSubjects();
    loadEduStats();
  }).catch(function() { showToast('Failed to delete', 'error'); });
};

/* ══ FLASHCARDS ══ */
function loadEduFlashcards() {
  var sid = (document.getElementById('fc-subject-filter') || {}).value || '';
  fetch('/api/flashcards' + (sid ? '?subject_id=' + sid : ''))
    .then(function(r) { return r.json(); })
    .then(function(cards) { renderEduFlashcards(cards || []); })
    .catch(function() {});
}
window.loadEduFlashcards = loadEduFlashcards;

function renderEduFlashcards(cards) {
  var grid = document.getElementById('fc-mgmt-grid'); if (!grid) return;
  if (!cards.length) {
    grid.innerHTML = '<div class="edu-empty" style="grid-column:1/-1"><i class="fa-solid fa-layer-group"></i><p>No flashcards yet</p><span>Create flashcards or use the AI generator</span></div>';
    return;
  }
  grid.innerHTML = cards.map(function(c, i) {
    return '<div class="fc-mgmt-card" onclick="this.classList.toggle(\'flipped\')" style="animation-delay:' + (i * 0.04) + 's">' +
      '<div class="fc-mgmt-inner">' +
      '<div class="fc-mgmt-front"><div class="fc-mgmt-icon"><i class="fa-solid fa-question"></i></div><div class="fc-mgmt-txt">' + escapeHtml(c.front) + '</div>' + (c.subject_name ? '<div class="fc-mgmt-tag">' + escapeHtml(c.subject_name) + '</div>' : '') + '</div>' +
      '<div class="fc-mgmt-back"><div class="fc-mgmt-icon"><i class="fa-solid fa-lightbulb"></i></div><div class="fc-mgmt-txt">' + escapeHtml(c.back) + '</div></div>' +
      '</div>' +
      '<button class="fc-del-btn" onclick="event.stopPropagation();deleteFCEdu(' + c.id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
      '</div>';
  }).join('');
}

window.deleteFCEdu = function(id) {
  fetch('/api/flashcards/' + id, { method: 'DELETE' }).then(function() {
    showToast('Flashcard deleted', 'success');
    loadEduFlashcards();
    loadEduStats();
  }).catch(function() { showToast('Failed', 'error'); });
};

var fcFilter = document.getElementById('fc-subject-filter');
if (fcFilter) fcFilter.addEventListener('change', loadEduFlashcards);

/* ══ STANDALONE TIMER ══ */
var saTotal = 25 * 60, saSeconds = 25 * 60, saRunning = false, saInterval = null;
var saCirc  = 2 * Math.PI * 88; // r=88

function saUpdateDisplay() {
  var m = Math.floor(saSeconds / 60), s = saSeconds % 60;
  var disp = document.getElementById('sa-timer-display');
  if (disp) disp.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  var ring = document.getElementById('sa-timer-ring');
  if (ring) ring.style.strokeDashoffset = saCirc * (saSeconds / saTotal);
}

window.saToggleTimer = function() {
  if (saRunning) {
    clearInterval(saInterval); saRunning = false;
    document.getElementById('sa-timer-play-icon').className = 'fa-solid fa-play';
    document.getElementById('sa-timer-status').textContent = 'Paused';
  } else {
    saRunning = true;
    document.getElementById('sa-timer-play-icon').className = 'fa-solid fa-pause';
    document.getElementById('sa-timer-status').textContent = 'Focusing…';
    saInterval = setInterval(function() {
      if (saSeconds > 0) { saSeconds--; saUpdateDisplay(); }
      else {
        clearInterval(saInterval); saRunning = false;
        document.getElementById('sa-timer-play-icon').className = 'fa-solid fa-play';
        document.getElementById('sa-timer-status').textContent = 'Session complete! 🎉';
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
  var sid = document.getElementById('sa-timer-subject') ? document.getElementById('sa-timer-subject').value : '';
  try {
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
    if (!sessions || !sessions.length) { el.innerHTML = '<div style="color:var(--txt-muted);font-size:13px;">No sessions yet</div>'; return; }
    el.innerHTML = sessions.slice(0, 5).map(function(s) {
      var color   = s.subject_color || '#8b7cf8';
      var name    = s.subject_name  || 'General';
      var date    = new Date(s.session_date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
      var h = Math.floor(s.duration_minutes / 60), m = s.duration_minutes % 60;
      var timeStr = h > 0 ? h + 'h ' + m + 'm' : m + ' min';
      return '<div class="log-item"><div class="log-color" style="background:' + color + '"></div>' +
        '<div class="log-info"><div class="log-subject">' + escapeHtml(name) + '</div>' +
        '<div class="log-meta">' + date + '</div></div>' +
        '<div class="log-duration">' + timeStr + '</div></div>';
    }).join('');
  } catch(_) {}
}

saUpdateDisplay();

/* ══ AI GENERATOR ══ */
var eduState = { file: null, generating: false, aiGenerated: 0 };

/* Drop zone */
var dropZone = document.getElementById('edu-dropzone');
if (dropZone) {
  dropZone.addEventListener('dragover', function(e) { e.preventDefault(); dropZone.classList.add('over'); });
  dropZone.addEventListener('dragleave', function() { dropZone.classList.remove('over'); });
  dropZone.addEventListener('drop', function(e) {
    e.preventDefault(); dropZone.classList.remove('over');
    var f = e.dataTransfer.files[0]; if (f) eduSetFile(f);
  });
}
var eduFI = document.getElementById('edu-file-input');
if (eduFI) eduFI.addEventListener('change', function() { if (this.files[0]) eduSetFile(this.files[0]); });
var eduUT = document.getElementById('edu-upload-trigger');
if (eduUT) eduUT.addEventListener('click', function() {
  document.getElementById('edu-tab-btn-ai') || switchToAITab();
  document.getElementById('edu-file-input').click();
});

function switchToAITab() {
  document.querySelectorAll('.edu-tab-btn').forEach(function(b) { b.classList.remove('active'); });
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
  /* Auto-switch to AI tab */
  switchToAITab();
}

window.eduClearFile = function() {
  eduState.file = null;
  document.getElementById('edu-dropzone-inner').style.display = '';
  document.getElementById('edu-file-preview').style.display   = 'none';
  document.getElementById('edu-gen-options').style.display    = 'none';
  document.getElementById('edu-results-wrap').style.display   = 'none';
  var fi = document.getElementById('edu-file-input'); if (fi) fi.value = '';
};

/* Choice cards */
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

/* Generate */
window.eduGenerate = async function() {
  if (!eduState.file) { showToast('Please upload a file first', 'error'); return; }
  if (eduState.generating) return;
  eduState.generating = true;

  var genType  = (document.querySelector('input[name="edu_gen_type"]:checked') || {}).value  || 'flashcard';
  var quizType = (document.querySelector('input[name="edu_quiz_type"]:checked') || {}).value || 'mcq';
  var count    = parseInt((document.getElementById('edu-gen-count') || {}).value || '10');
  var subjId   = (document.getElementById('edu-gen-subject') || {}).value || null;

  var btn = document.getElementById('edu-generate-btn');
  btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…';

  document.getElementById('edu-gen-options').style.display = 'none';
  var pw = document.getElementById('edu-progress-wrap');
  pw.style.display = 'block';

  var stages = ['Reading file…', 'Extracting content…', 'Analyzing topics…', 'Generating with AI…', 'Finalizing…'];
  var si = 0;
  var pf = document.getElementById('edu-progress-fill');
  var pl = document.getElementById('edu-progress-label');
  pf.style.width = '8%'; pl.textContent = stages[0];

  var timer = setInterval(function() {
    if (si < stages.length - 1) { si++; pl.textContent = stages[si]; pf.style.width = ((si + 1) / stages.length * 80) + '%'; }
  }, 1000);

  try {
    var text   = await eduReadFile(eduState.file);
    var prompt = buildPrompt(text, genType, quizType, count);

    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    clearInterval(timer); pf.style.width = '95%';

    var data   = await res.json();
    var raw    = (data.content || []).map(function(b) { return b.text || ''; }).join('');
    var parsed = parseAI(raw);

    pf.style.width = '100%'; pl.textContent = 'Done!';
    await new Promise(function(r) { setTimeout(r, 400); });
    pw.style.display = 'none';
    eduState.generating = false;
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI';

    if (!parsed || !parsed.length) { showToast('Could not parse AI response — try again', 'error'); document.getElementById('edu-gen-options').style.display = 'block'; return; }

    eduState.aiGenerated += parsed.length;
    var aiEl = document.getElementById('edu-stat-ai'); if (aiEl) aiEl.textContent = eduState.aiGenerated;
    renderEduResults(parsed, genType, quizType, subjId);
  } catch(err) {
    clearInterval(timer);
    pw.style.display = 'none';
    document.getElementById('edu-gen-options').style.display = 'block';
    eduState.generating = false;
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI';
    showToast('Error: ' + (err.message || 'unknown'), 'error');
  }
};

async function eduReadFile(file) {
  return new Promise(function(resolve) {
    var r = new FileReader();
    r.onload = function(e) {
      var arr = new Uint8Array(e.target.result), raw = '';
      for (var i = 0; i < Math.min(arr.length, 150000); i++) {
        var c = arr[i]; raw += (c >= 32 && c < 127) ? String.fromCharCode(c) : ' ';
      }
      resolve(raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 5000).trim());
    };
    r.readAsArrayBuffer(file);
  });
}

function buildPrompt(text, genType, quizType, count) {
  var base = 'You are a study assistant. Content from a file:\n\n"""\n' + text.substring(0, 4000) + '\n"""\n\n';
  if (genType === 'flashcard') {
    return base + 'Generate exactly ' + count + ' flashcards as a JSON array. Each: {"front":"question","back":"answer"}. Output ONLY valid JSON array.';
  }
  var td = { mcq: 'multiple choice with 4 options (a/b/c/d)', truefalse: 'true or false questions', identification: 'one-word or short phrase answer', mixed: 'mix of multiple choice, true/false, and identification' }[quizType] || 'multiple choice';
  return base + 'Generate exactly ' + count + ' quiz questions (' + td + ') as JSON array. Each: {"question":"...","type":"mcq|truefalse|identification","options":["a)...","b)...","c)...","d)..."],"answer":"correct answer"}. truefalse: options=["True","False"]. identification: options=[]. Output ONLY valid JSON array.';
}

function parseAI(raw) {
  try { var m = raw.match(/\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : null; } catch(e) { return null; }
}

/* ── Results ── */
function renderEduResults(items, genType, quizType, subjId) {
  var wrap = document.getElementById('edu-results-wrap');
  wrap.style.display = 'block';

  if (genType === 'flashcard') {
    wrap.innerHTML =
      '<div class="edu-res-header">' +
        '<div class="edu-res-title"><i class="fa-solid fa-layer-group"></i> Generated Flashcards <span class="edu-res-badge">' + items.length + '</span></div>' +
        '<button class="edu-save-btn" onclick="eduSaveFC()"><i class="fa-solid fa-floppy-disk"></i> Save All to Library</button>' +
      '</div>' +
      '<div class="edu-fc-grid-res" id="edu-fc-results">' +
        items.map(function(c, i) {
          return '<div class="fc-mgmt-card" onclick="this.classList.toggle(\'flipped\')" style="animation-delay:' + (i * 0.04) + 's">' +
            '<div class="fc-mgmt-inner">' +
            '<div class="fc-mgmt-front"><div class="fc-mgmt-icon"><i class="fa-solid fa-question"></i></div><div class="fc-mgmt-txt">' + escapeHtml(c.front) + '</div></div>' +
            '<div class="fc-mgmt-back"><div class="fc-mgmt-icon"><i class="fa-solid fa-lightbulb"></i></div><div class="fc-mgmt-txt">' + escapeHtml(c.back) + '</div></div>' +
            '</div></div>';
        }).join('') +
      '</div>';
    window._pfc = items; window._pfcSubj = subjId;
  } else {
    window._qs = { idx: 0, score: 0, items: items };
    renderQuizQuestion(window._qs, wrap);
  }
}

window.eduSaveFC = async function() {
  var cards = window._pfc || [], sid = window._pfcSubj || null;
  if (!cards.length) return;
  var btn = document.querySelector('.edu-save-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving…'; }
  var saved = 0;
  for (var i = 0; i < cards.length; i++) {
    try {
      await fetch('/api/flashcards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ front: cards[i].front, back: cards[i].back, subject_id: sid }) });
      saved++;
    } catch(e) {}
  }
  showToast(saved + ' flashcards saved to library!', 'success');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Saved!'; }
  loadEduFlashcards(); loadEduStats();
};

/* ── Quiz ── */
function renderQuizQuestion(state, wrap) {
  var q   = state.items[state.idx], tot = state.items.length;
  var pct = state.idx / tot * 100;
  var tl  = { mcq:'Multiple Choice', truefalse:'True / False', identification:'Identification', mixed:'Quiz' }[q.type || 'mcq'] || 'Quiz';

  var opts = '';
  if (q.type === 'identification') {
    opts = '<input type="text" class="edu-quiz-input" id="eq-input" placeholder="Type your answer…">' +
           '<button class="edu-quiz-submit" onclick="eduSubmitID()">Submit</button>';
  } else {
    opts = '<div class="edu-quiz-opts">' + (q.options || []).map(function(o, oi) {
      return '<button class="edu-quiz-opt" onclick="eduPick(this,\'' + o.replace(/'/g, "\\'") + '\')">' +
        '<span class="edu-opt-key">' + String.fromCharCode(65 + oi) + '</span><span>' + escapeHtml(o) + '</span></button>';
    }).join('') + '</div>';
  }

  wrap.innerHTML =
    '<div class="edu-quiz-wrap">' +
      '<div class="edu-quiz-top"><span class="edu-quiz-tag">' + tl + '</span><span class="edu-quiz-ctr">' + (state.idx + 1) + ' / ' + tot + '</span></div>' +
      '<div class="edu-qprog"><div class="edu-qprog-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="edu-quiz-q">' + escapeHtml(q.question) + '</div>' +
      opts +
      '<div class="edu-quiz-fb" id="eq-fb" style="display:none;"></div>' +
    '</div>';
}

window.eduPick = function(btn, chosen) {
  if (btn.disabled) return;
  var state = window._qs, q = state.items[state.idx];
  var ans   = (q.answer || '').trim().toLowerCase();
  var chk   = chosen.trim().toLowerCase().replace(/^[a-d]\)\s*/i, '');
  var correct = chk === ans || chosen.trim().toLowerCase() === ans;
  document.querySelectorAll('.edu-quiz-opt').forEach(function(b) { b.disabled = true; });
  btn.classList.add(correct ? 'correct' : 'wrong');
  if (!correct) {
    document.querySelectorAll('.edu-quiz-opt').forEach(function(b) {
      var bv = b.querySelector('span:last-child').textContent.trim().toLowerCase().replace(/^[a-d]\)\s*/i, '');
      if (bv === ans || b.querySelector('span:last-child').textContent.trim().toLowerCase() === ans) b.classList.add('correct');
    });
  }
  if (correct) state.score++;
  var fb = document.getElementById('eq-fb');
  fb.style.display = 'flex';
  fb.innerHTML = correct
    ? '<i class="fa-solid fa-circle-check" style="color:#34d399"></i> Correct!'
    : '<i class="fa-solid fa-circle-xmark" style="color:#f87171"></i> Answer: <strong>' + escapeHtml(q.answer) + '</strong>';
  setTimeout(function() {
    state.idx++;
    var wrap = document.getElementById('edu-results-wrap');
    state.idx >= state.items.length ? showQuizScore(state, wrap) : renderQuizQuestion(state, wrap);
  }, 1300);
};

window.eduSubmitID = function() {
  var input = document.getElementById('eq-input');
  if (!input || !input.value.trim()) { showToast('Type an answer', 'error'); return; }
  var state   = window._qs, q = state.items[state.idx];
  var correct = input.value.trim().toLowerCase() === (q.answer || '').trim().toLowerCase();
  if (correct) state.score++;
  var fb = document.getElementById('eq-fb');
  fb.style.display = 'flex';
  fb.innerHTML = correct
    ? '<i class="fa-solid fa-circle-check" style="color:#34d399"></i> Correct!'
    : '<i class="fa-solid fa-circle-xmark" style="color:#f87171"></i> Answer: <strong>' + escapeHtml(q.answer) + '</strong>';
  input.disabled = true;
  var sb = document.querySelector('.edu-quiz-submit'); if (sb) sb.disabled = true;
  setTimeout(function() {
    state.idx++;
    var wrap = document.getElementById('edu-results-wrap');
    state.idx >= state.items.length ? showQuizScore(state, wrap) : renderQuizQuestion(state, wrap);
  }, 1300);
};

function showQuizScore(state, wrap) {
  var pct   = Math.round(state.score / state.items.length * 100);
  var col   = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
  var grade = pct >= 90 ? 'Excellent! 🎉' : pct >= 75 ? 'Great job!' : pct >= 50 ? 'Good effort!' : 'Keep studying!';
  var dash  = 326.7, fill = dash * pct / 100;
  wrap.innerHTML =
    '<div class="edu-score">' +
      '<svg width="130" height="130" viewBox="0 0 130 130">' +
      '<circle cx="65" cy="65" r="55" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="10"/>' +
      '<circle cx="65" cy="65" r="55" fill="none" stroke="' + col + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + dash + '" stroke-dashoffset="' + (dash - fill) + '" transform="rotate(-90 65 65)" style="transition:stroke-dashoffset 1s ease"/></svg>' +
      '<div class="edu-score-num" style="color:' + col + '">' + pct + '<span>%</span></div>' +
      '<div class="edu-score-title">' + grade + '</div>' +
      '<div class="edu-score-sub">' + state.score + ' / ' + state.items.length + ' correct</div>' +
      '<div class="edu-score-btns">' +
        '<button class="edu-add-btn" onclick="window._qs.idx=0;window._qs.score=0;renderQuizQuestion(window._qs,document.getElementById(\'edu-results-wrap\'))"><i class="fa-solid fa-rotate-right"></i> Retry</button>' +
        '<button class="edu-browse-btn" onclick="eduClearFile()"><i class="fa-solid fa-plus"></i> New File</button>' +
      '</div>' +
    '</div>';
}
window.renderQuizQuestion = renderQuizQuestion;

/* ══ INIT ══ */
loadEduSubjects();
loadEduFlashcards();
loadEduStats();
saLoadSessions();
