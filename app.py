"""
StudyHub - Flask Backend
Dependencies: pip install flask flask-mysqldb werkzeug requests python-dotenv
"""

import os
import json
import secrets
import requests
from datetime import datetime, timedelta, date
from functools import wraps

from flask import (
    Flask, render_template, request, jsonify,
    session, redirect, url_for
)
from werkzeug.security import generate_password_hash, check_password_hash
import MySQLdb
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", secrets.token_hex(32))
app.config["MAX_CONTENT_LENGTH"] = 32 * 1024 * 1024  # 32 MB – enough for base64-encoded images

# ── Database config ───────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":   os.getenv("DB_HOST",   "localhost"),
    "user":   os.getenv("DB_USER",   "root"),
    "passwd": os.getenv("DB_PASS",   ""),
    "db":     os.getenv("DB_NAME",   "studyhub"),
    "charset": "utf8mb4",
}


def run_migrations():
    """Apply schema migrations on startup so existing DBs stay up to date."""
    try:
        db = MySQLdb.connect(**DB_CONFIG)
        cur = db.cursor()

        # Fix profile_picture column — VARCHAR(500) is too small for base64 images
        cur.execute("""
            SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'profile_picture'
        """)
        row = cur.fetchone()
        if row and row[0].lower() in ('varchar', 'tinytext', 'text'):
            cur.execute("ALTER TABLE users MODIFY COLUMN profile_picture MEDIUMTEXT")
            db.commit()

        # Add missing columns that older schema versions may not have
        def col_exists(table, col):
            cur.execute("""SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s AND COLUMN_NAME=%s""",
                (table, col))
            return cur.fetchone()[0] > 0

        missing_cols = [
            ("users", "score",        "ALTER TABLE users ADD COLUMN score INT DEFAULT 0"),
            ("users", "last_login",   "ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL"),
            ("users", "last_active",  "ALTER TABLE users ADD COLUMN last_active TIMESTAMP NULL"),
            ("users", "is_active",    "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE"),
            ("users", "google_id",    "ALTER TABLE users ADD COLUMN google_id VARCHAR(255)"),
            ("users", "auth_provider","ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local'"),
        ]
        for table, col, sql in missing_cols:
            if not col_exists(table, col):
                try:
                    cur.execute(sql)
                    db.commit()
                except Exception:
                    pass

        # Ensure follows table exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS follows (
                id INT AUTO_INCREMENT PRIMARY KEY,
                follower_id INT NOT NULL,
                following_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_follow (follower_id, following_id),
                FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        db.commit()

        cur.close(); db.close()
    except Exception:
        pass  # DB might not be set up yet — that's fine


run_migrations()

# ── Google OAuth config ───────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID",     "YOUR_GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI",  "http://localhost:5000/auth/google/callback")


# ── DB helpers ────────────────────────────────────────────────────────────────
def get_db():
    return MySQLdb.connect(**DB_CONFIG)


def query_one(sql, params=()):
    db = get_db()
    cur = db.cursor(MySQLdb.cursors.DictCursor)
    cur.execute(sql, params)
    row = cur.fetchone()
    cur.close(); db.close()
    return row


def query_all(sql, params=()):
    db = get_db()
    cur = db.cursor(MySQLdb.cursors.DictCursor)
    cur.execute(sql, params)
    rows = cur.fetchall()
    cur.close(); db.close()
    return rows


def execute(sql, params=()):
    db = get_db()
    cur = db.cursor()
    cur.execute(sql, params)
    db.commit()
    last_id = cur.lastrowid
    cur.close(); db.close()
    return last_id


# ── Auth decorators ────────────────────────────────────────────────────────────
def login_required(f):
    """For API routes – returns JSON 401."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


def login_required_page(f):
    """For page routes – redirects to login."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("index"))
        return f(*args, **kwargs)
    return decorated


# ── Page Routes ────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("index.html")


@app.route("/signup")
def signup():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("signup.html")


