/* ── StudyHub · Community Page ── */
'use strict';

/* ══ STATE ══════════════════════════════════════════════ */
var currentFilter = 'all';
var currentTopic  = 'all';
var _upm = { username: null, isFollowing: false };
var _dm  = { username: null, name: '', initials: 'U', avatar: '', sending: false };

/* ══ HELPERS ════════════════════════════════════════════ */
function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _ago(d) {
  if (!d) return '';
  // handles: ISO string, Unix ms number, or seconds_ago integer
  var ms = typeof d === 'string' ? new Date(d).getTime() : Number(d);
  var s  = Math.floor((Date.now() - ms) / 1000);
  if (s < 5)    return 'just now';
  if (s < 60)   return s + 's ago';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}
function _secsAgo(s) {
  s = parseInt(s) || 0;
  if (s < 5)     return 'just now';
  if (s < 60)    return s + 's ago';
  if (s < 3600)  return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}
function _initials(f,l){ return ((f||'U')[0]+(l||'')[0]).toUpperCase(); }
function _friendlyDate(d) {
  if (!d) return '';
  var dt=new Date(d), diff=Math.floor((new Date()-dt)/86400000);
  if (diff===0) return 'Today';
  if (diff===1) return 'Yesterday';
  return dt.toLocaleDateString('en-US',{month:'long',day:'numeric'});
}
function _dateKey(d){ return d?new Date(d).toDateString():''; }
function getTopicClass(t){
  return {General:'topic-general',Math:'topic-math',Science:'topic-science',
    Notes:'topic-notes','Help Needed':'topic-help'}[t]||'topic-general';
}

/* ══ FEED — RENDER ══════════════════════════════════════ */
function renderPosts(posts) {
  var c = document.getElementById('posts-container');
  if (!posts||!posts.length) {
    c.innerHTML='<div class="empty-state" style="padding:3rem 0">'+
      '<i class="fa-solid fa-inbox empty-icon-fa"></i><div>No posts yet</div>'+
      '<div class="empty-sub">Be the first to share something!</div></div>';
    return;
  }
  c.innerHTML = posts.map(function(p){
    var av = p.profile_picture
      ? '<img src="'+_esc(p.profile_picture)+'" class="post-avatar">'
      : '<div class="post-avatar-initials">'+_initials(p.first_name,p.last_name)+'</div>';
    return '<div class="post-card" data-post-id="'+p.id+'">'+
      '<div class="post-header">'+av+
        '<div class="post-meta">'+
          '<div class="post-author" onclick="viewUserProfile(\''+_esc(p.username)+'\')" style="cursor:pointer;">'+
            _esc((p.first_name||'')+' '+(p.last_name||''))+'</div>'+
          '<div class="post-handle">@<span onclick="viewUserProfile(\''+_esc(p.username)+'\')" style="cursor:pointer;">'+
            _esc(p.username)+'</span></div>'+
        '</div>'+
        '<div class="post-topic-badge '+getTopicClass(p.topic)+'">'+_esc(p.topic)+'</div>'+
      '</div>'+
      '<div class="post-title">'+_esc(p.title)+'</div>'+
      '<div class="post-body">'+_esc(p.body)+'</div>'+
      '<div class="post-actions">'+
        '<button class="post-action-btn '+(p.user_liked?'liked':'')+'" onclick="toggleLike('+p.id+')">'+
          '<i class="'+(p.user_liked?'fa-solid':'fa-regular')+' fa-heart"></i>'+
          '<span id="likes-'+p.id+'">'+(p.like_count||0)+'</span></button>'+
        '<button class="post-action-btn" onclick="toggleComments('+p.id+')">'+
          '<i class="fa-regular fa-comment"></i>'+
          '<span id="comments-'+p.id+'">'+(p.comment_count||0)+'</span></button>'+
        '<button class="post-action-btn" onclick="sendMessage(\''+_esc(p.username)+'\')" title="Message">'+
          '<i class="fa-regular fa-envelope"></i></button>'+
        (window.STUDYHUB_USER && String(window.STUDYHUB_USER.id)===String(p.user_id)
          ? '<button class="post-action-btn post-delete-btn" onclick="deletePost('+p.id+', this)" title="Delete post" style="margin-left:auto;color:var(--a-rose,#f87171);">'+
            '<i class="fa-regular fa-trash-can"></i></button>' : '')+
        (window.STUDYHUB_USER && String(window.STUDYHUB_USER.id)!==String(p.user_id)
          ? '<button class="post-action-btn" onclick="openReportModal(\'post\','+p.id+')" title="Report post" style="color:var(--txt-muted);">'+
            '<i class="fa-solid fa-flag"></i></button>' : '')+
      '</div>'+
      '<div class="comments-section" id="comments-section-'+p.id+'">'+
        '<div class="comment-input-wrap">'+
          '<input class="comment-input" id="comment-input-'+p.id+'" placeholder="Write a comment\u2026" '+
            'onkeydown="if(event.key===\'Enter\')submitComment('+p.id+')">'+
          '<button class="comment-submit" onclick="submitComment('+p.id+')">Reply</button></div>'+
        '<div class="comments-list" id="comments-list-'+p.id+'"></div>'+
      '</div></div>';
  }).join('');
}

