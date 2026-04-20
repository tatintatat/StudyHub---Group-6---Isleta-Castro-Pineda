"""
StudyHub - Flask Backend
Dependencies: pip install flask flask-mysqldb werkzeug requests python-dotenv
"""

import os
import json
import secrets
import requests
from datetime import datetime, timedelta
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

# ── Database config (edit .env or change defaults below) ─────────────────────
DB_CONFIG = {
    "host":   os.getenv("DB_HOST",   "localhost"),
    "user":   os.getenv("DB_USER",   "root"),
    "passwd": os.getenv("DB_PASS",   ""),
    "db":     os.getenv("DB_NAME",   "studyhub"),
    "charset": "utf8mb4",
}

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


# ── Auth decorator ────────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return redirect(url_for("login"))
        return f(*args, **kwargs)
    return decorated


# ── Routes ────────────────────────────────────────────────────────────────────

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
@login_required
def dashboard():
    user = query_one("SELECT * FROM users WHERE id = %s", (session["user_id"],))
    return render_template("dashboard.html", user=user)


# ── Local auth ────────────────────────────────────────────────────────────────

@app.route("/api/signup", methods=["POST"])
def api_signup():
    data = request.get_json()
    first_name = data.get("first_name", "").strip()
    last_name  = data.get("last_name",  "").strip()
    username   = data.get("username",   "").strip().lower()
    email      = data.get("email",      "").strip().lower()
    password   = data.get("password",   "")

    # Basic validation
    if not all([first_name, last_name, username, email, password]):
        return jsonify({"error": "All fields are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400

    # Duplicate checks
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
    identifier = data.get("identifier", "").strip().lower()   # username or email
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
    """Redirect to Google's OAuth consent screen."""
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

    # Exchange code for tokens
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

    # Fetch user info from Google
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

    # Upsert user
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


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)