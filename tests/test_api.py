from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "stats" in data
    assert "disclaimer" in data

def test_list_conditions():
    response = client.get("/conditions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "id" in data[0]
    assert "name" in data[0]

def test_get_condition():
    response = client.get("/conditions/agnimandya")
    assert response.status_code == 200
    data = response.json()
    assert data["condition"]["id"] == "agnimandya"
    assert len(data["recommendations"]) > 0

def test_list_herbs():
    response = client.get("/herbs")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0

def test_get_herb():
    response = client.get("/herbs/ashwagandha")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "ashwagandha"

def test_404_herb():
    response = client.get("/herbs/h_nonexistent")
    assert response.status_code == 404

def test_search():
    response = client.get("/search?q=digestion")
    assert response.status_code == 200
    data = response.json()
    assert "conditions" in data
    assert "herbs" in data
