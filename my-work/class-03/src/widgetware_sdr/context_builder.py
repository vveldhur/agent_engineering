import copy
import yaml
from pathlib import Path
from widgetware_sdr.instructions import get_system_instructions

def build_context(
    account: dict,
    objective: str,
    evidence: list[dict],
    state: dict | None = None,
) -> dict:
    """
    Builds the structured context package for the WidgetWare SDR agent.
    
    Ensures complete isolation of system instructions, business context,
    task context, retrieved evidence, and workflow state.
    """
    # 1. Resolve and load YAML configuration files
    project_root = Path(__file__).resolve().parent.parent.parent
    config_dir = project_root / "config"
    
    products_path = config_dir / "products.yaml"
    icp_path = config_dir / "icp.yaml"
    policies_path = config_dir / "policies.yaml"
    
    if not products_path.exists():
        raise FileNotFoundError(f"Required configuration file missing: {products_path}")
    if not icp_path.exists():
        raise FileNotFoundError(f"Required configuration file missing: {icp_path}")
    if not policies_path.exists():
        raise FileNotFoundError(f"Required configuration file missing: {policies_path}")
        
    try:
        with open(products_path, "r") as f:
            products = yaml.safe_load(f)
    except Exception as e:
        raise ValueError(f"Failed to parse products.yaml: {e}")
        
    try:
        with open(icp_path, "r") as f:
            icp = yaml.safe_load(f)
    except Exception as e:
        raise ValueError(f"Failed to parse icp.yaml: {e}")
        
    try:
        with open(policies_path, "r") as f:
            policies = yaml.safe_load(f)
    except Exception as e:
        raise ValueError(f"Failed to parse policies.yaml: {e}")
        
    if products is None:
        raise ValueError("products.yaml loaded as empty or invalid")
    if icp is None:
        raise ValueError("icp.yaml loaded as empty or invalid")
    if policies is None:
        raise ValueError("policies.yaml loaded as empty or invalid")

    # 2. Prevent mutations on input parameters by copying them
    copied_account = copy.deepcopy(account)
    copied_evidence = copy.deepcopy(evidence)
    copied_state = copy.deepcopy(state) if state is not None else {}
    
    # 3. Retrieve system instructions
    system_instructions = get_system_instructions()
    
    # 4. Construct and return the 5-layer context dictionary
    return {
        "system_instructions": system_instructions,
        "business_context": {
            "products": products,
            "icp": icp,
            "policies": policies,
        },
        "task_context": {
            "account": copied_account,
            "objective": objective,
        },
        "retrieved_evidence": copied_evidence,
        "state": copied_state,
    }
