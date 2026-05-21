'use strict';
/* ════════════════════════════════════════════════════════════
   StudyHub — message.js   (FIXED)
   • Correct API endpoints matching Flask backend
   • Real-time polling every 3 s on messages page
   • Unread badge on nav (all pages)
   • New-message modal with user search
   ════════════════════════════════════════════════════════════ */

/* ── tiny helpers ─────────────────────────────────────────── */
function msgEsc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function msgAgo(iso) {
  if (!iso) return '';
  var diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function msgDateKey(iso) { return iso ? new Date(iso).toDateString() : ''; }
function msgFriendlyDate(iso) {
  if (!iso) return '';
  var d = new Date(iso), diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/* ── state ────────────────────────────────────────────────── */
var _conv = {
  username: null,   // currently open conversation partner
  name:     '',
  avatar:   '',
  initials: '?',
  lastId:   0,      // highest message id seen, for polling
  poll:     null,   // setInterval handle
  filter:   'all',
};

/* ══════════════════════════════════════════════════════════
   1.  CONVERSATIONS LIST
   Flask: GET /api/messages/conversations
══════════════════════════════════════════════════════════ */
async function loadConversations() {
  var list = document.getElementById('convList');
  var loading = document.getElementById('convLoading');
  if (!list) return;

  try {
    var res   = await fetch('/api/messages/conversations');
    var convs = await res.json();
    if (loading) loading.style.display = 'none';

    /* filter tab */
    if (_conv.filter === 'unread') {
      convs = convs.filter(function(c) { return (c.unread_count || 0) > 0; });
    }

    if (!convs || !convs.length) {
      list.innerHTML =
        '<div style="padding:24px 16px;text-align:center;font-size:13px;color:var(--txt-muted);">' +
        'No conversations yet.<br>Send the first message!</div>';
      return;
    }

    list.innerHTML = convs.map(function(c) {
      var isUnread = (c.unread_count || 0) > 0;
      var name = msgEsc(((c.first_name || '') + ' ' + (c.last_name || '')).trim() || c.username);
      var ava  = c.profile_picture
        ? '<img src="' + msgEsc(c.profile_picture) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
        : msgEsc(((c.first_name || '?')[0] + (c.last_name || '')[0]).toUpperCase());
      var preview = msgEsc((c.last_message || '').substring(0, 50));
      var active  = (_conv.username === c.username) ? ' active' : '';

      return (
        '<div class="msg-conv-item' + active + '" ' +
             'data-username="' + msgEsc(c.username) + '" ' +
             'data-name="' + name + '" ' +
             'data-avatar="' + msgEsc(c.profile_picture || '') + '" ' +
             'onclick="openConversation(this)">' +
          '<div class="msg-conv-ava">' + ava +
            (c.is_online ? '<div class="msg-conv-online"></div>' : '') +
          '</div>' +
          '<div class="msg-conv-info">' +
            '<div class="msg-conv-name' + (isUnread ? ' unread' : '') + '">' + name + '</div>' +
            '<div class="msg-conv-preview' + (isUnread ? ' unread' : '') + '">' + preview + '</div>' +
          '</div>' +
          '<div class="msg-conv-meta">' +
            '<div class="msg-conv-time">' + msgAgo(c.last_at) + '</div>' +
            '<div class="msg-conv-unread' + (isUnread ? ' show' : '') + '"></div>' +
          '</div>' +
        '</div>'
      );
    }).join('');

  } catch (e) {
    console.error('[msg] loadConversations', e);
    if (list) list.innerHTML =
      '<div style="padding:16px;color:var(--txt-muted);font-size:13px;">Failed to load conversations.</div>';
  }
}

/* ══════════════════════════════════════════════════════════
   2.  OPEN A CONVERSATION
══════════════════════════════════════════════════════════ */
window.openConversation = function(el) {
  document.querySelectorAll('.msg-conv-item').forEach(function(i) { i.classList.remove('active'); });
  el.classList.add('active');

  var username = el.dataset.username;
  var name     = el.dataset.name || username;
  var avatar   = el.dataset.avatar || '';
  var initials = name ? (name.split(' ').map(function(p) { return p[0]; }).join('').substring(0, 2).toUpperCase()) : '?';

  _conv.username = username;
  _conv.name     = name;
  _conv.avatar   = avatar;
  _conv.initials = initials;
  _conv.lastId   = 0;

  /* Show chat, hide empty state */
  var emptyEl = document.getElementById('msgEmptyState');
  var innerEl = document.getElementById('msgChatInner');
  if (emptyEl) emptyEl.style.display = 'none';
  if (innerEl) { innerEl.style.display = 'flex'; }

  /* Mobile slide */
  var chatArea = document.getElementById('msgChatArea');
  if (chatArea) chatArea.classList.add('mobile-open');

  /* Header */
  var headerAva = document.getElementById('chatHeaderAva');
  var headerIni = document.getElementById('chatHeaderInitials');
  if (headerAva && headerIni) {
    var oldImg = headerAva.querySelector('img');
    if (oldImg) oldImg.remove();
    headerIni.textContent = initials;
    headerIni.style.display = '';
    if (avatar) {
      var img = document.createElement('img');
      img.src = avatar;
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;position:absolute;inset:0;';
      headerAva.style.position = 'relative';
      headerAva.appendChild(img);
      headerIni.style.display = 'none';
    }
  }
  var headerName = document.getElementById('chatHeaderName');
  if (headerName) headerName.textContent = name;

  /* Load messages then start polling */
  clearInterval(_conv.poll);
  var bubbles = document.getElementById('msgBubbles');
  if (bubbles) bubbles.innerHTML =
    '<div style="text-align:center;padding:40px 0;color:var(--txt-muted);font-size:13px;">' +
    '<i class="fa-solid fa-spinner fa-spin" style="font-size:20px;margin-bottom:8px;display:block;"></i>Loading…</div>';

  _loadMessages(username, true);
  _conv.poll = setInterval(function() { _loadMessages(username, false); }, 3000);

  /* Mark read */
  fetch('/api/messages/read_all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: username })
  }).catch(function() {});
};

/* Back button (mobile) */
var backBtn = document.getElementById('msgBackBtn');
if (backBtn) {
  backBtn.addEventListener('click', function() {
    var chatArea = document.getElementById('msgChatArea');
    if (chatArea) chatArea.classList.remove('mobile-open');
    clearInterval(_conv.poll);
    _conv.username = null;
  });
}

/* ══════════════════════════════════════════════════════════
   3.  LOAD / POLL MESSAGES
   Flask: GET /api/messages?user=:username
══════════════════════════════════════════════════════════ */
async function _loadMessages(username, fullReload) {
  if (_conv.username !== username) return; /* conversation switched */
  var bubblesEl = document.getElementById('msgBubbles');
  if (!bubblesEl) return;

  try {
    /* Flask endpoint: GET /api/messages?user=username */
    var url = '/api/messages?user=' + encodeURIComponent(username);
    var res  = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var msgs = await res.json();

    if (!Array.isArray(msgs)) return;

    if (fullReload) {
      bubblesEl.innerHTML = '';
      if (!msgs.length) {
        bubblesEl.innerHTML =
          '<div style="text-align:center;padding:40px 0;color:var(--txt-muted);font-size:13px;">' +
          'No messages yet. Say hello! 👋</div>';
        return;
      }
      _renderBubbles(msgs, bubblesEl, true);
    } else {
      /* Only append genuinely new messages */
      var newMsgs = msgs.filter(function(m) { return m.id > _conv.lastId; });
      if (newMsgs.length) {
        /* Remove "no messages" placeholder if present */
        var placeholder = bubblesEl.querySelector('[data-placeholder]');
        if (placeholder) placeholder.remove();
        _renderBubbles(newMsgs, bubblesEl, false);
        /* Refresh conv list so preview/time updates */
        loadConversations();
        updateMsgBadge();
      }
    }

    /* Track highest id */
    msgs.forEach(function(m) { if (m.id > _conv.lastId) _conv.lastId = m.id; });
    bubblesEl.scrollTop = bubblesEl.scrollHeight;

  } catch (e) {
    console.error('[msg] _loadMessages', e);
  }
}

function _renderBubbles(msgs, container, scroll) {
  var me = (window.STUDYHUB_USER || {}).id ? String(window.STUDYHUB_USER.id) : null;
  var prevMsg = null;

  msgs.forEach(function(m, i) {
    var isSent   = me && String(m.sender_id) === me;
    var next     = msgs[i + 1];
    var sameNext = next && String(next.sender_id) === String(m.sender_id);
    var samePrev = prevMsg && String(prevMsg.sender_id) === String(m.sender_id);

    /* Date separator */
    if (!prevMsg || msgDateKey(m.created_at) !== msgDateKey(prevMsg.created_at)) {
      var sep = document.createElement('div');
      sep.className   = 'msg-date-divider';
      sep.textContent = msgFriendlyDate(m.created_at);
      container.appendChild(sep);
    }

    var row = document.createElement('div');
    row.className = 'msg-bubble-row' +
      (isSent ? ' sent' : '') +
      (!samePrev ? ' first-in-group' : '') +
      (!sameNext ? ' last-in-group'  : '');
    row.setAttribute('data-msg-id', m.id);

    /* Avatar (received only) */
    var avaHtml = '';
    if (!isSent) {
      if (!sameNext) {
        avaHtml = _conv.avatar
          ? '<div class="msg-bubble-row-ava"><img src="' + msgEsc(_conv.avatar) +
            '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>'
          : '<div class="msg-bubble-row-ava">' + msgEsc(_conv.initials) + '</div>';
      } else {
        avaHtml = '<div class="msg-bubble-row-ava invisible"></div>';
      }
    }

    row.innerHTML =
      avaHtml +
      '<div class="msg-bubble ' + (isSent ? 'sent' : 'received') + '">' +
        msgEsc(m.body || m.content || '') +
      '</div>' +
      '<div class="msg-bubble-time">' + msgAgo(m.created_at) + '</div>';

    container.appendChild(row);
    prevMsg = m;
  });

  if (scroll) container.scrollTop = container.scrollHeight;
}

/* ══════════════════════════════════════════════════════════
   4.  SEND MESSAGE
   Flask: POST /api/messages  body: { to, body }
══════════════════════════════════════════════════════════ */
async function _doSend() {
  if (!_conv.username) return;
  var input   = document.getElementById('msgInput');
  var content = (input.value || '').trim();
  if (!content) return;

  input.value = '';

  /* Optimistic bubble */
  var bubblesEl = document.getElementById('msgBubbles');
  var placeholder = bubblesEl ? bubblesEl.querySelector('[data-placeholder]') : null;
  if (placeholder) placeholder.remove();

  if (bubblesEl) {
    var fakeId = 'opt_' + Date.now();
    _renderBubbles([{
      id:         fakeId,
      sender_id:  window.STUDYHUB_USER ? window.STUDYHUB_USER.id : 'me',
      body:       content,
      created_at: new Date().toISOString()
    }], bubblesEl, true);
  }

  try {
    /* Flask expects: { "to": username, "body": "..." } */
    var res = await fetch('/api/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ to: _conv.username, body: content })
    });
    if (!res.ok) {
      var err = await res.json().catch(function() { return {}; });
      throw new Error(err.error || 'Send failed');
    }
    /* Immediately refresh so real id replaces optimistic */
    _loadMessages(_conv.username, false);
    loadConversations();
  } catch (e) {
    console.error('[msg] send', e);
    if (typeof showToast === 'function') showToast('Failed to send message', 'error');
  }
}

