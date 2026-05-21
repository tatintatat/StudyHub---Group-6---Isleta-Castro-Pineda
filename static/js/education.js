/* ── StudyHub · Education Page ── */
'use strict';

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
      '<div class="subject-mgmt-count" id="smc-' + s.id + '">Loading\u2026</div></div>' +
      '<button class="subject-mgmt-del" onclick="deleteSubjectEdu(' + s.id + ',\'' + (s.name||'').replace(/'/g,'') + '\')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
      '</div>';
  }).join('');
  fetch('/api/flashcards').then(function(r) { return r.json(); }).then(function(cards) {
    var counts = {};
    (cards || []).forEach(function(c) { if (c.subject_id) counts[c.subject_id] = (counts[c.subject_id] || 0) + 1; });
    subjects.forEach(function(s) {
      var el = document.getElementById('smc-' + s.id);
      if (el) el.textContent = (counts[s.id] || 0) + ' flashcard' + ((counts[s.id] || 0) !== 1 ? 's' : '');
    });
  }).catch(function() {});
}

window.deleteSubjectEdu = function(sid, sname) {
  SHConfirm.show({
    type: 'danger', icon: 'fa-trash', title: 'Delete Subject?',
    body: '"' + (sname || 'This subject') + '" will be moved to trash. Flashcards in it will become unassigned.',
    confirmLabel: 'Move to Trash',
    onConfirm: function() {
      fetch('/api/subjects/' + sid, { method: 'DELETE' }).then(function() {
        if (window.SHTrash) SHTrash.addItem({ id: sid, name: sname || 'Subject #' + sid, type: 'Subject', icon: '<i class="fa-solid fa-book-open" style="color:var(--a-blue)"></i>' });
        else showToast('Subject deleted', 'success');
        loadEduSubjects(); loadEduStats();
      }).catch(function() { showToast('Failed to delete', 'error'); });
    }
  });
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
    return '<div class="fc-mgmt-card" onclick="this.classList.toggle(\'flipped\');trackFeature(\'flashcard_flip\')" style="animation-delay:' + (i * 0.04) + 's">' +
      '<div class="fc-mgmt-inner">' +
      '<div class="fc-mgmt-front"><div class="fc-mgmt-icon"><i class="fa-solid fa-question"></i></div><div class="fc-mgmt-txt">' + escapeHtml(c.front) + '</div>' + (c.subject_name ? '<div class="fc-mgmt-tag">' + escapeHtml(c.subject_name) + '</div>' : '') + '</div>' +
      '<div class="fc-mgmt-back"><div class="fc-mgmt-icon"><i class="fa-solid fa-lightbulb"></i></div><div class="fc-mgmt-txt">' + escapeHtml(c.back) + '</div></div>' +
      '</div>' +
      '<button class="fc-del-btn" onclick="event.stopPropagation();deleteFCEdu(' + c.id + ')" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
      '</div>';
  }).join('');
}

window.deleteFCEdu = function(id, front) {
  SHConfirm.show({
    type: 'danger', icon: 'fa-layer-group', title: 'Delete Flashcard?',
    body: 'This flashcard will be moved to trash and can be restored within 30 days.',
    confirmLabel: 'Move to Trash',
    onConfirm: function() {
      fetch('/api/flashcards/' + id, { method: 'DELETE' }).then(function() {
        if (window.SHTrash) SHTrash.addItem({ id: id, name: (front && front.length > 40 ? front.substring(0,40)+'...' : front) || 'Flashcard #' + id, type: 'Flashcard', icon: '<i class="fa-solid fa-layer-group" style="color:var(--a-cyan)"></i>' });
        else showToast('Flashcard deleted', 'success');
        loadEduFlashcards(); loadEduStats();
      }).catch(function() { showToast('Failed', 'error'); });
    }
  });
};

var fcFilter = document.getElementById('fc-subject-filter');
if (fcFilter) fcFilter.addEventListener('change', loadEduFlashcards);

/* ══ STANDALONE TIMER ══ */
var saTotal = 25 * 60, saSeconds = 25 * 60, saRunning = false, saInterval = null;
var saCirc  = 2 * Math.PI * 88;

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
  var sid = document.getElementById('sa-timer-subject') ? document.getElementById('sa-timer-subject').value : '';
  try {
    trackFeature('timer_session');
    await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_minutes: Math.round(elapsed / 60), subject_id: sid || null, notes: 'Focus timer session' })
    });
    showToast('Session saved!', 'success');
    saLoadSessions(); loadEduStats();
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

