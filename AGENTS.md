# AGENTS.md

This file provides guidance to AI coding agents when working with code in this repository.

## What This Project Is

cookiecutter-lemetech-web is a **Cookiecutter template** that generates production-ready Django projects. It is NOT a Django application itself — it's a Jinja2-templated project scaffold. The generated project lives inside `{{cookiecutter.project_slug}}/` and gets processed by Cookiecutter when users run the generator.

## Commands

### Install dependencies

```bash
uv sync --locked
```

### Run tests

```bash
# Full test suite (parallel, via tox)
uv run tox run -e py

# Direct pytest (parallel)
uv run pytest -n auto tests

# Single test
uv run pytest tests/test_cookiecutter_generation.py -k "test_name"

# Run with auto-fixable style checks enabled
AUTOFIXABLE_STYLES=1 uv run pytest -n auto tests
```

### Linting and formatting

```bash
# Run all pre-commit hooks
uv run pre-commit run --all-files

# Ruff only
uv run ruff check --fix
uv run ruff format
```

### Integration tests (require Docker or PostgreSQL+Redis)

```bash
# Docker-based
sh tests/test_docker.sh                          # defaults
sh tests/test_docker.sh use_celery=y use_drf=y   # with options

# Bare metal (needs PostgreSQL and Redis running)
sh tests/test_bare.sh
sh tests/test_bare.sh use_celery=y frontend_pipeline=Gulp
```

### Generate a project locally for debugging

```bash
uv run cookiecutter . --no-input --output-dir=/tmp/debug
```

## Architecture

### Template Generation Flow

1. User runs `cookiecutter` — prompted with options from `cookiecutter.json`
2. `hooks/pre_gen_project.py` validates input (project_slug format, conflicting options)
3. Jinja2 renders all files under `{{cookiecutter.project_slug}}/` with user choices
4. `hooks/post_gen_project.py` (~550 lines) removes files not needed for the chosen options, generates random secrets, and adjusts config files

### Key Files

- **`cookiecutter.json`** — All template variables and their choices (project name, Docker, Celery, cloud provider, frontend pipeline, etc.)
- **`hooks/pre_gen_project.py`** — Pre-generation validation (uses Jinja2 syntax at the top for context manipulation)
- **`hooks/post_gen_project.py`** — Post-generation cleanup: removes files based on user choices, generates Django secret key, sets DB credentials, modifies package.json and .pre-commit-config.yaml
- **`{{cookiecutter.project_slug}}/`** — The template directory; files here use Jinja2 conditionals (`{% if cookiecutter.use_celery == 'y' %}`) to include/exclude content
- **`{{cookiecutter.project_slug}}/frontend/`** — Vite frontend scaffold used when `frontend_pipeline=Vite`

### Test Structure

- **`tests/test_cookiecutter_generation.py`** — Main test file. Uses `pytest-cookies` to bake the template with 50+ option combinations defined in `SUPPORTED_COMBINATIONS`. Verifies: no Jinja syntax left in output, generated code passes linting, correct files present/absent. Skips on Windows (sh module) and macOS CI (slow).
- **`tests/test_hooks.py`** — Unit tests for hook helper functions
- **`tests/test_bare.sh`** / **`tests/test_docker.sh`** — Integration tests that generate a project and run its full test suite

### Generated Project Layout

The generated Django project uses:

- `config/settings/{base,local,test,production}.py` — Split settings with django-environ
- `config/urls.py` — URL routing
- `config/views.py` — SPA host view for Vite projects
- `<project_slug>/users/` — Custom user model (username or email-based auth via django-allauth)
- `frontend/` — Separate React + TypeScript + Tailwind + TanStack Router app in Vite mode
- `compose/` — Docker configs for local and production
- `requirements/` — Not used; dependencies managed via `pyproject.toml` + `uv.lock`

Current defaults bake a Docker-based project with email login, DRF, Vite, Celery, Mailpit, Sentry, WhiteNoise, GitHub Actions, and async support enabled.

In Vite mode, local frontend development is browser -> Vite on `:5173` -> Django proxy targets. Django keeps `/api/...` and `/admin/...`, serves the SPA shell in production, and does not mount public `allauth` or `users` page routes.

## Conventions

- **Python 3.14** required (`requires-python = "==3.14.*"`)
- **Line length**: 119 characters (ruff and djlint)
- **Ruff** for linting/formatting; config in `pyproject.toml` under `[tool.ruff]`
- **djLint** for HTML template linting with `profile = "jinja"`
- Template files under `{{cookiecutter.project_slug}}/` are excluded from ruff (not parseable Python)
- **Calendar versioning**: `YYYY.MM.DD`
- For frontend interactions, prefer optimistic UI updates over blocking loading states when the change is safe to reconcile or roll back if the request fails.

## Adding a New Template Option

1. Add the variable and choices to `cookiecutter.json`
2. Add validation in `hooks/pre_gen_project.py` if needed
3. Add file removal/modification logic in `hooks/post_gen_project.py`
4. Use Jinja2 conditionals in template files: `{% if cookiecutter.option == 'y' %}`
5. Add test combinations to `SUPPORTED_COMBINATIONS` in `tests/test_cookiecutter_generation.py`
6. If you change defaults, make sure `uv run cookiecutter . --no-input --output-dir=/tmp/debug` still bakes a valid project