var sendBtn = document.getElementById('msgSendBtn');
if (sendBtn) sendBtn.addEventListener('click', _doSend);

var msgInput = document.getElementById('msgInput');
if (msgInput) {
  msgInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _doSend(); }
  });
}

/* ══════════════════════════════════════════════════════════
   5.  FILTER TABS
══════════════════════════════════════════════════════════ */
document.querySelectorAll('.msg-filter-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.msg-filter-tab').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    _conv.filter = btn.dataset.filter || 'all';
    loadConversations();
  });
});

/* ══════════════════════════════════════════════════════════
   6.  CONVERSATION SEARCH (client-side filter)
══════════════════════════════════════════════════════════ */
var convSearchInput = document.getElementById('convSearchInput');
if (convSearchInput) {
  convSearchInput.addEventListener('input', function() {
    var q = this.value.toLowerCase();
    document.querySelectorAll('.msg-conv-item').forEach(function(item) {
      var name = (item.dataset.name || '').toLowerCase();
      item.style.display = name.includes(q) ? '' : 'none';
    });
  });
}

/* ══════════════════════════════════════════════════════════
   7.  NEW MESSAGE MODAL
══════════════════════════════════════════════════════════ */
var _nmSelected = null; /* { username, name, avatar } */

function openNM() {
  var overlay = document.getElementById('newMsgOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    _nmSelected = null;
    var inp = document.getElementById('nmSearchInput');
    if (inp) { inp.value = ''; inp.focus(); }
    var chips = document.getElementById('nmChips');
    if (chips) {
      /* Remove any existing chip */
      chips.querySelectorAll('.nm-chip').forEach(function(c) { c.remove(); });
    }
    var compose = document.getElementById('nmComposeInput');
    if (compose) compose.value = '';
    var sendBtn2 = document.getElementById('nmSendBtn');
    if (sendBtn2) sendBtn2.disabled = true;
    var resList = document.getElementById('nmResultsList');
    if (resList) resList.innerHTML = '';
    var noRes = document.getElementById('nmNoResults');
    if (noRes) noRes.style.display = 'none';
    var resHdr = document.getElementById('nmResultsHeader');
    if (resHdr) resHdr.textContent = 'Search users';
  }
}