/* ══════════════════════════════════════════════════════════════════
   AI GENERATOR
   Uses Claude API directly in the browser — completely free tier,
   no Gemini, no server-side quota issues.
   ══════════════════════════════════════════════════════════════════ */

var eduState = { file: null, generating: false, aiGenerated: 0 };

/* ── Drop zone ── */
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
  switchToAITab();
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

/* ── Read file as clean text (PDF.js for PDFs, JSZip for PPTX) ── */
async function eduReadFile(file) {
  var name = file.name.toLowerCase();
  try {
    if (name.endsWith('.pdf')) {
      return await eduReadPDF(file);
    } else if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
      return await eduReadPPTX(file);
    } else {
      throw new Error('Unsupported file type');
    }
  } catch (err) {
    throw new Error('Could not extract text from file: ' + (err.message || err));
  }
}

/* ── PDF extraction using PDF.js ── */
async function eduReadPDF(file) {
  // Dynamically load PDF.js from CDN if not already loaded
  if (!window.pdfjsLib) {
    await new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  var arrayBuffer = await file.arrayBuffer();
  var pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  var textParts = [];
  var maxPages = Math.min(pdf.numPages, 60);

  for (var p = 1; p <= maxPages; p++) {
    var page = await pdf.getPage(p);
    var tc = await page.getTextContent();
    var pageText = tc.items
      .map(function(item) { return item.str; })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (pageText) textParts.push('--- Page ' + p + ' ---\n' + pageText);
  }

  var result = textParts.join('\n\n').trim();
  if (!result || result.length < 60) throw new Error('PDF appears to be scanned or image-only — no text could be extracted.');
  return result.substring(0, 18000);
}

/* ── PPTX extraction using JSZip ── */
async function eduReadPPTX(file) {
  if (!window.JSZip) {
    await new Promise(function(resolve, reject) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  var arrayBuffer = await file.arrayBuffer();
  var zip = await JSZip.loadAsync(arrayBuffer);
  var slideFiles = Object.keys(zip.files)
    .filter(function(name) { return /^ppt\/slides\/slide[0-9]+\.xml$/.test(name); })
    .sort(function(a, b) {
      var na = parseInt(a.match(/slide(\d+)/)[1]);
      var nb = parseInt(b.match(/slide(\d+)/)[1]);
      return na - nb;
    });

  if (!slideFiles.length) throw new Error('No slides found in PPTX file.');

  var textParts = [];
  var maxSlides = Math.min(slideFiles.length, 60);

  for (var i = 0; i < maxSlides; i++) {
    var xml = await zip.files[slideFiles[i]].async('string');
    // Extract text from <a:t> tags (DrawingML text runs)
    var matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || [];
    var slideText = matches
      .map(function(m) { return m.replace(/<[^>]+>/g, '').trim(); })
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (slideText) textParts.push('--- Slide ' + (i + 1) + ' ---\n' + slideText);
  }

  var result = textParts.join('\n\n').trim();
  if (!result || result.length < 60) throw new Error('Could not extract text from slides. Slides may be image-only.');
  return result.substring(0, 18000);
}

/* ── Build Gemini prompts ── */
function buildPrompt(text, genType, quizType, count) {
  var docContent = text.substring(0, 15000);
  var strict =
    '\n\nOUTPUT FORMAT — FOLLOW EXACTLY:\n' +
    '- Respond with ONLY a raw JSON array. Nothing before it, nothing after it.\n' +
    '- Do NOT use markdown code fences (no ```json or ```).\n' +
    '- Do NOT add any explanation, intro, commentary, or closing text.\n' +
    '- Do NOT include <think> blocks or reasoning text.\n' +
    '- First character of your response must be [ and last must be ].\n';

  var groundingRule =
    '\n\nCRITICAL RULES:\n' +
    '- ONLY use information explicitly stated in the document above.\n' +
    '- Do NOT generate questions about file metadata, PDF version, file format, or technical document properties.\n' +
    '- Do NOT use any outside knowledge — every question and answer must be directly traceable to the document text.\n' +
    '- Focus on concepts, facts, definitions, processes, and key ideas the document teaches.\n' +
    '- Spread questions across different sections/topics in the document.\n';

  var base =
    'You are an expert educator creating study materials. ' +
    'Below is the FULL extracted text from a student\'s document. ' +
    'Read it carefully and create study materials ONLY from its content.\n\n' +
    'DOCUMENT TEXT:\n"""\n' + docContent + '\n"""\n';

  if (genType === 'flashcard') {
    return base + groundingRule +
      '\nGenerate exactly ' + count + ' high-quality flashcards from the document above.\n' +
      'Required fields per item: "front" (clear question or term from the document), "back" (concise answer from the document, 1-3 sentences).\n' +
      'Cover the most important concepts taught in the document. No duplicates.\n' +
      strict +
      'Example: [{"front":"What is photosynthesis?","back":"Plants use sunlight, CO2 and water to produce glucose and oxygen."}]';
  }
  var typeMap = {
    mcq:            'Multiple choice with exactly 4 options labeled "a) ...", "b) ...", "c) ...", "d) ...". Set type:"mcq".',
    truefalse:      'True/False questions. options must be exactly ["True","False"]. Set type:"truefalse".',
    identification: 'Short answer identification (1-5 word answer from the document). options must be []. Set type:"identification".',
    mixed:          'Mix of types: ~40% mcq, ~30% truefalse, ~30% identification. Use correct type field per item.'
  };
  var typeDesc = typeMap[quizType] || typeMap.mcq;
  return base + groundingRule +
    '\nGenerate exactly ' + count + ' quiz questions based ONLY on the document above.\n' +
    'Question style: ' + typeDesc + '\n' +
    'Required fields: "question" (string, about document content), "type" (string), "options" (array), "answer" (string, exact match to correct option), "explanation" (1 sentence citing the document).\n' +
    'No duplicates. Every question must be answerable from the document text.\n' +
    strict +
    'Example: [{"question":"What does photosynthesis produce?","type":"mcq","options":["a) oxygen only","b) glucose and oxygen","c) carbon dioxide","d) water"],"answer":"b) glucose and oxygen","explanation":"The document states photosynthesis converts CO2 and water into glucose and oxygen."}]';
}

/* ── Gemini API Key Modal (replaces window.prompt which is blocked in iframes) ── */
function showApiKeyModal() {
  return new Promise(function(resolve, reject) {
    var existing = document.getElementById('sh-api-key-modal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'sh-api-key-modal';
    overlay.style.cssText = [
      'position:fixed','top:0','left:0','width:100%','height:100%',
      'background:rgba(0,0,0,0.75)','z-index:99999',
      'display:flex','align-items:center','justify-content:center',
      'font-family:inherit'
    ].join(';');

    overlay.innerHTML = [
      '<div style="background:var(--bg-surface,#1e2130);border:1px solid var(--border,#2d3148);',
      'border-radius:16px;padding:32px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.5);">',
      '<h3 style="margin:0 0 8px;color:var(--txt-primary,#fff);font-size:18px;">',
      '<i class="fa-solid fa-key" style="color:#4285f4;margin-right:8px;"></i>Gemini API Key Required</h3>',
      '<p style="margin:0 0 6px;color:var(--txt-secondary,#9aa3c2);font-size:13px;line-height:1.5;">',
      'Enter your Google Gemini API key to use the AI generator.<br>',
      'Get a <strong style="color:#34a853;">free</strong> key (no credit card needed) at ',
      '<a href="https://aistudio.google.com/apikey" target="_blank" style="color:#4285f4;">aistudio.google.com/apikey</a></p>',
      '<p style="margin:0 0 14px;color:var(--txt-secondary,#9aa3c2);font-size:11px;">',
      '✦ Free tier: 10 req/min · 500 req/day · 250K tokens/min (Gemini 2.5 Flash)</p>',
      '<input id="sh-api-key-input" type="password" placeholder="AIza..." ',
      'style="width:100%;box-sizing:border-box;padding:10px 14px;border-radius:8px;',
      'border:1px solid var(--border,#2d3148);background:var(--bg-glass,#151726);',
      'color:var(--txt-primary,#fff);font-size:14px;outline:none;margin-bottom:8px;">',
      '<p id="sh-api-key-err" style="color:#f87171;font-size:12px;margin:0 0 12px;display:none;">',
      'Key must start with "AIza". Please try again.</p>',
      '<div style="display:flex;gap:10px;justify-content:flex-end;">',
      '<button id="sh-api-key-cancel" style="padding:9px 18px;border-radius:8px;border:1px solid var(--border,#2d3148);',
      'background:transparent;color:var(--txt-secondary,#9aa3c2);cursor:pointer;font-size:13px;">Cancel</button>',
      '<button id="sh-api-key-submit" style="padding:9px 18px;border-radius:8px;border:none;',
      'background:#4285f4;color:#fff;cursor:pointer;font-size:13px;font-weight:600;">Save & Continue</button>',
      '</div></div>'
    ].join('');

    document.body.appendChild(overlay);

    var input = document.getElementById('sh-api-key-input');
    var errMsg = document.getElementById('sh-api-key-err');
    input.focus();

    function submit() {
      var val = input.value.trim();
      if (!val.startsWith('AIza')) {
        errMsg.style.display = 'block';
        input.focus();
        return;
      }
      overlay.remove();
      resolve(val);
    }

    document.getElementById('sh-api-key-submit').onclick = submit;
    document.getElementById('sh-api-key-cancel').onclick = function() {
      overlay.remove();
      reject(new Error('API key entry cancelled'));
    };
    input.onkeydown = function(e) { if (e.key === 'Enter') submit(); };
    overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); reject(new Error('API key entry cancelled')); } };
  });
}

/* ── Call Gemini 2.5 Flash API directly from browser ── */
/* Model: gemini-2.5-flash — Best free tier: 10 RPM, 500 RPD, 250K TPM */
async function callClaudeDirectly(prompt) {
  var apiKey = window._SH_CLAUDE_KEY || '';

  if (!apiKey || apiKey.length < 20 || apiKey === 'your-anthropic-api-key-here') {
    try {
      apiKey = await showApiKeyModal();
    } catch(e) {
      throw new Error('A Gemini API key is required to use the AI generator.');
    }
    if (!apiKey || !apiKey.trim().startsWith('AIza')) {
      throw new Error('A valid Gemini API key is required (starts with AIza)');
    }
    window._SH_CLAUDE_KEY = apiKey.trim();
  }

  var GEMINI_MODEL = 'gemini-2.5-flash';
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + window._SH_CLAUDE_KEY;

  var res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 8192
      }
    })
  });

  if (!res.ok) {
    var errData = await res.json().catch(function() { return {}; });
    var msg = (errData.error && errData.error.message) || ('HTTP ' + res.status);
    if (res.status === 400 || res.status === 403) {
      window._SH_CLAUDE_KEY = ''; /* Clear invalid key so user is prompted again */
      throw new Error('Invalid Gemini API key. Please try again.');
    }
    if (res.status === 429) {
      throw new Error('Rate limit reached. Please wait a moment and try again (free tier: 10 req/min, 500/day).');
    }
    throw new Error(msg);
  }

  var data = await res.json();
  var candidates = (data.candidates || []);
  if (!candidates.length) throw new Error('No response from Gemini. Please try again.');
  var parts = (candidates[0].content && candidates[0].content.parts) || [];
  return parts.map(function(p) { return p.text || ''; }).join('');
}

