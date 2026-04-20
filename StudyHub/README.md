# StudyHub — Setup Guide

## Project Structure
```
studyhub/
├── app.py                  # Flask backend
├── schema.sql              # MySQL database setup
├── requirements.txt        # Python dependencies
├── .env.example            # Environment variables template
├── templates/
│   ├── index.html          # Login / Sign up page
│   └── dashboard.html      # Post-login dashboard
└── static/
    ├── css/
    │   ├── auth.css        # Auth page styles
    │   └── dashboard.css   # Dashboard styles
    └── js/
        └── auth.js         # Form validation & API calls
```

---

## 1 — MySQL Setup

```sql
-- In MySQL shell or Workbench:
SOURCE schema.sql;
```

---

## 2 — Environment Variables

```bash
cp .env.example .env
# Edit .env with your credentials
```

Key values to set:
- `DB_USER` / `DB_PASS` — your MySQL credentials
- `SECRET_KEY` — any long random string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console

---

## 3 — Google OAuth Setup (optional)

1. Go to https://console.cloud.google.com
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID → Web Application
4. Add Authorized Redirect URI: `http://localhost:5000/auth/google/callback`
5. Copy Client ID and Secret into your `.env`

---

## 4 — Install Python Dependencies

```bash
pip install -r requirements.txt
```

> On Ubuntu/Debian you may also need:
> `sudo apt-get install python3-dev default-libmysqlclient-dev build-essential`

---

## 5 — Run the App

```bash
python app.py
```

Open http://localhost:5000 in your browser.

---

## Features
- Sign in with username or email + password
- Sign up with username, email, and password
- Sign in / Sign up with Google OAuth
- Password strength indicator
- Show/hide password toggle
- Client-side and server-side validation
- Secure password hashing (Werkzeug)
- MySQL user storage
- Session management
- Protected dashboard route
