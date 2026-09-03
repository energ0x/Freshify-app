import pytest


def test_donation_settings(client, auth_headers):
    # 1. Get default settings
    get_res = client.get("/settings/donation", headers=auth_headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert "auto_donate" in data
    assert data["auto_donate"] is False
    assert data["charity_name"] == "Повернись живим"

    # 2. Update donation settings
    update_res = client.put("/settings/donation", json={
        "auto_donate": True,
        "charity_name": "Фонд Притули",
        "charity_url": "https://prytulafoundation.org"
    }, headers=auth_headers)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["auto_donate"] is True
    assert updated["charity_name"] == "Фонд Притули"
    assert updated["charity_url"] == "https://prytulafoundation.org"
