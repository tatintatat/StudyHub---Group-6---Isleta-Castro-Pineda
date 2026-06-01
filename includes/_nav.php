<!-- ─── SHARED TOPNAV (included by all dashboard pages) ─── -->

<div class="toast-container" id="toast-container"></div>

<!-- SEARCH OVERLAY -->
<div class="search-overlay" id="search-overlay">
  <div class="search-box-wrap">
    <i class="fa-solid fa-magnifying-glass search-icon-inner"></i>

    <input
      type="text"
      class="search-box"
      id="search-input"
      placeholder="Search posts, users, topics…"
      autocomplete="off"
    >

    <button class="search-close" id="search-close">
      <i class="fa-solid fa-xmark"></i>
    </button>
  </div>

  <div class="search-results" id="search-results"></div>

  <div class="search-hint">
    Press
    <kbd style="background:rgba(255,255,255,0.08);padding:2px 6px;border-radius:4px;font-size:12px;">
      Esc
    </kbd>
    to close
  </div>
</div>

<!-- TOP NAV -->
<nav class="topnav" id="topnav">

  <!-- BRAND -->
  <a class="nav-brand" href="/dashboard">
    <div class="brand-gem">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        stroke-width="2.2"
        stroke-linecap="round"
      >
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    </div>

    <span class="brand-wordmark">StudyHub</span>
  </a>

  <!-- NAV LINKS -->
  <div class="nav-links">

    <a class="nav-link <?php echo ($active_page==="dashboard")?"active":""; ?>" href="/dashboard">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
      Dashboard
    </a>

    <a class="nav-link <?php echo ($active_page==="community")?"active":""; ?>" href="/community">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      Community
    </a>

    <?php if (!empty($user['is_admin'])): ?>
    <a class="nav-link <?php echo ($active_page==="admin")?"active":""; ?>" href="/admin">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
      Admin
    </a>
    <?php endif; ?>



    <a class="nav-link <?php echo ($active_page==="education")?"active":""; ?>" href="/education">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
      Education
    </a>

  </div>

  <!-- RIGHT SIDE -->
  <div class="nav-right">

    <!-- SEARCH -->
    <div class="nav-icon-btn" id="search-btn" title="Search" style="margin:0 2px;">
      <i class="fa-solid fa-magnifying-glass"></i>
    </div>

    <!-- NOTIFICATIONS -->
    <div
      class="nav-icon-btn"
      id="notif-btn"
      title="Notifications"
      style="position:relative;margin:0 2px;"
    >

      <i class="fa-solid fa-bell"></i>

      <div class="notif-dot" id="notif-dot" style="display:none;"></div>

      <div class="notif-dropdown" id="notif-dropdown">

        <div class="notif-header">
          <div class="notif-header-title">Notifications</div>
          <div class="notif-header-action" id="notif-read-all">
            Mark all read
          </div>
        </div>

        <div class="notif-list" id="notif-list">
          <div class="notif-empty">No notifications yet</div>
        </div>

      </div>
    </div>

    <!-- MESSENGER -->
    <div class="nav-msg-wrap" id="nav-msg-wrap">

      <a class="nav-msg-btn" id="nav-msg-btn" href="/messages">
        <i class="fa-brands fa-facebook-messenger"></i>
        <span class="nav-msg-badge" id="nav-msg-badge">0</span>
      </a>

      <div class="msg-nav-dropdown" id="nav-msg-dropdown">

        <div class="msg-nav-dd-head">
          <span class="msg-nav-dd-title">Chats</span>
          <a class="msg-nav-dd-action" href="/messages">
            See all
          </a>
        </div>

        <div class="msg-nav-dd-list" id="nav-msg-dd-list"></div>

        <div class="msg-nav-dd-footer">
          <a href="/messages">Open Messenger</a>
        </div>

      </div>
    </div>

    <!-- TRASH -->
    <div class="nav-trash-btn" id="trash-nav-btn" title="Trash bin" style="margin:0 2px;">
      <i class="fa-solid fa-trash-can"></i>
      <span class="trash-count-badge" id="trash-count-badge">0</span>
    </div>

    <!-- THEME -->
    <div class="theme-btn" id="theme-btn" title="Toggle theme" style="margin:0 2px;">
      <i class="fa-solid fa-sun" id="theme-icon"></i>
    </div>

    <!-- PROFILE -->
    <a
      class="nav-user"
      href="/profile"
      id="nav-user"
      title="View profile"
      style="margin-left:4px;"
    >

      <div class="nav-user-ava" id="nav-user-ava">

        <?php if (!empty($user["profile_picture"])): ?>
          <img src="<?php echo htmlspecialchars($user["profile_picture"] ?? ""); ?>" alt="">
        <?php else: ?>
          <?php echo htmlspecialchars(strtoupper(($user["first_name"][0] ?? "U") . ($user["last_name"][0] ?? ""))); ?>
        <?php endif; ?>

      </div>

      <span class="nav-user-name">
        <?php echo htmlspecialchars($user["first_name"] ?? ""); ?>
      </span>
    </a>

    <!-- LOGOUT -->
    <div
      id="logout-btn"
      style="
        font-size:12px;
        color:var(--txt-muted);
        cursor:pointer;
        transition:color 0.2s;
        margin-left:6px;
      "
      title="Sign out"
      onmouseenter="this.style.color='var(--a-rose)'"
      onmouseleave="this.style.color='var(--txt-muted)'"
    >
      <i class="fa-solid fa-arrow-right-from-bracket"></i>
    </div>

    <!-- HAMBURGER -->
    <div class="nav-hamburger" id="nav-hamburger" style="margin-left:4px;">
      <i class="fa-solid fa-bars"></i>
    </div>

  </div>

