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

CATEGORY_QUESTION_LABELS = [
    "Técnica de perna",
    "Técnica de braço",
    "Técnica de quadril",
    "Técnica de imobilização",
    "Sequência de golpes",
    "Contra-ataque",
    "Virada no chão",
]

MEANING_CATEGORIES = {Category.vocabulario, Category.numeros}


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


def _wrong_meaning_options(item: ContentItem, all_items: list[ContentItem]) -> list[str]:
    candidates = []
    seen = {item.portuguese}
    for other in all_items:
        if other.id == item.id or other.portuguese in seen:
            continue
        seen.add(other.portuguese)
        candidates.append(other.portuguese)
    rng = random.Random(item.id)
    rng.shuffle(candidates)
    return candidates[:3]


def _meaning_options(item: ContentItem, all_items: list[ContentItem]) -> list[str]:
    if item.answer_options:
        options = item.answer_options[:]
    else:
        options = [item.portuguese, *_wrong_meaning_options(item, all_items)]
        if len(options) < 4:
            for label in CATEGORY_LABELS.values():
                if label not in options:
                    options.append(label)
                if len(options) == 4:
                    break

    if item.portuguese not in options:
        options.append(item.portuguese)

    random.Random(f"meaning:{item.id}").shuffle(options)
    return options


def _category_options(item: ContentItem) -> list[str]:
    correct = item.portuguese
    if item.category == Category.nage_waza:
        labels = ["Técnica de perna", "Técnica de braço", "Técnica de quadril", "Técnica de imobilização"]
    elif item.category == Category.ne_waza:
        labels = ["Técnica de imobilização", "Técnica de perna", "Técnica de braço", "Técnica de quadril"]
    elif item.category == Category.sequencias:
        labels = ["Sequência de golpes", "Contra-ataque", "Técnica de perna", "Técnica de imobilização"]
    elif item.category == Category.viradas:
        labels = ["Virada no chão", "Técnica de imobilização", "Sequência de golpes", "Técnica de projeção"]
        correct = "Virada no chão"
    else:
        labels = CATEGORY_QUESTION_LABELS

    options = [correct, *[label for label in labels if label != correct]]
    random.Random(f"category:{item.id}").shuffle(options)
    return options[:4]


def _category_prompt(item: ContentItem) -> str:
    if item.category == Category.viradas:
        return "As viradas pertencem a que grupo de treino?"
    return f"{item.japanese} pertence a que família técnica?"


def build_practice(mode: str = "treinar_agora", limit: int = 8) -> list[PracticeQuestion]:
    all_items = list_items()
    if mode == "palavras":
        source_items = [item for item in all_items if item.japanese and item.category != Category.numeros]
        kinds = [QuestionKind.japanese_to_portuguese]
    elif mode == "numeros":
        source_items = [item for item in all_items if item.category == Category.numeros]
        kinds = [QuestionKind.japanese_to_portuguese]
    elif mode == "tipos":
        source_items = [
            item
            for item in all_items
            if item.category not in {Category.vocabulario, Category.numeros}
        ]
        kinds = [QuestionKind.category]
    else:
        source_items = all_items
        kinds = [QuestionKind.japanese_to_portuguese, QuestionKind.category]

    rng = random.Random(f"digital-sensei:{mode}")
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
            correct = "Virada no chão" if item.category == Category.viradas else item.portuguese
            prompt = _category_prompt(item)
            options = _category_options(item)
        else:
            correct = item.portuguese
            prompt = item.quiz_prompts[0]
            options = _meaning_options(item, all_items)

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
