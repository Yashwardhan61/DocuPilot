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

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT
    )
    """)

    # User sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

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
        course TEXT DEFAULT 'B.Tech',
        department TEXT,
        branch TEXT,
        year TEXT,
        cgpa REAL,
        active_backlogs INTEGER DEFAULT 0,
        updated_at TEXT
    )
    """)

    # Auto-migrate columns if table existed before
    for col_def in [
        ("course", "TEXT DEFAULT 'B.Tech'"),
        ("department", "TEXT"),
        ("active_backlogs", "INTEGER DEFAULT 0")
    ]:
        try:
            cursor.execute(f"ALTER TABLE student_profiles ADD COLUMN {col_def[0]} {col_def[1]}")
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

def create_user(user_id: str, email: str, full_name: str, password_hash: str, salt: str) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO users (id, email, full_name, password_hash, salt, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, email.lower().strip(), full_name.strip(), password_hash, salt, now_iso))
    conn.commit()
    conn.close()
    return {
        "id": user_id,
        "email": email.lower().strip(),
        "full_name": full_name.strip(),
        "created_at": now_iso
    }

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE lower(email) = ?", (email.lower().strip(),))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return dict(row)

def create_user_session(token: str, user_id: str, expires_at: str):
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO user_sessions (token, user_id, expires_at, created_at)
        VALUES (?, ?, ?, ?)
    """, (token, user_id, expires_at, now_iso))
    conn.commit()
    conn.close()

def get_user_by_session_token(token: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.id, u.email, u.full_name, u.created_at, s.expires_at
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    """, (token,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    # Check expiry
    try:
        exp_time = datetime.fromisoformat(row["expires_at"])
        if datetime.now(timezone.utc) > exp_time:
            delete_user_session(token)
            return None
    except Exception:
        pass
    return {
        "id": row["id"],
        "email": row["email"],
        "full_name": row["full_name"],
        "created_at": row["created_at"]
    }

def delete_user_session(token: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_sessions WHERE token = ?", (token,))
    conn.commit()
    conn.close()

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

def save_profile(
    profile_id: str,
    branch: str,
    year: str,
    cgpa: float,
    active_backlogs: bool = False,
    course: str = "B.Tech",
    department: Optional[str] = None
):
    conn = get_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT OR REPLACE INTO student_profiles (id, course, department, branch, year, cgpa, active_backlogs, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        profile_id,
        course.strip() if course else "B.Tech",
        department.strip() if department else None,
        branch.strip(),
        year.strip(),
        float(cgpa),
        1 if active_backlogs else 0,
        now_iso
    ))
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
    keys = row.keys()
    return {
        "id": row["id"],
        "course": row["course"] if "course" in keys and row["course"] else "B.Tech",
        "department": row["department"] if "department" in keys else None,
        "branch": row["branch"],
        "year": row["year"],
        "cgpa": row["cgpa"],
        "active_backlogs": bool(row["active_backlogs"]) if "active_backlogs" in keys else False,
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
