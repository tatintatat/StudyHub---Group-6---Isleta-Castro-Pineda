<!-- ─── SHARED MODALS (included by all dashboard pages) ─── -->

<!-- Add Subject -->
<div class="modal-overlay" id="subject-modal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title"><i class="fa-solid fa-book-open" style="color:var(--a-violet);margin-right:8px;"></i>Add Subject</div>
      <button class="modal-close" onclick="closeModal('subject-modal')"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Subject Name</label>
        <input type="text" class="form-input" id="subject-name-input" placeholder="e.g. Calculus"
               onkeydown="if(event.key==='Enter') submitSubject()">
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div class="color-picker" id="subject-colors">
          <div class="color-option selected" style="background:#8b7cf8" data-color="#8b7cf8"></div>
          <div class="color-option" style="background:#6366f1" data-color="#6366f1"></div>
          <div class="color-option" style="background:#34d399" data-color="#34d399"></div>
          <div class="color-option" style="background:#fbbf24" data-color="#fbbf24"></div>
          <div class="color-option" style="background:#f87171" data-color="#f87171"></div>
          <div class="color-option" style="background:#a78bfa" data-color="#a78bfa"></div>
          <div class="color-option" style="background:#22d3ee" data-color="#22d3ee"></div>
          <div class="color-option" style="background:#f472b6" data-color="#f472b6"></div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('subject-modal')">Cancel</button>
      <button class="btn btn-primary" id="subject-submit-btn" onclick="submitSubject()">Add Subject</button>
    </div>
  </div>
</div>

<!-- Focus Timer -->
<div class="modal-overlay" id="timer-modal">
  <div class="modal" style="max-width:400px;">
    <div class="modal-header">
      <div class="modal-title"><i class="fa-solid fa-stopwatch" style="color:var(--a-violet);margin-right:8px;"></i>Focus Timer</div>
      <button class="modal-close" onclick="closeModal('timer-modal')"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">
      <div class="timer-display">
        <div class="timer-circle">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <defs>
              <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#8b7cf8"/>
                <stop offset="100%" stop-color="#22d3ee"/>
              </linearGradient>
            </defs>
            <circle class="timer-bg" cx="80" cy="80" r="70"/>
            <circle class="timer-progress" cx="80" cy="80" r="70" id="timer-progress-circle"/>
          </svg>
          <div class="timer-text" id="timer-display">25:00</div>
        </div>
        <div class="timer-label" id="timer-status">Ready to focus?</div>
        <div class="timer-controls">
          <button class="timer-btn timer-btn-secondary" onclick="resetTimer()" title="Reset">
            <i class="fa-solid fa-rotate-left"></i>
          </button>
          <button class="timer-btn timer-btn-play" id="timer-play-btn" onclick="toggleTimer()">
            <i class="fa-solid fa-play" id="timer-play-icon"></i>
          </button>
          <button class="timer-btn timer-btn-secondary" onclick="saveSessionFromTimer()" title="Save Session">
            <i class="fa-solid fa-check"></i>
          </button>
        </div>
        <div class="timer-presets">
          <button class="timer-preset active" data-min="25" onclick="setTimerPreset(25)">25 min</button>
          <button class="timer-preset" data-min="45" onclick="setTimerPreset(45)">45 min</button>
          <button class="timer-preset" data-min="60" onclick="setTimerPreset(60)">60 min</button>
        </div>
      </div>
      <div class="form-group" style="margin-top:16px;">
        <label class="form-label">Subject (optional)</label>
        <select class="form-select" id="timer-subject"><option value="">No subject</option></select>
      </div>
    </div>
  </div>
</div>

<!-- Flashcards -->
<div class="modal-overlay" id="flashcard-modal">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title" id="flashcard-modal-title">
        <i class="fa-solid fa-layer-group" style="color:var(--a-indigo);margin-right:8px;"></i>New Flashcard
      </div>
      <button class="modal-close" onclick="closeModal('flashcard-modal')"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Front (Question)</label>
        <input type="text" class="form-input" id="flashcard-front" placeholder="What is the capital of France?"
               onkeydown="if(event.key==='Enter') document.getElementById('flashcard-back').focus()">
      </div>
      <div class="form-group">
        <label class="form-label">Back (Answer)</label>
        <input type="text" class="form-input" id="flashcard-back" placeholder="Paris"
               onkeydown="if(event.key==='Enter') submitFlashcard()">
      </div>
      <div class="form-group">
        <label class="form-label">Subject (optional)</label>
        <select class="form-select" id="flashcard-subject"><option value="">No subject</option></select>
      </div>
      <div id="flashcard-list-section" style="display:none;">
        <div style="font-size:11px;font-weight:700;color:var(--txt-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Recent Flashcards</div>
        <div id="flashcard-list" style="max-height:180px;overflow-y:auto;"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('flashcard-modal')">Close</button>
      <button class="btn btn-primary" id="flashcard-submit-btn" onclick="submitFlashcard()">Create Flashcard</button>
    </div>
  </div>