function closeNM() {
  var overlay = document.getElementById('newMsgOverlay');
  if (overlay) overlay.style.display = 'none';
}

/* Open buttons */
['newMsgBtn', 'emptyNewMsgBtn'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', openNM);
});
['newMsgClose', 'nmCancelBtn'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', closeNM);
});

/* Close on backdrop */
var nmOverlay = document.getElementById('newMsgOverlay');
if (nmOverlay) {
  nmOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeNM();
  });
}

/* User search inside modal — calls Flask /api/search?q= */
var nmSearchInput = document.getElementById('nmSearchInput');
var _nmSearchTimer = null;
if (nmSearchInput) {
  nmSearchInput.addEventListener('input', function() {
    clearTimeout(_nmSearchTimer);
    var q = this.value.trim();
    var resList = document.getElementById('nmResultsList');
    var noRes   = document.getElementById('nmNoResults');
    var resHdr  = document.getElementById('nmResultsHeader');
    if (!q) {
      if (resList) resList.innerHTML = '';
      if (noRes) noRes.style.display = 'none';
      if (resHdr) resHdr.textContent = 'Search users';
      return;
    }
    _nmSearchTimer = setTimeout(async function() {
      try {
        var res   = await fetch('/api/search?q=' + encodeURIComponent(q));
        var data  = await res.json();
        var users = data.users || [];
        if (resHdr) resHdr.textContent = users.length ? 'People' : '';
        if (!users.length) {
          if (resList) resList.innerHTML = '';
          if (noRes) noRes.style.display = 'flex';
          return;
        }
        if (noRes) noRes.style.display = 'none';
        if (resList) {
          resList.innerHTML = users.map(function(u) {
            var name = ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || u.username;
            var ava  = u.profile_picture
              ? '<img src="' + msgEsc(u.profile_picture) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
              : msgEsc(((u.first_name || '?')[0] + (u.last_name || '')[0]).toUpperCase());
            return (
              '<div class="nm-result-item" ' +
                   'data-username="' + msgEsc(u.username) + '" ' +
                   'data-name="' + msgEsc(name) + '" ' +
                   'data-avatar="' + msgEsc(u.profile_picture || '') + '" ' +
                   'onclick="nmSelectUser(this)">' +
                '<div class="nm-result-ava">' + ava + '</div>' +
                '<div class="nm-result-info">' +
                  '<div class="nm-result-name">' + msgEsc(name) + '</div>' +
                  '<div class="nm-result-handle">@' + msgEsc(u.username) + '</div>' +
                '</div>' +
              '</div>'
            );
          }).join('');
        }
      } catch (e) { console.error('[nm] search', e); }
    }, 300);
  });
}

