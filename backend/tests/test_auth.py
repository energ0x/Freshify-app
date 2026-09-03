import uuid
import pytest


def test_register_success(client):
    email = f"newuser_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email,
        "password": "StrongPassword123!",
        "name": "Jane Doe",
        "dietary_preference": "vegetarian",
        "allergens": ["gluten", "soy"]
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == email
    assert data["user"]["name"] == "Jane Doe"
    assert data["user"]["dietary_preference"] == "vegetarian"
    assert data["user"]["allergens"] == ["gluten", "soy"]
    assert data["user"]["is_premium"] is False


def test_register_duplicate_email(client, test_user):
    payload = {
        "email": test_user.email,
        "password": "AnotherPassword123!",
        "name": "Duplicate User"
    }
    response = client.post("/auth/register", json=payload)
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_login_success(client):
    email = f"loginuser_{uuid.uuid4().hex[:8]}@example.com"
    client.post("/auth/register", json={
        "email": email,
        "password": "CorrectPassword123!",
        "name": "Login User"
    })

    response = client.post("/auth/login", json={
        "email": email,
        "password": "CorrectPassword123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == email


def test_login_wrong_password(client, test_user):
    response = client.post("/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401
    assert "incorrect email or password" in response.json()["detail"].lower()


def test_login_nonexistent_user(client):
    response = client.post("/auth/login", json={
        "email": "nonexistent_freshify_user@example.com",
        "password": "SomePassword123!"
    })
    assert response.status_code == 401


def test_get_me_authenticated(client, auth_headers, test_user):
    response = client.get("/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["name"] == test_user.name


def test_get_me_unauthenticated(client):
    response = client.get("/auth/me")
    assert response.status_code == 403 or response.status_code == 401


def test_update_me(client, auth_headers, test_user):
    update_payload = {
        "name": "Updated Name",
        "dietary_preference": "vegan",
        "allergens": ["dairy", "nuts"]
    }
    response = client.put("/auth/me", json=update_payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["dietary_preference"] == "vegan"
    assert "dairy" in data["allergens"]


def test_activate_premium(client, auth_headers):
    response = client.post("/auth/me/activate-premium", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["is_premium"] is True
    assert data["premium_expires_at"] is not None
