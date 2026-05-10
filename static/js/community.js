/* ── StudyHub · Community Page ── */
'use strict';

var currentFilter = 'all', currentTopic = 'all';

function getTopicClass(t) {
  return { General:'topic-general', Math:'topic-math', Science:'topic-science', Notes:'topic-notes', 'Help Needed':'topic-help' }[t] || 'topic-general';
}

/* ── RENDER POSTS ── */
function renderPosts(posts) {
  var c = document.getElementById('posts-container');
  if (!posts || !posts.length) {
    c.innerHTML = '<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-inbox empty-icon-fa"></i><div>No posts yet</div><div class="empty-sub">Be the first to share something!</div></div>';
    return;
  }
  c.innerHTML = posts.map(function(p) {
    var av = p.profile_picture
      ? '<img src="' + p.profile_picture + '" class="post-avatar">'
      : '<div class="post-avatar-initials">' + (p.first_name ? p.first_name[0] : 'U') + (p.last_name ? p.last_name[0] : '') + ' </div>';
    return '<div class="post-card" data-post-id="' + p.id + '">' +
      '<div class="post-header">' + av +
      '<div class="post-meta">' +
      '<div class="post-author" onclick="viewUserProfile(\'' + p.username + '\')" style="cursor:pointer;">' + escapeHtml(p.first_name + ' ' + p.last_name) + '</div>' +
      '<div class="post-handle">@<span onclick="viewUserProfile(\'' + p.username + '\')" style="cursor:pointer;">' + p.username + '</span> · <span class="post-time">' + formatTimeAgo(p.created_at) + '</span></div>' +
      '</div><div class="post-topic-badge ' + getTopicClass(p.topic) + '">' + p.topic + '</div></div>' +
      '<div class="post-title">' + escapeHtml(p.title) + '</div>' +
      '<div class="post-body">' + escapeHtml(p.body) + '</div>' +
      '<div class="post-actions">' +
      '<button class="post-action-btn ' + (p.user_liked ? 'liked' : '') + '" onclick="toggleLike(' + p.id + ')">' +
      '<i class="' + (p.user_liked ? 'fa-solid' : 'fa-regular') + ' fa-heart"></i>' +
      '<span id="likes-' + p.id + '">' + (p.like_count || 0) + '</span></button>' +
      '<button class="post-action-btn" onclick="toggleComments(' + p.id + ')">' +
      '<i class="fa-regular fa-comment"></i><span id="comments-' + p.id + '">' + (p.comment_count || 0) + '</span></button>' +
      '<button class="post-action-btn" onclick="sendMessage(\'' + p.username + '\')">' +
      '<i class="fa-regular fa-envelope"></i></button></div>' +
      '<div class="comments-section" id="comments-section-' + p.id + '">' +
      '<div class="comment-input-wrap">' +
      '<input class="comment-input" id="comment-input-' + p.id + '" placeholder="Write a comment…" onkeydown="if(event.key===\'Enter\')submitComment(' + p.id + ')">' +
      '<button class="comment-submit" onclick="submitComment(' + p.id + ')">Reply</button></div>' +
      '<div class="comments-list" id="comments-list-' + p.id + '"></div></div></div>';
  }).join('');
}

/* ── LOAD POSTS ── */
async function loadPosts() {
  var c = document.getElementById('posts-container');
  c.innerHTML = '<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-spinner fa-spin empty-icon-fa"></i><div>Loading posts…</div></div>';
  try {
    var url = '/api/posts?filter=' + currentFilter;
    if (currentTopic && currentTopic !== 'all') url += '&topic=' + encodeURIComponent(currentTopic);
    var res = await fetch(url);
    var posts = await res.json();
    if (currentFilter === 'trending') {
      posts = posts.slice().sort(function(a, b) {
        return ((b.like_count||0)*2 + (b.comment_count||0)) - ((a.like_count||0)*2 + (a.comment_count||0));
      });
    }
    renderPosts(posts);
  } catch(_) {
    c.innerHTML = '<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-triangle-exclamation empty-icon-fa"></i><div>Failed to load posts</div></div>';
  }
}

/* ── LIKE ── */
window.toggleLike = async function(postId) {
  try {
    var res  = await fetch('/api/posts/' + postId + '/like', { method: 'POST' });
    var data = await res.json();
    var btn  = document.querySelector('.post-card[data-post-id="' + postId + '"] .post-action-btn:first-child');
    if (!btn) return;
    var icon  = btn.querySelector('i');
    var count = document.getElementById('likes-' + postId);
    btn.classList.toggle('liked', data.liked);
    icon.className = data.liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
    if (count) count.textContent = data.count;
    if (data.liked) showToast('Post liked!', 'success');
  } catch(_) { showToast('Failed to like post', 'error'); }
};

