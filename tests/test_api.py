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


def test_progress_is_isolated_by_user_and_can_reset(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("DIGITAL_SENSEI_DB", str(tmp_path / "test.sqlite3"))
    client = TestClient(app)
    questions = client.get("/api/practice/today?mode=treinar_agora&limit=2").json()
    adult_question, child_question = questions

    for user_id, question in (("adulto", adult_question), ("crianca", child_question)):
        response = client.post(
            "/api/attempts",
            json={
                "question_id": question["id"],
                "item_id": question["item_id"],
                "selected_answer": "resposta errada",
                "correct": False,
                "mode": "treinar_agora",
                "user_id": user_id,
            },
        )
        assert response.status_code == 201

    adult_progress = client.get("/api/progress?user_id=adulto").json()
    child_progress = client.get("/api/progress?user_id=crianca").json()

    assert adult_progress["total_attempts"] == 1
    assert child_progress["total_attempts"] == 1
    assert adult_progress["weak_topics"][0]["item_id"] == adult_question["item_id"]
    assert child_progress["weak_topics"][0]["item_id"] == child_question["item_id"]

    adult_review = client.get("/api/practice/today?mode=review&limit=20&user_id=adulto").json()
    child_review = client.get("/api/practice/today?mode=review&limit=20&user_id=crianca").json()

    assert {question["item_id"] for question in adult_review} == {adult_question["item_id"]}
    assert {question["item_id"] for question in child_review} == {child_question["item_id"]}

    reset = client.delete("/api/progress/crianca")
    assert reset.status_code == 204
    assert client.get("/api/progress?user_id=adulto").json()["total_attempts"] == 1
    assert client.get("/api/progress?user_id=crianca").json()["total_attempts"] == 0
