
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

def resolve_tax_rate(tax_rate, forecast_assumptions):
    # Caller passed the whole assumptions dict: take its forecast value
    if isinstance(tax_rate, dict):
        tax_rate = tax_rate.get("forecast")

    tax_rate = to_float(tax_rate)
    if tax_rate is not None and tax_rate > 1:
        tax_rate /= 100

    # Nothing usable passed: fall back to the historical weighted rate
    if tax_rate is None:
        fallback = (forecast_assumptions.get("tax_rate") or {}).get("forecast")
        tax_rate = to_float(fallback)

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
    terminal_growth=0.025
):

    # 1. Calculate historical FCFF
    nwc_change = calculate_nwc_change(balance_annual)

    historical_fcff = calculate_historical_fcff(
        income_annual,
        cashflow_annual,
        nwc_change
    )

    historical_growth = calculate_fcff_growth(historical_fcff)


    # 2. Calculate forecast assumptions
    forecast_assumptions = calculate_forecast_assumptions(
        profitability,
        history,
        income_annual,
        cashflow_annual,
        balance_annual
    )
    
    tax_rate = resolve_tax_rate(tax_rate, forecast_assumptions)

    # 3. Calculate WACC components
    cost_of_equity = calculate_cost_of_equity(
        risk_free_rate,
        beta,
        equity_risk_premium
    )

    cost_of_debt_details = calculate_cost_of_debt(
    balance_annual,
    income_annual
)

    cost_of_debt = (
        cost_of_debt_details["cost_of_debt"]
        if cost_of_debt_details is not None
        else None
    )

    wacc = calculate_wacc(
        cost_of_equity,
        cost_of_debt,
        market_cap,
        total_debt,
        tax_rate
    )

    # Use the default WACC if the calculation is unavailable
    base_wacc = wacc if wacc is not None else 0.10


    # 4. Prepare WACC details
    market_cap_value = to_float(market_cap)
    debt_value = to_float(total_debt)

    total_capital = (
        market_cap_value + debt_value
        if market_cap_value is not None and debt_value is not None
        else None
    )

    if total_capital is not None and total_capital > 0:

        equity_weight = market_cap_value / total_capital
        debt_weight = debt_value / total_capital

        wacc_details = {
            "risk_free_rate": risk_free_rate,
            "beta": beta,
            "equity_risk_premium": equity_risk_premium,
            "market_cap": market_cap,
            "total_debt": total_debt,

            "cost_of_equity": cost_of_equity,
            "cost_of_debt": cost_of_debt,
            "cost_of_debt_details": cost_of_debt_details,
            "equity_weight": equity_weight,
            "debt_weight": debt_weight,
            "tax_rate": tax_rate,
            "calculated_wacc": wacc,
            "wacc": base_wacc
        }

    else:
        wacc_details = None

    print({
        "wacc_raw": wacc,
        "cost_of_equity": cost_of_equity,
        "cost_of_debt": cost_of_debt,
        "market_cap": market_cap,
        "total_debt": total_debt,
        "tax_rate": tax_rate,
        "rf": risk_free_rate,
        "beta": beta,
        "erp": equity_risk_premium,
        "base_wacc": base_wacc,
    })
    
    # 5. Generate bear, base and bull scenarios
    scenarios = generate_scenarios(
        forecast_assumptions,
        base_wacc,
        terminal_growth
    )

    scenario_results = {}

    for name, scenario in scenarios.items():

        # Forecast FCFF using scenario-specific assumptions
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

        # Calculate DCF valuation
        dcf_result = calculate_dcf(
            forecast,
            scenario["wacc"],
            cash,
            total_debt,
            shares_outstanding,
            scenario["terminal_growth"],
            scenario["assumptions"],
            scenario_wacc_details
        )

        if dcf_result is None:
            scenario_results[name] = None
            continue

        # Record the default WACC if the original calculation failed
        if wacc is None:
            dcf_result.setdefault("defaults_used", {})["wacc"] = 0.10

        # Add historical FCFF information
        dcf_result["historical_fcff"] = historical_fcff
        dcf_result["historical_fcff_growth"] = historical_growth

        scenario_results[name] = dcf_result


    # 6. Keep base case as the main DCF result
    base_result = scenario_results.get("base")

    if base_result is None:
        return None

    result = dict(base_result)
    result["scenarios"] = scenario_results

    return result