/* ── Parse JSON array from AI text — robust against Gemini output quirks ── */
function parseAIJson(raw) {
  if (!raw) return null;
  try {
    var cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    cleaned = cleaned.replace(/^```(?:json)?\s*/im, '').replace(/```\s*$/im, '').trim();
    try { return JSON.parse(cleaned); } catch(e) {}
    var arrMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      try { return JSON.parse(arrMatch[0]); } catch(e) {}
      var fixed = arrMatch[0].replace(/,\s*([}\]])/g, '$1').replace(/'/g, '"');
      try { return JSON.parse(fixed); } catch(e) {}
    }
    var objs = [], depth = 0, start = -1;
    for (var i = 0; i < cleaned.length; i++) {
      if (cleaned[i] === '{') { if (depth === 0) start = i; depth++; }
      else if (cleaned[i] === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          try { objs.push(JSON.parse(cleaned.substring(start, i + 1))); } catch(e) {}
          start = -1;
        }
      }
    }
    if (objs.length) return objs;
  } catch(e) { console.error('parseAIJson error:', e); }
  return null;
}

/* ── Main generate ── */
window.eduGenerate = async function() {
  if (!eduState.file)      { showToast('Please upload a file first', 'error'); return; }
  if (eduState.generating) return;
  eduState.generating = true;

  var genType  = (document.querySelector('input[name="edu_gen_type"]:checked')  || {}).value || 'flashcard';
  var quizType = (document.querySelector('input[name="edu_quiz_type"]:checked') || {}).value || 'mcq';
  var count    = parseInt((document.getElementById('edu-gen-count') || {}).value || '10');
  var subjId   = (document.getElementById('edu-gen-subject') || {}).value || null;

  trackFeature('ai_generate');

  var btn = document.getElementById('edu-generate-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating\u2026';

  document.getElementById('edu-gen-options').style.display = 'none';
  var pw = document.getElementById('edu-progress-wrap');
  pw.style.display = 'block';

  var stages = ['Reading file\u2026', 'Extracting content\u2026', 'Analyzing topics\u2026', 'Generating with AI\u2026', 'Finalizing\u2026'];
  var si = 0;
  var pf = document.getElementById('edu-progress-fill');
  var pl = document.getElementById('edu-progress-label');
  pf.style.width = '8%'; pl.textContent = stages[0];
  var stageTimer = setInterval(function() {
    if (si < stages.length - 1) { si++; pl.textContent = stages[si]; pf.style.width = ((si + 1) / stages.length * 80) + '%'; }
  }, 900);

  function resetUI() {
    clearInterval(stageTimer);
    pw.style.display = 'none';
    document.getElementById('edu-gen-options').style.display = 'block';
    eduState.generating = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI';
  }

  try {
    var text = await eduReadFile(eduState.file);
    var trimmed = text ? text.trim() : '';
    if (!trimmed || trimmed.length < 100) {
      showToast('Not enough readable text found. Make sure your PDF/PPTX has actual text (not just images/scans).', 'error');
      resetUI(); return;
    }
    // Show how much content was extracted
    var wordCount = trimmed.split(/\s+/).length;
    pl.textContent = 'Extracted ~' + wordCount + ' words — sending to AI…';

    var prompt = buildPrompt(text, genType, quizType, count);
    var raw    = await callClaudeDirectly(prompt);

    clearInterval(stageTimer);
    pf.style.width = '95%'; pl.textContent = 'Parsing\u2026';

    var parsed = parseAIJson(raw);

    pf.style.width = '100%'; pl.textContent = 'Done!';
    await new Promise(function(r) { setTimeout(r, 350); });

    pw.style.display = 'none';
    eduState.generating = false;
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate with AI';

    if (!parsed || !parsed.length) {
      showToast('Could not parse AI response \u2014 please try again', 'error');
      document.getElementById('edu-gen-options').style.display = 'block';
      return;
    }

    eduState.aiGenerated += parsed.length;
    var aiEl = document.getElementById('edu-stat-ai'); if (aiEl) aiEl.textContent = eduState.aiGenerated;
    renderEduResults(parsed, genType, quizType, subjId);

  } catch(err) {
    resetUI();
    showToast('Error: ' + (err.message || 'Failed to generate'), 'error');
  }
};

/* ══════════════════════════════════════════════════════════════════
   RESULTS
   ══════════════════════════════════════════════════════════════════ */

function renderEduResults(items, genType, quizType, subjId) {
  var wrap = document.getElementById('edu-results-wrap');
  wrap.style.display = 'block';
  setTimeout(function() { wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);

  if (genType === 'flashcard') {
    renderFlashcardResults(items, subjId, wrap);
  } else {
    window._qs = { idx: 0, score: 0, items: items };
    renderQuizQuestion(window._qs, wrap);
  }
}

/* ── Flashcard results panel with "Take a Quiz" ── */
function renderFlashcardResults(items, subjId, wrap) {
  window._pfc     = items;
  window._pfcSubj = subjId;

  wrap.innerHTML =
    '<div class="edu-res-header">' +
      '<div class="edu-res-title"><i class="fa-solid fa-layer-group"></i> Generated Flashcards <span class="edu-res-badge">' + items.length + '</span></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
        '<button class="edu-take-quiz-btn" id="edu-take-quiz-btn" onclick="eduStartFlashcardQuiz()">' +
          '<i class="fa-solid fa-clipboard-question"></i> Take a Quiz' +
        '</button>' +
        '<button class="edu-save-btn" onclick="eduSaveFC()">' +
          '<i class="fa-solid fa-floppy-disk"></i> Save All' +
        '</button>' +
      '</div>' +
    '</div>' +
    '<div class="edu-fc-grid-res" id="edu-fc-results">' +
      items.map(function(c, i) {
        return '<div class="fc-mgmt-card" onclick="this.classList.toggle(\'flipped\');trackFeature(\'flashcard_flip\')" style="animation-delay:' + (i * 0.04) + 's">' +
          '<div class="fc-mgmt-inner">' +
          '<div class="fc-mgmt-front"><div class="fc-mgmt-icon"><i class="fa-solid fa-question"></i></div><div class="fc-mgmt-txt">' + escapeHtml(c.front) + '</div></div>' +
          '<div class="fc-mgmt-back"><div class="fc-mgmt-icon"><i class="fa-solid fa-lightbulb"></i></div><div class="fc-mgmt-txt">' + escapeHtml(c.back) + '</div></div>' +
          '</div></div>';
      }).join('') +
    '</div>' +
    '<div id="edu-inline-quiz" style="display:none;margin-top:32px;"></div>';
}

/* Convert flashcards to an identification quiz and show inline */
window.eduStartFlashcardQuiz = function() {
  var cards = window._pfc || [];
  if (!cards.length) return;

  /* Build quiz items — front becomes question, back is the answer */
  var quizItems = cards.map(function(c) {
    return { question: c.front, type: 'identification', options: [], answer: c.back, explanation: '' };
  });

  /* Shuffle for variety */
  for (var i = quizItems.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = quizItems[i]; quizItems[i] = quizItems[j]; quizItems[j] = tmp;
  }

  var section = document.getElementById('edu-inline-quiz');
  if (!section) return;
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  window._inlineQS = { idx: 0, score: 0, items: quizItems, mode: 'inline' };
  renderInlineQuiz(window._inlineQS, section);

  /* Update button to "Go to Quiz" */
  var btn = document.getElementById('edu-take-quiz-btn');
  if (btn) {
    btn.innerHTML = '<i class="fa-solid fa-arrow-down"></i> Go to Quiz';
    btn.onclick = function() { section.scrollIntoView({ behavior: 'smooth' }); };
  }
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
      var safeO = o.replace(/\\/g,'\\\\').replace(/'/g,'&#39;').replace(/"/g,'&quot;');
      return '<button class="edu-quiz-opt" data-val="' + safeO + '" onclick="eduPickAnswer(this)">' +
        '<span class="edu-opt-key">' + String.fromCharCode(65 + oi) + '</span>' +
        '<span>' + escapeHtml(o) + '</span>' +
      '</button>';
    }).join('') +
  '</div>';
}

function quizHTML(state, title) {
  var q   = state.items[state.idx];
  var tot = state.items.length;
  var pct = (state.idx / tot) * 100;
  var tl  = { mcq:'Multiple Choice', truefalse:'True / False', identification:'Identification' }[q.type || 'mcq'] || 'Quiz';

  return (title ? '<div class="edu-quiz-section-banner"><i class="fa-solid fa-brain"></i> ' + escapeHtml(title) + '</div>' : '') +
    '<div class="edu-quiz-wrap">' +
      '<div class="edu-quiz-meta">' +
        '<span class="edu-quiz-tag">' + tl + '</span>' +
        '<span class="edu-quiz-ctr">' + (state.idx + 1) + ' / ' + tot + '</span>' +
      '</div>' +
      '<div class="edu-qprog"><div class="edu-qprog-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="edu-quiz-q">' + escapeHtml(q.question) + '</div>' +
      quizOptionsHTML(q) +
      '<div class="edu-quiz-fb" id="eq-fb" style="display:none"></div>' +
    '</div>';
}

/* Render into main results wrap (AI-generated quiz) */
function renderQuizQuestion(state, wrap) {
  if (state.idx === 0) trackFeature('quiz_attempt');
  wrap.innerHTML = quizHTML(state, null);
  window._curQS   = state;
  window._curWrap = wrap;
  window._curMode = 'main';
  bindQuizInput();
}

/* Render into inline section below flashcards */
function renderInlineQuiz(state, section) {
  if (state.idx === 0) trackFeature('quiz_attempt');
  section.innerHTML = quizHTML(state, 'Flashcard Quiz \u2014 Test Yourself');
  window._curQS   = state;
  window._curWrap = section;
  window._curMode = 'inline';
  bindQuizInput();
}

function bindQuizInput() {
  var inp = document.getElementById('eq-input');
  if (inp) {
    inp.focus();
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') eduSubmitAnswer();
    });
  }
}

