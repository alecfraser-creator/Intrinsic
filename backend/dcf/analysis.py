
from ..utils import to_float

from .historical import (
    calculate_nwc_change,
    calculate_historical_fcff,
    calculate_fcff_growth
)

from .assumptions import calculate_forecast_assumptions
from .forecast import forecast_fcff
from .scenarios import generate_scenarios

from .wacc import (
    calculate_cost_of_equity,
    calculate_cost_of_debt,
    calculate_wacc
)

from .model import calculate_dcf


def build_editable_value(calculated, existing=None):
    existing = existing or {}

    return {
        "calculated": to_float(calculated),
        "custom": to_float(existing.get("custom"))
    }


def get_effective_value(assumption):
    if assumption is None:
        return None

    custom = assumption.get("custom")

    return (
        custom
        if custom is not None
        else assumption.get("calculated")
    )


def resolve_tax_rate(
    tax_rate,
    forecast_assumptions,
    fallback_tax_rate=None
):
    # Extract the effective value if a complete assumption was passed.
    if isinstance(tax_rate, dict):
        tax_rate = get_effective_value(tax_rate)

    tax_rate = to_float(tax_rate)

    if tax_rate is not None and tax_rate > 1:
        tax_rate /= 100

    # Fall back to the forecast assumption.
    if tax_rate is None:
        fallback = forecast_assumptions.get("tax_rate")
        tax_rate = to_float(get_effective_value(fallback))

        if tax_rate is not None and tax_rate > 1:
            tax_rate /= 100

    # Finally, fall back to the latest TTM tax rate.
    if tax_rate is None:
        tax_rate = to_float(fallback_tax_rate)

        if tax_rate is not None and tax_rate > 1:
            tax_rate /= 100

    return tax_rate



