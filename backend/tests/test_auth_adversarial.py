import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_connection, create_user_session

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_sessions")
    cursor.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    yield

def test_sql_injection_in_login():
    # Attempt SQL injection payloads
    res = client.post("/api/auth/login", json={
        "email": "' OR 1=1 --",
        "password": "' OR '1'='1"
    })
    assert res.status_code == 401

def test_email_case_insensitivity():
    # Register with mixed case
    reg = client.post("/api/auth/register", json={
        "email": "Student.CSE@MNNIT.ac.in",
        "password": "Password123!",
        "full_name": "Test Student"
    })
    assert reg.status_code == 201

    # Login with all lowercase
    login = client.post("/api/auth/login", json={
        "email": "student.cse@mnnit.ac.in",
        "password": "Password123!"
    })
    assert login.status_code == 200

    # Prevent duplicate registration with different casing
    reg_dup = client.post("/api/auth/register", json={
        "email": "STUDENT.CSE@mnnit.ac.in",
        "password": "Password123!",
        "full_name": "Another Name"
    })
    assert reg_dup.status_code == 400

def test_expired_session_token():
    reg = client.post("/api/auth/register", json={
        "email": "student@mnnit.ac.in",
        "password": "Password123!",
        "full_name": "Test Student"
    })
    user_id = reg.json()["user"]["id"]

    # Inject an already-expired token directly
    expired_token = "expired_token_123"
    past_iso = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    create_user_session(expired_token, user_id, past_iso)

    # Calling /me with expired token should yield 401
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert me.status_code == 401

