/* ── StudyHub · Shared Nav & Utilities ── */
'use strict';

/* ── HELPERS ── */
function escapeHtml(t) {
  if (!t) return '';
  var d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function formatTimeAgo(ds) {
  var d = new Date(ds), now = new Date(), diff = Math.floor((now - d) / 1000);
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400)  return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ── TOAST ── */
function showToast(msg, type) {
  type = type || 'info';
  var c = document.getElementById('toast-container');
  if (!c) return;
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  var icons  = { success:'fa-check-circle', error:'fa-circle-exclamation', info:'fa-circle-info' };
  var colors = { success:'var(--a-emerald)', error:'var(--a-rose)', info:'var(--a-cyan)' };
  t.style.borderLeftColor = colors[type] || 'var(--a-violet)';
  t.innerHTML = '<i class="fa-solid ' + (icons[type]||icons.info) + '" style="color:' + (colors[type]||'var(--a-violet)') + ';flex-shrink:0;"></i><span>' + msg + '</span>';
  c.appendChild(t);
  setTimeout(function(){ t.style.opacity='0'; t.style.transform='translateX(24px)'; t.style.transition='0.3s'; }, 3000);
  setTimeout(function(){ t.remove(); }, 3400);
}
window.showToast = showToast;

/* ── THEME ── */
var isDark = localStorage.getItem('theme') !== 'light';
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
var themeBtn = document.getElementById('theme-btn');
var themeIcon = document.getElementById('theme-icon');
if (themeIcon) themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
if (themeBtn) themeBtn.addEventListener('click', function() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (themeIcon) themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
});

/* ── MOBILE HAMBURGER ── */
var hamburger = document.getElementById('nav-hamburger');
if (hamburger) hamburger.addEventListener('click', function() {
  document.getElementById('mobile-drawer').classList.toggle('open');
});

/* ── LOGOUT ── */
var logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', async function(e) {
  e.preventDefault(); e.stopPropagation();
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

/* ── SEARCH ── */
var searchOverlay = document.getElementById('search-overlay');
var searchInput   = document.getElementById('search-input');
var searchResults = document.getElementById('search-results');
var searchBtn     = document.getElementById('search-btn');
var searchClose   = document.getElementById('search-close');

if (searchBtn) searchBtn.addEventListener('click', function() {
  searchOverlay.classList.add('active');
  setTimeout(function(){ searchInput.focus(); }, 80);
});
if (searchClose) searchClose.addEventListener('click', function() {
  searchOverlay.classList.remove('active'); searchInput.value = ''; searchResults.innerHTML = '';
});

var searchTimeout;
if (searchInput) searchInput.addEventListener('input', function() {
  clearTimeout(searchTimeout);
  var q = this.value.trim();
  if (q.length < 2) { searchResults.innerHTML = ''; return; }
  searchTimeout = setTimeout(async function() {
    try {
      var res = await fetch('/api/search?q=' + encodeURIComponent(q));
      var data = await res.json();
      var html = '';
      (data.users||[]).forEach(function(u) {
        var av = u.profile_picture
          ? '<img src="'+u.profile_picture+'" class="search-result-avatar">'
          : '<div class="search-result-initials">'+(u.first_name?u.first_name[0]:'')+(u.last_name?u.last_name[0]:'')+' </div>';
        html += '<a class="search-result-item" href="/profile">'+av+'<div><div style="font-size:13px;font-weight:600;color:var(--txt-primary)">'+escapeHtml(u.first_name+' '+u.last_name)+'</div><div style="font-size:11px;color:var(--txt-muted)">@'+u.username+'</div></div></a>';
      });
      (data.posts||[]).forEach(function(p) {
        html += '<a class="search-result-item" href="/community"><div style="width:32px;height:32px;border-radius:50%;background:rgba(139,124,248,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-file-lines" style="color:var(--a-violet);font-size:12px"></i></div><div><div style="font-size:13px;font-weight:600;color:var(--txt-primary)">'+escapeHtml(p.title)+'</div><div style="font-size:11px;color:var(--txt-muted)">'+p.topic+' · @'+p.username+'</div></div></a>';
      });
      if (!html) html = '<div style="color:var(--txt-muted);font-size:13px;padding:12px 0;text-align:center;">No results found</div>';
      searchResults.innerHTML = html;
    } catch(_) { searchResults.innerHTML = '<div style="color:var(--txt-muted);font-size:13px;padding:12px 0;text-align:center;">Search failed</div>'; }
  }, 300);
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && searchOverlay) {
    searchOverlay.classList.remove('active');
    document.querySelectorAll('.modal-overlay').forEach(function(m){ m.classList.remove('active'); });
  }
});

/* ── NOTIFICATIONS ── */
var notifBtn  = document.getElementById('notif-btn');
var notifDrop = document.getElementById('notif-dropdown');

if (notifBtn && notifDrop) {
  notifBtn.addEventListener('click', function(e) {
    if (notifDrop.contains(e.target) && e.target !== notifBtn) return;
    e.stopPropagation();
    notifDrop.classList.toggle('open');
    if (notifDrop.classList.contains('open')) loadNotifications();
  });
  document.addEventListener('click', function(e) {
    if (notifBtn && !notifBtn.contains(e.target)) notifDrop.classList.remove('open');
  });
}

async function loadNotifications() {
  try {
    var res  = await fetch('/api/notifications');
    var data = await res.json();
    var list = document.getElementById('notif-list');
    var dot  = document.getElementById('notif-dot');
    if (dot) dot.style.display = data.unread > 0 ? 'block' : 'none';
    if (!list) return;
    if (!data.notifications || !data.notifications.length) {
      list.innerHTML = '<div class="notif-empty">No notifications yet</div>'; return;
    }
    list.innerHTML = data.notifications.map(function(n) {
      return '<div class="notif-item '+(n.is_read?'':'unread')+'" onclick="markNotifRead('+n.id+')">'+
        '<div class="notif-dot-indicator" style="opacity:'+(n.is_read?'0':'1')+'"></div>'+
        '<div class="notif-content"><div class="notif-title">'+escapeHtml(n.title)+'</div>'+
        '<div class="notif-body">'+escapeHtml(n.body||'')+'</div>'+
        '<div class="notif-time">'+formatTimeAgo(n.created_at)+'</div></div></div>';
    }).join('');
  } catch(_) {}
}

window.markNotifRead = async function(id) {
  try { await fetch('/api/notifications/'+id+'/read', {method:'POST'}); loadNotifications(); } catch(_) {}
};

var notifReadAll = document.getElementById('notif-read-all');
if (notifReadAll) notifReadAll.addEventListener('click', async function() {
  try { await fetch('/api/notifications/read-all', {method:'POST'}); loadNotifications(); } catch(_) {}
});

/* ── MODAL UTILS ── */
window.closeModal = function(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('active');
};
document.querySelectorAll('.modal-overlay').forEach(function(o) {
  o.addEventListener('click', function(e) { if (e.target === o) o.classList.remove('active'); });
});

/* ── HEARTBEAT ── */
function sendHeartbeat() { fetch('/api/heartbeat', {method:'POST'}).catch(function(){}); }
setInterval(sendHeartbeat, 60000);
sendHeartbeat();

/* ── NOTIFICATION POLLING ── */
setInterval(loadNotifications, 30000);
loadNotifications();
