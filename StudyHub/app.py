"""
StudyHub - Flask Backend
pip install flask flask-mysqldb werkzeug requests python-dotenv
"""

import os
import secrets
import requests
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

# ── Session / security config ──────────────────────────────────────────────────
app.secret_key = os.getenv("SECRET_KEY", "studyhub-secret-2026")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"]   = False   # set True only when using HTTPS
app.config["PERMANENT_SESSION_LIFETIME"] = 86400 * 7  # 7 days

# ── Database config ────────────────────────────────────────────────────────────
DB_CONFIG = {
    "host":    os.getenv("DB_HOST", "localhost"),
    "user":    os.getenv("DB_USER", "root"),
    "passwd":  os.getenv("DB_PASS", ""),
    "db":      os.getenv("DB_NAME", "studyhub"),
    "charset": "utf8mb4",
}

# ── Google OAuth config ────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID",     "YOUR_GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "YOUR_GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI  = os.getenv("GOOGLE_REDIRECT_URI",  "http://localhost:5000/auth/google/callback")


# ── DB helpers ─────────────────────────────────────────────────────────────────
def get_db():
    try:
        return MySQLdb.connect(**DB_CONFIG)
    except MySQLdb.Error as e:
        app.logger.error(f"DB connection failed: {e}")
        raise


def query_one(sql, params=()):
    db = get_db()
    try:
        cur = db.cursor(MySQLdb.cursors.DictCursor)
        cur.execute(sql, params)
        return cur.fetchone()
    finally:
        cur.close()
        db.close()


def execute(sql, params=()):
    db = get_db()
    try:
        cur = db.cursor()
        cur.execute(sql, params)
        db.commit()
        return cur.lastrowid
    finally:
        cur.close()
        db.close()


# ── Auth decorator ─────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("index"))
        return f(*args, **kwargs)
    return decorated


# ── Page routes ────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("index.html")


@app.route("/login")
def login_page():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("index.html")


@app.route("/signup")
def signup_page():
    if "user_id" in session:
        return redirect(url_for("dashboard"))
    return render_template("signup.html")


@app.route("/dashboard")
@login_required
def dashboard():
    user = query_one("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    if not user:
        session.clear()
        return redirect(url_for("index"))
    return render_template("dashboard.html", user=user)


# ── API: Sign up ───────────────────────────────────────────────────────────────
@app.route("/api/signup", methods=["POST"])
def api_signup():
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({"error": "Invalid request."}), 400

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
    try:
        execute(
            "INSERT INTO users (first_name, last_name, username, email, password_hash, auth_provider) "
            "VALUES (%s, %s, %s, %s, %s, 'local')",
            (first_name, last_name, username, email, pw_hash)
        )
    except MySQLdb.Error as e:
        app.logger.error(f"Signup DB error: {e}")
        return jsonify({"error": "Database error. Please try again."}), 500

    return jsonify({
        "message":  "Account created! Please sign in.",
        "redirect": "/login?registered=1"
    }), 201


# ── API: Login ─────────────────────────────────────────────────────────────────
@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({"error": "Invalid request."}), 400

    identifier = data.get("identifier", "").strip().lower()
    password   = data.get("password",   "")

    if not identifier or not password:
        return jsonify({"error": "Please fill in all fields."}), 400

    try:
        user = query_one(
            "SELECT * FROM users WHERE (email = %s OR username = %s) AND auth_provider = 'local'",
            (identifier, identifier)
        )
    except MySQLdb.Error as e:
        app.logger.error(f"Login DB error: {e}")
        return jsonify({"error": "Database error. Please try again."}), 500

    if not user:
        return jsonify({
            "error": "No account found with that username or email.",
            "code":  "not_registered"
        }), 404

    if not check_password_hash(user["password_hash"] or "", password):
        return jsonify({"error": "Incorrect password. Please try again."}), 401

    execute("UPDATE users SET last_login = NOW() WHERE id = %s", (user["id"],))

    session.permanent = True
    session["user_id"]    = user["id"]
    session["user_name"]  = f"{user['first_name']} {user['last_name']}"
    session["user_email"] = user["email"]

    return jsonify({"message": "Logged in!", "redirect": "/dashboard"})


# ── API: Logout ────────────────────────────────────────────────────────────────
@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"redirect": "/"})


# ── API: Stats ─────────────────────────────────────────────────────────────────
@app.route("/api/stats")
@login_required
def api_stats():
    user = query_one("SELECT created_at, last_login FROM users WHERE id = %s", (session["user_id"],))
    return jsonify({
        "subjects":     0,
        "flashcards":   0,
        "study_hours":  0,
        "streak":       1,
        "weekly_goal":  10,
        "weekly_done":  0,
        "member_since": str(user["created_at"]) if user else "",
        "last_login":   str(user["last_login"])  if user else "",
    })


# ── Google OAuth ───────────────────────────────────────────────────────────────
@app.route("/auth/google")
def auth_google():
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        "&response_type=code"
        "&scope=openid%20email%20profile"
        "&access_type=offline"
    )
    return redirect(url)


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
    tokens       = token_res.json()
    access_token = tokens.get("access_token")
    if not access_token:
        return redirect("/?error=google_token_failed")

    info_res = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    info      = info_res.json()
    google_id = info.get("sub")
    email     = info.get("email", "").lower()
    first     = info.get("given_name",  "")
    last      = info.get("family_name", "")
    picture   = info.get("picture",     "")

    try:
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
            count    = 1
            while query_one("SELECT id FROM users WHERE username=%s", (username,)):
                username = f"{base_username}{count}"
                count   += 1
            user_id = execute(
                "INSERT INTO users (first_name, last_name, username, email, google_id, auth_provider, profile_picture) "
                "VALUES (%s, %s, %s, %s, %s, 'google', %s)",
                (first, last, username, email, google_id, picture)
            )
            full_name = f"{first} {last}"
    except MySQLdb.Error as e:
        app.logger.error(f"Google OAuth DB error: {e}")
        return redirect("/?error=server_error")

    session.permanent = True
    session["user_id"]    = user_id
    session["user_name"]  = full_name
    session["user_email"] = email
    return redirect("/dashboard")


# ── Run ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, host="localhost", port=5000)
