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

/* ── PROFILE DROPDOWN ── */
var navUserWrap = document.getElementById('nav-user-wrap');
var profileDrop = document.getElementById('profile-dropdown');

if (navUserWrap && profileDrop) {
  document.getElementById('nav-user').addEventListener('click', function(e) {
    e.stopPropagation();
    navUserWrap.classList.toggle('open');
  });
  document.addEventListener('click', function(e) {
    if (!navUserWrap.contains(e.target)) navUserWrap.classList.remove('open');
  });
}

/* ── LOGOUT (with confirmation) ── */
var logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.addEventListener('click', async function(e) {
  e.preventDefault(); e.stopPropagation();
  if (navUserWrap) navUserWrap.classList.remove('open');
  SHConfirm.show({
    type: 'warning',
    icon: 'fa-arrow-right-from-bracket',
    title: 'Sign Out?',
    body: 'You will be logged out of StudyHub. Any unsaved changes may be lost.',
    confirmLabel: 'Sign Out',
    onConfirm: async function() {
      // Wipe ALL trash-related localStorage keys before leaving.
      // This ensures the next user who logs in on this browser never sees
      // a flash of the previous account's trash badge or modal contents.
      try {
        var keysToDelete = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && (k.indexOf('studyhub_trash') === 0 || k.indexOf('sh_quizzes_v1_') === 0)) {
            keysToDelete.push(k);
          }
        }
        keysToDelete.forEach(function(k) { localStorage.removeItem(k); });
      } catch(_) {}
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = '/';
    }
  });
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
setInterval(sendHeartbeat, 20000);
sendHeartbeat();

/* ── NOTIFICATION POLLING ── */
setInterval(loadNotifications, 30000);
loadNotifications();

/* ══════════════════════════════════════════
   GLOBAL CONFIRM DIALOG
══════════════════════════════════════════ */
window.SHConfirm = (function() {
  var _cb = null;
  var overlay = null;

  function _init() {
    if (overlay) return;
    overlay = document.getElementById('confirm-overlay');
  }

  function show(opts) {
    _init();
    if (!overlay) return;
    _cb = opts.onConfirm || null;
    var type = opts.type || 'danger'; // 'danger' | 'warning'
    var iconEl = document.getElementById('confirm-icon');
    var iconI  = document.getElementById('confirm-icon-i');
    var btn    = document.getElementById('confirm-proceed-btn');
    iconEl.className = 'confirm-icon ' + type;
    iconI.className  = 'fa-solid ' + (opts.icon || (type === 'warning' ? 'fa-triangle-exclamation' : 'fa-trash'));
    document.getElementById('confirm-title').textContent = opts.title || 'Are you sure?';
    document.getElementById('confirm-body').textContent  = opts.body  || 'This action cannot be undone.';
    btn.className = 'confirm-proceed-' + type;
    btn.textContent = opts.confirmLabel || (type === 'warning' ? 'Proceed' : 'Delete');
    overlay.classList.add('active');
  }

  function cancel() {
    if (overlay) overlay.classList.remove('active');
    _cb = null;
  }

  function proceed() {
    if (overlay) overlay.classList.remove('active');
    if (_cb) { var fn = _cb; _cb = null; fn(); }
  }

  // Close on backdrop click
  document.addEventListener('DOMContentLoaded', function() {
    var o = document.getElementById('confirm-overlay');
    if (o) o.addEventListener('click', function(e) {
      if (e.target === o) cancel();
    });
  });

  return { show: show, cancel: cancel, proceed: proceed };
})();

