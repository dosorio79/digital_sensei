from __future__ import annotations

import json
import random
from functools import lru_cache
from pathlib import Path

from .models import Category, ContentCatalog, ContentItem, PracticeQuestion, QuestionKind

ROOT = Path(__file__).resolve().parents[2]
CONTENT_FILE = ROOT / "content" / "manual_amarelo_laranja.json"

CATEGORY_LABELS: dict[Category, str] = {
    Category.vocabulario: "Vocabulário",
    Category.numeros: "Números",
    Category.nage_waza: "Técnica de projeção",
    Category.ne_waza: "Técnica de solo",
    Category.sequencias: "Sequência ou contra-ataque",
    Category.viradas: "Virada no chão",
}

CATEGORY_QUESTION_LABELS = ["Perna", "Braço", "Quadril", "Imobilização", "Sequência", "Contra-ataque", "Virada"]

TECHNIQUE_LABEL_BY_ANSWER = {
    "Técnica de perna": "Perna",
    "Técnica de braço": "Braço",
    "Técnica de quadril": "Quadril",
    "Técnica de imobilização": "Imobilização",
    "Sequência de golpes": "Sequência",
    "Contra-ataque": "Contra-ataque",
    "Viradas com uke em decúbito ventral": "Virada",
}

MEANING_CATEGORIES = {Category.vocabulario, Category.numeros}
TECHNIQUE_CATEGORIES = {Category.nage_waza, Category.ne_waza, Category.sequencias, Category.viradas}


@lru_cache
def load_catalog(path: Path = CONTENT_FILE) -> ContentCatalog:
    data = json.loads(path.read_text(encoding="utf-8"))
    catalog = ContentCatalog.model_validate(data)
    ids = [item.id for item in catalog.items]
    if len(ids) != len(set(ids)):
        raise ValueError("content item ids must be unique")
    return catalog


def list_items() -> list[ContentItem]:
    return load_catalog().items


def get_item(item_id: str) -> ContentItem | None:
    return next((item for item in list_items() if item.id == item_id), None)


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


def _meaning_options(item: ContentItem, all_items: list[ContentItem], rng: random.Random) -> list[str]:
    if item.answer_options:
        options = _unique(item.answer_options[:])
        rng.shuffle(options)
        return options

    candidates = _unique(
        [
            other.portuguese
            for other in all_items
            if other.category == item.category and other.id != item.id
        ]
    )
    rng.shuffle(candidates)
    options = [item.portuguese, *candidates[:3]]
    rng.shuffle(options)
    return options


def _technique_label(item: ContentItem) -> str:
    return TECHNIQUE_LABEL_BY_ANSWER.get(item.portuguese, item.portuguese)


def _category_options(item: ContentItem, rng: random.Random) -> list[str]:
    correct = _technique_label(item)
    if item.category == Category.nage_waza:
        labels = ["Perna", "Braço", "Quadril", "Imobilização"]
    elif item.category == Category.ne_waza:
        labels = ["Imobilização", "Perna", "Braço", "Quadril"]
    elif item.category == Category.sequencias:
        labels = ["Sequência", "Contra-ataque", "Perna", "Imobilização"]
    elif item.category == Category.viradas:
        labels = ["Virada", "Imobilização", "Sequência", "Perna"]
    else:
        labels = CATEGORY_QUESTION_LABELS

    options = [correct, *[label for label in labels if label != correct]]
    rng.shuffle(options)
    return options[:4]


def _meaning_prompt(item: ContentItem, rng: random.Random) -> str:
    prompts = item.quiz_prompts[:]
    if item.category == Category.vocabulario:
        prompts.extend(
            [
                f"Qual é o significado de {item.japanese}?",
                f"{item.japanese} quer dizer o quê?",
            ]
        )
    elif item.category == Category.numeros:
        prompts.extend(
            [
                f"Como se diz o símbolo {item.japanese} em japonês?",
                f"Que nome japonês corresponde a {item.japanese}?",
            ]
        )
    return rng.choice(_unique(prompts))


def _category_prompt(item: ContentItem, rng: random.Random) -> str:
    if item.category == Category.viradas:
        prompts = [
            "Quando uke está de barriga para baixo, que grupo é este?",
            "Que grupo trabalha com uke em decúbito ventral?",
        ]
    else:
        prompts = [
            f"A que grupo pertence {item.japanese}?",
            f"{item.japanese} fica em que grupo?",
            f"Que grupo de treino combina com {item.japanese}?",
        ]
    return rng.choice(prompts)


def build_practice(
    mode: str = "treinar_agora",
    limit: int = 8,
    rng: random.Random | None = None,
) -> list[PracticeQuestion]:
    rng = rng or random.SystemRandom()
    all_items = list_items()
    if mode == "palavras":
        source_items = [item for item in all_items if item.category == Category.vocabulario]
        kinds = [QuestionKind.japanese_to_portuguese]
    elif mode == "numeros":
        source_items = [item for item in all_items if item.category == Category.numeros]
        kinds = [QuestionKind.japanese_to_portuguese]
    elif mode == "tipos":
        source_items = [
            item
            for item in all_items
            if item.category in TECHNIQUE_CATEGORIES
        ]
        kinds = [QuestionKind.category]
    else:
        source_items = all_items
        kinds = [QuestionKind.japanese_to_portuguese, QuestionKind.category]

    picked = source_items[:]
    rng.shuffle(picked)
    questions: list[PracticeQuestion] = []

    for index, item in enumerate(picked):
        kind = kinds[index % len(kinds)]
        if mode == "treinar_agora" and item.category not in MEANING_CATEGORIES:
            kind = QuestionKind.category
        if kind == QuestionKind.category and item.category in MEANING_CATEGORIES:
            kind = QuestionKind.japanese_to_portuguese

        if kind == QuestionKind.category:
            correct = _technique_label(item)
            prompt = _category_prompt(item, rng)
            options = _category_options(item, rng)
        else:
            correct = item.portuguese
            prompt = _meaning_prompt(item, rng)
            options = _meaning_options(item, all_items, rng)

        questions.append(
            PracticeQuestion(
                id=f"{mode}-{item.id}-{kind}",
                item_id=item.id,
                kind=kind,
                prompt=prompt,
                options=options,
                correct_answer=correct,
                child_explanation=item.child_explanation,
                category=item.category,
                media_sources=item.media_sources,
                visual_cue=item.visual_cue,
            )
        )
        if len(questions) >= limit:
            break

    return questions
