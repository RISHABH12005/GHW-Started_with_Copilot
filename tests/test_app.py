"""Backend API tests for the extracurricular activities application."""

import copy

import pytest
from fastapi.testclient import TestClient

from src.app import activities, app

client = TestClient(app)


@pytest.fixture(autouse=True)
def restore_activities():
    """Keep each test isolated by restoring the in-memory data after it runs."""
    original = copy.deepcopy(activities)
    yield
    activities.clear()
    activities.update(original)


def test_list_activities_includes_participants():
    response = client.get("/activities")

    assert response.status_code == 200
    data = response.json()
    assert "Chess Club" in data
    assert "participants" in data["Chess Club"]
    assert "michael@mergington.edu" in data["Chess Club"]["participants"]


def test_signup_adds_participant():
    email = "new.student@mergington.edu"

    response = client.post(
        "/activities/Basketball%20Team/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert response.json()["message"] == f"Signed up {email} for Basketball Team"
    assert email in activities["Basketball Team"]["participants"]


def test_duplicate_signup_is_rejected():
    email = "michael@mergington.edu"

    response = client.post(
        "/activities/Chess%20Club/signup",
        params={"email": email},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Student is already signed up"
    assert activities["Chess Club"]["participants"].count(email) == 1


def test_signup_for_unknown_activity_returns_404():
    response = client.post(
        "/activities/Unknown%20Club/signup",
        params={"email": "student@mergington.edu"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_removes_participant():
    email = "new.student@mergington.edu"
    activities["Basketball Team"]["participants"].append(email)

    response = client.delete(
        "/activities/Basketball%20Team/signup",
        params={"email": email},
    )

    assert response.status_code == 200
    assert response.json()["message"] == f"Unregistered {email} from Basketball Team"
    assert email not in activities["Basketball Team"]["participants"]


def test_unregister_unknown_activity_returns_404():
    response = client.delete(
        "/activities/Unknown%20Club/signup",
        params={"email": "student@mergington.edu"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Activity not found"


def test_unregister_unregistered_student_returns_404():
    response = client.delete(
        "/activities/Basketball%20Team/signup",
        params={"email": "not-registered@mergington.edu"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Student is not signed up for this activity"


def test_signup_then_unregister_restores_participant_list():
    email = "cycle.student@mergington.edu"

    signup = client.post(
        "/activities/Swimming%20Club/signup",
        params={"email": email},
    )
    unregister = client.delete(
        "/activities/Swimming%20Club/signup",
        params={"email": email},
    )

    assert signup.status_code == 200
    assert unregister.status_code == 200
    assert email not in activities["Swimming Club"]["participants"]
