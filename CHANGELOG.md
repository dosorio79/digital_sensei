# Changelog

All notable changes to Digital Sensei are documented here.

## [Unreleased]

## [v0.4.0] - 2026-06-06

### Added

- `Glossário` mode with grouped cards for all manual technique and movement entries.
- Tighter child-first technique summaries grounded in official federation references where available.
- Per-technique read buttons in the glossary, reusing the existing speech sequence control.
- Render free-plan deployment configuration through `render.yaml`.
- Terraform-managed GitHub branch rules for `master` and `dev`.

### Changed

- Technique illustrations now use distinct pose keys for all manual technique and movement entries.
- Long mode tab labels now wrap at word boundaries instead of splitting final letters.
- Docker frontend builds now use `npm ci` for reproducible installs.
- CI and Terraform validation workflows now run on both `master` and `dev`.
- `dev` branch protection allows merge commits so `dev` can be synced from `master` without force pushes.

### Deployment

- Render free deployment is documented as ephemeral for SQLite progress data because free Render services cannot attach persistent disks.
- Branch-rule Terraform is limited to GitHub branch management; Render remains configured by `render.yaml`.

## [v0.3.0] - 2026-06-03

### Added

- Browser text-to-speech controls for reading questions, answer options, and answer feedback aloud in European Portuguese.
- Correct-answer chime using the browser Web Audio API.
- Frontend unit/component test coverage with Vitest, jsdom, and React Testing Library for speech, sound effects, quiz audio behavior, answer highlighting, and reference links.
- CI now runs backend tests, frontend tests, and the frontend production build through `make test`.

### Changed

- Question prompts and answer options are easier to use for a non-reading child: the question speaker now reads the prompt followed by all answer options, highlighting each answer as it is read.
- Answer feedback now auto-reads after the child chooses an answer, including the correct answer when needed and the visual cue text.
- Reference links now render as more visible play-style action links.
- Training interface visuals were polished for the child-facing practice flow.
- Number prompts now stay aligned with the manual format.
- Technique question prompts are more natural and direct.

## [v0.2.0] - 2026-06-02

### Added

- Adulto/Criança profile switcher for keeping separate local progress.
- Progress reset action for clearing one learner's saved attempts without affecting the other.
- `Demonstrações` tab for the three teacher-assisted guide requirements.

### Changed

- `Rever erros` now uses the selected learner's weak topics.
- Practice questions now follow the guide sections more strictly: vocabulary, numbers, technique groups, and demonstrations.
- Fresh practice sessions now use a new random mix instead of a fixed per-mode order.
- Answer options now stay within the same answer type, and technique group options use balanced short labels.
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
