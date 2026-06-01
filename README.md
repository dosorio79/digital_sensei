# Digital Sensei

![Release](https://img.shields.io/badge/release-v0.1.0-f26a21)
![Python](https://img.shields.io/badge/python-3.11-24352e)
![Backend](https://img.shields.io/badge/backend-FastAPI-009688)
![Frontend](https://img.shields.io/badge/frontend-React%20%2B%20Vite-ffd735)
![Tests](https://img.shields.io/badge/tests-pytest%20%2B%20vite-17201d)
![Safety](https://img.shields.io/badge/child%20safety-no%20camera%20%7C%20no%20chat-2f855a)

Digital Sensei is a Portuguese, browser-based quiz app for a 5-year-old judoca training the `graduação amarelo-laranja`. The source manual is stored at `manuals/MANUAL AMARELO LARANJA.pdf`; runtime content is curated in `content/manual_amarelo_laranja.json` so the app stays faithful and reviewable.

V1 is quiz-only. It does not use camera, microphone, chat, accounts, or movement validation.

## Features

- Portuguese child-facing quiz flow for yellow-orange belt preparation.
- Manual-backed vocabulary, Japanese numbers, and judo technique families.
- Dedicated modes:
  - `Treinar agora`: mixed daily practice.
  - `Palavras japonesas`: vocabulary from the manual.
  - `Números`: kanji/number prompts where the child guesses the Japanese name.
  - `Técnicas do Judo`: manual-grounded technique families such as perna, braço, quadril, imobilização, sequência, contra-ataque, and virada.
  - `Rever erros`: weak-topic review.
  - `Progresso`: simple local progress summary.
- Original in-app visual cues for techniques, with official sources linked instead of copied.
- Yellow-orange belt color theme and subtle manual cover background.
- Local-only SQLite progress storage.

## Project Structure

- `backend/`: FastAPI API, curated content validation, SQLite progress storage.
- `frontend/`: React + TypeScript + Vite child-facing app.
- `content/`: reviewed manual-backed JSON content.
- `manuals/`: original PDF manual.
- `docs/`: extraction and deployment notes.
- `tests/`: backend API and content tests.

## Local Development

Install backend dependencies:

```bash
uv sync --extra dev
```

Run the API:

```bash
uv run python main.py
```

Run the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

For the production-style local server after building the frontend:

```bash
cd frontend
npm run build
cd ..
uv run uvicorn backend.digital_sensei.app:app --host 127.0.0.1 --port 8001
```

Open `http://127.0.0.1:8001`.

## Tests

```bash
uv run --extra dev pytest
cd frontend && npm run build
```

## API

- `GET /api/content`
- `GET /api/practice/today?mode=treinar_agora`
- `GET /api/practice/today?mode=palavras`
- `GET /api/practice/today?mode=numeros`
- `GET /api/practice/today?mode=tipos`
- `GET /api/practice/today?mode=review`
- `POST /api/attempts`
- `GET /api/progress`

## Content Policy

- The PDF manual remains the source of truth.
- App content is curated JSON, not runtime PDF extraction.
- Federation/Kodokan/IJF/British Judo/France Judo references are stored as links only.
- External images and videos are not copied into the repo without explicit permission.
- `Obi` accepts both `faixa` and `cinto` to support Portuguese-from-Portugal usage and the Brazilian sensei’s terminology.

## Deployment

The recommended V1 deployment is one Docker container that builds the React frontend and serves it through FastAPI.

```bash
docker build -t digital-sensei .
docker run --rm -p 8000:8000 digital-sensei
```

Then open `http://localhost:8000`.

## Release

Current release: `v0.1.0`.

See [CHANGELOG.md](CHANGELOG.md) for release notes.
