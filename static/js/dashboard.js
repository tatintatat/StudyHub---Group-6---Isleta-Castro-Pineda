/* ── StudyHub · Dashboard Page ── */
'use strict';

/* ── DATE ── */
var dateEl = document.getElementById('today-date');
if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' });

/* ── STREAK DAYS ── */
(function() {
  var el = document.getElementById('streak-days'); if (!el) return;
  var todayIdx = (new Date().getDay() + 6) % 7;
  el.innerHTML = ['M','T','W','T','F','S','S'].map(function(d, i) {
    return '<div class="streak-day ' + (i === todayIdx ? 'today' : '') + '">' + d + '</div>';
  }).join('');
})();

/* ── DASHBOARD STATS ── */
function loadDashboardStats() {
  fetch('/api/stats').then(function(r) { return r.json(); }).then(function(data) {
    var ms = document.getElementById('member-since');
    if (ms && data.member_since) ms.textContent = new Date(data.member_since).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });

    var set = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
    set('dash-subjects',   data.subjects   || 0);
    set('dash-flashcards', data.flashcards || 0);
    set('dash-hours',     (data.study_hours || 0) + 'h');
    set('dash-streak',     data.streak     || 1);
    set('streak-num',      data.streak     || 1);

    var dSub = document.getElementById('delta-subjects');   if (dSub) dSub.textContent = (data.subjects  || 0) > 0 ? 'Active' : 'New';
    var dFC  = document.getElementById('delta-flashcards'); if (dFC)  dFC.textContent  = (data.flashcards|| 0) > 0 ? 'Active' : 'New';
    var dH   = document.getElementById('delta-hours');      if (dH)   dH.textContent   = (data.study_hours||0)  > 0 ? 'This week' : 'New';

    var pct = Math.min(100, Math.round(((data.weekly_done || 0) / 10) * 100));
    set('goal-pct', pct + '%');
    set('goal-title', (data.weekly_done || 0) + ' / 10 hrs studied');
    var gb = document.getElementById('goal-bar'); if (gb) gb.style.width = pct + '%';
    var rf = document.getElementById('ring-fill');
    if (rf) {
      var circ = 2 * Math.PI * 45;
      rf.style.strokeDasharray  = circ;
      rf.style.strokeDashoffset = circ * (1 - pct / 100);
    }
    var gs = document.getElementById('goal-sub');
    if (gs) gs.textContent = pct >= 100 ? 'Goal achieved! Great work!' : pct >= 50 ? 'Halfway there! Keep it up!' : 'Keep going — you can do this!';
  }).catch(function() {});
}
window.loadDashboardStats = loadDashboardStats;

/* ── SUBJECTS LIST (dashboard widget) ── */
function loadSubjects() {
  fetch('/api/subjects').then(function(r) { return r.json(); }).then(function(subjects) {
    var list = document.getElementById('subject-list');
    if (!list) return;
    if (!subjects || !subjects.length) {
      list.innerHTML = '<div class="empty-state"><i class="fa-solid fa-book-open empty-icon-fa"></i><div>No subjects yet</div><div class="empty-sub">Add your first subject to start tracking</div></div>';
      return;
    }
    list.innerHTML = subjects.map(function(s, i) {
      return '<div class="subject-item" style="animation-delay:' + (i * 0.06) + 's">' +
        '<div class="subject-color-dot" style="background:' + s.color + ';box-shadow:0 0 8px ' + s.color + '40;"></div>' +
        '<div class="subject-name">' + escapeHtml(s.name) + '</div>' +
        '<button class="subject-delete" onclick="deleteSubject(' + s.id + ',\'' + (s.name||'').replace(/\'/g,'') + '\')"><i class="fa-solid fa-trash"></i></button></div>';
    }).join('');
  }).catch(function() {});
}
window.loadSubjects = loadSubjects;

/* ── ACTIVITY CHART ── */
function buildActivityChart() {
  var chart = document.getElementById('activity-chart'); if (!chart) return;
  fetch('/api/sessions/weekly').then(function(r) { return r.json(); }).then(function(data) {
    var maxMin   = Math.max.apply(null, data.map(function(d) { return d.minutes; })) || 1;
    var todayIdx = (new Date().getDay() + 6) % 7;
    chart.innerHTML = data.map(function(d, i) {
      var h = d.minutes > 0 ? Math.max(8, (d.minutes / maxMin) * 80) : 4;
      return '<div class="act-col"><div class="act-bar-wrap"><div class="act-bar ' + (d.minutes > 0 ? 'filled' : 'empty') + '" style="height:' + h + '%"></div></div><div class="act-day ' + (i === todayIdx ? 'today' : '') + '">' + d.day + '</div></div>';
    }).join('');
  }).catch(function() {
    var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var todayIdx = (new Date().getDay() + 6) % 7;
    chart.innerHTML = days.map(function(d, i) {
      return '<div class="act-col"><div class="act-bar-wrap"><div class="act-bar empty"></div></div><div class="act-day ' + (i === todayIdx ? 'today' : '') + '">' + d + '</div></div>';
    }).join('');
  });
}
window.buildActivityChart = buildActivityChart;

/* ── INIT ── */
loadDashboardStats();
buildActivityChart();
loadSubjects();
populateSubjectSelects();
