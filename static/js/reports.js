/* ── StudyHub · Reports Page ── */
'use strict';

async function loadReportsData() {
  try {
    var res   = await fetch('/api/stats');
    var stats = await res.json();

    var set = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
    set('report-sessions', stats.posts || 0);
    set('report-total', (stats.study_hours || 0) + 'h');
    set('report-goal', Math.min(100, Math.round(((stats.weekly_done || 0) / 10) * 100)) + '%');

    /* Monthly chart */
    var mres    = await fetch('/api/sessions/monthly');
    var monthly = await mres.json();
    var chart   = document.getElementById('report-monthly-chart');
    var maxH    = Math.max.apply(null, monthly.map(function(d) { return d.hours; })) || 1;
    chart.innerHTML = monthly.map(function(d) {
      var h = d.hours > 0 ? Math.max(12, (d.hours / maxH) * 80) : 12;
      return '<div class="act-col"><div class="act-bar-wrap"><div class="act-bar ' + (d.hours > 0 ? 'filled' : 'empty') + '" style="height:' + h + '%"></div></div><div class="act-day">' + d.week + '</div></div>';
    }).join('');

    /* Subject breakdown */
    var bres      = await fetch('/api/sessions/subject-breakdown');
    var breakdown = await bres.json();
    var bel       = document.getElementById('subject-breakdown');
    var hasData   = breakdown && breakdown.some(function(s) { return s.total > 0; });
    if (hasData) {
      var maxT = Math.max.apply(null, breakdown.map(function(d) { return d.total; })) || 1;
      bel.innerHTML = '<div class="breakdown-list">' + breakdown.map(function(s) {
        var pct = Math.round((s.total / maxT) * 100);
        return '<div class="breakdown-item">' +
          '<div class="breakdown-color" style="background:' + (s.color || '#8b7cf8') + '"></div>' +
          '<div class="breakdown-name">' + escapeHtml(s.name) + '</div>' +
          '<div class="breakdown-bar-wrap"><div class="breakdown-bar-fill" style="width:' + pct + '%;background:' + (s.color || '#8b7cf8') + '"></div></div>' +
          '<div class="breakdown-time">' + Math.round(s.total / 60 * 10) / 10 + 'h</div></div>';
      }).join('') + '</div>';
    } else {
      bel.innerHTML = '<div class="empty-state" style="padding:2rem 0"><i class="fa-solid fa-chart-pie empty-icon-fa"></i><div>No data yet</div><div class="empty-sub">Add subjects and start studying</div></div>';
    }

    /* Best day */
    var sres   = await fetch('/api/sessions/weekly');
    var weekly = await sres.json();
    var best   = weekly.reduce(function(b, d) { return d.minutes > b.minutes ? d : b; }, { minutes: 0, day: '—' });
    set('report-best', best.minutes > 0 ? best.day : '—');

    loadStudyLog();
  } catch(_) {}
}

async function loadStudyLog() {
  try {
    var res      = await fetch('/api/sessions');
    var sessions = await res.json();
    var el       = document.getElementById('study-log-reports'); if (!el) return;
    if (!sessions || !sessions.length) {
      el.innerHTML = '<div class="empty-state" style="padding:2rem 0"><i class="fa-solid fa-clipboard-list empty-icon-fa"></i><div>No sessions yet</div><div class="empty-sub">Start logging your study sessions to track progress</div></div>';
      return;
    }
    el.innerHTML = '<div class="log-list">' + sessions.slice(0, 15).map(function(s) {
      var color   = s.subject_color || '#8b7cf8';
      var name    = s.subject_name  || 'General';
      var date    = new Date(s.session_date).toLocaleDateString('en-US', { month:'short', day:'numeric' });
      var hours   = Math.floor(s.duration_minutes / 60);
      var mins    = s.duration_minutes % 60;
      var timeStr = hours > 0 ? hours + 'h ' + mins + 'm' : mins + ' min';
      return '<div class="log-item">' +
        '<div class="log-color" style="background:' + color + '"></div>' +
        '<div class="log-info"><div class="log-subject">' + escapeHtml(name) + '</div>' +
        '<div class="log-meta">' + date + (s.notes ? ' — ' + escapeHtml(s.notes.substring(0, 40)) : '') + '</div></div>' +
        '<div class="log-duration">' + timeStr + '</div></div>';
    }).join('') + '</div>';
  } catch(_) {}
}
window.loadStudyLog = loadStudyLog;

/* ── INIT ── */
loadReportsData();
populateSubjectSelects();
