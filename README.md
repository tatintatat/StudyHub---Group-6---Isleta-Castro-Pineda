# StudyHub — PHP Edition (InfinityFree Compatible)

This is a full PHP conversion of the original Python/Flask StudyHub application,
built specifically to run on **InfinityFree** free hosting.

---

## 📁 Project Structure

```
StudyHub_PHP/
├── .htaccess              ← URL routing (mod_rewrite)
├── index.php              ← Login page
├── signup.php             ← Sign-up page
├── dashboard.php          ← Dashboard
├── community.php          ← Community feed
├── reports.php            ← Study reports
├── statistics.php         ← Statistics
├── education.php          ← AI flashcards & quizzes
├── profile.php            ← User profile
├── messages.php           ← Direct messages
├── schema.sql             ← MySQL database schema
│
├── includes/
│   ├── config.php         ← ⚙️  DB credentials & API keys (EDIT THIS)
│   ├── db.php             ← PDO connection + migrations
│   ├── helpers.php        ← Auth, JSON helpers, streak calculator
│   ├── AIService.php      ← Pollinations.AI REST client (no API key needed)
│   ├── _nav.php           ← Shared navigation bar
│   └── _modals.php        ← Shared modal dialogs
│
├── api/                   ← All REST API endpoints
│   ├── login.php, signup.php, logout.php
│   ├── subjects.php, sessions.php, stats.php
│   ├── flashcards.php, posts.php, comments.php
│   ├── notifications.php, messages.php
│   ├── leaderboard.php, online.php, heartbeat.php
│   ├── search.php, feature_usage.php, followers.php
│   ├── user_profile.php, profile_photo.php, profile_update.php
│   └── ai/
│       ├── generate.php, generate_file.php
│       ├── flashcards.php, quiz.php, reviewer.php
│       ├── extract_text.php, health.php
│
├── auth/
│   ├── google.php          ← Google OAuth redirect
│   └── google_callback.php ← Google OAuth callback
│
└── static/
    ├── css/               ← All stylesheets (unchanged)
    └── js/                ← All JavaScript (unchanged)
```

---

## 🚀 InfinityFree Deployment Steps

### 1. Create Your Free Account
- Go to [infinityfree.com](https://infinityfree.com) and create an account
- Create a new hosting account — you get a free subdomain like `yourdomain.infinityfreeapp.com`

### 2. Set Up MySQL Database
1. In your InfinityFree control panel → **MySQL Databases**
2. Create a new database (note the full database name, e.g. `if0_12345678_studyhub`)
3. Create a database user and assign it to the database
4. Go to **phpMyAdmin** and import `schema.sql`

### 3. Edit `includes/config.php`
Replace the placeholder values with your InfinityFree DB credentials:
```php
define('DB_HOST',   'sql200.infinityfree.com');  // from your cPanel
define('DB_USER',   'if0_12345678');              // your DB username
define('DB_PASS',   'your_password');
define('DB_NAME',   'if0_12345678_studyhub');     // your DB name

define('SECRET_KEY', 'some-random-string');
// AI is powered by Pollinations.AI — no API key needed!
```

### 4. Upload Files
Use **FileZilla** (FTP) or the InfinityFree **File Manager**:
- Upload **all files** to the `htdocs/` folder on your hosting
- Make sure `.htaccess` is uploaded (it may be hidden — enable "show hidden files" in FileZilla)

### 5. Google OAuth (Optional)
If you want Google sign-in:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add your InfinityFree URL as an authorized redirect URI:
   `https://yourdomain.infinityfreeapp.com/auth/google/callback`
4. Update `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `config.php`

---

## ⚠️ InfinityFree Limitations & Workarounds Applied

| Limitation | Workaround |
|---|---|
| No Python/Flask | Full PHP rewrite using native PDO + `file_get_contents` |
| No pip packages | AIService calls Pollinations.AI REST API directly — zero dependencies |
| No shell exec | All file parsing done in pure PHP |
| No `exec()`/`shell_exec()` | Removed backup scheduler entirely (not needed) |
| No background tasks | Heartbeat handled by client-side JS polling |
| Shared hosting session limits | Sessions use PHP native sessions (no Redis/memcache) |
| Max upload ~2MB default | Profile photos stored as base64 in DB (MEDIUMTEXT) |

---

## 🔑 API Keys You Need

| Key | Where to Get | Required? |
|---|---|---|
| AI (Pollinations.AI) | [text.pollinations.ai](https://text.pollinations.ai) — **no key needed** | No |
| `GOOGLE_CLIENT_ID/SECRET` | [console.cloud.google.com](https://console.cloud.google.com) | No (only for Google login) |
| `SECRET_KEY` | Any random string | Yes |

---

## ✅ What Works

- ✅ User registration & login (username/email + password)
- ✅ Google OAuth sign-in
- ✅ Dashboard with stats, weekly activity chart, streak
- ✅ Subjects management
- ✅ Study session timer & logging
- ✅ Flashcard creation, review, deletion
- ✅ Community posts, likes, comments
- ✅ Direct messaging between users
- ✅ Notifications
- ✅ Leaderboard
- ✅ Reports & statistics charts
- ✅ AI flashcard/quiz/reviewer generation (via Pollinations.AI — free, no API key)
- ✅ Profile photo upload & update
- ✅ Follow/unfollow users
- ✅ Search (users & posts)
- ✅ Online presence / heartbeat
- ✅ Feature usage tracking

## ❌ Removed Features (not compatible with free hosting)

- ❌ Automatic database backups (requires cron jobs / shell access)
- ❌ PPTX file parsing (requires python-pptx library)
- ❌ Background scheduler

---

## 🧪 Testing Locally (XAMPP / WAMP)

1. Start Apache + MySQL in XAMPP
2. Import `schema.sql` into phpMyAdmin
3. Edit `includes/config.php` with `localhost` credentials
4. Place files in `htdocs/StudyHub_PHP/`
5. Enable `mod_rewrite` in Apache (usually on by default in XAMPP)
6. Visit `http://localhost/StudyHub_PHP/`