def run_dcf_analysis(
    profitability,
    history,
    income_annual,
    cashflow_annual,
    balance_annual,
    risk_free_rate,
    beta,
    equity_risk_premium,
    market_cap,
    cash,
    total_debt,
    tax_rate,
    shares_outstanding,
    terminal_growth=0.025,
    existing_assumptions=None,
    custom_assumptions=None,
    existing_scenarios=None,
    existing_terminal_growth_input=None
):

    existing_forecast_assumptions = existing_assumptions or {}

    # 1. Build the shared editable terminal-growth input.

    terminal_growth_input = build_editable_value(
        terminal_growth,
        existing_terminal_growth_input
    )

    effective_terminal_growth = get_effective_value(
        terminal_growth_input
    )

    # 2. Calculate historical FCFF.
    nwc_change = calculate_nwc_change(balance_annual)

    historical_fcff = calculate_historical_fcff(
        income_annual,
        cashflow_annual,
        nwc_change
    )

    historical_growth = calculate_fcff_growth(historical_fcff)

    # 3. Calculate forecast assumptions.
    forecast_assumptions = calculate_forecast_assumptions(
        profitability,
        history,
        income_annual,
        cashflow_annual,
        balance_annual,
        existing_assumptions=existing_forecast_assumptions
    )

    # Backward compatibility with the previous flat custom_assumptions
    # structure.
    if custom_assumptions:
        for name, custom_value in custom_assumptions.items():
            if name in forecast_assumptions:
                forecast_assumptions[name]["custom"] = custom_value

    # 4. Build editable WACC inputs.

    def build_wacc_input(name, calculated):
        existing = existing_forecast_assumptions.get(name)

        return build_editable_value(
            calculated,
            existing
        )

    risk_free_rate_input = build_wacc_input(
        "risk_free_rate",
        risk_free_rate
    )

    beta_input = build_wacc_input(
        "beta",
        beta
    )

    equity_risk_premium_input = build_wacc_input(
        "equity_risk_premium",
        equity_risk_premium
    )

    market_cap_input = build_wacc_input(
        "market_cap",
        market_cap
    )

    total_debt_input = build_wacc_input(
        "total_debt",
        total_debt
    )

    # Calculate original cost-of-debt components.
    raw_cost_of_debt_details = calculate_cost_of_debt(
        balance_annual,
        income_annual
    ) or {}

    interest_expense_input = build_wacc_input(
        "interest_expense",
        raw_cost_of_debt_details.get("interest_expense")
    )

    current_debt_input = build_wacc_input(
        "current_debt",
        raw_cost_of_debt_details.get("current_debt")
    )

    previous_debt_input = build_wacc_input(
        "previous_debt",
        raw_cost_of_debt_details.get("previous_debt")
    )

    average_debt_input = build_wacc_input(
        "average_debt",
        raw_cost_of_debt_details.get("average_debt")
    )

    cost_of_debt_input = build_wacc_input(
        "cost_of_debt",
        raw_cost_of_debt_details.get("cost_of_debt")
    )

    # Tax rate is already part of forecast_assumptions.
    tax_rate_input = forecast_assumptions.get("tax_rate", {
        "calculated": None,
        "custom": None
    })

    # Store all WACC inputs in the same authoritative structure.
    wacc_inputs = {
        "risk_free_rate": risk_free_rate_input,
        "beta": beta_input,
        "equity_risk_premium": equity_risk_premium_input,
        "interest_expense": interest_expense_input,
        "current_debt": current_debt_input,
        "previous_debt": previous_debt_input,
        "average_debt": average_debt_input,
        "cost_of_debt": cost_of_debt_input,
        "market_cap": market_cap_input,
        "total_debt": total_debt_input
    }

    forecast_assumptions.update(wacc_inputs)

    # 5. Resolve effective WACC inputs.

    effective_risk_free_rate = get_effective_value(
        risk_free_rate_input
    )

    effective_beta = get_effective_value(
        beta_input
    )

    effective_equity_risk_premium = get_effective_value(
        equity_risk_premium_input
    )

    effective_market_cap = get_effective_value(
        market_cap_input
    )

    effective_total_debt = get_effective_value(
        total_debt_input
    )

    effective_tax_rate = resolve_tax_rate(
        tax_rate_input,
        forecast_assumptions,
        fallback_tax_rate=tax_rate
    )

    # Keep the forecast assumption synchronized with the effective rate.
    if effective_tax_rate is not None:
        tax_rate_input["calculated"] = effective_tax_rate

    effective_interest_expense = get_effective_value(
        interest_expense_input
    )

    effective_current_debt = get_effective_value(
        current_debt_input
    )

    effective_previous_debt = get_effective_value(
        previous_debt_input
    )

    # 6. Recalculate average debt from effective debt inputs.

    if average_debt_input["custom"] is not None:
        effective_average_debt = average_debt_input["custom"]

    elif effective_current_debt is not None:
        if effective_previous_debt is not None:
            effective_average_debt = (
                effective_current_debt + effective_previous_debt
            ) / 2
        else:
            effective_average_debt = effective_current_debt

        average_debt_input["calculated"] = effective_average_debt

    else:
        effective_average_debt = None

    # 7. Recalculate cost of debt.

    if cost_of_debt_input["custom"] is not None:
        effective_cost_of_debt = cost_of_debt_input["custom"]

    elif (
        effective_interest_expense is not None
        and effective_average_debt is not None
        and effective_average_debt > 0
    ):
        effective_cost_of_debt = (
            abs(effective_interest_expense) / effective_average_debt
        )

        cost_of_debt_input["calculated"] = effective_cost_of_debt

    else:
        effective_cost_of_debt = None
        cost_of_debt_input["calculated"] = None

    # 8. Calculate cost of equity and WACC.

    cost_of_equity = calculate_cost_of_equity(
        effective_risk_free_rate,
        effective_beta,
        effective_equity_risk_premium
    )

    wacc = calculate_wacc(
        cost_of_equity,
        effective_cost_of_debt,
        effective_market_cap,
        effective_total_debt,
        effective_tax_rate
    )

    # Use the default WACC if the calculation is unavailable.
    base_wacc = wacc if wacc is not None else 0.10

    # 9. Calculate capital structure.

    total_capital = (
        effective_market_cap + effective_total_debt
        if effective_market_cap is not None
        and effective_total_debt is not None
        else None
    )

    if total_capital is not None and total_capital > 0:

        equity_weight = effective_market_cap / total_capital
        debt_weight = effective_total_debt / total_capital

        after_tax_cost_of_debt = (
            effective_cost_of_debt * (1 - effective_tax_rate)
            if effective_cost_of_debt is not None
            and effective_tax_rate is not None
            else None
        )

        equity_contribution = (
            equity_weight * cost_of_equity
            if cost_of_equity is not None
            else None
        )

        debt_contribution = (
            debt_weight * after_tax_cost_of_debt
            if after_tax_cost_of_debt is not None
            else None
        )

        wacc_details = {
            "risk_free_rate": effective_risk_free_rate,
            "beta": effective_beta,
            "equity_risk_premium": effective_equity_risk_premium,
            "market_cap": effective_market_cap,
            "total_debt": effective_total_debt,
            "cost_of_equity": cost_of_equity,
            "cost_of_debt": effective_cost_of_debt,

            "cost_of_debt_details": {
                "interest_expense": effective_interest_expense,
                "current_debt": effective_current_debt,
                "previous_debt": effective_previous_debt,
                "average_debt": effective_average_debt
            },

            "equity_weight": equity_weight,
            "debt_weight": debt_weight,
            "tax_rate": effective_tax_rate,
            "after_tax_cost_of_debt": after_tax_cost_of_debt,
            "equity_contribution": equity_contribution,
            "debt_contribution": debt_contribution,
            "calculated_wacc": wacc,
            "wacc": base_wacc
        }

    else:
        wacc_details = None

    # 10. Generate bear, base and bull scenarios.

    scenarios = generate_scenarios(
        forecast_assumptions,
        base_wacc,
        effective_terminal_growth,
        existing_scenarios=existing_scenarios
    )

    scenario_results = {}

    for name, scenario in scenarios.items():

        # Forecast FCFF using scenario-specific assumptions.
        forecast = forecast_fcff(
            income_annual,
            balance_annual,
            scenario["assumptions"]
        )

        if forecast is None:
            scenario_results[name] = None
            continue

        scenario_wacc_details = (
            dict(wacc_details) if wacc_details else None
        )

        if scenario_wacc_details is not None:
            scenario_wacc_details["wacc"] = scenario["wacc"]

        # Calculate DCF valuation.
        dcf_result = calculate_dcf(
            forecast,
            scenario["wacc"],
            cash,
            effective_total_debt,
            shares_outstanding,
            scenario["terminal_growth"],
            scenario["assumptions"],
            scenario_wacc_details
        )

        if dcf_result is None:
            scenario_results[name] = None
            continue

        # Record the default WACC if the original calculation failed.
        if wacc is None:
            dcf_result.setdefault("defaults_used", {})["wacc"] = 0.10

        # Add historical FCFF information.
        dcf_result["historical_fcff"] = historical_fcff
        dcf_result["historical_fcff_growth"] = historical_growth

        scenario_results[name] = dcf_result

    # 11. Keep base case as the main DCF result.

    base_result = scenario_results.get("base")

    if base_result is None:
        return None

    result = dict(base_result)
    result["scenarios"] = scenario_results
    result["terminal_growth_input"] = terminal_growth_input

    return result
