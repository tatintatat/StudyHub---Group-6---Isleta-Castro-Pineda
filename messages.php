<?php
@error_reporting(0);
require_once __DIR__ . '/includes/helpers.php';
require_auth_page();
$user = sh_current_user();
if (!$user) { session_destroy(); header('Location: /index.php'); exit; }
$active_page = 'messages';
?>
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>StudyHub — Messages</title>

  <link rel="stylesheet" href="/static/css/style.css?v=1779582994">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">

  <style>
    /* ── Emoji Picker ── */
    .msg-emoji-picker {
      position: absolute;
      bottom: 70px;
      right: 16px;
      width: 300px;
      background: var(--bg-surface, #1e2130);
      border: 1px solid var(--border, rgba(255,255,255,0.1));
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 200;
      padding: 10px;
    }
    .msg-emoji-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 2px;
      max-height: 220px;
      overflow-y: auto;
    }
    .msg-emoji-btn {
      background: none; border: none;
      font-size: 20px;
      cursor: pointer;
      border-radius: 6px;
      padding: 4px;
      line-height: 1;
      transition: background 0.1s;
      text-align: center;
    }
    .msg-emoji-btn:hover { background: rgba(255,255,255,0.1); }
    /* ── File Preview ── */
    .msg-file-preview {
      display: flex; align-items: center; gap: 6px;
      background: rgba(59,158,255,0.12);
      border: 1px solid rgba(59,158,255,0.3);
      border-radius: 8px;
      padding: 4px 10px;
      margin-bottom: 6px;
      font-size: 12px;
      color: var(--txt-primary, #fff);
    }
    .msg-file-name {
      flex: 1; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
      max-width: 180px;
    }
    .msg-file-remove {
      background: none; border: none;
      color: var(--txt-secondary, #aaa);
      cursor: pointer; font-size: 12px;
      padding: 0 2px;
    }
    .msg-file-remove:hover { color: #ef4444; }
    /* ── Image bubble ── */
    .msg-bubble-img {
      max-width: 220px; max-height: 200px;
      border-radius: 10px; display: block;
      cursor: pointer;
    }
    .msg-input-wrap { position: relative; display: flex; flex-direction: column; }
    /* Ensure chat area is position:relative for picker */
    .msg-chat-inner { position: relative; }
  </style>
</head>

<body>


<?php include __DIR__ . '/includes/_nav.php'; ?>
<?php include __DIR__ . '/includes/_modals.php'; ?>

<div class="main-wrap">
  <div class="msg-layout" id="msgLayout">

    <aside class="msg-sidebar" id="msgSidebar">
      <div class="msg-sidebar-head">
        <h1 class="msg-sidebar-title">Chats</h1>

        <div class="msg-sidebar-icons">
          <button class="msg-icon-btn" id="newMsgBtn" title="New Message">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
        </div>
      </div>

      <div class="msg-search-wrap">
        <i class="fa-solid fa-magnifying-glass msg-search-icon"></i>
        <input
          type="text"
          class="msg-search-input"
          id="convSearchInput"
          placeholder="Search Messenger"
          autocomplete="off"
        >
      </div>

      <div class="msg-filter-tabs">
        <button class="msg-filter-tab active" data-filter="all">All</button>
        <button class="msg-filter-tab" data-filter="unread">Unread</button>
      </div>

      <div class="msg-conv-list" id="convList">
        <div class="msg-loading" id="convLoading">
          <i class="fa-solid fa-circle-notch fa-spin"></i>
        </div>
      </div>
    </aside>

    <section class="msg-chat-area" id="msgChatArea">

      <div class="msg-empty-chat" id="msgEmptyState">
        <div class="msg-empty-icon">
          <i class="fa-solid fa-comments"></i>
        </div>

        <div class="msg-empty-title">Your Messages</div>

        <p class="msg-empty-sub">
          Send private notes and messages to a friend or study group.
        </p>

        <button class="btn btn-primary" style="margin-top:8px;" id="emptyNewMsgBtn">
          <i class="fa-solid fa-pen-to-square"></i>&nbsp; New Message
        </button>
      </div>

      <div class="msg-chat-inner" id="msgChatInner" style="display:none;flex-direction:column;height:100%;">

        <div class="msg-chat-header" id="msgChatHeader">
          <button class="msg-back-btn" id="msgBackBtn" title="Back">
            <i class="fa-solid fa-arrow-left"></i>
          </button>

          <div class="msg-chat-header-ava" id="chatHeaderAva">
            <span id="chatHeaderInitials">?</span>
          </div>

          <div class="msg-chat-header-info">
            <div class="msg-chat-header-name" id="chatHeaderName">—</div>
            <div class="msg-chat-header-status">
              <span class="msg-status-dot" id="chatOnlineDot"></span>
            </div>
          </div>

          <div class="msg-chat-header-actions">
            <button class="msg-icon-btn" title="More options" id="chatMoreBtn">
              <i class="fa-solid fa-ellipsis"></i>
            </button>
          </div>
        </div>

        <div class="msg-bubbles" id="msgBubbles"></div>

        <!-- Emoji Picker Popup -->
        <div class="msg-emoji-picker" id="msgEmojiPicker" style="display:none;">
          <div class="msg-emoji-grid" id="msgEmojiGrid"></div>
        </div>

        <div class="msg-input-bar">
          <!-- Hidden file input -->
          <input type="file" id="msgFileInput" accept="image/*,.pdf,.doc,.docx,.txt" style="display:none;">
          <button class="msg-icon-btn" id="msgAttachBtn" title="Attach file">
            <i class="fa-solid fa-paperclip"></i>
          </button>

          <div class="msg-input-wrap">
            <!-- File preview chip (shown when file is selected) -->
            <div class="msg-file-preview" id="msgFilePreview" style="display:none;">
              <span class="msg-file-name" id="msgFileName"></span>
              <button class="msg-file-remove" id="msgFileRemove" title="Remove">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <input
              type="text"
              class="msg-input"
              id="msgInput"
              placeholder="Write a message…"
              autocomplete="off"
            >
          </div>

          <button class="msg-icon-btn" id="msgEmojiBtn" title="Emoji">
            <i class="fa-regular fa-face-smile"></i>
          </button>

          <button class="msg-send-btn" id="msgSendBtn" title="Send">
            <i class="fa-solid fa-paper-plane"></i>
          </button>
        </div>

      </div>
    </section>

  </div>
</div>

<div class="nm-overlay" id="newMsgOverlay">
  <div class="nm-modal" id="newMsgModal">

    <div class="nm-header">
      <div class="nm-header-left">
        <div class="nm-header-icon">
          <i class="fa-solid fa-pen-to-square"></i>
        </div>

        <div>
          <div class="nm-title">New Message</div>
          <div class="nm-subtitle">Start a private conversation</div>
        </div>
      </div>

      <button class="nm-close-btn" id="newMsgClose" title="Close">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="nm-to-wrap">
      <div class="nm-to-label">To:</div>

      <div class="nm-to-chips" id="nmChips">
        <input
          type="text"
          class="nm-to-input"
          id="nmSearchInput"
          placeholder="Search people by name or @handle…"
          autocomplete="off"
        >
      </div>
    </div>

    <div class="nm-results-wrap open" id="nmResultsWrap">
      <div class="nm-results-header" id="nmResultsHeader">Search users</div>
      <div class="nm-results-list" id="nmResultsList"></div>

      <div class="nm-no-results" id="nmNoResults" style="display:none;">
        <i class="fa-solid fa-user-slash"></i>
        <span>No users found</span>
      </div>
    </div>

    <div class="nm-compose-area">
      <textarea
        class="nm-compose-input"
        id="nmComposeInput"
        placeholder="Write a message…"
        rows="3"
      ></textarea>
    </div>

    <div class="nm-footer">
      <button class="nm-cancel-btn" id="nmCancelBtn">Cancel</button>

      <button class="nm-send-btn" id="nmSendBtn" disabled>
        <i class="fa-solid fa-paper-plane"></i>
        Send Message
      </button>
    </div>

  </div>
</div>

<script>
  window.STUDYHUB_USER = {
    id: "<?php echo htmlspecialchars($user["id"] ?? ""); ?>",
    name: "<?php echo htmlspecialchars($user["first_name"] ?? ""); ?> <?php echo htmlspecialchars($user["last_name"] ?? ""); ?>",
    firstName: "<?php echo htmlspecialchars($user["first_name"] ?? ""); ?>",
    username: "<?php echo htmlspecialchars($user["username"] ?? ""); ?>",
    email: "<?php echo htmlspecialchars($user["email"] ?? ""); ?>",
    avatar: "<?php echo htmlspecialchars($user["profile_picture"] ?? ""); ?>",
    initials: "<?php echo htmlspecialchars(strtoupper(($user["first_name"][0] ?? "U") . ($user["last_name"][0] ?? ""))); ?>"
  };
</script>

<script src="/static/js/nav.js?v=1779582994"></script>
<script src="/static/js/shared.js?v=1779582994"></script>
<script src="/static/js/message.js?v=1779582994"></script>

</body>
</html>