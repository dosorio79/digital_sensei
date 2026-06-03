.PHONY: help install sync frontend-install api frontend-dev build frontend-build test backend-test frontend-test serve docker-build docker-run

UV ?= uv
NPM ?= npm
HOST ?= 127.0.0.1
PORT ?= 8001
IMAGE ?= digital-sensei

help:
	@printf "Digital Sensei targets:\n"
	@printf "  make install          Install backend dev deps and frontend deps\n"
	@printf "  make api              Run the FastAPI dev server on 127.0.0.1:8000\n"
	@printf "  make frontend-dev     Run the Vite dev server\n"
	@printf "  make test             Run backend tests, frontend tests, and frontend production build\n"
	@printf "  make build            Build the frontend\n"
	@printf "  make serve            Build frontend and serve the full app on $(HOST):$(PORT)\n"
	@printf "  make docker-build     Build the Docker image\n"
	@printf "  make docker-run       Run the Docker image on localhost:8000\n"

install: sync frontend-install

sync:
	$(UV) sync --extra dev

frontend-install:
	$(NPM) --prefix frontend install

api:
	$(UV) run python main.py

frontend-dev:
	$(NPM) --prefix frontend run dev

build: frontend-build

frontend-build:
	$(NPM) --prefix frontend run build

test: backend-test frontend-test

backend-test:
	$(UV) run --extra dev pytest -q

frontend-test:
	$(NPM) --prefix frontend run test
	$(NPM) --prefix frontend run build

serve: build
	$(UV) run uvicorn backend.digital_sensei.app:app --host $(HOST) --port $(PORT)

docker-build:
	docker build -t $(IMAGE) .

docker-run:
	docker run --rm -p 8000:8000 $(IMAGE)
