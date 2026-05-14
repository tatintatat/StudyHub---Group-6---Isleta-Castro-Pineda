'use strict';

/* ════════════════════════════════════════
   StudyHub Messages — messages.js
   Handles full messages page + nav dropdown
   ════════════════════════════════════════ */

var currentConvUser = null;   // { username, name, avatar }
var pollInterval    = null;
var lastMsgId       = 0;

/* ── Helpers ── */
function msgEscape(str) {
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function msgTimeAgo(iso) {
  var d = new Date(iso), now = new Date();
  var diff = Math.floor((now - d) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function makeAva(user) {
  if (user.profile_picture)
    return '<img src="' + user.profile_picture + '" alt="">';
  var n = (user.name || user.username || '?');
  var parts = n.split(' ');
  return (parts[0][0] || '') + (parts[1] ? parts[1][0] : '');
}

/* ════════════════════════════════════════
   CONVERSATIONS LIST
   ════════════════════════════════════════ */
async function loadConversations(filter) {
  var list = document.getElementById('msg-conv-list'); if (!list) return;
  try {
    var res  = await fetch('/api/messages/conversations');
    var convs = await res.json();

    if (filter === 'unread') convs = convs.filter(function(c) { return c.unread_count > 0; });

    if (!convs || !convs.length) {
      list.innerHTML = '<div style="padding:24px 16px;text-align:center;font-size:13px;color:var(--txt-muted);">No conversations yet.<br>Send the first message!</div>';
      return;
    }

    list.innerHTML = convs.map(function(c) {
      var isUnread = c.unread_count > 0;
      var ava = c.profile_picture
        ? '<img src="' + c.profile_picture + '" alt="">'
        : (((c.first_name || '?')[0]) + ((c.last_name || '')[0]));
      var name = msgEscape((c.first_name || '') + ' ' + (c.last_name || '')) || c.username;
      var preview = msgEscape((c.last_message || '').substring(0, 50));
      return '<div class="msg-conv-item" data-username="' + c.username + '" data-name="' + name + '" onclick="openConversation(this)">' +
        '<div class="msg-conv-ava">' + ava +
          '<div class="msg-conv-online"></div>' +
        '</div>' +
        '<div class="msg-conv-info">' +
          '<div class="msg-conv-name' + (isUnread ? ' unread' : '') + '">' + name + '</div>' +
          '<div class="msg-conv-preview' + (isUnread ? ' unread' : '') + '">' + preview + '</div>' +
        '</div>' +
        '<div class="msg-conv-meta">' +
          '<div class="msg-conv-time">' + (c.last_at ? msgTimeAgo(c.last_at) : '') + '</div>' +
          '<div class="msg-conv-unread' + (isUnread ? ' show' : '') + '"></div>' +
        '</div>' +
        '</div>';
    }).join('');
  } catch(e) {
    var list2 = document.getElementById('msg-conv-list');
    if (list2) list2.innerHTML = '<div style="padding:16px;color:var(--txt-muted);font-size:13px;">Failed to load conversations.</div>';
  }
}

/* ════════════════════════════════════════
   OPEN A CONVERSATION
   ════════════════════════════════════════ */
window.openConversation = function(el) {
  /* Mark active in sidebar */
  document.querySelectorAll('.msg-conv-item').forEach(function(i) { i.classList.remove('active'); });
  el.classList.add('active');

  var username = el.dataset.username;
  var name     = el.dataset.name;
  currentConvUser = { username: username, name: name };

  /* Show chat inner, hide empty */
  document.getElementById('msg-empty-chat').style.display  = 'none';
  document.getElementById('msg-chat-inner').style.display  = 'flex';

  /* Mobile: slide chat area in */
  document.getElementById('msg-chat-area').classList.add('mobile-open');

  /* Populate header */
  document.getElementById('chat-header-name').textContent = name;
  var avaEl = document.getElementById('msg-chat-header').querySelector('.msg-chat-header-ava');
  if (avaEl) avaEl.textContent = name[0] || '?';

  /* Clear interval then reload */
  clearInterval(pollInterval);
  lastMsgId = 0;
  loadMessages(username, true);
  pollInterval = setInterval(function() { loadMessages(username, false); }, 3000);
};

/* Mobile back */
window.closeChatMobile = function() {
  document.getElementById('msg-chat-area').classList.remove('mobile-open');
  clearInterval(pollInterval);
};

/* ════════════════════════════════════════
   LOAD MESSAGES (with polling)
   ════════════════════════════════════════ */
async function loadMessages(username, fullReload) {
  var bubblesEl = document.getElementById('msg-bubbles'); if (!bubblesEl) return;
  try {
    var url = '/api/messages/conversation/' + encodeURIComponent(username);
    if (!fullReload && lastMsgId) url += '?after=' + lastMsgId;
    var res      = await fetch(url);
    var messages = await res.json();
    if (!messages || !messages.length) {
      if (fullReload) bubblesEl.innerHTML = '<div style="padding:40px 0;text-align:center;font-size:13px;color:var(--txt-muted);">No messages yet. Say hello! 👋</div>';
      return;
    }
    if (fullReload) bubblesEl.innerHTML = '';
    var me = (window.STUDYHUB_USER || {}).username || '';
    var prev = null;
    messages.forEach(function(m, i) {
      var isSent = (m.sender_username === me);
      var sameAsPrev = prev && prev.sender_username === m.sender_username;
      var next = messages[i + 1];
      var sameAsNext = next && next.sender_username === m.sender_username;

      var row = document.createElement('div');
      row.className = 'msg-bubble-row' + (isSent ? ' sent' : '') +
        (!sameAsPrev ? ' first-in-group' : '') +
        (!sameAsNext ? ' last-in-group' : '');

      var ava = sameAsNext
        ? '<div class="msg-bubble-row-ava invisible"></div>'
        : '<div class="msg-bubble-row-ava">' + (m.sender_first_name ? m.sender_first_name[0] : '?') + (m.sender_last_name ? m.sender_last_name[0] : '') + '</div>';

      row.innerHTML =
        (isSent ? '' : ava) +
        '<div class="msg-bubble ' + (isSent ? 'sent' : 'received') + '">' +
          msgEscape(m.content) +
          '<div class="msg-bubble-time">' + msgTimeAgo(m.created_at) + '</div>' +
        '</div>' +
        (isSent ? ava : '');

      bubblesEl.appendChild(row);
      if (m.id > lastMsgId) lastMsgId = m.id;
      prev = m;
    });
    bubblesEl.scrollTop = bubblesEl.scrollHeight;
  } catch(e) { /* silent fail on poll */ }
}

/* ════════════════════════════════════════
   SEND MESSAGE
   ════════════════════════════════════════ */
window.sendMessage = async function() {
  if (!currentConvUser) return;
  var input = document.getElementById('msg-text-input');
  var content = (input.value || '').trim();
  if (!content) return;
  input.value = '';

  /* Optimistic bubble */
  var bubblesEl = document.getElementById('msg-bubbles');
  var row = document.createElement('div');
  row.className = 'msg-bubble-row sent last-in-group';
  row.innerHTML = '<div class="msg-bubble-row-ava invisible"></div><div class="msg-bubble sent">' + msgEscape(content) + '</div>';
  if (bubblesEl) { bubblesEl.appendChild(row); bubblesEl.scrollTop = bubblesEl.scrollHeight; }

  try {
    await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_username: currentConvUser.username, content: content })
    });
    loadConversations(currentFilter);
  } catch(e) { showToast('Failed to send message', 'error'); }
};

