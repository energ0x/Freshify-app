import uuid
import pytest


def test_list_categories_has_defaults(client, auth_headers):
    response = client.get("/categories", headers=auth_headers)
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) > 0
    cat_names = [c["name"] for c in categories]
    assert "Молочні продукти" in cat_names


def test_create_and_update_category(client, auth_headers):
    # Create new custom category
    unique_name = f"Снеки_{uuid.uuid4().hex[:6]}"
    create_res = client.post("/categories", json={"name": unique_name}, headers=auth_headers)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["name"] == unique_name
    category_id = created["id"]

    # Duplicate name should fail
    dup_res = client.post("/categories", json={"name": unique_name}, headers=auth_headers)
    assert dup_res.status_code == 400

    # Update category name
    updated_name = f"Смачні Снеки_{uuid.uuid4().hex[:6]}"
    put_res = client.put(f"/categories/{category_id}", json={"name": updated_name}, headers=auth_headers)
    assert put_res.status_code == 200
    assert put_res.json()["name"] == updated_name


def test_delete_category_flow(client, auth_headers):
    # Create category
    name = f"КатегоріяДляВидалення_{uuid.uuid4().hex[:6]}"
    res = client.post("/categories", json={"name": name}, headers=auth_headers)
    cat_id = res.json()["id"]

    # Delete
    del_res = client.delete(f"/categories/{cat_id}", headers=auth_headers)
    assert del_res.status_code == 204


def test_restore_default_categories(client, auth_headers):
    res = client.post("/categories/restore-defaults", headers=auth_headers)
    assert res.status_code == 200
    restored = res.json()
    names = [c["name"] for c in restored]
    assert "Фрукти" in names
    assert "Овочі" in names