@app.route("/dashboard")
@login_required_page
def dashboard():
    user = query_one("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    if not user:
        session.clear()
        return redirect(url_for("index"))
    return render_template("dashboard.html", user=user)


@app.route("/community")
@login_required_page
def community():
    user = query_one("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    if not user:
        session.clear()
        return redirect(url_for("index"))
    return render_template("community.html", user=user)


@app.route("/reports")
@login_required_page
def reports():
    user = query_one("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    if not user:
        session.clear()
        return redirect(url_for("index"))
    return render_template("reports.html", user=user)


@app.route("/statistics")
@login_required_page
def statistics():
    user = query_one("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    if not user:
        session.clear()
        return redirect(url_for("index"))
    return render_template("statistics.html", user=user)


@app.route("/education")
@login_required_page
def education():
    user = query_one("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    if not user:
        session.clear()
        return redirect(url_for("index"))
    return render_template("education.html", user=user)


@app.route("/profile")
@login_required_page
def profile():
    user = query_one("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    if not user:
        session.clear()
        return redirect(url_for("index"))
    return render_template("profile.html", user=user)


# ══════════════════════════════════════════
# MESSAGES PAGE
# ══════════════════════════════════════════

@app.route("/messages")
@login_required_page
def messages():
    user = query_one(
        "SELECT * FROM users WHERE id = %s",
        (session["user_id"],)
    )

    if not user:
        session.clear()
        return redirect(url_for("index"))

    return render_template("messages.html", user=user)

# ── Auth API ────────────────────────────────────────────────────────────────

@app.route("/api/signup", methods=["POST"])
def api_signup():
    data = request.get_json()
    first_name = data.get("first_name", "").strip()
    last_name  = data.get("last_name",  "").strip()
    username   = data.get("username",   "").strip().lower()
    email      = data.get("email",      "").strip().lower()
    password   = data.get("password",   "")

    if not all([first_name, last_name, username, email, password]):
        return jsonify({"error": "All fields are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if query_one("SELECT id FROM users WHERE email = %s", (email,)):
        return jsonify({"error": "Email is already registered."}), 409
    if query_one("SELECT id FROM users WHERE username = %s", (username,)):
        return jsonify({"error": "Username is already taken."}), 409

    pw_hash = generate_password_hash(password)
    user_id = execute(
        "INSERT INTO users (first_name, last_name, username, email, password_hash, auth_provider) "
        "VALUES (%s, %s, %s, %s, %s, 'local')",
        (first_name, last_name, username, email, pw_hash)
    )
    session["user_id"]    = user_id
    session["user_name"]  = f"{first_name} {last_name}"
    session["user_email"] = email
    return jsonify({"message": "Account created!", "redirect": "/dashboard"}), 201


@app.route("/api/login", methods=["POST"])
def api_login():
    data       = request.get_json()
    identifier = data.get("identifier", "").strip().lower()
    password   = data.get("password",   "")

    if not identifier or not password:
        return jsonify({"error": "Please fill in all fields."}), 400

    user = query_one(
        "SELECT * FROM users WHERE (email = %s OR username = %s) AND auth_provider = 'local'",
        (identifier, identifier)
    )
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Invalid credentials."}), 401

    execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user["id"],))
    session["user_id"]    = user["id"]
    session["user_name"]  = f"{user['first_name']} {user['last_name']}"
    session["user_email"] = user["email"]
    return jsonify({"message": "Logged in!", "redirect": "/dashboard"})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"redirect": "/"})


# ── Google OAuth ──────────────────────────────────────────────────────────────

@app.route("/auth/google")
def auth_google():
    params = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
    )
    return redirect(params)


@app.route("/auth/google/callback")
def auth_google_callback():
    code = request.args.get("code")
    if not code:
        return redirect("/?error=google_cancelled")

    token_res = requests.post("https://oauth2.googleapis.com/token", data={
        "code":          code,
        "client_id":     GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri":  GOOGLE_REDIRECT_URI,
        "grant_type":    "authorization_code",
    })
    tokens = token_res.json()
    access_token = tokens.get("access_token")
    if not access_token:
        return redirect("/?error=google_token_failed")

    info_res = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    info = info_res.json()
    google_id = info.get("sub")
    email     = info.get("email", "").lower()
    first     = info.get("given_name",  "")
    last      = info.get("family_name", "")
    picture   = info.get("picture",     "")

    user = query_one("SELECT * FROM users WHERE google_id = %s", (google_id,))
    if not user:
        user = query_one("SELECT * FROM users WHERE email = %s", (email,))

    if user:
        execute(
            "UPDATE users SET google_id=%s, auth_provider='google', profile_picture=%s, last_login=NOW() WHERE id=%s",
            (google_id, picture, user["id"])
        )
        user_id   = user["id"]
        full_name = f"{user['first_name']} {user['last_name']}"
    else:
        base_username = email.split("@")[0].lower().replace(".", "_")
        username = base_username
        count = 1
        while query_one("SELECT id FROM users WHERE username=%s", (username,)):
            username = f"{base_username}{count}"; count += 1

        user_id = execute(
            "INSERT INTO users (first_name, last_name, username, email, google_id, auth_provider, profile_picture) "
            "VALUES (%s, %s, %s, %s, %s, 'google', %s)",
            (first, last, username, email, google_id, picture)
        )
        full_name = f"{first} {last}"

    session["user_id"]    = user_id
    session["user_name"]  = full_name
    session["user_email"] = email
    return redirect("/dashboard")


# ══════════════════════════════════════════
# SUBJECTS
# ══════════════════════════════════════════

@app.route("/api/subjects", methods=["GET"])
@login_required
def get_subjects():
    rows = query_all(
        "SELECT * FROM subjects WHERE user_id=%s ORDER BY created_at DESC",
        (session["user_id"],)
    )
    result = []
    for r in rows:
        r = dict(r)
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
        result.append(r)
    return jsonify(result)


@app.route("/api/subjects", methods=["POST"])
@login_required
def create_subject():
    data  = request.get_json()
    name  = data.get("name", "").strip()
    color = data.get("color", "#8b7cf8")
    if not name:
        return jsonify({"error": "Subject name is required."}), 400
    sid = execute(
        "INSERT INTO subjects (user_id, name, color) VALUES (%s, %s, %s)",
        (session["user_id"], name, color)
    )
    return jsonify({"id": sid, "name": name, "color": color}), 201


@app.route("/api/subjects/<int:sid>", methods=["DELETE"])
@login_required
def delete_subject(sid):
    subject = query_one(
        "SELECT id FROM subjects WHERE id=%s AND user_id=%s",
        (sid, session["user_id"])
    )
    if not subject:
        return jsonify({"error": "Subject not found."}), 404
    execute("DELETE FROM subjects WHERE id=%s", (sid,))
    return jsonify({"message": "Subject deleted."})


# ══════════════════════════════════════════
# STUDY SESSIONS
# ══════════════════════════════════════════

@app.route("/api/sessions", methods=["GET"])
@login_required
def get_sessions():
    rows = query_all(
        """SELECT ss.*, s.name AS subject_name, s.color AS subject_color
           FROM study_sessions ss
           LEFT JOIN subjects s ON ss.subject_id = s.id
           WHERE ss.user_id=%s
           ORDER BY ss.session_date DESC, ss.created_at DESC
           LIMIT 100""",
        (session["user_id"],)
    )
    result = []
    for r in rows:
        r = dict(r)
        if r.get("session_date"):
            r["session_date"] = str(r["session_date"])
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
        result.append(r)
    return jsonify(result)


@app.route("/api/sessions", methods=["POST"])
@login_required
def create_session():
    data     = request.get_json()
    duration = int(data.get("duration_minutes", 0))
    subj_id  = data.get("subject_id") or None
    notes    = data.get("notes", "").strip()
    if duration < 1:
        return jsonify({"error": "Duration must be at least 1 minute."}), 400
    today = date.today()
    hour  = datetime.now().hour
    sid = execute(
        "INSERT INTO study_sessions (user_id, subject_id, duration_minutes, session_date, session_hour, notes) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (session["user_id"], subj_id, duration, today, hour, notes)
    )
    execute("UPDATE users SET score=score+%s WHERE id=%s", (duration, session["user_id"]))
    return jsonify({"id": sid, "message": "Session logged."}), 201


@app.route("/api/sessions/weekly", methods=["GET"])
@login_required
def sessions_weekly():
    rows = query_all(
        """SELECT session_date, SUM(duration_minutes) AS total_minutes
           FROM study_sessions
           WHERE user_id=%s AND session_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
           GROUP BY session_date ORDER BY session_date""",
        (session["user_id"],)
    )
    return jsonify({str(r["session_date"]): int(r["total_minutes"]) for r in rows})


@app.route("/api/sessions/monthly", methods=["GET"])
@login_required
def sessions_monthly():
    rows = query_all(
        """SELECT session_date, SUM(duration_minutes) AS total_minutes
           FROM study_sessions
           WHERE user_id=%s AND session_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
           GROUP BY session_date ORDER BY session_date""",
        (session["user_id"],)
    )
    return jsonify({str(r["session_date"]): int(r["total_minutes"]) for r in rows})


@app.route("/api/sessions/heatmap", methods=["GET"])
@login_required
def sessions_heatmap():
    rows = query_all(
        """SELECT session_date, SUM(duration_minutes) AS total_minutes
           FROM study_sessions
           WHERE user_id=%s AND session_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
           GROUP BY session_date""",
        (session["user_id"],)
    )
    return jsonify({str(r["session_date"]): int(r["total_minutes"]) for r in rows})


@app.route("/api/sessions/peak-hours", methods=["GET"])
@login_required
def sessions_peak_hours():
    rows = query_all(
        """SELECT session_hour, SUM(duration_minutes) AS total_minutes
           FROM study_sessions
           WHERE user_id=%s
           GROUP BY session_hour ORDER BY session_hour""",
        (session["user_id"],)
    )
    return jsonify({int(r["session_hour"]): int(r["total_minutes"]) for r in rows})


@app.route("/api/sessions/subject-breakdown", methods=["GET"])
@login_required
def sessions_subject_breakdown():
    rows = query_all(
        """SELECT s.name, s.color, SUM(ss.duration_minutes) AS total_minutes
           FROM study_sessions ss
           JOIN subjects s ON ss.subject_id=s.id
           WHERE ss.user_id=%s
           GROUP BY s.id, s.name, s.color
           ORDER BY total_minutes DESC""",
        (session["user_id"],)
    )
    return jsonify([dict(r) for r in rows])


# ══════════════════════════════════════════
# STATS
# ══════════════════════════════════════════

@app.route("/api/stats", methods=["GET"])
@login_required
def get_stats():
    uid = session["user_id"]
    subjects  = query_one("SELECT COUNT(*) AS cnt FROM subjects WHERE user_id=%s", (uid,))
    flashcards = query_one("SELECT COUNT(*) AS cnt FROM flashcards WHERE user_id=%s", (uid,))
    total_time = query_one(
        "SELECT COALESCE(SUM(duration_minutes),0) AS total FROM study_sessions WHERE user_id=%s", (uid,)
    )
    user_info = query_one("SELECT created_at FROM users WHERE id=%s", (uid,))

    # Calculate streak
    streak_rows = query_all(
        "SELECT DISTINCT session_date FROM study_sessions WHERE user_id=%s ORDER BY session_date DESC LIMIT 365",
        (uid,)
    )
    streak = 0
    if streak_rows:
        check_date = date.today()
        for r in streak_rows:
            d = r["session_date"] if isinstance(r["session_date"], date) else date.fromisoformat(str(r["session_date"]))
            if d == check_date:
                streak += 1
                check_date = check_date - timedelta(days=1)
            else:
                break

    posts_count    = query_one("SELECT COUNT(*) AS cnt FROM posts WHERE user_id=%s", (uid,))
    likes_received = query_one(
        "SELECT COALESCE(SUM(like_count),0) AS cnt FROM posts WHERE user_id=%s", (uid,)
    )
    member_since = str(user_info["created_at"]) if user_info and user_info.get("created_at") else None

    return jsonify({
        "subjects":      subjects["cnt"] if subjects else 0,
        "flashcards":    flashcards["cnt"] if flashcards else 0,
        "total_minutes": int(total_time["total"]) if total_time else 0,
        "streak":        max(streak, 1),
        "created_at":    member_since,
        "member_since":  member_since,
        "posts":         posts_count["cnt"] if posts_count else 0,
        "likes":         int(likes_received["cnt"]) if likes_received else 0,
    })


# ══════════════════════════════════════════
# FLASHCARDS
# ══════════════════════════════════════════

@app.route("/api/flashcards", methods=["GET"])
@login_required
def get_flashcards():
    subj = request.args.get("subject_id")
    if subj:
        rows = query_all(
            "SELECT f.*, s.name AS subject_name FROM flashcards f "
            "LEFT JOIN subjects s ON f.subject_id=s.id "
            "WHERE f.user_id=%s AND f.subject_id=%s ORDER BY f.created_at DESC",
            (session["user_id"], subj)
        )
    else:
        rows = query_all(
            "SELECT f.*, s.name AS subject_name FROM flashcards f "
            "LEFT JOIN subjects s ON f.subject_id=s.id "
            "WHERE f.user_id=%s ORDER BY f.created_at DESC",
            (session["user_id"],)
        )
    result = []
    for r in rows:
        r = dict(r)
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
        result.append(r)
    return jsonify(result)


@app.route("/api/flashcards", methods=["POST"])
@login_required
def create_flashcard():
    data    = request.get_json()
    front   = data.get("front", "").strip()
    back    = data.get("back", "").strip()
    subj_id = data.get("subject_id") or None
    if not front or not back:
        return jsonify({"error": "Front and back are required."}), 400
    fid = execute(
        "INSERT INTO flashcards (user_id, subject_id, front, back) VALUES (%s, %s, %s, %s)",
        (session["user_id"], subj_id, front, back)
    )
    return jsonify({"id": fid, "front": front, "back": back}), 201


@app.route("/api/flashcards/<int:fid>/review", methods=["POST"])
@login_required
def review_flashcard(fid):
    data    = request.get_json()
    correct = bool(data.get("correct", False))
    card = query_one("SELECT id FROM flashcards WHERE id=%s AND user_id=%s", (fid, session["user_id"]))
    if not card:
        return jsonify({"error": "Not found."}), 404
    if correct:
        execute("UPDATE flashcards SET review_count=review_count+1, correct_count=correct_count+1 WHERE id=%s", (fid,))
    else:
        execute("UPDATE flashcards SET review_count=review_count+1 WHERE id=%s", (fid,))
    return jsonify({"message": "Reviewed."})


@app.route("/api/flashcards/<int:fid>", methods=["DELETE"])
@login_required
def delete_flashcard(fid):
    card = query_one("SELECT id FROM flashcards WHERE id=%s AND user_id=%s", (fid, session["user_id"]))
    if not card:
        return jsonify({"error": "Not found."}), 404
    execute("DELETE FROM flashcards WHERE id=%s", (fid,))
    return jsonify({"message": "Deleted."})


# ══════════════════════════════════════════
# POSTS / COMMUNITY FEED
# ══════════════════════════════════════════

@app.route("/api/posts", methods=["GET"])
@login_required
def get_posts():
    uid     = session["user_id"]
    filter_ = request.args.get("filter", "all")
    topic   = request.args.get("topic", "all")

    base   = """
        SELECT p.*, u.first_name, u.last_name, u.username, u.profile_picture,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id=p.id AND pl.user_id=%s) AS user_liked
        FROM posts p JOIN users u ON p.user_id=u.id
    """
    params = [uid]
    conditions = []

    if filter_ == "my":
        conditions.append("p.user_id=%s"); params.append(uid)
    elif filter_ == "user":
        username = request.args.get("user", "")
        conditions.append("u.username=%s"); params.append(username)

    if topic and topic != "all":
        conditions.append("p.topic=%s"); params.append(topic)

    if conditions:
        base += " WHERE " + " AND ".join(conditions)
    base += " ORDER BY p.created_at DESC LIMIT 50"

    rows = query_all(base, tuple(params))
    result = []
    for r in rows:
        r = dict(r)
        r["user_liked"] = bool(r["user_liked"])
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
        result.append(r)
    return jsonify(result)


@app.route("/api/posts", methods=["POST"])
@login_required
def create_post():
    data  = request.get_json()
    title = data.get("title", "").strip()
    body  = data.get("body", "").strip()
    topic = data.get("topic", "General")
    if not title or not body:
        return jsonify({"error": "Title and body are required."}), 400
    if topic not in ["General", "Math", "Science", "Notes", "Help Needed"]:
        topic = "General"
    pid = execute(
        "INSERT INTO posts (user_id, title, body, topic) VALUES (%s, %s, %s, %s)",
        (session["user_id"], title, body, topic)
    )
    execute("UPDATE users SET score=score+10 WHERE id=%s", (session["user_id"],))
    return jsonify({"id": pid, "message": "Post created."}), 201


@app.route("/api/posts/<int:pid>/like", methods=["POST"])
@login_required
def toggle_like(pid):
    uid = session["user_id"]
    existing = query_one("SELECT id FROM post_likes WHERE user_id=%s AND post_id=%s", (uid, pid))
    if existing:
        execute("DELETE FROM post_likes WHERE user_id=%s AND post_id=%s", (uid, pid))
        execute("UPDATE posts SET like_count=GREATEST(like_count-1,0) WHERE id=%s", (pid,))
        liked = False
    else:
        execute("INSERT INTO post_likes (user_id, post_id) VALUES (%s, %s)", (uid, pid))
        execute("UPDATE posts SET like_count=like_count+1 WHERE id=%s", (pid,))
        liked = True
    count = query_one("SELECT like_count FROM posts WHERE id=%s", (pid,))
    return jsonify({"liked": liked, "count": count["like_count"] if count else 0})


@app.route("/api/posts/<int:pid>/comments", methods=["GET"])
@login_required
def get_comments(pid):
    rows = query_all(
        """SELECT c.*, u.first_name, u.last_name, u.username, u.profile_picture
           FROM comments c JOIN users u ON c.user_id=u.id
           WHERE c.post_id=%s ORDER BY c.created_at ASC""",
        (pid,)
    )
    result = []
    for r in rows:
        r = dict(r)
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
        result.append(r)
    return jsonify(result)


@app.route("/api/posts/<int:pid>/comments", methods=["POST"])
@login_required
def create_comment(pid):
    data = request.get_json()
    body = data.get("body", "").strip()
    if not body:
        return jsonify({"error": "Comment body is required."}), 400
    cid = execute(
        "INSERT INTO comments (post_id, user_id, body) VALUES (%s, %s, %s)",
        (pid, session["user_id"], body)
    )
    execute("UPDATE posts SET comment_count=comment_count+1 WHERE id=%s", (pid,))
    return jsonify({"id": cid, "message": "Comment added."}), 201


@app.route("/api/posts/<int:pid>", methods=["DELETE"])
@login_required
def delete_post(pid):
    post = query_one("SELECT id FROM posts WHERE id=%s AND user_id=%s", (pid, session["user_id"]))
    if not post:
        return jsonify({"error": "Not found."}), 404
    execute("DELETE FROM posts WHERE id=%s", (pid,))
    return jsonify({"message": "Post deleted."})


# ══════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════

@app.route("/api/notifications", methods=["GET"])
@login_required
def get_notifications():
    uid = session["user_id"]
    rows = query_all(
        "SELECT * FROM notifications WHERE user_id=%s ORDER BY created_at DESC LIMIT 30",
        (uid,)
    )
    unread = query_one(
        "SELECT COUNT(*) AS cnt FROM notifications WHERE user_id=%s AND is_read=0", (uid,)
    )
    result = []
    for r in rows:
        r = dict(r)
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
        result.append(r)
    return jsonify({"notifications": result, "unread": unread["cnt"] if unread else 0})


@app.route("/api/notifications/<int:nid>/read", methods=["POST"])
@login_required
def mark_notification_read(nid):
    execute("UPDATE notifications SET is_read=1 WHERE id=%s AND user_id=%s", (nid, session["user_id"]))
    return jsonify({"message": "Marked as read."})


@app.route("/api/notifications/read-all", methods=["POST"])
@login_required
def mark_all_notifications_read():
    execute("UPDATE notifications SET is_read=1 WHERE user_id=%s", (session["user_id"],))
    return jsonify({"message": "All marked as read."})


# ══════════════════════════════════════════
# MESSAGES
# ══════════════════════════════════════════

@app.route("/api/messages", methods=["GET"])
@login_required
def get_messages():
    uid   = session["user_id"]
    other = request.args.get("user")
    if other:
        other_user = query_one("SELECT id FROM users WHERE username=%s", (other,))
        if not other_user:
            return jsonify([])
        rows = query_all(
            """SELECT m.*, u.first_name, u.last_name, u.username, u.profile_picture
               FROM messages m JOIN users u ON m.sender_id=u.id
               WHERE (m.sender_id=%s AND m.receiver_id=%s) OR (m.sender_id=%s AND m.receiver_id=%s)
               ORDER BY m.created_at ASC LIMIT 100""",
            (uid, other_user["id"], other_user["id"], uid)
        )
    else:
        rows = query_all(
            """SELECT m.*, u.first_name, u.last_name, u.username, u.profile_picture
               FROM messages m
               JOIN users u ON (CASE WHEN m.sender_id=%s THEN m.receiver_id ELSE m.sender_id END)=u.id
               WHERE m.sender_id=%s OR m.receiver_id=%s
               ORDER BY m.created_at DESC LIMIT 50""",
            (uid, uid, uid)
        )
    result = []
    for r in rows:
        r = dict(r)
        if r.get("created_at"):
            r["created_at"] = str(r["created_at"])
        result.append(r)
    return jsonify(result)


@app.route("/api/messages", methods=["POST"])
@login_required
def send_message():
    data     = request.get_json()
    receiver = data.get("to", "")
    body     = data.get("body", "").strip()
    if not receiver or not body:
        return jsonify({"error": "Recipient and body are required."}), 400
    recv_user = query_one("SELECT id FROM users WHERE username=%s", (receiver,))
    if not recv_user:
        return jsonify({"error": "User not found."}), 404
    mid = execute(
        "INSERT INTO messages (sender_id, receiver_id, body) VALUES (%s, %s, %s)",
        (session["user_id"], recv_user["id"], body)
    )
    return jsonify({"id": mid, "message": "Sent."}), 201


# ══════════════════════════════════════════
# LEADERBOARD
# ══════════════════════════════════════════

@app.route("/api/leaderboard", methods=["GET"])
@login_required
def get_leaderboard():
    rows = query_all(
        """SELECT u.id, u.first_name, u.last_name, u.username, u.profile_picture, u.score,
                  (SELECT COUNT(*) FROM posts WHERE user_id=u.id) AS post_count,
                  (SELECT COALESCE(SUM(like_count),0) FROM posts WHERE user_id=u.id) AS like_count
           FROM users u WHERE u.is_active=1
           ORDER BY u.score DESC LIMIT 20""",
        ()
    )
    return jsonify([dict(r) for r in rows])


# ══════════════════════════════════════════
# ONLINE USERS & HEARTBEAT
# ══════════════════════════════════════════

@app.route("/api/online", methods=["GET"])
@login_required
def get_online_users():
    execute("UPDATE users SET last_active=NOW() WHERE id=%s", (session["user_id"],))
    rows = query_all(
        """SELECT id, first_name, last_name, username, profile_picture
           FROM users
           WHERE last_active >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) AND is_active=1
           ORDER BY last_active DESC LIMIT 20""",
        ()
    )
    return jsonify([dict(r) for r in rows])


@app.route("/api/heartbeat", methods=["POST"])
@login_required
def heartbeat():
    execute("UPDATE users SET last_active=NOW() WHERE id=%s", (session["user_id"],))
    return jsonify({"ok": True})


# ══════════════════════════════════════════
# SEARCH
# ══════════════════════════════════════════

@app.route("/api/search", methods=["GET"])
@login_required
def search():
    q = request.args.get("q", "").strip()
    if len(q) < 2:
        return jsonify({"users": [], "posts": []})
    like = f"%{q}%"
    users = query_all(
        """SELECT id, first_name, last_name, username, profile_picture
           FROM users WHERE (first_name LIKE %s OR last_name LIKE %s OR username LIKE %s)
           AND is_active=1 LIMIT 10""",
        (like, like, like)
    )
    posts = query_all(
        """SELECT p.id, p.title, p.topic, u.username, u.first_name, u.last_name
           FROM posts p JOIN users u ON p.user_id=u.id
           WHERE p.title LIKE %s OR p.body LIKE %s
           ORDER BY p.created_at DESC LIMIT 10""",
        (like, like)
    )
    return jsonify({"users": [dict(r) for r in users], "posts": [dict(r) for r in posts]})


# ══════════════════════════════════════════
# FOLLOWERS  (auto-creates follows table if missing)
# ══════════════════════════════════════════

def ensure_follows_table():
    try:
        db = get_db()
        cur = db.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS follows (
                id INT AUTO_INCREMENT PRIMARY KEY,
                follower_id INT NOT NULL,
                following_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_follow (follower_id, following_id),
                FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        db.commit()
        cur.close(); db.close()
    except Exception:
        pass


@app.route("/api/followers/counts", methods=["GET"])
@login_required
def follower_counts():
    ensure_follows_table()
    uid = session["user_id"]
    try:
        followers = query_one("SELECT COUNT(*) AS cnt FROM follows WHERE following_id=%s", (uid,))
        following = query_one("SELECT COUNT(*) AS cnt FROM follows WHERE follower_id=%s", (uid,))
        return jsonify({
            "followers": followers["cnt"] if followers else 0,
            "following": following["cnt"] if following else 0,
        })
    except Exception:
        return jsonify({"followers": 0, "following": 0})


@app.route("/api/users/<username>/follow", methods=["POST"])
@login_required
def follow_user(username):
    ensure_follows_table()
    uid    = session["user_id"]
    target = query_one("SELECT id FROM users WHERE username=%s", (username,))
    if not target:
        return jsonify({"error": "User not found."}), 404
    if target["id"] == uid:
        return jsonify({"error": "Cannot follow yourself."}), 400
    existing = query_one(
        "SELECT id FROM follows WHERE follower_id=%s AND following_id=%s", (uid, target["id"])
    )
    if existing:
        execute("DELETE FROM follows WHERE follower_id=%s AND following_id=%s", (uid, target["id"]))
        return jsonify({"following": False})
    else:
        execute("INSERT INTO follows (follower_id, following_id) VALUES (%s,%s)", (uid, target["id"]))
        return jsonify({"following": True})


@app.route("/api/users/<username>", methods=["GET"])
@login_required
def get_user_profile(username):
    ensure_follows_table()
    uid  = session["user_id"]
    user = query_one(
        "SELECT id, first_name, last_name, username, profile_picture, score, created_at "
        "FROM users WHERE username=%s AND is_active=1",
        (username,)
    )
    if not user:
        return jsonify({"error": "User not found."}), 404
    user = dict(user)
    if user.get("created_at"):
        user["created_at"] = str(user["created_at"])
    try:
        followers   = query_one("SELECT COUNT(*) AS cnt FROM follows WHERE following_id=%s", (user["id"],))
        following   = query_one("SELECT COUNT(*) AS cnt FROM follows WHERE follower_id=%s", (user["id"],))
        is_following = query_one(
            "SELECT id FROM follows WHERE follower_id=%s AND following_id=%s", (uid, user["id"])
        )
        user["followers_count"] = followers["cnt"] if followers else 0
        user["following_count"] = following["cnt"] if following else 0
        user["is_following"]    = bool(is_following)
    except Exception:
        user["followers_count"] = 0
        user["following_count"] = 0
        user["is_following"]    = False
    posts_count = query_one("SELECT COUNT(*) AS cnt FROM posts WHERE user_id=%s", (user["id"],))
    user["posts_count"] = posts_count["cnt"] if posts_count else 0
    return jsonify(user)


# ══════════════════════════════════════════
# PROFILE PHOTO
# ══════════════════════════════════════════

@app.route("/api/profile/photo", methods=["POST"])
@login_required
def update_profile_photo():
    url = ""

    ct = request.content_type or ""
    if "application/json" in ct:
        data = request.get_json(silent=True, force=True) or {}
        url  = (data.get("url") or data.get("avatar_data") or "").strip()

    if not url and "photo" in request.files:
        import base64
        f    = request.files["photo"]
        b64  = base64.b64encode(f.read()).decode()
        mime = f.content_type or "image/jpeg"
        url  = f"data:{mime};base64,{b64}"

    if not url:
        return jsonify({"error": "No photo provided."}), 400

    if not (url.startswith("data:image/") or url.startswith("http")):
        return jsonify({"error": "Invalid image data."}), 400

    try:
        execute("UPDATE users SET profile_picture=%s WHERE id=%s", (url, session["user_id"]))
    except Exception as exc:
        app.logger.error("Avatar save failed: %s", exc)
        return jsonify({"error": "Database error saving photo."}), 500

    return jsonify({"url": url, "message": "Profile photo updated."})


@app.route("/api/profile/update", methods=["POST"])
@login_required
def update_profile():
    data       = request.get_json()
    first_name = data.get("first_name", "").strip()
    last_name  = data.get("last_name",  "").strip()
    username   = data.get("username",  "").strip().lower()

    if not first_name or not last_name or not username:
        return jsonify({"error": "All fields are required."}), 400

    uid = session["user_id"]

    # Check username uniqueness (excluding current user)
    existing = query_one(
        "SELECT id FROM users WHERE username=%s AND id != %s", (username, uid)
    )
    if existing:
        return jsonify({"error": "Username is already taken."}), 409

    execute(
        "UPDATE users SET first_name=%s, last_name=%s, username=%s WHERE id=%s",
        (first_name, last_name, username, uid)
    )
    session["user_name"] = f"{first_name} {last_name}"
    return jsonify({"message": "Profile updated.", "first_name": first_name,
                    "last_name": last_name, "username": username})


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)