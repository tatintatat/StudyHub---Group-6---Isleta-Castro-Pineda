"""
backup_service.py
─────────────────────────────────────────────────────────────────
StudyHub · MySQL Auto-Backup Service
Runs scheduled backups: hourly, daily, and weekly.
Backups are saved to ~/backups/studyhub/ as .sql files.

Schedules:
    Hourly  → every 60 minutes  (keeps last 24)
    Daily   → every day at midnight (keeps last 7)
    Weekly  → every Sunday at 00:05 (keeps last 4)

Usage:
    Automatically started when app.py runs.
    Or manually: python backup_service.py
─────────────────────────────────────────────────────────────────
"""

import os
import glob
import logging
import subprocess
import threading
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────
BACKUP_DIR   = Path.home() / "backups" / "studyhub"

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "")
DB_NAME = os.getenv("DB_NAME", "studyhub")

# How many backups of each type to keep
KEEP_HOURLY  = 24   # last 24 hours
KEEP_DAILY   = 7    # last 7 days
KEEP_WEEKLY  = 4    # last 4 weeks


# ══════════════════════════════════════════════════════════════
# Core backup logic
# ══════════════════════════════════════════════════════════════

def _ensure_dir():
    """Create backup directory if it doesn't exist."""
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    (BACKUP_DIR / "hourly").mkdir(exist_ok=True)
    (BACKUP_DIR / "daily").mkdir(exist_ok=True)
    (BACKUP_DIR / "weekly").mkdir(exist_ok=True)


def _run_mysqldump(output_path: Path) -> bool:
    """
    Run mysqldump and write to output_path.
    Returns True on success, False on failure.
    """
    cmd = ["mysqldump", f"--host={DB_HOST}", f"--user={DB_USER}"]

    if DB_PASS:
        cmd.append(f"--password={DB_PASS}")

    cmd += [
        "--single-transaction",   # consistent snapshot without locking
        "--routines",             # include stored procedures
        "--triggers",             # include triggers
        "--add-drop-table",       # safe restores
        DB_NAME,
    ]

    try:
        with open(output_path, "w", encoding="utf-8") as f:
            result = subprocess.run(
                cmd,
                stdout=f,
                stderr=subprocess.PIPE,
                timeout=120,
            )

        if result.returncode != 0:
            err = result.stderr.decode("utf-8", errors="replace")
            logger.error("[Backup] mysqldump failed: %s", err)
            # Remove empty/partial file
            if output_path.exists():
                output_path.unlink()
            return False

        size_kb = output_path.stat().st_size // 1024
        logger.info("[Backup] ✅ Saved: %s (%d KB)", output_path.name, size_kb)
        return True

    except FileNotFoundError:
        logger.error("[Backup] ❌ mysqldump not found. Install MySQL client tools.")
        return False
    except subprocess.TimeoutExpired:
        logger.error("[Backup] ❌ mysqldump timed out after 120 seconds.")
        if output_path.exists():
            output_path.unlink()
        return False
    except Exception as exc:
        logger.error("[Backup] ❌ Unexpected error: %s", exc)
        return False


def _prune_old(folder: Path, keep: int, pattern: str = "*.sql"):
    """Delete oldest backup files, keeping only `keep` most recent."""
    files = sorted(folder.glob(pattern))
    to_delete = files[: max(0, len(files) - keep)]
    for f in to_delete:
        f.unlink()
        logger.info("[Backup] 🗑️  Pruned old backup: %s", f.name)


def do_backup(backup_type: str) -> bool:
    """
    Perform a backup of the given type: 'hourly', 'daily', or 'weekly'.
    Returns True on success.
    """
    _ensure_dir()
    now       = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    filename  = f"{DB_NAME}_{backup_type}_{timestamp}.sql"
    folder    = BACKUP_DIR / backup_type
    output    = folder / filename

    logger.info("[Backup] Starting %s backup → %s", backup_type, filename)
    success = _run_mysqldump(output)

    if success:
        keep_map = {"hourly": KEEP_HOURLY, "daily": KEEP_DAILY, "weekly": KEEP_WEEKLY}
        _prune_old(folder, keep_map.get(backup_type, 7))

    return success


# ══════════════════════════════════════════════════════════════
# Scheduler — runs in a background daemon thread
# ══════════════════════════════════════════════════════════════

