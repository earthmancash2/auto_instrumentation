.PHONY: help up down build logs clean seed

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

up: ## Start all services
	docker compose up

up-d: ## Start all services in background
	docker compose up -d

down: ## Stop all services
	docker compose down

down-v: ## Stop all services and remove volumes
	docker compose down -v

build: ## Rebuild all Docker images
	docker compose build

logs: ## View logs from all services
	docker compose logs -f

logs-api: ## View logs from core-api
	docker compose logs -f core-api

logs-search: ## View logs from search-service
	docker compose logs -f search-service

logs-pricing: ## View logs from pricing-service
	docker compose logs -f pricing-service

logs-web: ## View logs from web frontend
	docker compose logs -f web

clean: ## Stop services and clean up
	docker compose down -v
	rm -rf node_modules packages/*/node_modules services/*/node_modules apps/*/node_modules
	rm -rf packages/*/.turbo services/*/.turbo apps/*/.turbo
	rm -rf apps/marketplace-web/.next

seed: ## Seed the database (requires services to be running)
	docker compose exec core-api pnpm --filter database seed

shell-api: ## Open shell in core-api container
	docker compose exec core-api sh

shell-db: ## Open PostgreSQL shell
	docker compose exec postgres psql -U marketplace -d marketplace

restart: down up ## Restart all services
