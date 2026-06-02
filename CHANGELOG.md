# Changelog

All notable changes to Digital Sensei are documented here.

## [Unreleased]

### Added

- Adulto/Criança profile switcher for keeping separate local progress.
- Progress reset action for clearing one learner's saved attempts without affecting the other.

### Changed

- `Rever erros` now uses the selected learner's weak topics.
- Quiz prompts no longer include the "No manual," prefix — questions are more direct and natural.
- Visual cue cards now render per-technique SVG illustrations instead of a generic CSS figure.
  Each of the 14 techniques has a distinct scene (e.g. outside sweep, inner reap, foot block, shoulder entry, hip throw, side control, mount, north-south, turnover, chain, counter).
- `visual_cue` model extended with an optional `pose` field used by the frontend to select the correct illustration.

## [v0.1.0] - 2026-06-01

### Added

- Initial FastAPI backend with curated content validation and SQLite progress tracking.
- React + Vite frontend for child-friendly Portuguese quiz practice.
- Manual-backed content for vocabulary, Japanese numbers, Nage Waza, Ne Waza, Ren Raku Waza, Kaeshi Waza, and viradas.
- Dedicated `Números` mode with number + kanji prompts and Japanese-name answers.
- `Técnicas do Judo` mode grounded in manual technique families:
  - Técnica de perna
  - Técnica de braço
  - Técnica de quadril
  - Técnica de imobilização
  - Sequência de golpes
  - Contra-ataque
  - Virada no chão
- Original visual cue cards for techniques, shown after answering.
- Official reference links for IJF, Kodokan, British Judo, USJF, and France Judo.
- Yellow-orange belt visual theme and subtle manual-cover background.
- Dockerfile and deployment notes.
- Backend tests for content grounding, API behavior, numbers, terminology, and practice-option quality.

### Changed

- `Obi` now displays `Faixa / cinto` and accepts both terms.
- Mixed practice asks technique-family questions for techniques instead of broad or unrelated vocabulary prompts.

### Safety

- No camera, microphone, chat, accounts, or social features.
- External federation media is linked as reference only and not copied into the app.
