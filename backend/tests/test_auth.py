import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, get_connection

@pytest.fixture(autouse=True)
def setup_test_db():
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_sessions")
    cursor.execute("DELETE FROM users")
    conn.commit()
    conn.close()
    yield

client = TestClient(app)

def test_register_new_user():
    payload = {
        "email": "student@mnnit.ac.in",
        "password": "securePassword123",
        "full_name": "Aditi Gupta",
        "branch": "CSE",
        "year": "3rd",
        "cgpa": 8.5
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "token" in data
    assert data["user"]["email"] == "student@mnnit.ac.in"
    assert data["user"]["full_name"] == "Aditi Gupta"
    assert "password" not in data["user"]

def test_register_duplicate_email():
    payload = {
        "email": "student@mnnit.ac.in",
        "password": "securePassword123",
        "full_name": "Aditi Gupta"
    }
    client.post("/api/auth/register", json=payload)
    # Attempt same email again
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()

def test_register_short_password():
    payload = {
        "email": "student2@mnnit.ac.in",
        "password": "123",
        "full_name": "Test User"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code in [400, 422]

def test_login_successful():
    register_payload = {
        "email": "student@mnnit.ac.in",
        "password": "securePassword123",
        "full_name": "Aditi Gupta"
    }
    client.post("/api/auth/register", json=register_payload)

    login_payload = {
        "email": "student@mnnit.ac.in",
        "password": "securePassword123"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["user"]["email"] == "student@mnnit.ac.in"

def test_login_invalid_password():
    register_payload = {
        "email": "student@mnnit.ac.in",
        "password": "securePassword123",
        "full_name": "Aditi Gupta"
    }
    client.post("/api/auth/register", json=register_payload)

    response = client.post("/api/auth/login", json={
        "email": "student@mnnit.ac.in",
        "password": "wrongPassword!"
    })
    assert response.status_code == 401
    assert "invalid" in response.json()["detail"].lower()

def test_login_nonexistent_user():
    response = client.post("/api/auth/login", json={
        "email": "unknown@mnnit.ac.in",
        "password": "securePassword123"
    })
    assert response.status_code == 401

def test_get_current_user_me():
    register_payload = {
        "email": "student@mnnit.ac.in",
        "password": "securePassword123",
        "full_name": "Aditi Gupta",
        "branch": "CSE",
        "year": "3rd",
        "cgpa": 8.5
    }
    reg_res = client.post("/api/auth/register", json=register_payload)
    token = reg_res.json()["token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["email"] == "student@mnnit.ac.in"
    assert user_data["full_name"] == "Aditi Gupta"
    assert user_data.get("profile", {}).get("branch") == "CSE"

def test_get_current_user_invalid_token():
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer fake_token_xyz"})
    assert response.status_code == 401

def test_logout():
    reg_res = client.post("/api/auth/register", json={
        "email": "student@mnnit.ac.in",
        "password": "securePassword123",
        "full_name": "Aditi Gupta"
    })
    token = reg_res.json()["token"]

    # Logout
    logout_res = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_res.status_code == 200

    # Token should no longer work
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 401
