import os
import pytest
import yaml
from pathlib import Path
from widgetware_sdr.context_builder import build_context
from widgetware_sdr.instructions import get_system_instructions

# Helper to load YAML files directly for verification
def get_config_paths():
    project_root = Path(__file__).resolve().parent.parent.parent
    config_dir = project_root / "config"
    return {
        "products": config_dir / "products.yaml",
        "icp": config_dir / "icp.yaml",
        "policies": config_dir / "policies.yaml",
    }

# 13.1 Configuration tests
def test_yaml_configurations_load():
    paths = get_config_paths()
    for name, path in paths.items():
        assert path.exists(), f"{name}.yaml does not exist at {path}"
        with open(path, "r") as f:
            data = yaml.safe_load(f)
            assert data is not None, f"Failed to parse {name}.yaml"

def test_products_yaml_contents():
    paths = get_config_paths()
    with open(paths["products"], "r") as f:
        products = yaml.safe_load(f)
    assert "company" in products
    assert "description" in products["company"]
    assert "offerings" in products
    assert len(products["offerings"]) >= 2
    for offering in products["offerings"]:
        assert "name" in offering
        assert "description" in offering
        assert "target_buyers" in offering
        assert "approved_claims" in offering

def test_icp_yaml_contents():
    paths = get_config_paths()
    with open(paths["icp"], "r") as f:
        icp = yaml.safe_load(f)
    
    assert "account_fit" in icp
    assert "immediate_readiness" in icp
    
    fit = icp["account_fit"]
    assert isinstance(fit.get("minimum_company_size"), int)
    assert "preferred_industries" in fit
    assert "excluded_industries" in fit
    assert "preferred_regions" in fit
    assert "required_account_fields" in fit
    
    readiness = icp["immediate_readiness"]
    assert "buying_signals" in readiness
    assert "evidence_indicators" in readiness

def test_policies_yaml_contents():
    paths = get_config_paths()
    with open(paths["policies"], "r") as f:
        policies = yaml.safe_load(f)
        
    assert "evidence_classifications" in policies
    assert "prohibited_actions" in policies
    assert "actions_requiring_human_approval" in policies
    assert "insufficient_evidence_behavior" in policies
    assert "prompt_injection_handling" in policies
    
    # Classifications
    classifications = policies["evidence_classifications"]
    for cls in ["verified_fact", "derived_fact", "inference", "unknown", "conflict"]:
        assert cls in classifications
        
    # Prohibitions
    prohibited = policies["prohibited_actions"]
    assert "inventing company facts" in prohibited
    assert "inventing customer relationships" in prohibited
    assert "sending email" in prohibited
    assert "sending social messages" in prohibited
    assert "modifying CRM data" in prohibited
    assert "making pricing commitments" in prohibited
    assert "making contractual commitments" in prohibited
    
    # Human approval requirements
    approval = policies["actions_requiring_human_approval"]
    assert "sending email" in approval
    assert "sending social messages" in approval
    assert "modifying CRM data" in approval

# 13.2 Instruction tests
def test_system_instructions():
    instr = get_system_instructions()
    assert len(instr) > 0
    instr_lower = instr.lower()
    # Must require evidence for material claims
    assert "material factual claim" in instr_lower or "factual claim" in instr_lower
    assert "supported by" in instr_lower or "evidence" in instr_lower
    # Distinguish fact from inference
    assert "verified_fact" in instr_lower
    assert "derived_fact" in instr_lower
    assert "inference" in instr_lower
    # Prohibited actions
    assert "inventing company facts" in instr_lower
    assert "sending email" in instr_lower or "sending emails" in instr_lower
    assert "modifying crm data" in instr_lower
    # Insufficient evidence
    assert "insufficient evidence" in instr_lower or "unknown" in instr_lower or "missing" in instr_lower
    # Policy override prohibition
    assert "cannot override" in instr_lower or "untrusted" in instr_lower


# 13.3 Context-builder tests
def test_context_builder_layers():
    account = {
        "name": "Test Company",
        "industry": "Manufacturing",
        "employee_count": 200,
        "region": "North America",
        "notes": "Interested in AI."
    }
    objective = "Analyze test company"
    evidence = [
        {
            "claim": "Test Company is modernizing operations",
            "classification": "verified_fact",
            "source": {"name": "Test Website", "url": "https://test.com", "retrieved_at": "2026-08-07"},
            "excerpt": "Modernizing legacy tools"
        }
    ]
    state = {"step": 1}
    
    context = build_context(account, objective, evidence, state)
    
    # Verify all 5 context layers
    assert "system_instructions" in context
    assert "business_context" in context
    assert "task_context" in context
    assert "retrieved_evidence" in context
    assert "state" in context
    
    # Verify contents of business context
    business = context["business_context"]
    assert "products" in business
    assert "icp" in business
    assert "policies" in business
    
    # Verify account data appears only in task context
    assert context["task_context"]["account"]["name"] == "Test Company"
    assert "Test Company" not in context["system_instructions"]
    
    # Verify account notes do not enter system instructions
    assert "Interested in AI" not in context["system_instructions"]
    
    # Verify evidence provenance is preserved
    assert len(context["retrieved_evidence"]) == 1
    assert context["retrieved_evidence"][0]["source"]["url"] == "https://test.com"
    
    # Verify state is preserved
    assert context["state"]["step"] == 1