function advanceQuiz() {
  var state = window._curQS;
  var wrap  = window._curWrap;
  state.idx++;
  if (state.idx >= state.items.length) {
    showQuizScore(state, wrap);
  } else if (window._curMode === 'inline') {
    renderInlineQuiz(state, wrap);
  } else {
    renderQuizQuestion(state, wrap);
  }
}

window.eduPickAnswer = function(btn) {
  if (btn.disabled) return;
  document.querySelectorAll('.edu-quiz-opt').forEach(function(b) { b.disabled = true; });

  var state = window._curQS;
  var q     = state.items[state.idx];
  var chosen = btn.dataset.val || btn.querySelector('span:last-child').textContent.trim();
  var ans    = (q.answer || '').trim().toLowerCase();
  var chk    = chosen.trim().toLowerCase().replace(/^[a-d]\)\s*/i, '');
  var correct = chk === ans || chosen.trim().toLowerCase() === ans;

  btn.classList.add(correct ? 'correct' : 'wrong');
  if (!correct) {
    document.querySelectorAll('.edu-quiz-opt').forEach(function(b) {
      var bv = (b.dataset.val || b.querySelector('span:last-child').textContent).trim().toLowerCase().replace(/^[a-d]\)\s*/i, '');
      if (bv === ans || (b.dataset.val || '').trim().toLowerCase() === ans) b.classList.add('correct');
    });
  }
  if (correct) state.score++;
  showFeedback(correct, q);
  setTimeout(advanceQuiz, 1400);
};

