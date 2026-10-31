from ..utils import to_float

from .historical import (
    calculate_nwc_change,
    calculate_historical_fcff,
    calculate_fcff_growth
)

from .assumptions import calculate_forecast_assumptions
from .forecast import forecast_fcff

from .wacc import (
    calculate_cost_of_equity,
    calculate_cost_of_debt,
    calculate_wacc
)

from .model import calculate_dcf


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


    # 3. Forecast future FCFF
    forecast = forecast_fcff(
        income_annual,
        balance_annual,
        forecast_assumptions
    )

    if forecast is None:
        return None


    # 4. Calculate WACC components
    cost_of_equity = calculate_cost_of_equity(
        risk_free_rate,
        beta,
        equity_risk_premium
    )

    cost_of_debt = calculate_cost_of_debt(
        balance_annual,
        income_annual
    )

    wacc = calculate_wacc(
        cost_of_equity,
        cost_of_debt,
        market_cap,
        total_debt,
        tax_rate
    )


    # 5. Prepare WACC details for the result
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
            "cost_of_equity": cost_of_equity,
            "cost_of_debt": cost_of_debt,
            "equity_weight": equity_weight,
            "debt_weight": debt_weight,
            "tax_rate": tax_rate,
            "wacc": wacc
        }

    else:
        wacc_details = None


    # 6. Calculate intrinsic value
    dcf_result = calculate_dcf(
        forecast,
        wacc,
        cash,
        total_debt,
        shares_outstanding,
        terminal_growth,
        forecast_assumptions,
        wacc_details
    )

    if dcf_result is None:
        return None


    # 7. Add historical FCFF information
    dcf_result["historical_fcff"] = historical_fcff
    dcf_result["historical_fcff_growth"] = historical_growth

    return dcf_result