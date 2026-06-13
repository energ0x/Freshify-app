import uuid


def _email(prefix="u"):
    return f"{prefix}_{uuid.uuid4().hex[:8]}@test.com"


def test_register(client):
    r = client.post("/auth/register", json={
        "email": _email(), "password": "Secret123!", "name": "Tester",
    })
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert "user" in data


def test_register_duplicate(client):
    email = _email("dup")
    payload = {"email": email, "password": "Secret123!", "name": "Tester"}
    client.post("/auth/register", json=payload)
    r = client.post("/auth/register", json=payload)
    assert r.status_code == 400


def test_login(client):
    email = _email("login")
    client.post("/auth/register", json={"email": email, "password": "Secret123!", "name": "Tester"})
    r = client.post("/auth/login", json={"email": email, "password": "Secret123!"})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_login_wrong_password(client):
    email = _email("wp")
    client.post("/auth/register", json={"email": email, "password": "Secret123!", "name": "Tester"})
    r = client.post("/auth/login", json={"email": email, "password": "wrongpass"})
    assert r.status_code == 401


def test_me(client):
    email = _email("me")
    reg = client.post("/auth/register", json={"email": email, "password": "Secret123!", "name": "Tester"})
    token = reg.json()["access_token"]
    r = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == email


def test_me_no_auth(client):
    r = client.get("/auth/me")
    assert r.status_code in (401, 403)
