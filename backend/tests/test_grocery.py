import pytest


def test_grocery_crud(client, auth_headers):
    # 1. Create item
    create_res = client.post("/grocery", json={
        "name": "Olive Oil",
        "quantity": 1.0,
        "unit": "пляшка",
        "notes": "Extra virgin"
    }, headers=auth_headers)
    assert create_res.status_code == 201
    item = create_res.json()
    assert item["name"] == "Olive Oil"
    assert item["is_purchased"] is False
    item_id = item["id"]

    # 2. List items
    list_res = client.get("/grocery", headers=auth_headers)
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(i["id"] == item_id for i in items)

    # 3. Update item (mark purchased)
    update_res = client.put(f"/grocery/{item_id}", json={
        "is_purchased": True
    }, headers=auth_headers)
    assert update_res.status_code == 200
    assert update_res.json()["is_purchased"] is True

    # 4. Delete item
    del_res = client.delete(f"/grocery/{item_id}", headers=auth_headers)
    assert del_res.status_code == 204


def test_add_from_fridge(client, auth_headers):
    # Add product to fridge first
    prod_res = client.post("/products", json={
        "name": "Tomatoes",
        "quantity": 3.0,
        "unit": "шт"
    }, headers=auth_headers)
    prod_id = prod_res.json()["id"]

    # Add from fridge to grocery list
    res = client.post("/grocery/from-fridge", json={"product_ids": [prod_id]}, headers=auth_headers)
    assert res.status_code == 200
    items = res.json()
    assert any(i["name"] == "Tomatoes" for i in items)

    # Second call should not duplicate unpurchased items
    res2 = client.post("/grocery/from-fridge", json={"product_ids": [prod_id]}, headers=auth_headers)
    assert res2.status_code == 200
    assert len(res2.json()) == 0