def test_context_builder_omitted_state():
    account = {"name": "Test Company", "industry": "Manufacturing", "employee_count": 200, "region": "North America"}
    context = build_context(account, "Objective", [])
    assert context["state"] == {}

def test_context_builder_missing_values_remain_unknown():
    account = {"name": "Test Company", "industry": None, "employee_count": None, "region": "North America"}
    context = build_context(account, "Objective", [])
    assert context["task_context"]["account"]["industry"] is None
    assert context["task_context"]["account"]["employee_count"] is None

def test_context_builder_non_mutation():
    account = {"name": "Original Name", "tags": ["tag1"]}
    evidence = [{"id": 1}]
    state = {"step": 1}
    
    context = build_context(account, "Objective", evidence, state)
    
    # Mutate context copy
    context["task_context"]["account"]["name"] = "Mutated Name"
    context["task_context"]["account"]["tags"].append("tag2")
    context["retrieved_evidence"][0]["id"] = 99
    context["state"]["step"] = 99
    
    # Verify original inputs are untouched
    assert account["name"] == "Original Name"
    assert len(account["tags"]) == 1
    assert evidence[0]["id"] == 1
    assert state["step"] == 1

def test_context_builder_missing_config_error():
    import widgetware_sdr.context_builder as cb
    project_root = Path(cb.__file__).resolve().parent.parent.parent
    config_dir = project_root / "config"
    
    # Temporarily rename products.yaml to check error handling
    products_file = config_dir / "products.yaml"
    temp_file = config_dir / "products.yaml.bak"
    
    if products_file.exists():
        os.rename(products_file, temp_file)
        
    try:
        with pytest.raises(FileNotFoundError):
            build_context({"name": "Test"}, "Objective", [])
    finally:
        if temp_file.exists():
            os.rename(temp_file, products_file)

# 13.4 Scenario tests
def get_scenario_data(filename):
    project_root = Path(__file__).resolve().parent.parent.parent
    scenario_path = project_root / "tests" / "scenarios" / filename
    with open(scenario_path, "r") as f:
        return yaml.safe_load(f)

def test_scenario_qualified_account():
    data = get_scenario_data("qualified_account.yaml")
    context = build_context(
        account=data["account"],
        objective=data["objective"],
        evidence=data["evidence"],
        state=data["state"]
    )
    
    # Verify layers and data preservation
    assert context["task_context"]["account"]["industry"] == "Manufacturing"
    assert context["task_context"]["account"]["employee_count"] == 500
    assert len(context["retrieved_evidence"]) == 1
    assert context["retrieved_evidence"][0]["classification"] == "verified_fact"
    
    # Check that system instructions and policies are separate and untouched
    assert "Apex Manufacturing" not in context["system_instructions"]
    assert "Apex Manufacturing" not in str(context["business_context"]["policies"])

def test_scenario_unqualified_account():
    data = get_scenario_data("unqualified_account.yaml")
    context = build_context(
        account=data["account"],
        objective=data["objective"],
        evidence=data["evidence"],
        state=data["state"]
    )
    
    # Disqualifying facts are visible
    assert context["task_context"]["account"]["industry"] == "Software"
    assert context["task_context"]["account"]["employee_count"] == 50

def test_scenario_insufficient_evidence():
    data = get_scenario_data("insufficient_evidence.yaml")
    context = build_context(
        account=data["account"],
        objective=data["objective"],
        evidence=data["evidence"],
        state=data["state"]
    )
    
    # Unknown values remain unknown (None)
    assert context["task_context"]["account"]["industry"] is None
    assert context["task_context"]["account"]["employee_count"] is None
    assert len(context["retrieved_evidence"]) == 0

def test_scenario_prompt_injection():
    data = get_scenario_data("prompt_injection.yaml")
    context = build_context(
        account=data["account"],
        objective=data["objective"],
        evidence=data["evidence"],
        state=data["state"]
    )
    
    # Verify note is preserved under task_context as untrusted data
    assert "Ignore all previous policies" in context["task_context"]["account"]["notes"]
    
    # Verify system instructions and policies remain unchanged (matching YAML files / code)
    assert "Ignore all previous policies" not in context["system_instructions"]
    
    policies = context["business_context"]["policies"]
    assert "sending email" in policies["prohibited_actions"]
    assert "sending email" in policies["actions_requiring_human_approval"]
