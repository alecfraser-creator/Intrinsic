
from copy import deepcopy


SCENARIO_ADJUSTMENTS = {
    "bear": {
        "revenue_growth": -0.01,
        "operating_margin": -0.015,
        "capex_rate": 0.005,
        "wacc": 0.01,
        "terminal_growth": -0.0025
    },
    "base": {
        "revenue_growth": 0,
        "operating_margin": 0,
        "capex_rate": 0,
        "wacc": 0,
        "terminal_growth": 0
    },
    "bull": {
        "revenue_growth": 0.01,
        "operating_margin": 0.015,
        "capex_rate": -0.005,
        "wacc": -0.005,
        "terminal_growth": 0.0025
    }
}


def apply_scenario_adjustments(base_assumptions, adjustments):

    assumptions = deepcopy(base_assumptions)

    for key in ("revenue_growth", "operating_margin", "capex_rate"):

        if assumptions.get(key) is None:
            continue

        forecast = assumptions[key].get("forecast")

        if forecast is None:
            continue

        assumptions[key]["forecast"] = forecast + adjustments[key]

    # CapEx / Revenue cannot be negative.
    if assumptions.get("capex_rate") is not None:
        forecast = assumptions["capex_rate"]["forecast"]

        if forecast is not None:
            assumptions["capex_rate"]["forecast"] = max(0, forecast)

    return assumptions


def generate_scenarios(
    base_assumptions,
    base_wacc,
    base_terminal_growth=0.025
):

    scenarios = {}

    for name, adjustments in SCENARIO_ADJUSTMENTS.items():

        assumptions = apply_scenario_adjustments(
            base_assumptions,
            adjustments
        )

        wacc = base_wacc + adjustments["wacc"]
        terminal_growth = (
            base_terminal_growth + adjustments["terminal_growth"]
        )

        # Terminal growth must remain below WACC.
        if wacc <= terminal_growth:
            raise ValueError(
                f"Invalid {name} scenario: WACC must exceed terminal growth."
            )

        # Keep terminal growth within the initial conservative range.
        if terminal_growth < 0 or terminal_growth > 0.03 + 1e-9:
            raise ValueError(
                f"Invalid {name} scenario: terminal growth must be between 0% and 3%."
            )

        scenarios[name] = {
            "assumptions": assumptions,
            "wacc": wacc,
            "terminal_growth": terminal_growth
        }

    return scenarios