/* ══════════════════════════════════════════
   TRASH BIN SYSTEM (server-driven, per-user)
   Source of truth: /api/subjects?trash=1
   localStorage used only for icon/type metadata
   that the server doesn't store.
══════════════════════════════════════════ */
window.SHTrash = (function() {
  var DAYS_30 = 30 * 24 * 60 * 60 * 1000;

  // ── Per-user metadata key (icon, type only) ──────────────────────────────
  // IMPORTANT: always scoped to the current user ID so that switching accounts
  // never leaks one user's trash metadata into another account's trash view.
  function _metaKey() {
    var uid = (window.STUDYHUB_USER && window.STUDYHUB_USER.id) ? String(window.STUDYHUB_USER.id) : null;
    if (!uid) return null; // not logged in — do not read/write any trash data
    // One-time migration: wipe the legacy unscoped key
    if (localStorage.getItem('studyhub_trash') !== null) {
      localStorage.removeItem('studyhub_trash');
    }
    return 'studyhub_trash_meta_' + uid;
  }

  function _loadMeta() {
    var key = _metaKey();
    if (!key) return {};
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch(_) { return {}; }
  }

  function _saveMeta(meta) {
    var key = _metaKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(meta));
  }

  // ── Badge ─────────────────────────────────────────────────────────────────
  function _updateBadge(count) {
    var badge = document.getElementById('trash-count-badge');
    if (!badge) return;
    if (count > 0) {
      badge.style.display = 'flex';
      badge.textContent = count > 99 ? '99+' : count;
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Fetch trash items from the server (source of truth) ──────────────────
  function _fetchFromServer() {
    return fetch('/api/subjects?trash=1')
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function(data) {
        var rows = data.data || data || [];
        var meta = _loadMeta();
        // Map server rows → display items, merging saved icon/type metadata
        return rows.map(function(row) {
          var m = meta[String(row.id)] || {};
          return {
            id:        row.id,
            name:      row.name,
            type:      m.type || 'Subject',
            icon:      m.icon || '<i class="fa-solid fa-book-open" style="color:var(--a-blue)"></i>',
            deletedAt: row.deleted_at || Date.now(),   // deleted_at is ms timestamp from API
            // trashId used by restore/permDelete buttons — use server id as stable key
            trashId:   'srv_' + row.id
          };
        });
      });
  }

  function _daysLeft(deletedAt) {
    var ms = DAYS_30 - (Date.now() - deletedAt);
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  }

  // ── addItem: called right after a successful soft-delete API call ─────────
  // Saves icon/type metadata locally (server doesn't store these UI fields)
  // and refreshes the badge from the server.
  function addItem(item) {
    // Only store metadata (icon, type) — not the item itself, which now lives on the server
    var meta = _loadMeta();
    meta[String(item.id)] = { icon: item.icon || '', type: item.type || 'Subject' };
    _saveMeta(meta);
    // Refresh badge count from server
    _fetchFromServer().then(function(items) {
      _updateBadge(items.length);
    }).catch(function() {});
  }

  // ── restore ───────────────────────────────────────────────────────────────
  function restore(trashId, onRestore) {
    // trashId is 'srv_<subjectId>'
    var subjectId = trashId.replace(/^srv_/, '');
    fetch('/api/subjects/' + subjectId + '?action=restore', { method: 'POST' })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function() {
        // Clean up local metadata for this item
        var meta = _loadMeta();
        delete meta[String(subjectId)];
        _saveMeta(meta);
        if (onRestore) onRestore({ id: subjectId });
        showToast('Subject restored', 'success');
        // Re-render modal with fresh server data
        renderModal();
        // Refresh subject lists on whichever page is active
        if (typeof loadSubjects === 'function') loadSubjects();
        if (typeof loadEduSubjects === 'function') loadEduSubjects();
        if (typeof populateSubjectSelects === 'function') populateSubjectSelects();
        if (typeof loadDashboardStats === 'function') loadDashboardStats();
        if (typeof loadEduStats === 'function') loadEduStats();
      })
      .catch(function(err) {
        showToast('Failed to restore subject: ' + err.message, 'error');
      });
  }

  // ── permDelete ────────────────────────────────────────────────────────────
  function permDelete(trashId) {
    var subjectId = trashId.replace(/^srv_/, '');
    SHConfirm.show({
      type: 'danger',
      icon: 'fa-trash',
      title: 'Permanently Delete?',
      body: 'This item will be removed forever and cannot be recovered.',
      confirmLabel: 'Delete Forever',
      onConfirm: function() {
        fetch('/api/subjects/' + subjectId + '?action=purge', { method: 'DELETE' })
          .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            var meta = _loadMeta();
            delete meta[String(subjectId)];
            _saveMeta(meta);
            showToast('Subject permanently deleted', 'info');
            renderModal();
          })
          .catch(function(err) {
            showToast('Failed to permanently delete: ' + err.message, 'error');
          });
      }
    });
  }

  // ── emptyAll ──────────────────────────────────────────────────────────────
  function emptyAll() {
    _fetchFromServer().then(function(items) {
      if (!items.length) { showToast('Trash is already empty', 'info'); return; }
      SHConfirm.show({
        type: 'danger',
        icon: 'fa-trash',
        title: 'Empty Trash?',
        body: 'All ' + items.length + ' item(s) will be permanently deleted. This cannot be undone.',
        confirmLabel: 'Empty Trash',
        onConfirm: function() {
          Promise.all(items.map(function(item) {
            return fetch('/api/subjects/' + item.id + '?action=purge', { method: 'DELETE' });
          }))
          .then(function() {
            // Clear all metadata for this user
            var key = _metaKey();
            if (key) localStorage.removeItem(key);
            showToast('Trash emptied', 'info');
            _updateBadge(0);
            renderModal();
          })
          .catch(function(err) {
            showToast('Failed to empty trash: ' + err.message, 'error');
          });
        }
      });
    }).catch(function(err) {
      showToast('Failed to load trash: ' + err.message, 'error');
    });
  }

  // ── renderModal ───────────────────────────────────────────────────────────
  // Always fetches fresh data from the server — guarantees each user only
  // sees their own deleted subjects, regardless of shared browser or account switching.
  function renderModal() {
    var container = document.getElementById('trash-list-container');
    var countEl   = document.getElementById('trash-item-count');
    if (!container) return;

    // Show loading state while fetching
    container.innerHTML = '<div class="trash-empty-state"><i class="fa-solid fa-rotate fa-spin"></i><p>Loading…</p></div>';

    _fetchFromServer()
      .then(function(items) {
        items.sort(function(a, b) { return b.deletedAt - a.deletedAt; });
        _updateBadge(items.length);
        if (countEl) countEl.textContent = items.length + ' item' + (items.length !== 1 ? 's' : '');
        if (!items.length) {
          container.innerHTML = '<div class="trash-empty-state"><i class="fa-solid fa-trash-can"></i><p>Trash is empty</p></div>';
          return;
        }
        container.innerHTML = items.map(function(item) {
          var days = _daysLeft(item.deletedAt);
          var cls  = days <= 3 ? 'urgent' : days <= 10 ? 'warning' : 'safe';
          var lbl  = days === 0 ? 'Expires today' : days + 'd left';
          var deletedDate = new Date(item.deletedAt).toLocaleDateString('en-US', { month:'short', day:'numeric' });
          return '<div class="trash-item" data-trash-id="' + item.trashId + '">' +
            '<div class="trash-item-icon">' + (item.icon || '<i class="fa-solid fa-file" style="color:var(--a-blue)"></i>') + '</div>' +
            '<div class="trash-item-info">' +
              '<div class="trash-item-name">' + escapeHtml(item.name) + '</div>' +
              '<div class="trash-item-meta">' + escapeHtml(item.type || 'Subject') + ' · Deleted ' + deletedDate + '</div>' +
            '</div>' +
            '<span class="trash-item-days ' + cls + '">' + lbl + '</span>' +
            '<button class="trash-item-restore" title="Restore" onclick="SHTrash.restore(\'' + item.trashId + '\')"><i class="fa-solid fa-rotate-left"></i></button>' +
            '<button class="trash-item-perm-del" title="Delete permanently" onclick="SHTrash.permDelete(\'' + item.trashId + '\')"><i class="fa-solid fa-xmark"></i></button>' +
            '</div>';
        }).join('');
      })
      .catch(function(err) {
        container.innerHTML = '<div class="trash-empty-state"><i class="fa-solid fa-triangle-exclamation"></i><p>Failed to load trash</p></div>';
        console.error('SHTrash renderModal error:', err);
      });
  }

  // ── openModal ─────────────────────────────────────────────────────────────
  function openModal() {
    var overlay = document.getElementById('trash-modal-overlay');
    if (overlay) overlay.classList.add('active');
    renderModal(); // always fetches fresh from server on open
  }

  function closeModal() {
    var overlay = document.getElementById('trash-modal-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    var o = document.getElementById('trash-modal-overlay');
    if (o) o.addEventListener('click', function(e) {
      if (e.target === o) closeModal();
    });
    var trashBtn = document.getElementById('trash-nav-btn');
    if (trashBtn) trashBtn.addEventListener('click', openModal);

    // On every page load: remove any stale trash localStorage keys that
    // don't belong to the currently logged-in user. This is the safety net —
    // even if logout didn't clean up (e.g. tab was closed, session expired),
    // another user logging in will never see leftover data.
    try {
      var currentKey = _metaKey(); // e.g. 'studyhub_trash_meta_42'
      var staleKeys = [];
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('studyhub_trash') === 0 && k !== currentKey) {
          staleKeys.push(k);
        }
      }
      staleKeys.forEach(function(k) { localStorage.removeItem(k); });
    } catch(_) {}

    // Init badge from server (source of truth — always scoped to current user's session)
    _fetchFromServer().then(function(items) {
      _updateBadge(items.length);
    }).catch(function() { _updateBadge(0); });
  });

  return { addItem: addItem, restore: restore, permDelete: permDelete, emptyAll: emptyAll, openModal: openModal, closeModal: closeModal, renderModal: renderModal };
})();