class BackupScheduler:
    """
    Lightweight scheduler that checks every minute whether
    an hourly, daily, or weekly backup is due.
    """

    def __init__(self):
        self._last_hourly  = None   # datetime of last hourly backup
        self._last_daily   = None   # date of last daily backup
        self._last_weekly  = None   # iso-week of last weekly backup
        self._thread       = None
        self._stop_event   = threading.Event()

    def start(self):
        """Start the background scheduler thread."""
        if self._thread and self._thread.is_alive():
            return  # already running

        # Run an initial backup on startup
        threading.Thread(target=self._startup_backup, daemon=True).start()

        self._stop_event.clear()
        self._thread = threading.Thread(
            target=self._loop, daemon=True, name="BackupScheduler"
        )
        self._thread.start()
        logger.info("[Backup] Scheduler started. Backups → %s", BACKUP_DIR)

    def stop(self):
        """Signal the scheduler to stop."""
        self._stop_event.set()

    # ── Internal ──────────────────────────────────────────────

    def _startup_backup(self):
        """Take a daily backup when the server first starts."""
        import time
        time.sleep(3)  # give Flask a moment to fully boot
        logger.info("[Backup] Running startup backup...")
        do_backup("daily")
        now = datetime.now()
        self._last_daily  = now.date()
        self._last_hourly = now

    def _loop(self):
        import time
        while not self._stop_event.is_set():
            try:
                self._tick()
            except Exception as exc:
                logger.error("[Backup] Scheduler error: %s", exc)
            time.sleep(60)  # check every minute

    def _tick(self):
        now = datetime.now()

        # ── Hourly: every 60 minutes ─────────────────────────
        if (
            self._last_hourly is None
            or (now - self._last_hourly).total_seconds() >= 3600
        ):
            if do_backup("hourly"):
                self._last_hourly = now

        # ── Daily: once per day at midnight (00:xx) ──────────
        if now.date() != self._last_daily and now.hour == 0:
            if do_backup("daily"):
                self._last_daily = now.date()

        # ── Weekly: every Sunday at 00:05 ─────────────────────
        iso_week = now.isocalendar()[1]   # week number
        if (
            now.weekday() == 6             # Sunday
            and now.hour == 0
            and now.minute >= 5
            and iso_week != self._last_weekly
        ):
            if do_backup("weekly"):
                self._last_weekly = iso_week


# ── Singleton ─────────────────────────────────────────────────
_scheduler = BackupScheduler()


def start_backup_scheduler():
    """Call this once from app.py to start the auto-backup service."""
    _scheduler.start()


def trigger_manual_backup(backup_type: str = "daily") -> dict:
    """
    Trigger a manual backup from a Flask route.
    Returns a dict with success status and message.
    """
    valid = {"hourly", "daily", "weekly"}
    if backup_type not in valid:
        return {"success": False, "error": f"Invalid type. Choose from: {valid}"}

    success = do_backup(backup_type)
    if success:
        return {
            "success": True,
            "message": f"{backup_type.capitalize()} backup completed.",
            "location": str(BACKUP_DIR / backup_type),
        }
    return {"success": False, "error": "Backup failed. Check server logs."}


def list_backups() -> dict:
    """Return a dict listing all existing backup files by type."""
    result = {}
    for t in ("hourly", "daily", "weekly"):
        folder = BACKUP_DIR / t
        if folder.exists():
            files = sorted(folder.glob("*.sql"), reverse=True)
            result[t] = [
                {
                    "name": f.name,
                    "size_kb": f.stat().st_size // 1024,
                    "created": datetime.fromtimestamp(f.stat().st_mtime).strftime(
                        "%Y-%m-%d %H:%M:%S"
                    ),
                }
                for f in files
            ]
        else:
            result[t] = []
    return result


# ══════════════════════════════════════════════════════════════
# Standalone run (python backup_service.py)
# ══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)s  %(message)s",
    )

    import sys
    backup_type = sys.argv[1] if len(sys.argv) > 1 else "daily"
    print(f"Running manual {backup_type} backup...")
    success = do_backup(backup_type)
    if success:
        print(f"Backup saved to: {BACKUP_DIR / backup_type}")
    else:
        print("Backup failed. Check that mysqldump is installed.")
        sys.exit(1)
