.PHONY: help dev-frontend dev-backend dev

help:
	@echo "Available commands:"
	@echo "  make dev-frontend    - Starts the frontend development server (Vite)"
	@echo "  make dev-backend     - Starts the backend development server (Uvicorn with reload)"
	@echo "  make dev             - Starts both frontend and backend development servers"

dev-frontend:
	@echo "Starting frontend development server..."
	@cd frontend && npm run dev

dev-backend:
	@echo "Starting backend development server..."
	@cd backend && langgraph dev

dev-webapi:
	@echo "Starting web API development server..."
	@cd backend && python src/webapi/server.py

# Run frontend and backend concurrently
dev:
	@echo "Starting both frontend and backend development servers..."
	@make dev-frontend & make dev-backend

# Run frontend, backend, and web API concurrently
dev-all:
	@echo "Starting frontend, backend, and web API development servers..."
	@make dev-frontend & make dev-backend & make dev-webapi

# Stop all development servers
stop-all:
	@echo "Stopping all development servers..."
	@pkill -f "vite" || true
	@pkill -f "uvicorn" || true
	@pkill -f "python.*server" || true
	@pkill -f "langgraph" || true
	@echo "All servers stopped." 