</div>

<!-- Quick Notes -->
<div class="modal-overlay" id="notes-modal">
  <div class="modal" style="max-width:580px;">
    <div class="modal-header">
      <div class="modal-title"><i class="fa-solid fa-pen-to-square" style="color:var(--a-emerald);margin-right:8px;"></i>Quick Notes</div>
      <button class="modal-close" onclick="closeModal('notes-modal')"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">
      <textarea class="notes-area" id="quick-notes" placeholder="Jot down your thoughts, ideas, or study notes here…"></textarea>
      <div style="margin-top:8px;font-size:12px;color:var(--txt-muted);text-align:right;" id="notes-char-count">0 characters</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('notes-modal')">Close</button>
      <button class="btn btn-primary" onclick="saveNotes()"><i class="fa-solid fa-download" style="margin-right:6px;"></i>Download</button>
    </div>
  </div>
</div>

<!-- Log Session -->
<div class="modal-overlay" id="session-modal">
  <div class="modal" style="max-width:420px;">
    <div class="modal-header">
      <div class="modal-title"><i class="fa-solid fa-clock" style="color:var(--a-cyan);margin-right:8px;"></i>Log Study Session</div>
      <button class="modal-close" onclick="closeModal('session-modal')"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">Duration (minutes)</label>
        <input type="number" class="form-input" id="session-duration" value="30" min="1" max="480">
      </div>
      <div class="form-group">
        <label class="form-label">Subject (optional)</label>
        <select class="form-select" id="session-subject"><option value="">No subject</option></select>
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="form-textarea" id="session-notes" placeholder="What did you study?"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('session-modal')">Cancel</button>
      <button class="btn btn-primary" onclick="submitSession()">Log Session</button>
    </div>
  </div>
</div>

<!-- Edit Profile Modal -->
<div class="modal-overlay" id="edit-profile-modal">
  <div class="modal" style="max-width:480px;">
    <div class="modal-header">
      <div class="modal-title"><i class="fa-solid fa-pen" style="color:var(--a-violet);margin-right:8px;"></i>Edit Profile</div>
      <button class="modal-close" onclick="closeModal('edit-profile-modal')"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">First Name</label>
        <input type="text" class="form-input" id="edit-first-name" placeholder="First name">
      </div>
      <div class="form-group">
        <label class="form-label">Last Name</label>
        <input type="text" class="form-input" id="edit-last-name" placeholder="Last name">
      </div>
      <div class="form-group">
        <label class="form-label">Username</label>
        <input type="text" class="form-input" id="edit-username" placeholder="username">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal('edit-profile-modal')">Cancel</button>
      <button class="btn btn-primary" id="edit-profile-submit-btn" onclick="submitEditProfile()">Save Changes</button>
    </div>
  </div>
</div>

<!-- User Profile Modal (legacy fallback for non-community pages) -->
<div class="modal-overlay" id="user-profile-modal">
  <div class="modal" style="max-width:600px;">
    <div class="modal-header">
      <div class="modal-title"><i class="fa-solid fa-user" style="color:var(--a-violet);margin-right:8px;"></i>User Profile</div>
      <button class="modal-close" onclick="closeModal('user-profile-modal')"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body" style="padding:0;">
      <div class="upm-hero">
        <div class="upm-ava" id="legacy-upm-ava"></div>
        <div class="upm-info">
          <div class="upm-name" id="legacy-upm-name">Loading…</div>
          <div class="upm-handle" id="legacy-upm-handle">@username</div>
          <div class="upm-stats">
            <span><strong id="legacy-upm-posts">0</strong> Posts</span>
            <span><strong id="legacy-upm-followers">0</strong> Followers</span>
            <span><strong id="legacy-upm-following">0</strong> Following</span>
          </div>
        </div>
        <div class="upm-actions">
          <button class="btn btn-primary upm-follow-btn" id="legacy-upm-follow-btn">Follow</button>
          <button class="btn btn-secondary" onclick="sendMessageToUser()">Message</button>
        </div>
      </div>
      <div style="padding:20px;">
        <div style="font-size:14px;font-weight:700;color:var(--txt-primary);margin-bottom:12px;">Recent Posts</div>
        <div id="upm-posts-container">
          <div class="empty-state" style="padding:2rem 0">
            <i class="fa-solid fa-spinner fa-spin empty-icon-fa"></i>
            <div>Loading posts…</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