window.eduSubmitAnswer = function() {
  var inp = document.getElementById('eq-input');
  if (!inp || !inp.value.trim()) { showToast('Type an answer first', 'info'); return; }

  var state   = window._curQS;
  var q       = state.items[state.idx];
  var userAns = inp.value.trim().toLowerCase();
  var realAns = (q.answer || '').trim().toLowerCase();

  /* Fuzzy: accept if user answer is contained in real answer or matches start */
  var correct = userAns === realAns ||
    realAns.replace(/[^a-z0-9\s]/g,'').includes(userAns.replace(/[^a-z0-9\s]/g,'')) ||
    (userAns.length > 3 && realAns.replace(/[^a-z0-9\s]/g,'').startsWith(userAns.replace(/[^a-z0-9\s]/g,'')));

  if (correct) state.score++;
  inp.disabled = true;
  var sb = document.getElementById('eq-submit-btn'); if (sb) sb.disabled = true;
  showFeedback(correct, q);
  setTimeout(advanceQuiz, 1500);
};

function showFeedback(correct, q) {
  var fb = document.getElementById('eq-fb');
  if (!fb) return;
  fb.style.display = 'flex';
  fb.className = 'edu-quiz-fb ' + (correct ? 'fb-correct' : 'fb-wrong');
  fb.innerHTML = correct
    ? '<i class="fa-solid fa-circle-check"></i><span>Correct!' + (q.explanation ? ' <em>' + escapeHtml(q.explanation) + '</em>' : '') + '</span>'
    : '<i class="fa-solid fa-circle-xmark"></i><span>Answer: <strong>' + escapeHtml(q.answer) + '</strong>' + (q.explanation ? ' \u2014 <em>' + escapeHtml(q.explanation) + '</em>' : '') + '</span>';
}

