# Deployment

## Recommended V1

Use a single Docker container on Render:

1. Build the React frontend.
2. Copy `frontend/dist` into the runtime image.
3. Run FastAPI with Uvicorn.
4. Serve API and frontend from the same origin.

This keeps hosting simple and avoids cross-origin configuration in production.

Render service configuration lives in root `render.yaml`. It deploys the Docker service from `master`, waits for GitHub Actions checks with `autoDeployTrigger: checksPass`, and uses Render's free web service plan.

Free Render web services cannot attach persistent disks. The app still writes SQLite progress locally, but that data is ephemeral on the free plan and can be lost on redeploy, restart, or spin-down. This is acceptable for a no-cost demo deployment, but not for durable production progress tracking.

GitHub branch setup is managed separately by Terraform in `infra/github-branch-rules`. Terraform is intentionally limited to branch creation/protection; it does not manage Render.

## Branch And Release Flow

- `dev` is the integration branch.
- `master` is the Render deployment branch.
- Work should land through feature branches into `dev`, then through a release PR from `dev` into `master`.
- After a release PR merges, sync `dev` from `master` with a normal merge commit:

```bash
git switch dev
git fetch origin
git merge origin/master
git push origin dev
```

The `dev` branch protection intentionally allows merge commits so this sync does not require force pushes. `master` remains protected for deployment.

## Local Docker

```bash
docker build -t digital-sensei .
docker run --rm -p 8000:8000 digital-sensei
```

Open `http://localhost:8000`.

## Hosting Options

- Render: current recommended target, configured through `render.yaml`.
- Fly.io or Railway: possible later alternatives.
- Azure Container Apps: good fit if Azure is preferred.
- Static frontend plus hosted API: possible later, but unnecessary for V1.

## Runtime Data

SQLite progress is stored in `data/digital_sensei.sqlite3` by default. On free Render, this is ephemeral. For durable production progress later, use a paid Render service with a persistent disk mounted at `/app/data` and set `DIGITAL_SENSEI_DB=/app/data/digital_sensei.sqlite3`, or move progress to an external datastore.
