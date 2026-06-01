from backend.digital_sensei.content import build_practice, load_catalog
from backend.digital_sensei.models import Category


def test_catalog_loads_manual_backed_content() -> None:
    catalog = load_catalog()

    assert catalog.source_manual == "manuals/MANUAL AMARELO LARANJA.pdf"
    assert len(catalog.items) >= 25
    assert {item.category for item in catalog.items} == {
        Category.vocabulario,
        Category.numeros,
        Category.nage_waza,
        Category.ne_waza,
        Category.sequencias,
        Category.viradas,
    }
    assert all(item.manual_text for item in catalog.items)
    assert all(item.quiz_prompts for item in catalog.items)
    technique_categories = {Category.nage_waza, Category.ne_waza, Category.sequencias, Category.viradas}
    assert all(item.media_sources for item in catalog.items if item.category in technique_categories)
    assert all(item.visual_cue for item in catalog.items if item.category in technique_categories)


def test_practice_questions_use_curated_items() -> None:
    item_ids = {item.id for item in load_catalog().items}
    questions = build_practice("treinar_agora", limit=8)

    assert len(questions) == 8
    assert {question.item_id for question in questions}.issubset(item_ids)
    assert all(question.correct_answer in question.options for question in questions)


def test_obi_accepts_faixa_and_cinto() -> None:
    obi = next(item for item in load_catalog().items if item.id == "vocab-obi")

    assert obi.portuguese == "Faixa / cinto"
    assert {"Faixa", "Cinto", "cinto"}.issubset(set(obi.accepted_answers))


def test_numbers_mode_asks_for_japanese_number_names() -> None:
    questions = build_practice("numeros", limit=10)

    assert len(questions) == 10
    assert {question.category for question in questions} == {Category.numeros}
    assert all("/" in question.prompt for question in questions)
    assert all(question.correct_answer in question.options for question in questions)
    assert {question.correct_answer for question in questions} == {
        "Ichi",
        "Ni",
        "San",
        "Shi",
        "Go",
        "Roku",
        "Shichi",
        "Hachi",
        "Kyu",
        "Ju",
    }


def test_technique_group_questions_have_natural_wording_and_relevant_options() -> None:
    vocabulary_ids = {
        item.id
        for item in load_catalog().items
        if item.category in {Category.vocabulario, Category.numeros}
    }
    questions = build_practice("tipos", limit=20)

    assert questions
    assert all("Que tipo de coisa" not in question.prompt for question in questions)
    assert all("Vocabulário" not in question.options for question in questions)
    assert all(question.item_id not in vocabulary_ids for question in questions)
    for question in questions:
        assert question.correct_answer.lower() not in question.prompt.lower()
        for option in question.options:
            assert option.lower() not in question.prompt.lower()

    uki_goshi = next(question for question in questions if question.item_id == "nage-uki-goshi")
    assert uki_goshi.correct_answer == "Técnica de quadril"
    assert set(uki_goshi.options) == {
        "Técnica de perna",
        "Técnica de braço",
        "Técnica de quadril",
        "Técnica de imobilização",
    }


def test_mixed_practice_uses_category_questions_for_techniques() -> None:
    technique_categories = {Category.nage_waza, Category.ne_waza, Category.sequencias, Category.viradas}
    questions = build_practice("treinar_agora", limit=20)
    technique_questions = [question for question in questions if question.category in technique_categories]

    assert technique_questions
    for question in technique_questions:
        assert question.kind == "category"
        assert question.correct_answer in question.options
        assert "Técnica de projeção" not in question.options
        assert "Técnica de solo" not in question.options
        assert {"Professor", "Criador do judo", "Ni"}.isdisjoint(question.options)


def test_viradas_meaning_question_uses_curated_position_options() -> None:
    viradas_item = next(item for item in load_catalog().items if item.id == "viradas-decubito-ventral")

    assert viradas_item.portuguese == "Viradas com uke em decúbito ventral"
    assert set(viradas_item.answer_options) == {
        "Viradas com uke em decúbito ventral",
        "Uke em pé",
        "Uke sentado",
        "Uke de barriga para cima",
    }
    assert {"Professor", "Atenção", "Esquerda"}.isdisjoint(viradas_item.answer_options)
