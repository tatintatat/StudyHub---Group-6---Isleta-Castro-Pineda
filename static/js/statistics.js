/* ── StudyHub · Statistics Page ── */
'use strict';

function buildHeatmap() {
  var el = document.getElementById('heatmap'); if (!el) return;
  fetch('/api/sessions/heatmap')
    .then(function(r) { return r.json(); })
    .then(function(data) { renderHeatmap(el, data); })
    .catch(function() { renderHeatmap(el, {}); });
}

function renderHeatmap(el, data) {
  var cells = [];
  for (var i = 29; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var key  = d.toISOString().split('T')[0];
    var mins = data[key] || 0;
    var isToday = (i === 0);
    var bg = mins > 90 ? 'rgba(139,124,248,0.85)' : mins > 60 ? 'rgba(139,124,248,0.6)' : mins > 30 ? 'rgba(139,124,248,0.4)' : mins > 0 ? 'rgba(139,124,248,0.2)' : 'rgba(255,255,255,0.04)';
    var border = isToday ? 'border:1.5px solid var(--a-violet);box-shadow:0 0 0 1.5px var(--a-violet);' : 'border:1px solid rgba(255,255,255,0.06);';
    cells.push('<div class="heatmap-cell" style="background:' + bg + ';' + border + '" title="' + d.toDateString() + ': ' + mins + ' min"></div>');
  }
  var rem = 30 % 7;
  if (rem) for (var p = 0; p < 7 - rem; p++) cells.unshift('<div style="aspect-ratio:1;opacity:0;"></div>');
  el.innerHTML = cells.join('');
}

async function loadStatisticsData() {
  try {
    var set = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };

    /* Flashcard stats */
    var res   = await fetch('/api/flashcards');
    var cards = await res.json();
    var totalReviews  = cards.reduce(function(s, c) { return s + (c.review_count  || 0); }, 0);
    var totalCorrect  = cards.reduce(function(s, c) { return s + (c.correct_count || 0); }, 0);
    var accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
    set('stat-reviewed',  totalReviews);
    set('stat-accuracy',  accuracy + '%');
    set('stat-quizzes',   totalReviews);

    /* Peak hours */
    var pres  = await fetch('/api/sessions/peak-hours');
    var peaks = await pres.json();
    var labels = { 6:'6am', 9:'9am', 12:'12p', 15:'3pm', 18:'6pm', 21:'9pm', 0:'12a' };
    var maxPeak = Math.max.apply(null, Object.values(peaks)) || 1;
    var hasPeak = Object.values(peaks).some(function(v) { return v > 0; });
    document.getElementById('peak-hours-chart').innerHTML = [6, 9, 12, 15, 18, 21, 0].map(function(h) {
      var v = peaks[h] || 0;
      var pct = hasPeak ? Math.max(16, (v / maxPeak) * 80) : 16;
      return '<div class="act-col"><div class="act-bar-wrap"><div class="act-bar ' + (hasPeak && v > 0 ? 'filled' : 'empty') + '" style="height:' + pct + '%"></div></div><div class="act-day" style="font-size:9px">' + labels[h] + '</div></div>';
    }).join('');

    /* Sessions */
    var sres     = await fetch('/api/sessions');
    var sessions = await sres.json();
    var totalMins = sessions.reduce(function(s, x) { return s + x.duration_minutes; }, 0);
    set('perf-avg',   (sessions.length > 0 ? Math.round(totalMins / sessions.length) : 0) + ' min');
    set('perf-total', sessions.length);

    /* Streak & achievements */
    var stRes  = await fetch('/api/stats');
    var stData = await stRes.json();
    var sv = stData.streak || 1;
    set('perf-streak',    sv + ' day' + (sv > 1 ? 's' : ''));
    set('stat-achievements', Math.min(10, Math.floor((stData.score || 0) / 50)));
    set('perf-retention', (totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0) + '%');

    /* Education feature usage */
    try {
      var fuRes  = await fetch('/api/feature-usage/stats');
      var fuData = await fuRes.json();
      set('stat-quizzes',   fuData.quizzes_completed || 0);
      set('stat-reviewed',  fuData.flashcards_flipped || totalReviews);
      set('stat-ai-gen',    fuData.ai_generations || 0);
      set('stat-timer',     fuData.timer_sessions || 0);
      set('perf-edu-total', fuData.total_edu_actions || 0);
      /* Accuracy stays from flashcard review_count / correct_count */
    } catch(_) {}

    buildHeatmap();
  } catch(_) {}
}

/* ── INIT ── */
loadStatisticsData();
