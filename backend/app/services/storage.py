
import json
import sqlite3
from pathlib import Path

from app.schemas.notice import NoticeResponse
from app.schemas.profile import StudentProfile


# Database will be created inside the backend folder.
DB_PATH = Path(__file__).resolve().parents[2] / "notices.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_connection() as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS notices (
                notice_id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        connection.execute("""
            CREATE TABLE IF NOT EXISTS student_profiles (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                data TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)


def save_notice(notice: NoticeResponse):
    notice_data = notice.model_dump(mode="json")

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO notices (notice_id, data)
            VALUES (?, ?)
            """,
            (
                notice.notice_id,
                json.dumps(notice_data)
            )
        )


def get_notice(notice_id: str):
    with get_connection() as connection:
        row = connection.execute(
            "SELECT data FROM notices WHERE notice_id = ?",
            (notice_id,)
        ).fetchone()

    if row is None:
        return None

    return NoticeResponse.model_validate_json(row["data"])

def save_profile(profile: StudentProfile):
    profile_data = profile.model_dump(mode="json")

    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO student_profiles (id, data)
            VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET
                data = excluded.data,
                updated_at = CURRENT_TIMESTAMP
            """,
            (json.dumps(profile_data),)
        )


def get_profile():
    with get_connection() as connection:
        row = connection.execute(
            "SELECT data FROM student_profiles WHERE id = 1"
        ).fetchone()

    if row is None:
        return None

    return StudentProfile.model_validate_json(row["data"])
