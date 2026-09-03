import pytest


def test_get_achievements(client, auth_headers):
    response = client.get("/achievements", headers=auth_headers)
    assert response.status_code == 200
    achievements = response.json()
    assert len(achievements) > 0
    # Check required fields
    first = achievements[0]
    assert "id" in first
    assert "title" in first
    assert "desc" in first
    assert "progress" in first
    assert "total" in first
    assert "completed" in first


def test_daily_tasks_and_streaks(client, auth_headers):
    # 1. Fetch daily tasks
    tasks_res = client.get("/api/v1/daily-tasks", headers=auth_headers)
    assert tasks_res.status_code == 200
    tasks = tasks_res.json()
    assert len(tasks) >= 3

    # Daily login task should be completed immediately on request
    login_task = next((t for t in tasks if t["id"] == "daily_login"), None)
    assert login_task is not None
    assert login_task["completed"] is True

    # 2. Fetch streaks
    streaks_res = client.get("/api/v1/daily-tasks/streaks", headers=auth_headers)
    assert streaks_res.status_code == 200
    streaks = streaks_res.json()
    assert len(streaks) > 0
    login_streak = next((s for s in streaks if s["streak_type"] == "daily_login"), None)
    assert login_streak is not None
    assert login_streak["current_streak"] >= 1

    # 3. Fetch summary
    summary_res = client.get("/api/v1/daily-tasks/summary", headers=auth_headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "current" in summary
    assert "best" in summary
    assert "week" in summary
    assert len(summary["week"]) == 7