window.nmSelectUser = function(el) {
  _nmSelected = {
    username: el.dataset.username,
    name:     el.dataset.name,
    avatar:   el.dataset.avatar
  };
  /* Show chip */
  var chips = document.getElementById('nmChips');
  if (chips) {
    chips.querySelectorAll('.nm-chip').forEach(function(c) { c.remove(); });
    var chip = document.createElement('div');
    chip.className = 'nm-chip';
    chip.innerHTML = '<span>' + msgEsc(_nmSelected.name) + '</span>' +
      '<button onclick="nmClearUser()" style="background:none;border:none;cursor:pointer;color:inherit;padding:0 0 0 4px;font-size:12px;">×</button>';
    chips.insertBefore(chip, document.getElementById('nmSearchInput'));
  }
  var inp = document.getElementById('nmSearchInput');
  if (inp) { inp.value = ''; }
  var resList = document.getElementById('nmResultsList');
  if (resList) resList.innerHTML = '';
  var sendBtn2 = document.getElementById('nmSendBtn');
  if (sendBtn2) sendBtn2.disabled = false;
};

window.nmClearUser = function() {
  _nmSelected = null;
  var chips = document.getElementById('nmChips');
  if (chips) chips.querySelectorAll('.nm-chip').forEach(function(c) { c.remove(); });
  var sendBtn2 = document.getElementById('nmSendBtn');
  if (sendBtn2) sendBtn2.disabled = true;
};