/* ── COMMENTS ── */
window.toggleComments = async function(postId) {
  var section = document.getElementById('comments-section-' + postId);
  section.classList.toggle('open');
  if (!section.classList.contains('open')) return;
  var list = document.getElementById('comments-list-' + postId);
  list.innerHTML = '<div style="color:var(--txt-muted);font-size:12px;padding:8px 0">Loading…</div>';
  try {
    var res = await fetch('/api/posts/' + postId + '/comments');
    var comments = await res.json();
    if (!comments.length) {
      list.innerHTML = '<div style="color:var(--txt-dim);font-size:12px;padding:8px 0">No comments yet. Be the first!</div>';
    } else {
      list.innerHTML = comments.map(function(c) {
        var av = c.profile_picture
          ? '<img src="' + c.profile_picture + '" class="comment-avatar">'
          : '<div class="comment-initials">' + (c.first_name ? c.first_name[0] : 'U') + (c.last_name ? c.last_name[0] : '') + ' </div>';
        return '<div class="comment-item">' + av +
          '<div class="comment-content"><div class="comment-author">' + escapeHtml(c.first_name + ' ' + c.last_name) + '</div>' +
          '<div class="comment-text">' + escapeHtml(c.body) + '</div>' +
          '<div class="comment-time">' + formatTimeAgo(c.created_at) + '</div></div></div>';
      }).join('');
    }
  } catch(_) { list.innerHTML = '<div style="color:var(--txt-muted);font-size:12px;padding:8px 0">Failed to load</div>'; }
};

window.submitComment = async function(postId) {
  var input = document.getElementById('comment-input-' + postId);
  var body  = input.value.trim(); if (!body) return;
  try {
    var res = await fetch('/api/posts/' + postId + '/comments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: body })
    });
    if (res.ok) {
      input.value = '';
      var count = document.getElementById('comments-' + postId);
      if (count) count.textContent = parseInt(count.textContent) + 1;
      showToast('Comment added!', 'success');
      document.getElementById('comments-section-' + postId).classList.remove('open');
      toggleComments(postId);
    } else { showToast('Failed to add comment', 'error'); }
  } catch(_) { showToast('Failed to add comment', 'error'); }
};

/* ── LEADERBOARD ── */
async function loadLeaderboard() {
  var list = document.getElementById('leaderboard-list'); if (!list) return;
  try {
    var res = await fetch('/api/leaderboard'); var users = await res.json();
    if (!users || !users.length) { list.innerHTML = '<div style="color:var(--txt-muted);font-size:12px;padding:12px 16px;">No data yet</div>'; return; }
    list.innerHTML = users.map(function(u, i) {
      var av = u.profile_picture
        ? '<img src="' + u.profile_picture + '" class="leaderboard-avatar">'
        : '<div class="leaderboard-initials">' + (u.first_name ? u.first_name[0] : '') + (u.last_name ? u.last_name[0] : '') + ' </div>';
      return '<div class="leaderboard-item"><div class="leaderboard-rank ' + (i < 3 ? 'top' : '') + '">' + (i+1) + '</div>' +
        av + '<div class="leaderboard-info"><div class="leaderboard-name">' + escapeHtml(u.first_name + ' ' + u.last_name) + '</div>' +
        '<div class="leaderboard-stats">' + (u.post_count||0) + ' posts · ' + (u.like_count||0) + ' likes</div></div>' +
        '<div class="leaderboard-score">' + (u.score||0) + '</div></div>';
    }).join('');
  } catch(_) { list.innerHTML = '<div style="color:var(--txt-muted);font-size:12px;padding:12px 16px;">Failed to load</div>'; }
}

/* ── ONLINE USERS ── */
async function loadOnlineUsers() {
  var list = document.getElementById('online-list'); if (!list) return;
  try {
    var res = await fetch('/api/online'); var users = await res.json();
    if (!users || !users.length) { list.innerHTML = '<div style="color:var(--txt-muted);font-size:12px;padding:12px 16px;">No one online</div>'; return; }
    list.innerHTML = users.map(function(u) {
      var av = u.profile_picture
        ? '<img src="' + u.profile_picture + '" class="online-avatar">'
        : '<div class="online-initials">' + (u.first_name ? u.first_name[0] : '') + (u.last_name ? u.last_name[0] : '') + ' </div>';
      return '<div class="online-item" style="cursor:pointer;" onclick="viewUserProfile(\'' + u.username + '\')">' +
        av + '<div class="online-name">' + escapeHtml(u.first_name + ' ' + u.last_name) + '</div>' +
        '<div class="online-status"></div></div>';
    }).join('');
  } catch(_) {}
}

/* ── POST SUBMIT ── */
document.getElementById('post-submit').addEventListener('click', async function() {
  var title = document.getElementById('post-title').value.trim();
  var body  = document.getElementById('post-body').value.trim();
  var topic = document.getElementById('post-topic').value;
  if (!title || !body) { showToast('Please enter both title and body', 'error'); return; }
  this.disabled = true;
  try {
    var res = await fetch('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title, body: body, topic: topic })
    });
    if (res.ok) {
      document.getElementById('post-title').value = '';
      document.getElementById('post-body').value  = '';
      showToast('Post created!', 'success'); loadPosts();
    } else { showToast('Failed to create post', 'error'); }
  } catch(_) { showToast('Failed to create post', 'error'); }
  this.disabled = false;
});

/* ── FEED TABS ── */
document.querySelectorAll('.feed-tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.feed-tab').forEach(function(t) { t.classList.remove('active'); });
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    loadPosts();
  });
});

/* ── CATEGORY PILLS ── */
document.querySelectorAll('.category-pill').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.category-pill').forEach(function(c) { c.classList.remove('active'); });
    btn.classList.add('active');
    currentTopic = btn.dataset.topic;
    loadPosts();
  });
});

/* ── INIT ── */
loadPosts();
loadLeaderboard();
loadOnlineUsers();
setInterval(loadOnlineUsers, 60000);
