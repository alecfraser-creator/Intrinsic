
from copy import deepcopy


SCENARIO_ADJUSTMENTS = {
    "bear": {
        "revenue_growth": -0.03,
        "operating_margin": -0.025,
        "capex_rate": 0.01,
        "wacc": 0.015,
        "terminal_growth": -0.005
    },
    "base": {
        "revenue_growth": 0,
        "operating_margin": 0,
        "capex_rate": 0,
        "wacc": 0,
        "terminal_growth": 0
    },
    "bull": {
        "revenue_growth": 0.03,
        "operating_margin": 0.025,
        "capex_rate": -0.01,
        "wacc": -0.01,
        "terminal_growth": 0.005
    }
}


def get_effective_value(assumption):
    custom = assumption.get("custom")

    return (
        custom
        if custom is not None
        else assumption.get("calculated")
    )


def apply_scenario_adjustments(
    base_assumptions,
    adjustments,
    existing_assumptions=None,
    scenario_name=None
):
    assumptions = deepcopy(base_assumptions)
    existing_assumptions = existing_assumptions or {}

    for key in ("revenue_growth", "operating_margin", "capex_rate"):

        assumption = assumptions.get(key)

        if assumption is None:
            continue

        # Calculate the scenario value from the base assumption.
        effective_value = assumption.get("calculated")

        if effective_value is None:
            continue

        scenario_value = effective_value + adjustments[key]

        if key == "capex_rate":
            scenario_value = max(0, scenario_value)

        # Retrieve this scenario's previously saved override.
        saved_assumption = existing_assumptions.get(key, {})
        custom = saved_assumption.get("custom")

        # Preserve an existing base-case override from the old structure.
        if (
            custom is None
            and scenario_name == "base"
        ):
            custom = assumption.get("custom")

        # Store the scenario-specific override separately.
        assumption["custom"] = custom
        assumption["scenario_value"] = (
            custom if custom is not None else scenario_value
        )
        assumption["scenario_is_custom"] = custom is not None

    return assumptions


def generate_scenarios(
    base_assumptions,
    base_wacc,
    base_terminal_growth=0.025,
    existing_scenarios=None
):
    scenarios = {}
    existing_scenarios = existing_scenarios or {}

    for name, adjustments in SCENARIO_ADJUSTMENTS.items():

        saved_scenario = existing_scenarios.get(name, {})
        saved_assumptions = (
            saved_scenario
            .get("assumptions", {})
            .get("forecast_assumptions", {})
        )

        assumptions = apply_scenario_adjustments(
            base_assumptions,
            adjustments,
            existing_assumptions=saved_assumptions,
            scenario_name=name
        )

        wacc = base_wacc + adjustments["wacc"]
        terminal_growth = (
            base_terminal_growth + adjustments["terminal_growth"]
        )

        # Preserve independently customized WACC and terminal growth.
        saved_custom = saved_scenario.get("custom_assumptions", {})

        if "wacc" in saved_custom:
            wacc = saved_custom["wacc"]

        if "terminal_growth" in saved_custom:
            terminal_growth = saved_custom["terminal_growth"]

        if wacc <= terminal_growth:
            raise ValueError(
                f"Invalid {name} scenario: WACC must exceed terminal growth."
            )


        scenarios[name] = {
            "assumptions": assumptions,
            "wacc": wacc,
            "terminal_growth": terminal_growth,
            "custom_assumptions": deepcopy(saved_custom)
        }

    return scenarios