/* Send from modal */
var nmSendBtn = document.getElementById('nmSendBtn');
if (nmSendBtn) {
  nmSendBtn.addEventListener('click', async function() {
    if (!_nmSelected) return;
    var body = (document.getElementById('nmComposeInput').value || '').trim();
    if (!body) {
      if (typeof showToast === 'function') showToast('Please write a message', 'error');
      return;
    }
    nmSendBtn.disabled = true;
    try {
      var res = await fetch('/api/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ to: _nmSelected.username, body: body })
      });
      if (!res.ok) throw new Error('send failed');
      closeNM();
      /* Auto-open the conversation we just started */
      await loadConversations();
      var item = document.querySelector('.msg-conv-item[data-username="' + _nmSelected.username + '"]');
      if (item) item.click();
    } catch (e) {
      if (typeof showToast === 'function') showToast('Failed to send', 'error');
      nmSendBtn.disabled = false;
    }
  });
}

/* ══════════════════════════════════════════════════════════
   8.  UNREAD BADGE  (works on every page)
   Flask: GET /api/messages/unread_count
══════════════════════════════════════════════════════════ */
async function updateMsgBadge() {
  try {
    var res  = await fetch('/api/messages/unread_count');
    var data = await res.json();
    var badge = document.getElementById('nav-msg-badge');
    if (!badge) return;
    var count = data.count || 0;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.add('visible');
    } else {
      badge.classList.remove('visible');
    }
  } catch (e) { /* silent */ }
}

/* ══════════════════════════════════════════════════════════
   9.  NAV DROPDOWN MINI-PREVIEW
   Flask: GET /api/messages/conversations
══════════════════════════════════════════════════════════ */
function initMsgNavDropdown() {
  var wrap = document.getElementById('nav-msg-wrap');
  var btn  = document.getElementById('nav-msg-btn');
  var dd   = document.getElementById('nav-msg-dropdown') || document.getElementById('msg-nav-dropdown');
  var list = document.getElementById('nav-msg-dd-list')  || document.getElementById('msg-nav-dd-list');
  if (!wrap || !btn || !dd) return;

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    dd.classList.toggle('open');
    if (dd.classList.contains('open')) _loadNavDropdownConvs();
  });

  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target)) dd.classList.remove('open');
  });

  async function _loadNavDropdownConvs() {
    if (!list) return;
    list.innerHTML = '<div class="msg-nav-dd-empty"><i class="fa-solid fa-spinner fa-spin"></i></div>';
    try {
      var res   = await fetch('/api/messages/conversations');
      var convs = await res.json();
      if (!convs || !convs.length) {
        list.innerHTML = '<div class="msg-nav-dd-empty">No conversations yet.</div>';
        return;
      }
      list.innerHTML = convs.slice(0, 6).map(function(c) {
        var isUnread = (c.unread_count || 0) > 0;
        var name = ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || c.username;
        var ava  = c.profile_picture
          ? '<img src="' + msgEsc(c.profile_picture) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">'
          : msgEsc(((c.first_name || '?')[0] + (c.last_name || '')[0]).toUpperCase());
        return (
          '<a class="msg-nav-dd-item" href="/messages?with=' + msgEsc(c.username) + '">' +
            '<div class="msg-nav-dd-ava">' + ava +
              '<div class="msg-online-indicator"></div>' +
            '</div>' +
            '<div class="msg-nav-dd-info">' +
              '<div class="msg-nav-dd-name">' + msgEsc(name) + '</div>' +
              '<div class="msg-nav-dd-preview' + (isUnread ? ' unread' : '') + '">' +
                msgEsc((c.last_message || '').substring(0, 40)) +
              '</div>' +
            '</div>' +
            '<div class="msg-nav-dd-meta">' +
              '<div class="msg-nav-dd-time">' + msgAgo(c.last_at) + '</div>' +
              '<div class="msg-nav-dd-unread-dot' + (isUnread ? ' show' : '') + '"></div>' +
            '</div>' +
          '</a>'
        );
      }).join('');
    } catch (e) {
      list.innerHTML = '<div class="msg-nav-dd-empty">Failed to load.</div>';
    }
  }
}

/* ══════════════════════════════════════════════════════════
   10. INIT
══════════════════════════════════════════════════════════ */

/* Full messages page */
if (document.getElementById('convList')) {
  loadConversations();

  /* Auto-open conversation from URL ?with=username */
  var urlParams   = new URLSearchParams(window.location.search);
  var withUser    = urlParams.get('with');
  if (withUser) {
    setTimeout(async function() {
      await loadConversations();
      var target = document.querySelector('.msg-conv-item[data-username="' + withUser + '"]');
      if (target) target.click();
    }, 400);
  }

  /* Refresh conv list every 5 s to catch new conversations */
  setInterval(loadConversations, 5000);
}

/* Nav dropdown + badge on ALL pages */
initMsgNavDropdown();
updateMsgBadge();
setInterval(updateMsgBadge, 10000);