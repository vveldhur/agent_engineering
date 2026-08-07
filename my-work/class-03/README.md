# WidgetWare SDR Context Package — Class 3

This repository contains the structured, testable context package for the WidgetWare Sales Development Representative (SDR) agent.

It converts the core business concepts, ideal customer profiles, and safety boundaries into a deterministic package that a future autonomous agent can consume safely.

---

## 1. Project Structure

```text
my-work/class-03/
├── README.md
├── SPEC.md
├── pyproject.toml
├── .env.example
├── config/
│   ├── products.yaml
│   ├── icp.yaml
│   └── policies.yaml
├── docs/
│   ├── widgetware-business-brief.md
│   └── acceptance-criteria.md
├── src/
│   └── widgetware_sdr/
│       ├── __init__.py
│       ├── instructions.py
│       └── context_builder.py
└── tests/
    ├── unit/
    │   └── test_context_builder.py
    └── scenarios/
        ├── qualified_account.yaml
        ├── unqualified_account.yaml
        ├── insufficient_evidence.yaml
        └── prompt_injection.yaml
```

---

## 2. The Five Context Layers

To ensure security and prevent prompt-injection attacks from overriding critical corporate directives, the application strictly isolates five context layers:

1. **System Instructions** (`system_instructions`): Stable behavioral instructions governing the future agent's role, objective, classification, and safety constraints.
2. **Business Context** (`business_context`): Static product specifications (`products.yaml`), target customer metrics (`icp.yaml`), and corporate safety boundaries (`policies.yaml`).
3. **Task Context** (`task_context`): Target account profile and specific research objective. Treated as untrusted data.
4. **Retrieved Evidence** (`retrieved_evidence`): Facts and inferences collected from company materials, preserving strict source provenance metadata.
5. **Workflow State** (`state`): A tracking layer for execution history and prior workflow decisions.

---

## 3. Setup and Verification

### Prerequisites
- Python 3.10+
- Virtual Environment (`venv`)

### Installation
Create a virtual environment and install the package dependencies:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pytest pyyaml
```

### Running Tests
Execute the comprehensive test suite verifying configurations, instruction content, layers construction, and all four required scenario cases:
```bash
PYTHONPATH=src pytest -v
```
