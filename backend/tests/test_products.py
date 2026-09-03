from datetime import date, timedelta
import uuid
import pytest


def test_create_and_get_product(client, auth_headers):
    payload = {
        "name": "Organic Milk",
        "quantity": 2.0,
        "unit": "л",
        "expiry_date": (date.today() + timedelta(days=7)).isoformat(),
        "notes": "Keep refrigerated",
        "calories": 60.0,
        "proteins": 3.2,
        "fats": 2.5,
        "carbohydrates": 4.7
    }
    response = client.post("/products", json=payload, headers=auth_headers)
    assert response.status_code == 201
    created = response.json()
    assert created["name"] == "Organic Milk"
    assert created["quantity"] == 2.0
    assert created["unit"] == "л"
    product_id = created["id"]

    # Get single product
    get_res = client.get(f"/products/{product_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == product_id


def test_list_products_with_sorting(client, auth_headers):
    client.post("/products", json={
        "name": "Apple",
        "quantity": 5.0,
        "unit": "шт",
        "expiry_date": (date.today() + timedelta(days=10)).isoformat(),
    }, headers=auth_headers)

    client.post("/products", json={
        "name": "Banana",
        "quantity": 3.0,
        "unit": "шт",
        "expiry_date": (date.today() + timedelta(days=4)).isoformat(),
    }, headers=auth_headers)

    res = client.get("/products?sort_by=name&sort_order=asc", headers=auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert len(items) >= 2
    names = [i["name"] for i in items]
    assert "Apple" in names and "Banana" in names


def test_update_product(client, auth_headers):
    create_res = client.post("/products", json={
        "name": "Bread",
        "quantity": 1.0,
        "unit": "шт",
        "expiry_date": (date.today() + timedelta(days=3)).isoformat(),
    }, headers=auth_headers)
    prod_id = create_res.json()["id"]

    update_payload = {
        "name": "Whole Wheat Bread",
        "quantity": 1.5,
        "notes": "Updated note"
    }
    update_res = client.put(f"/products/{prod_id}", json=update_payload, headers=auth_headers)
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["name"] == "Whole Wheat Bread"
    assert updated["quantity"] == 1.5
    assert updated["notes"] == "Updated note"


def test_delete_product(client, auth_headers):
    create_res = client.post("/products", json={
        "name": "Yogurt",
        "quantity": 2.0,
        "unit": "шт",
        "expiry_date": (date.today() + timedelta(days=5)).isoformat(),
    }, headers=auth_headers)
    prod_id = create_res.json()["id"]

    del_res = client.delete(f"/products/{prod_id}", headers=auth_headers)
    assert del_res.status_code == 204

    # Now trying to get should return 404
    get_res = client.get(f"/products/{prod_id}", headers=auth_headers)
    assert get_res.status_code == 404


def test_consume_product(client, auth_headers):
    create_res = client.post("/products", json={
        "name": "Eggs",
        "quantity": 10.0,
        "unit": "шт",
        "expiry_date": (date.today() + timedelta(days=14)).isoformat(),
    }, headers=auth_headers)
    prod_id = create_res.json()["id"]

    # Partial consume
    consume_res = client.post(f"/products/{prod_id}/consume", json={"quantity": 4.0}, headers=auth_headers)
    assert consume_res.status_code == 200
    assert consume_res.json()["quantity"] == 6.0

    # Verify consumed history
    history_res = client.get("/products/history/consumed", headers=auth_headers)
    assert history_res.status_code == 200
    consumed_list = history_res.json()
    assert any(item["product_name"] == "Eggs" and item["quantity"] == 4.0 for item in consumed_list)

    # Excessive quantity consumption should fail with 400
    excess_res = client.post(f"/products/{prod_id}/consume", json={"quantity": 10.0}, headers=auth_headers)
    assert excess_res.status_code == 400


def test_expiring_and_expired_products(client, auth_headers):
    # Expiring soon (2 days)
    client.post("/products", json={
        "name": "Fresh Cheese",
        "quantity": 1.0,
        "unit": "шт",
        "expiry_date": (date.today() + timedelta(days=2)).isoformat(),
    }, headers=auth_headers)

    # Far expiry (20 days)
    client.post("/products", json={
        "name": "Canned Beans",
        "quantity": 1.0,
        "unit": "шт",
        "expiry_date": (date.today() + timedelta(days=20)).isoformat(),
    }, headers=auth_headers)

    expiring_res = client.get("/products/expiring?days=3", headers=auth_headers)
    assert expiring_res.status_code == 200
    expiring_names = [p["name"] for p in expiring_res.json()]
    assert "Fresh Cheese" in expiring_names
    assert "Canned Beans" not in expiring_names