/* ══ FEED — LOAD DATA ═══════════════════════════════════ */
async function loadPosts() {
  var c = document.getElementById('posts-container');
  c.innerHTML='<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-spinner fa-spin empty-icon-fa"></i><div>Loading posts\u2026</div></div>';
  try {
    var url='/api/posts?filter='+currentFilter;
    if (currentTopic&&currentTopic!=='all') url+='&topic='+encodeURIComponent(currentTopic);
    var posts=await (await fetch(url)).json();
    if (currentFilter==='trending') posts=posts.slice().sort(function(a,b){
      return ((b.like_count||0)*2+(b.comment_count||0))-((a.like_count||0)*2+(a.comment_count||0));
    });
    renderPosts(posts);
  } catch(_) {
    c.innerHTML='<div class="empty-state" style="padding:3rem 0"><i class="fa-solid fa-triangle-exclamation empty-icon-fa"></i><div>Failed to load posts</div></div>';
  }
}

async function loadLeaderboard() {
  var el=document.getElementById('leaderboard-list'); if(!el) return;
  try {
    var users=await (await fetch('/api/leaderboard')).json();
    if (!users||!users.length){el.innerHTML='<div style="color:var(--txt-muted);font-size:12px;padding:12px 16px;">No data yet</div>';return;}
    el.innerHTML=users.map(function(u,i){
      var av=u.profile_picture?'<img src="'+_esc(u.profile_picture)+'" class="leaderboard-avatar">':'<div class="leaderboard-initials">'+_initials(u.first_name,u.last_name)+'</div>';
      return '<div class="leaderboard-item" style="cursor:pointer;" onclick="viewUserProfile(\''+_esc(u.username)+'\')">'+
        '<div class="leaderboard-rank '+(i<3?'top':'')+'">'+( i+1)+'</div>'+av+
        '<div class="leaderboard-info"><div class="leaderboard-name">'+_esc((u.first_name||'')+' '+(u.last_name||''))+'</div>'+
        '<div class="leaderboard-stats">'+(u.post_count||0)+' posts \u00b7 '+(u.like_count||0)+' likes</div></div>'+
        '<div class="leaderboard-score">'+(u.score||0)+'</div></div>';
    }).join('');
  } catch(_){el.innerHTML='<div style="color:var(--txt-muted);font-size:12px;padding:12px 16px;">Failed to load</div>';}
}

async function loadOnlineUsers() {
  var el=document.getElementById('online-list'); if(!el) return;
  try {
    var users=await (await fetch('/api/online')).json();
    if (!users||!users.length){el.innerHTML='<div style="color:var(--txt-muted);font-size:12px;padding:12px 16px;">No one online</div>';return;}
    el.innerHTML=users.map(function(u){
      var av=u.profile_picture?'<img src="'+_esc(u.profile_picture)+'" class="online-avatar">':'<div class="online-initials">'+_initials(u.first_name,u.last_name)+'</div>';
      return '<div class="online-item" style="cursor:pointer;" onclick="viewUserProfile(\''+_esc(u.username)+'\')">'+av+
        '<div class="online-name">'+_esc((u.first_name||'')+' '+(u.last_name||''))+'</div>'+
        '<div class="online-status"></div></div>';
    }).join('');
  } catch(_){}
}