/* ════════════════════════════════════════
   NEW MESSAGE MODAL
   ════════════════════════════════════════ */
window.openNewMessageModal = function() {
  var overlay = document.getElementById('new-msg-modal');
  if (overlay) { overlay.classList.add('active'); document.getElementById('new-msg-username').focus(); }
};
window.closeNewMessageModal = function() {
  var overlay = document.getElementById('new-msg-modal');
  if (overlay) overlay.classList.remove('active');
};

window.sendNewMessage = async function() {
  var username = (document.getElementById('new-msg-username').value || '').trim().toLowerCase();
  var content  = (document.getElementById('new-msg-body').value || '').trim();
  if (!username) { showToast('Please enter a username', 'error'); return; }
  if (!content)  { showToast('Please enter a message', 'error'); return; }
  try {
    var res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_username: username, content: content })
    });
    if (res.ok) {
      showToast('Message sent!', 'success');
      closeNewMessageModal();
      document.getElementById('new-msg-username').value = '';
      document.getElementById('new-msg-body').value = '';
      loadConversations(currentFilter);
    } else {
      var d = await res.json().catch(function() { return {}; });
      showToast(d.error || 'Failed to send message', 'error');
    }
  } catch(e) { showToast('Network error', 'error'); }
};

/* ════════════════════════════════════════
   FILTER TABS
   ════════════════════════════════════════ */