function showQuizScore(state, wrap) {
  trackFeature('quiz_complete');
  var pct   = Math.round(state.score / state.items.length * 100);
  var col   = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171';
  var grade = pct >= 90 ? 'Excellent! \uD83C\uDF89' : pct >= 75 ? 'Great job! \uD83D\uDC4F' : pct >= 50 ? 'Good effort! \uD83D\uDCDA' : 'Keep studying! \uD83D\uDCAA';
  var dash  = 326.7, fill = dash * pct / 100;

  var isInline = (window._curMode === 'inline');
  var retryJS  = isInline
    ? 'window._inlineQS.idx=0;window._inlineQS.score=0;renderInlineQuiz(window._inlineQS,document.getElementById(\'edu-inline-quiz\'))'
    : 'window._qs.idx=0;window._qs.score=0;renderQuizQuestion(window._qs,document.getElementById(\'edu-results-wrap\'))';

  wrap.innerHTML =
    '<div class="edu-score-card">' +
      (isInline ? '<div class="edu-quiz-section-banner"><i class="fa-solid fa-trophy"></i> Quiz Results</div>' : '') +
      '<div class="edu-score-inner">' +
        '<div class="edu-score-chart" style="position:relative;width:130px;height:130px;">' +
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
            '<button class="edu-add-btn" onclick="' + retryJS + '"><i class="fa-solid fa-rotate-right"></i> Retry</button>' +
            '<button class="edu-browse-btn" onclick="eduClearFile()"><i class="fa-solid fa-plus"></i> New File</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

window.renderQuizQuestion = renderQuizQuestion;
window.renderInlineQuiz   = renderInlineQuiz;

/* ── Save flashcards to library ── */
window.eduSaveFC = async function() {
  var cards = window._pfc || [], sid = window._pfcSubj || null;
  if (!cards.length) return;
  var btn = document.querySelector('.edu-save-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving\u2026'; }
  var saved = 0;
  for (var i = 0; i < cards.length; i++) {
    try {
      await fetch('/api/flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front: cards[i].front, back: cards[i].back, subject_id: sid })
      });
      saved++; trackFeature('flashcard_create');
    } catch(e) {}
  }
  showToast(saved + ' flashcards saved to library!', 'success');
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Saved!'; }
  loadEduFlashcards(); loadEduStats();
};

