# Class 3 Starter — WidgetWare SDR Context Package

This is the minimal starting project for Class 3.

## Source of truth

Read `SPEC.md` before implementing the lab. Use `LAB.md` for detailed guidance.

The starter intentionally does **not** include:

- WidgetWare product configuration;
- ICP configuration;
- policy configuration;
- agent instructions;
- the context builder;
- completed scenario fixtures;
- completed Class 3 tests.

Students will create those items during the lab.

## Setup

From this directory:

```bash
python -m pip install -e ".[dev]"
python -m pytest -v
```

The starter smoke test must pass before implementation begins.

## Important boundaries

Class 3 does not build:

- a Google ADK agent;
- Gemini or another LLM call;
- web research;
- email or social-message delivery;
- CRM integration;
- a database;
- deployment code;
- external side effects.
