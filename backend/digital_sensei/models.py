from __future__ import annotations

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class Category(StrEnum):
    vocabulario = "vocabulario"
    numeros = "numeros"
    nage_waza = "nage_waza"
    ne_waza = "ne_waza"
    sequencias = "sequencias"
    viradas = "viradas"


class QuestionKind(StrEnum):
    japanese_to_portuguese = "japanese_to_portuguese"
    category = "category"


class MediaSource(BaseModel):
    title: str = Field(min_length=1)
    url: str = Field(min_length=1)
    provider: str = Field(min_length=1)
    media_type: str = Field(min_length=1)
    copyright_caution: str = Field(min_length=1)


class VisualCue(BaseModel):
    label: str = Field(min_length=1)
    action: str = Field(min_length=1)
    hints: list[str] = Field(min_length=1)
    pose: str | None = None


class ContentItem(BaseModel):
    id: str = Field(min_length=2)
    category: Category
    japanese: str = Field(min_length=1)
    portuguese: str = Field(min_length=1)
    manual_text: str = Field(min_length=1)
    child_explanation: str = Field(min_length=1)
    quiz_prompts: list[str] = Field(min_length=1)
    accepted_answers: list[str] = Field(min_length=1)
    answer_options: list[str] = Field(default_factory=list)
    media_sources: list[MediaSource] = Field(default_factory=list)
    visual_cue: VisualCue | None = None

    @field_validator("accepted_answers", "quiz_prompts", "answer_options")
    @classmethod
    def no_blank_entries(cls, values: list[str]) -> list[str]:
        if any(not value.strip() for value in values):
            raise ValueError("entries must not be blank")
        return values


class ContentCatalog(BaseModel):
    source_manual: str
    language: str = "pt-PT"
    items: list[ContentItem] = Field(min_length=1)


class PracticeQuestion(BaseModel):
    id: str
    item_id: str
    kind: QuestionKind
    prompt: str
    options: list[str] = Field(min_length=2)
    correct_answer: str
    child_explanation: str
    category: Category
    media_sources: list[MediaSource] = Field(default_factory=list)
    visual_cue: VisualCue | None = None


class AttemptIn(BaseModel):
    question_id: str = Field(min_length=1)
    item_id: str = Field(min_length=1)
    selected_answer: str = Field(min_length=1)
    correct: bool
    mode: str = Field(default="treinar_agora", min_length=1)


class AttemptOut(BaseModel):
    id: int
    question_id: str
    item_id: str
    selected_answer: str
    correct: bool
    mode: str
    created_at: datetime


class WeakTopic(BaseModel):
    item_id: str
    japanese: str
    portuguese: str
    category: Category
    incorrect: int
    correct: int


class ProgressSummary(BaseModel):
    nickname: str = "Pequeno judoca"
    total_attempts: int
    correct_attempts: int
    incorrect_attempts: int
    accuracy: float
    completed_sessions: int
    weak_topics: list[WeakTopic]
