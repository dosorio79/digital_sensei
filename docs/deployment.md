# Deployment

## Recommended V1

Use a single Docker container:

1. Build the React frontend.
2. Copy `frontend/dist` into the runtime image.
3. Run FastAPI with Uvicorn.
4. Serve API and frontend from the same origin.

This keeps hosting simple and avoids cross-origin configuration in production.

## Local Docker

```bash
docker build -t digital-sensei .
docker run --rm -p 8000:8000 digital-sensei
```

Open `http://localhost:8000`.

## Hosting Options

- Render, Fly.io, or Railway: simplest container hosting.
- Azure Container Apps: good fit if Azure is preferred.
- Static frontend plus hosted API: possible later, but unnecessary for V1.

## Runtime Data

SQLite progress is stored in `data/digital_sensei.sqlite3` by default. In production, mount a persistent volume at `/app/data` or set `DIGITAL_SENSEI_DB`.