/* ══ LIKES & COMMENTS ═══════════════════════════════════ */
window.toggleLike = async function(id) {
  try {
    var d=await (await fetch('/api/posts/'+id+'/like',{method:'POST'})).json();
    var btn=document.querySelector('.post-card[data-post-id="'+id+'"] .post-action-btn:first-child');
    if (!btn) return;
    btn.classList.toggle('liked',d.liked);
    btn.querySelector('i').className=d.liked?'fa-solid fa-heart':'fa-regular fa-heart';
    var c=document.getElementById('likes-'+id); if(c) c.textContent=d.count;
    if (d.liked) showToast('Post liked!','success');
  } catch(_){showToast('Failed to like post','error');}
};

window.toggleComments = async function(id) {
  var sec=document.getElementById('comments-section-'+id);
  sec.classList.toggle('open');
  if (!sec.classList.contains('open')) return;
  var list=document.getElementById('comments-list-'+id);
  list.innerHTML='<div style="color:var(--txt-muted);font-size:12px;padding:8px 0">Loading\u2026</div>';
  try {
    var arr=await (await fetch('/api/posts/'+id+'/comments')).json();
    if (!arr.length){list.innerHTML='<div style="color:var(--txt-dim);font-size:12px;padding:8px 0">No comments yet. Be the first!</div>';return;}
    list.innerHTML=arr.map(function(c){
      var av=c.profile_picture?'<img src="'+_esc(c.profile_picture)+'" class="comment-avatar">':'<div class="comment-initials">'+_initials(c.first_name,c.last_name)+'</div>';
      var isMyComment = window.STUDYHUB_USER && String(window.STUDYHUB_USER.id)===String(c.user_id);
      return '<div class="comment-item">'+av+'<div class="comment-content"><div class="comment-author">'+_esc((c.first_name||'')+' '+(c.last_name||''))+'</div>'+
        '<div class="comment-text">'+_esc(c.body)+'</div></div>'+
        (!isMyComment ? '<button class="comment-report-btn" onclick="openReportModal(\'comment\','+c.id+')" title="Report reply"><i class="fa-solid fa-flag"></i></button>' : '')+
        '</div>';
    }).join('');
  } catch(_){list.innerHTML='<div style="color:var(--txt-muted);font-size:12px;padding:8px 0">Failed to load</div>';}
};

