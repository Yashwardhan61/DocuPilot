import sqlite3
import json
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.config import settings

def get_connection():
    conn = sqlite3.connect(settings.DATABASE_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Notices table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS notices (
        id TEXT PRIMARY KEY,
        title TEXT,
        filename TEXT,
        raw_text TEXT,
        page_count INTEGER DEFAULT 1,
        extraction_json TEXT,
        created_at TEXT
    )
    """)

    # Student profiles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS student_profiles (
        id TEXT PRIMARY KEY,
        branch TEXT,
        year TEXT,
        cgpa REAL,
        active_backlogs INTEGER DEFAULT 0,
        updated_at TEXT
    )
    """)

    # Auto-migrate active_backlogs if table existed before
    try:
        cursor.execute("ALTER TABLE student_profiles ADD COLUMN active_backlogs INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    # Google OAuth tokens table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS google_tokens (
        user_id TEXT PRIMARY KEY,
        access_token TEXT,
        refresh_token TEXT,
        token_uri TEXT,
        client_id TEXT,
        client_secret TEXT,
        scopes TEXT,
        expiry TEXT,
        email TEXT,
        updated_at TEXT
    )
    """)

    # Tasks checklist table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        notice_id TEXT,
        title TEXT,
        due_date TEXT,
        done INTEGER DEFAULT 0,
        FOREIGN KEY (notice_id) REFERENCES notices(id)
    )
    """)

    conn.commit()
    conn.close()

# Auto-initialize database schema on first import
try:
    init_db()
except Exception:
    pass

# Database helper functions
def save_notice(notice_id: str, title: str, filename: str, raw_text: str, page_count: int, extraction: dict):
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO notices (id, title, filename, raw_text, page_count, extraction_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (notice_id, title, filename, raw_text, page_count, json.dumps(extraction), now_iso))
    
    # Also save tasks
    for task in extraction.get("tasks", []):
        task_id = f"{notice_id}_{hash(task.get('title', '')) % 100000}"
        cursor.execute("""
            INSERT OR REPLACE INTO tasks (id, notice_id, title, due_date, done)
            VALUES (?, ?, ?, ?, ?)
        """, (task_id, notice_id, task.get("title"), task.get("due"), 1 if task.get("done") else 0))

    conn.commit()
    conn.close()

def get_notice(notice_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM notices WHERE id = ?", (notice_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "title": row["title"],
        "filename": row["filename"],
        "raw_text": row["raw_text"],
        "page_count": row["page_count"],
        "extraction": json.loads(row["extraction_json"]) if row["extraction_json"] else {},
        "created_at": row["created_at"]
    }

def save_profile(profile_id: str, branch: str, year: str, cgpa: float, active_backlogs: bool = False):
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO student_profiles (id, branch, year, cgpa, active_backlogs, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (profile_id, branch.strip(), year.strip(), float(cgpa), 1 if active_backlogs else 0, now_iso))
    conn.commit()
    conn.close()

def get_profile(profile_id: str = "default_user") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM student_profiles WHERE id = ?", (profile_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "id": row["id"],
        "branch": row["branch"],
        "year": row["year"],
        "cgpa": row["cgpa"],
        "active_backlogs": bool(row["active_backlogs"]) if "active_backlogs" in row.keys() else False,
        "updated_at": row["updated_at"]
    }

def save_google_token(user_id: str, access_token: str, refresh_token: Optional[str], expiry: Optional[str], email: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO google_tokens (user_id, access_token, refresh_token, expiry, email, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, access_token, refresh_token, expiry, email, now_iso))
    conn.commit()
    conn.close()

def get_google_token(user_id: str = "default_user") -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM google_tokens WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {
        "user_id": row["user_id"],
        "access_token": row["access_token"],
        "refresh_token": row["refresh_token"],
        "expiry": row["expiry"],
        "email": row["email"],
        "updated_at": row["updated_at"]
    }

def delete_google_token(user_id: str = "default_user"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM google_tokens WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