/* ══ INJECT QUIZ STYLES ══ */
(function injectStyles() {
  var s = document.createElement('style');
  s.textContent = `
    /* Take a Quiz button */
    .edu-take-quiz-btn {
      display:inline-flex;align-items:center;gap:7px;
      padding:9px 16px;border:1px solid rgba(139,124,248,0.35);border-radius:10px;
      background:linear-gradient(135deg,rgba(139,124,248,0.14),rgba(96,165,250,0.1));
      color:var(--a-violet);font-size:13px;font-weight:600;cursor:pointer;
      transition:all 0.18s;
    }
    .edu-take-quiz-btn:hover { background:rgba(139,124,248,0.26);transform:translateY(-1px); }

    /* Section banner */
    .edu-quiz-section-banner {
      display:flex;align-items:center;gap:9px;
      padding:13px 18px;
      background:linear-gradient(135deg,rgba(139,124,248,0.1),rgba(96,165,250,0.07));
      border:1px solid rgba(139,124,248,0.22);
      border-radius:12px 12px 0 0;
      font-size:14px;font-weight:700;color:var(--txt-primary);
    }
    .edu-quiz-section-banner i { color:var(--a-violet); }

    /* Quiz card */
    .edu-quiz-wrap {
      background:var(--bg-card);border:1px solid var(--border);
      border-radius:12px;padding:24px;
      border-top-left-radius:0;border-top-right-radius:0;
    }
    .edu-quiz-section-banner + .edu-quiz-wrap { border-top:none; }
    #edu-results-wrap > .edu-quiz-wrap { border-radius:12px; }

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

    /* Identification input */
    .edu-id-row { display:flex;gap:10px;align-items:center;flex-wrap:wrap; }
    .edu-quiz-input {
      flex:1;min-width:180px;padding:11px 14px;
      background:var(--bg-input);border:1px solid var(--border);border-radius:10px;
      color:var(--txt-primary);font-size:13px;
    }
    .edu-quiz-input:focus { outline:none;border-color:var(--a-violet); }
    .edu-quiz-submit {
      padding:11px 20px;border:none;border-radius:10px;
      background:var(--a-violet);color:#fff;font-size:13px;font-weight:600;
      cursor:pointer;transition:opacity 0.18s;white-space:nowrap;
    }
    .edu-quiz-submit:hover:not(:disabled) { opacity:0.86; }
    .edu-quiz-submit:disabled { opacity:0.45;cursor:default; }

    /* Feedback bar */
    .edu-quiz-fb {
      display:flex;align-items:flex-start;gap:8px;
      margin-top:16px;padding:11px 14px;border-radius:10px;
      font-size:13px;font-weight:600;line-height:1.5;
    }
    .edu-quiz-fb.fb-correct { background:rgba(52,211,153,0.1);color:#34d399; }
    .edu-quiz-fb.fb-wrong   { background:rgba(248,113,113,0.1);color:#f87171; }
    .edu-quiz-fb em { font-weight:400;font-style:normal;color:var(--txt-secondary);font-size:12px; }
    .edu-quiz-fb i  { flex-shrink:0;margin-top:2px; }

    /* Score card */
    .edu-score-card {
      background:var(--bg-card);border:1px solid var(--border);border-radius:12px;overflow:hidden;
    }
    .edu-score-card .edu-quiz-section-banner { border-radius:0; }
    .edu-score-inner {
      display:flex;align-items:center;gap:28px;padding:28px 24px;
      flex-wrap:wrap;justify-content:center;
    }
    .edu-score-text { display:flex;flex-direction:column;gap:6px; }
    .edu-score-btns { display:flex;gap:10px;margin-top:14px;flex-wrap:wrap; }

    /* Score in main wrap (non-inline) */
    #edu-results-wrap > .edu-score-card { border-radius:12px; }
  `;
  document.head.appendChild(s);
})();

/* ══ TRY TO LOAD GEMINI API KEY FROM PAGE META (set by Flask template) ══ */
(function() {
  /* Support gemini-key meta tag (new) or anthropic-key meta tag (legacy fallback) */
  var meta = document.querySelector('meta[name="gemini-key"]') ||
             document.querySelector('meta[name="anthropic-key"]');
  if (meta && meta.content && meta.content.startsWith('AIza')) {
    window._SH_CLAUDE_KEY = meta.content;
  }
})();

/* ══ INIT ══ */
loadEduSubjects();
loadEduFlashcards();
loadEduStats();
saLoadSessions();