window.submitComment = async function(id) {
  var input=document.getElementById('comment-input-'+id), body=input.value.trim(); if(!body) return;
  try {
    var res=await fetch('/api/posts/'+id+'/comments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({body:body})});
    if (res.ok){
      input.value='';
      var c=document.getElementById('comments-'+id); if(c) c.textContent=parseInt(c.textContent)+1;
      showToast('Comment added!','success');
      document.getElementById('comments-section-'+id).classList.remove('open');
      toggleComments(id);
    } else showToast('Failed to add comment','error');
  } catch(_){showToast('Failed to add comment','error');}
};

/* ══ POST SUBMIT / TABS / PILLS ═════════════════════════ */
document.getElementById('post-submit').addEventListener('click', async function() {
  var title=document.getElementById('post-title').value.trim();
  var body=document.getElementById('post-body').value.trim();
  var topic=document.getElementById('post-topic').value;
  if (!title||!body){showToast('Please enter both title and body','error');return;}
  this.disabled=true;
  try {
    var res=await fetch('/api/posts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,body,topic})});
    if (res.ok){
      document.getElementById('post-title').value='';
      document.getElementById('post-body').value='';
      showToast('Post created!','success'); loadPosts();
    } else showToast('Failed to create post','error');
  } catch(_){showToast('Failed to create post','error');}
  this.disabled=false;
});

document.querySelectorAll('.feed-tab').forEach(function(t){
  t.addEventListener('click',function(){
    document.querySelectorAll('.feed-tab').forEach(function(x){x.classList.remove('active');});
    t.classList.add('active'); currentFilter=t.dataset.filter; loadPosts();
  });
});

document.querySelectorAll('.category-pill').forEach(function(b){
  b.addEventListener('click',function(){
    document.querySelectorAll('.category-pill').forEach(function(x){x.classList.remove('active');});
    b.classList.add('active'); currentTopic=b.dataset.topic; loadPosts();
  });
});

/* ══ DELETE POST ════════════════════════════════════════ */
window.deletePost = async function(id, btn) {
  if (!confirm('Delete this post? This cannot be undone.')) return;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
  try {
    var res = await fetch('/api/posts/'+id, { method: 'DELETE' });
    if (res.ok) {
      var card = document.querySelector('.post-card[data-post-id="'+id+'"]');
      if (card) {
        card.style.transition = 'opacity 0.3s, transform 0.3s';
        card.style.opacity = '0';
        card.style.transform = 'scale(0.97)';
        setTimeout(function() { card.remove(); }, 300);
      }
      showToast('Post deleted.', 'success');
    } else {
      showToast('Failed to delete post.', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
    }
  } catch(e) {
    showToast('Failed to delete post.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-regular fa-trash-can"></i>';
  }
};

/* ══ INIT ═══════════════════════════════════════════════ */
loadPosts(); loadLeaderboard(); loadOnlineUsers();
setInterval(loadOnlineUsers, 20000);

/* ══════════════════════════════════════════════════════════
   USER PROFILE POPUP MODAL
══════════════════════════════════════════════════════════ */
window.viewUserProfile = async function(username) {
  if (!username) return;
  if (window.STUDYHUB_USER && window.STUDYHUB_USER.username===username) {
    window.location.href='/profile'; return;
  }
  _upm.username=username;
  var overlay=document.getElementById('upm-overlay');
  overlay.classList.add('active');
  document.body.style.overflow='hidden';

  /* Loading placeholders */
  document.getElementById('upm-name').textContent='Loading\u2026';
  document.getElementById('upm-handle').textContent='@'+username;
  document.getElementById('upm-ava').innerHTML=_esc(username[0].toUpperCase());
  ['upm-posts-count','upm-followers-count','upm-following-count','upm-likes-count']
    .forEach(function(id){document.getElementById(id).textContent='\u2014';});
  document.getElementById('upm-posts-list').innerHTML=
    '<div class="empty-state" style="padding:2rem 0"><i class="fa-solid fa-spinner fa-spin empty-icon-fa"></i><div>Loading\u2026</div></div>';
  _upmSetTab('posts');

  try {
    var res=await fetch('/api/users/'+encodeURIComponent(username));
    if (!res.ok) throw new Error('Server returned '+res.status);
    var u=await res.json();
    if (u.error) throw new Error(u.error);

    _upm.isFollowing=!!u.is_following;

    /* Avatar */
    var ava=document.getElementById('upm-ava');
    if (u.profile_picture) ava.innerHTML='<img src="'+_esc(u.profile_picture)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
    else ava.textContent=_initials(u.first_name,u.last_name);

    /* Name / handle */
    var full=((u.first_name||'')+' '+(u.last_name||'')).trim()||username;
    document.getElementById('upm-name').textContent=full;
    document.getElementById('upm-handle').textContent='@'+(u.username||username);

    /* Counters */
    document.getElementById('upm-posts-count').textContent    =u.posts_count    ||0;
    document.getElementById('upm-followers-count').textContent=u.followers_count||0;
    document.getElementById('upm-following-count').textContent=u.following_count||0;
    document.getElementById('upm-likes-count').textContent    =u.like_count||u.score||0;
    document.getElementById('upm-tab-post-count').textContent =u.posts_count    ||0;

    /* About */
    document.getElementById('upm-about-username').textContent='@'+(u.username||username);
    document.getElementById('upm-about-joined').textContent=u.created_at
      ? new Date(u.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'}) : '\u2014';
    document.getElementById('upm-about-streak').textContent=(u.streak||0)+' days';
    document.getElementById('upm-about-subject').textContent=u.top_subject||'\u2014';

    /* Buttons */
    _upmRefreshFollowBtn();
    document.getElementById('upm-dm-btn').onclick=function(){
      _closeUpm(); sendMessage(username);
    };

    _renderUpmBadges(u.badges||[]);
    _loadUpmPosts(username);

  } catch(err) {
    document.getElementById('upm-name').textContent='Could not load user';
    document.getElementById('upm-posts-list').innerHTML=
      '<div class="empty-state" style="padding:2rem 0">'+
      '<i class="fa-solid fa-triangle-exclamation empty-icon-fa"></i>'+
      '<div>Failed to load profile</div>'+
      '<div class="empty-sub">'+_esc(err.message)+'</div></div>';
  }
};

async function _loadUpmPosts(username) {
  var list=document.getElementById('upm-posts-list');
  try {
    var posts=await (await fetch('/api/posts?filter=user&user='+encodeURIComponent(username))).json();
    if (!Array.isArray(posts)||!posts.length){
      list.innerHTML='<div class="empty-state" style="padding:2rem 0"><i class="fa-solid fa-inbox empty-icon-fa"></i><div>No posts yet</div></div>';
      return;
    }
    list.innerHTML=posts.map(function(p){
      return '<div class="upm-post-item">'+
        '<div class="upm-post-title">'+_esc(p.title)+'</div>'+
        '<div class="upm-post-body">'+_esc(p.body)+'</div>'+
        '<div class="upm-post-meta">'+
          '<span><i class="fa-regular fa-heart"></i> '+(p.like_count||0)+'</span>'+
          '<span><i class="fa-regular fa-comment"></i> '+(p.comment_count||0)+'</span>'+
        '</div></div>';
    }).join('');
  } catch(_){
    list.innerHTML='<div class="empty-state" style="padding:2rem 0"><i class="fa-solid fa-triangle-exclamation empty-icon-fa"></i><div>Could not load posts</div></div>';
  }
}

function _renderUpmBadges(badges) {
  var def=[
    {emoji:'\uD83C\uDFC6',name:'Top Poster',desc:'50+ posts'},
    {emoji:'\uD83D\uDD25',name:'Streak Master',desc:'7-day streak'},
    {emoji:'\uD83D\uDCA1',name:'Helper',desc:'10+ answers'},
    {emoji:'\uD83D\uDCDA',name:'Scholar',desc:'100h studied'},
    {emoji:'\u2B50',name:'Star Student',desc:'100 likes'},
    {emoji:'\uD83C\uDFAF',name:'Focused',desc:'30 sessions'},
  ];
  var list=(badges&&badges.length)?badges:def;
  document.getElementById('upm-badges-grid').innerHTML=list.map(function(b){
    return '<div class="upm-badge-card">'+
      '<span class="upm-badge-emoji">'+(b.emoji||'\uD83C\uDFC5')+'</span>'+
      '<div class="upm-badge-name">'+_esc(b.name)+'</div>'+
      '<div class="upm-badge-desc">'+_esc(b.desc||'')+'</div></div>';
  }).join('');
}

function _upmRefreshFollowBtn() {
  var btn=document.getElementById('upm-follow-btn');
  var txt=document.getElementById('upm-follow-text');
  var ico=btn.querySelector('i');
  if (_upm.isFollowing){
    btn.classList.add('following-state');
    ico.className='fa-solid fa-user-check'; txt.textContent='Following';
  } else {
    btn.classList.remove('following-state');
    ico.className='fa-solid fa-user-plus'; txt.textContent='Follow';
  }
}

/* Tab switcher — reads the data-upm-tab attribute */
function _upmSetTab(name) {
  document.querySelectorAll('.upm-tab').forEach(function(t){
    t.classList.toggle('active', t.getAttribute('data-upm-tab')===name);
  });
  document.querySelectorAll('.upm-tab-panel').forEach(function(p){
    p.classList.toggle('active', p.id==='upm-panel-'+name);
  });
}

function _closeUpm() {
  document.getElementById('upm-overlay').classList.remove('active');
  var chatOpen=(document.getElementById('fb-chat-win').style.display==='flex');
  if (!chatOpen) document.body.style.overflow='';
}

/* Modal events */
document.getElementById('upm-overlay').addEventListener('click',function(e){if(e.target===this)_closeUpm();});
document.getElementById('upm-close-btn').addEventListener('click',_closeUpm);
document.querySelectorAll('.upm-tab').forEach(function(t){
  t.addEventListener('click',function(){ _upmSetTab(t.getAttribute('data-upm-tab')); });
});

/* Follow / Unfollow */
document.getElementById('upm-follow-btn').addEventListener('click', async function(){
  if (!_upm.username) return;
  try {
    var res=await fetch('/api/users/'+encodeURIComponent(_upm.username)+'/follow',{method:'POST'});
    if (!res.ok) throw new Error('HTTP '+res.status);
    var d=await res.json();
    _upm.isFollowing=!!d.following;
    _upmRefreshFollowBtn();
    var fc=document.getElementById('upm-followers-count');
    if (fc) fc.textContent=Math.max(0,parseInt(fc.textContent||'0')+(_upm.isFollowing?1:-1));
    showToast(_upm.isFollowing?'Now following!':'Unfollowed',_upm.isFollowing?'success':'info');
  } catch(err){showToast('Action failed','error');}
});

/* ══════════════════════════════════════════════════════════
   FB-STYLE FLOATING CHAT BUBBLE
══════════════════════════════════════════════════════════ */
window.sendMessage = function(username) {
  if (!username) return;
  _dm.username=username;
  _dm.name=username;
  _dm.initials=(username[0]||'U').toUpperCase();
  _dm.avatar='';

  _fbShow();
  _fbSetHeader(username, _dm.initials, '', false);
  document.getElementById('fb-chat-header-status').textContent='Loading\u2026';
  document.getElementById('dm-bubbles').innerHTML=
    '<div class="dm-loading"><i class="fa-solid fa-spinner fa-spin"></i><span>Opening conversation\u2026</span></div>';
  _loadDmUser(username);
};

function _fbShow(){
  document.getElementById('fb-chat-win').style.display='flex';
  document.getElementById('fb-chat-tab').style.display='none';
  setTimeout(function(){var i=document.getElementById('dm-input');if(i)i.focus();},200);
}
function _fbMinimise(){
  document.getElementById('fb-chat-win').style.display='none';
  document.getElementById('fb-chat-tab').style.display='flex';
}
function _fbClose(){
  document.getElementById('fb-chat-win').style.display='none';
  document.getElementById('fb-chat-tab').style.display='none';
  _dm.username=null;
  if (!document.getElementById('upm-overlay').classList.contains('active'))
    document.body.style.overflow='';
}

function _fbSetHeader(name, initials, avatar, online){
  var ava=document.getElementById('fb-chat-header-ava');
  var ini=document.getElementById('fb-chat-ava-initials');
  var old=ava.querySelector('img'); if(old) old.remove();
  ini.style.display=''; ini.textContent=initials;
  if (avatar){
    var img=document.createElement('img');
    img.src=avatar;
    img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;';
    ava.appendChild(img);
    ini.style.display='none';
  }
  document.getElementById('fb-chat-header-name').textContent=name;
  document.getElementById('fb-chat-online-dot').style.display=online?'block':'none';
  document.getElementById('fb-chat-tab-ava').textContent=initials;
  document.getElementById('fb-chat-tab-name').textContent=name;
}

/* Header button wiring */
document.getElementById('fb-chat-minimise-btn').addEventListener('click',_fbMinimise);
document.getElementById('fb-chat-close-btn').addEventListener('click',_fbClose);
document.getElementById('fb-chat-tab-close').addEventListener('click',function(e){e.stopPropagation();_fbClose();});
document.getElementById('fb-chat-tab').addEventListener('click',function(e){
  if(e.target.closest('#fb-chat-tab-close'))return; _fbShow();
});
document.getElementById('fb-chat-profile-btn').addEventListener('click',function(){
  if(_dm.username){_fbMinimise();viewUserProfile(_dm.username);}
});

async function _loadDmUser(username){
  try {
    var res=await fetch('/api/users/'+encodeURIComponent(username));
    if (!res.ok) throw new Error('HTTP '+res.status);
    var u=await res.json();
    if (u.error) throw new Error(u.error);
    _dm.name=((u.first_name||'')+' '+(u.last_name||'')).trim()||username;
    _dm.initials=_initials(u.first_name,u.last_name);
    _dm.avatar=u.profile_picture||'';
    var online = !!u.is_online;
    var st = 'Offline';
    if (online) {
      st = 'Active now';
    } else if (u.secs_since_active) {
      st = 'Active ' + _secsAgo(u.secs_since_active);
    }
    _fbSetHeader(_dm.name,_dm.initials,_dm.avatar,online);
    var sel=document.getElementById('fb-chat-header-status');
    sel.textContent=st; sel.style.color=online?'var(--a-emerald)':'';
    document.getElementById('fb-chat-tab-status').textContent=st;
  } catch(err){
    document.getElementById('fb-chat-header-status').textContent='Tap to chat';
  }
  _loadDmMessages(username);
}

async function _loadDmMessages(username){
  var el=document.getElementById('dm-bubbles');
  try {
    var msgs=await (await fetch('/api/messages?user='+encodeURIComponent(username))).json();
    if (!Array.isArray(msgs)||!msgs.length){el.innerHTML=_dmEmptyHtml();return;}
    el.innerHTML=''; _appendBubbles(msgs,el); el.scrollTop=el.scrollHeight;
  } catch(_){el.innerHTML=_dmEmptyHtml();}
}

function _dmEmptyHtml(){
  return '<div class="dm-empty-state">'+
    '<div class="dm-empty-icon"><i class="fa-regular fa-comments"></i></div>'+
    '<div class="dm-empty-title">Say hi to '+_esc(_dm.name||_dm.username||'them')+'!</div>'+
    '<div class="dm-empty-sub">No messages yet \u2014 send the first one \uD83D\uDC4B</div></div>';
}

function _appendBubbles(msgs, container){
  var meId=window.STUDYHUB_USER?String(window.STUDYHUB_USER.id):null;
  msgs.forEach(function(msg,i){
    var sent=meId&&String(msg.sender_id)===meId;
    var prev=msgs[i-1], next=msgs[i+1];
    var sameNext=next&&String(next.sender_id)===String(msg.sender_id);
    var samePrev=prev&&String(prev.sender_id)===String(msg.sender_id);
    if (!prev||_dateKey(msg.created_at)!==_dateKey(prev.created_at)){
      var sep=document.createElement('div');
      sep.className='dm-date-sep'; sep.textContent=_friendlyDate(msg.created_at);
      container.appendChild(sep);
    }
    var row=document.createElement('div');
    row.className='dm-bubble-row'+(sent?' sent':' received')+(!samePrev?' first-in-group':'')+(!sameNext?' last-in-group':'');
    var ava='';
    if (!sent){
      ava=!sameNext
        ?(_dm.avatar?'<div class="dm-bubble-row-ava"><img src="'+_esc(_dm.avatar)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div>':'<div class="dm-bubble-row-ava">'+_esc(_dm.initials)+'</div>')
        :'<div class="dm-bubble-row-ava invisible"></div>';
    }
    row.innerHTML=ava+'<div class="dm-bubble '+(sent?'sent':'received')+'">'+_esc(msg.body||msg.content||'')+'</div>'+
      '';
    container.appendChild(row);
  });
}

async function _dmSend(){
  if (_dm.sending||!_dm.username) return;
  var input=document.getElementById('dm-input'), body=input.value.trim();
  if (!body) return;
  _dm.sending=true;
  document.getElementById('dm-send-btn').disabled=true;
  input.value='';
  var el=document.getElementById('dm-bubbles');
  var emp=el.querySelector('.dm-empty-state'); if(emp) emp.remove();
  _appendBubbles([{sender_id:window.STUDYHUB_USER?window.STUDYHUB_USER.id:'me',body,created_at:new Date().toISOString()}],el);
  el.scrollTop=el.scrollHeight;
  try {
    var res=await fetch('/api/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:_dm.username,body})});
    if (!res.ok){var e=await res.json().catch(function(){return{};});throw new Error(e.error||'Send failed');}
  } catch(err){showToast('Message failed to send','error');}
  _dm.sending=false;
  document.getElementById('dm-send-btn').disabled=false;
  input.focus();
}

document.getElementById('dm-send-btn').addEventListener('click',_dmSend);
document.getElementById('dm-input').addEventListener('keydown',function(e){
  if (e.key==='Enter'&&!e.shiftKey){e.preventDefault();_dmSend();}
});

document.addEventListener('keydown',function(e){
  if (e.key!=='Escape') return;
  _closeUpm(); _fbClose();
});

/* ══ REPORT MODAL ═══════════════════════════════════════ */
(function() {
  // Inject report modal HTML once DOM ready
  var REASONS = [
    { val: 'spam',           label: '🚫 Spam' },
    { val: 'harassment',     label: '😠 Harassment' },
    { val: 'inappropriate',  label: '⚠️ Inappropriate content' },
    { val: 'misinformation', label: '❌ Misinformation' },
    { val: 'other',          label: '📋 Other' }
  ];

  function injectModal() {
    if (document.getElementById('rpt-overlay')) return;
    var html = '<div class="rpt-overlay" id="rpt-overlay">' +
      '<div class="rpt-modal">' +
        '<div class="rpt-header">' +
          '<div class="rpt-title"><i class="fa-solid fa-flag" style="margin-right:8px;color:var(--a-rose,#f87171);"></i>Report Content</div>' +
          '<button class="rpt-close" id="rpt-close"><i class="fa-solid fa-xmark"></i></button>' +
        '</div>' +
        '<div class="rpt-body">' +
          '<p class="rpt-sub">Help keep StudyHub safe. Select a reason:</p>' +
          '<div class="rpt-reasons" id="rpt-reasons">' +
            REASONS.map(function(r) {
              return '<label class="rpt-reason-opt">' +
                '<input type="radio" name="rpt-reason" value="' + r.val + '">' +
                '<span>' + r.label + '</span></label>';
            }).join('') +
          '</div>' +
          '<textarea class="rpt-details" id="rpt-details" placeholder="Optional: add more context…" rows="3"></textarea>' +
        '</div>' +
        '<div class="rpt-footer">' +
          '<button class="rpt-cancel" id="rpt-cancel-btn">Cancel</button>' +
          '<button class="rpt-submit" id="rpt-submit-btn"><i class="fa-solid fa-paper-plane"></i> Submit Report</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    document.getElementById('rpt-close').addEventListener('click', closeReportModal);
    document.getElementById('rpt-cancel-btn').addEventListener('click', closeReportModal);
    document.getElementById('rpt-overlay').addEventListener('click', function(e) { if (e.target===this) closeReportModal(); });
    document.getElementById('rpt-submit-btn').addEventListener('click', submitReport);
  }

  var _rpt = { type: null, id: null };

  window.openReportModal = function(type, id) {
    injectModal();
    _rpt.type = type; _rpt.id = id;
    // Reset
    document.querySelectorAll('input[name="rpt-reason"]').forEach(function(r){ r.checked=false; });
    document.getElementById('rpt-details').value = '';
    document.getElementById('rpt-overlay').classList.add('active');
  };

  function closeReportModal() {
    var ov = document.getElementById('rpt-overlay');
    if (ov) ov.classList.remove('active');
  }
  window.closeReportModal = closeReportModal;

  async function submitReport() {
    var reason = '';
    document.querySelectorAll('input[name="rpt-reason"]').forEach(function(r){ if(r.checked) reason=r.value; });
    if (!reason) { showToast('Please select a reason.', 'error'); return; }
    var details = document.getElementById('rpt-details').value.trim();
    var btn = document.getElementById('rpt-submit-btn');
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      var res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_type: _rpt.type, content_id: _rpt.id, reason: reason, details: details })
      });
      var d = await res.json();
      if (!res.ok) { showToast(d.error || 'Error submitting report.', 'error'); }
      else { showToast(d.message || 'Report submitted!', 'success'); closeReportModal(); }
    } catch(_) { showToast('Failed to submit report.', 'error'); }
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Report';
  }
})();