var currentFilter = 'all';
document.querySelectorAll('.msg-filter-tab').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.msg-filter-tab').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    loadConversations(currentFilter);
  });
});

/* Search */
var searchInput = document.getElementById('msg-search');
if (searchInput) {
  searchInput.addEventListener('input', function() {
    var q = this.value.toLowerCase();
    document.querySelectorAll('.msg-conv-item').forEach(function(item) {
      var name = (item.dataset.name || '').toLowerCase();
      item.style.display = name.includes(q) ? '' : 'none';
    });
  });
}

/* ════════════════════════════════════════
   NAV DROPDOWN (included on ALL pages)
   ════════════════════════════════════════ */
window.initMsgNavDropdown = function() {
  var wrap = document.getElementById('nav-msg-wrap');
  var btn  = document.getElementById('nav-msg-btn');
  var dd   = document.getElementById('nav-msg-dropdown');
  var list = document.getElementById('nav-msg-dd-list');
  if (!wrap || !btn || !dd) return;

  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    dd.classList.toggle('open');
    wrap.classList.toggle('open');
    if (dd.classList.contains('open')) loadNavDropdownConvs();
  });

  document.addEventListener('click', function(e) {
    if (!wrap.contains(e.target)) { dd.classList.remove('open'); wrap.classList.remove('open'); }
  });

  async function loadNavDropdownConvs() {
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
        var isUnread = c.unread_count > 0;
        var name = ((c.first_name || '') + ' ' + (c.last_name || '')).trim() || c.username;
        var ava = c.profile_picture
          ? '<img src="' + c.profile_picture + '" alt="">'
          : ((c.first_name || '?')[0] + (c.last_name ? c.last_name[0] : ''));
        return '<a class="msg-nav-dd-item" href="/messages?with=' + c.username + '">' +
          '<div class="msg-nav-dd-ava">' + ava + '<div class="msg-online-indicator"></div></div>' +
          '<div class="msg-nav-dd-info">' +
            '<div class="msg-nav-dd-name">' + msgEscape(name) + '</div>' +
            '<div class="msg-nav-dd-preview' + (isUnread ? ' unread' : '') + '">' +
              msgEscape((c.last_message || '').substring(0, 40)) +
            '</div>' +
          '</div>' +
          '<div class="msg-nav-dd-meta">' +
            '<div class="msg-nav-dd-time">' + (c.last_at ? msgTimeAgo(c.last_at) : '') + '</div>' +
            '<div class="msg-nav-dd-unread-dot' + (isUnread ? ' show' : '') + '"></div>' +
          '</div></a>';
      }).join('');
    } catch(e) {
      list.innerHTML = '<div class="msg-nav-dd-empty">Failed to load.</div>';
    }
  }
};

/* ════════════════════════════════════════
   UNREAD BADGE (update on all pages)
   ════════════════════════════════════════ */
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
  } catch(e) { /* silent */ }
}

/* ════════════════════════════════════════
   INIT
   ════════════════════════════════════════ */
/* Full messages page */
if (document.getElementById('msg-conv-list')) {
  loadConversations('all');

  /* If URL has ?with=username, auto-open that conversation */
  var params = new URLSearchParams(window.location.search);
  var withUser = params.get('with');
  if (withUser) {
    setTimeout(function() {
      var target = document.querySelector('[data-username="' + withUser + '"]');
      if (target) target.click();
    }, 600);
  }
}

/* Nav dropdown (runs on every page that includes messages.js — or call from nav.js) */
initMsgNavDropdown();
updateMsgBadge();
setInterval(updateMsgBadge, 15000);