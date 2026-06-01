from pathlib import Path

from fastapi.testclient import TestClient

from backend.digital_sensei.app import app


def test_api_content_and_practice(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("DIGITAL_SENSEI_DB", str(tmp_path / "test.sqlite3"))
    client = TestClient(app)

    content = client.get("/api/content")
    assert content.status_code == 200
    assert content.json()["source_manual"] == "manuals/MANUAL AMARELO LARANJA.pdf"

    practice = client.get("/api/practice/today?mode=palavras")
    assert practice.status_code == 200
    questions = practice.json()
    assert questions
    assert questions[0]["correct_answer"] in questions[0]["options"]


def test_attempts_update_progress(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("DIGITAL_SENSEI_DB", str(tmp_path / "test.sqlite3"))
    client = TestClient(app)
    question = client.get("/api/practice/today?mode=treinar_agora").json()[0]

    response = client.post(
        "/api/attempts",
        json={
            "question_id": question["id"],
            "item_id": question["item_id"],
            "selected_answer": question["correct_answer"],
            "correct": True,
            "mode": "treinar_agora",
        },
    )
    assert response.status_code == 201

    progress = client.get("/api/progress")
    assert progress.status_code == 200
    assert progress.json()["total_attempts"] == 1
    assert progress.json()["correct_attempts"] == 1
