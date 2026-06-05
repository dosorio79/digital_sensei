FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV DIGITAL_SENSEI_DB=/app/data/digital_sensei.sqlite3

COPY pyproject.toml README.md main.py ./
COPY backend ./backend
COPY content ./content
COPY manuals ./manuals
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN pip install --no-cache-dir .
RUN mkdir -p /app/data

EXPOSE 8000
CMD ["uvicorn", "backend.digital_sensei.app:app", "--host", "0.0.0.0", "--port", "8000"]
