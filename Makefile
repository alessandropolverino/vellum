# ==============================================================================
# Vellum (dnd5e) - Cross-Platform Makefile (Unix / Linux / macOS / Windows)
# ==============================================================================
# Supports:
#   - Unix / Unix-like (Linux, macOS, WSL, BSD) via /bin/sh
#   - Windows (PowerShell, CMD, Git Bash / MSYS2) via powershell.exe
# ==============================================================================

ifeq ($(OS),Windows_NT)
	DETECTED_OS := Windows
	SHELL := powershell.exe
	.SHELLFLAGS := -NoProfile -ExecutionPolicy Bypass -Command
	NPM := npm
	NPX := npx
	ENSURE_DEPS = if (-not (Test-Path 'node_modules')) { Write-Host 'Installing npm dependencies...' -ForegroundColor Cyan; npm install }
	CLEAN_CMD = if (Test-Path 'dist') { Remove-Item -Recurse -Force 'dist' }; Write-Host 'Cleaned ./dist' -ForegroundColor Green
	CLEAN_ALL_CMD = if (Test-Path 'dist') { Remove-Item -Recurse -Force 'dist' }; if (Test-Path 'src-tauri/target') { Remove-Item -Recurse -Force 'src-tauri/target' }; Write-Host 'Cleaned ./dist and ./src-tauri/target' -ForegroundColor Green
else
	DETECTED_OS := $(shell uname -s 2>/dev/null || echo Unix)
	SHELL := /bin/sh
	NPM := npm
	NPX := npx
	ENSURE_DEPS = [ -d node_modules ] || (echo "Installing npm dependencies..." && npm install)
	CLEAN_CMD = rm -rf dist && echo "Cleaned ./dist"
	CLEAN_ALL_CMD = rm -rf dist src-tauri/target && echo "Cleaned ./dist and ./src-tauri/target"
endif

.DEFAULT_GOAL := help

.PHONY: help install dev build preview typecheck tauri-dev tauri-build clean clean-all

help: ## Show available Make targets
	@echo "=================================================================="
	@echo " Vellum (dnd5e) - Build & Development Targets ($(DETECTED_OS))"
	@echo "=================================================================="
	@echo "  make install      Install npm dependencies"
	@echo "  make dev          Start Vite development server (http://localhost:1420)"
	@echo "  make build        Typecheck (tsc -b) and build production web bundle"
	@echo "  make preview      Preview production web bundle locally"
	@echo "  make typecheck    Run TypeScript compiler check without emitting files"
	@echo "  make tauri-dev    Start native Tauri v2 desktop app in development mode"
	@echo "  make tauri-build  Build & package native Tauri v2 desktop application"
	@echo "  make clean        Remove frontend build artifacts (./dist)"
	@echo "  make clean-all    Remove ./dist and Rust ./src-tauri/target artifacts"
	@echo "=================================================================="

install: ## Install npm dependencies
	$(NPM) install

dev: ## Start Vite dev server (http://localhost:1420) with local disk DB API
	$(ENSURE_DEPS)
	$(NPM) run dev

build: ## Run TypeScript build check and bundle production frontend into ./dist
	$(ENSURE_DEPS)
	$(NPM) run build

preview: ## Preview the built production frontend
	$(ENSURE_DEPS)
	$(NPM) run preview

typecheck: ## Verify TypeScript types across the project
	$(ENSURE_DEPS)
	$(NPX) tsc -b --noEmit

tauri-dev: ## Run native Tauri v2 desktop app in dev mode
	$(ENSURE_DEPS)
	$(NPM) run tauri dev

tauri-build: ## Package native Tauri v2 desktop application
	$(ENSURE_DEPS)
	$(NPM) run tauri build

clean: ## Remove frontend ./dist directory
	$(CLEAN_CMD)

clean-all: ## Remove frontend ./dist and Tauri ./src-tauri/target directories
	$(CLEAN_ALL_CMD)
