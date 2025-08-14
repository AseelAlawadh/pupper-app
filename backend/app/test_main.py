import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_list_dogs():
    response = client.get("/dogs")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_create_breed():
    # This would need authentication, so we'll test the structure
    response = client.post("/breeds", json={"name": "Test Breed"})
    # Expect 401 without auth
    assert response.status_code == 401