</nav>

<!-- CONFIRM DIALOG -->
<div class="confirm-overlay" id="confirm-overlay">

  <div class="confirm-dialog">

    <div class="confirm-icon" id="confirm-icon">
      <i id="confirm-icon-i" class="fa-solid fa-triangle-exclamation"></i>
    </div>

    <div class="confirm-title" id="confirm-title">
      Are you sure?
    </div>

    <div class="confirm-body" id="confirm-body">
      This action cannot be undone.
    </div>

    <div class="confirm-actions">

      <button class="confirm-cancel" onclick="SHConfirm.cancel()">
        Cancel
      </button>

      <button
        id="confirm-proceed-btn"
        class="confirm-proceed-danger"
        onclick="SHConfirm.proceed()"
      >
        Confirm
      </button>

    </div>
  </div>
</div>

<!-- TRASH MODAL -->
<div class="trash-modal-overlay" id="trash-modal-overlay">

  <div class="trash-modal">

    <div class="trash-modal-header">

      <div class="trash-modal-icon">
        <i class="fa-solid fa-trash-can"></i>
      </div>

      <div>
        <div class="trash-modal-title">Trash Bin</div>

        <div class="trash-modal-sub">
          Items are permanently deleted after 30 days
        </div>
      </div>

      <button class="trash-modal-close" onclick="SHTrash.closeModal()">
        <i class="fa-solid fa-xmark"></i>
      </button>

    </div>

    <div class="trash-actions-bar">

      <span
        style="font-size:12px;color:var(--txt-muted);"
        id="trash-item-count"
      >
        0 items
      </span>

      <button class="trash-empty-btn" onclick="SHTrash.emptyAll()">
        <i class="fa-solid fa-trash" style="margin-right:5px;"></i>
        Empty Trash
      </button>

    </div>

    <div class="trash-list" id="trash-list-container">

      <div class="trash-empty-state">
        <i class="fa-solid fa-trash-can"></i>
        <p>Trash is empty</p>
      </div>

    </div>

  </div>
</div>

<!-- MOBILE DRAWER -->
<div class="mobile-drawer" id="mobile-drawer">

  <a class="nav-link <?php echo ($active_page==="dashboard")?"active":""; ?>" href="/dashboard">
    <svg
      class="nav-icon"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
    >
      <rect x="3" y="3" width="7" height="7" rx="1"/>
      <rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/>
      <rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>

    Dashboard
  </a>

  <a class="nav-link <?php echo ($active_page==="community")?"active":""; ?>" href="/community">
    <i class="fa-solid fa-users" style="width:16px;"></i>
    Community
  </a>

  <?php if (!empty($user['is_admin'])): ?>
  <a class="nav-link <?php echo ($active_page==="admin")?"active":""; ?>" href="/admin">
    <i class="fa-solid fa-shield-halved" style="width:16px;"></i>
    Admin
  </a>
  <?php endif; ?>



  <a class="nav-link <?php echo ($active_page==="education")?"active":""; ?>" href="/education">
    <i class="fa-solid fa-brain" style="width:16px;"></i>
    Education
  </a>

  <a class="nav-link <?php echo ($active_page==="profile")?"active":""; ?>" href="/profile">
    <i class="fa-solid fa-user" style="width:16px;"></i>
    My Profile
  </a>

</div>