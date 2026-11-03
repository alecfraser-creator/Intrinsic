
from ..utils import to_float, fiscal_year_key


def calculate_cost_of_equity(risk_free_rate, beta, equity_risk_premium):
    risk_free_rate = to_float(risk_free_rate)
    beta = to_float(beta)
    equity_risk_premium = to_float(equity_risk_premium)

    if any(value is None for value in [
        risk_free_rate,
        beta,
        equity_risk_premium
    ]):
        return None

    return risk_free_rate + beta * equity_risk_premium



def calculate_cost_of_debt(balance_annual, income_annual):
    # Always return the same structure, even when data is missing.
    result = {
        "cost_of_debt": None,
        "interest_expense": None,
        "current_debt": None,
        "previous_debt": None,
        "average_debt": None,
    }

    balance_annual = balance_annual or []
    income_annual = income_annual or []

    if not balance_annual:
        return result

    # Sort financial statements by year.
    balance_sorted = sorted(
        balance_annual,
        key=lambda x: int(x["year"]),
        reverse=True
    )

    income_sorted = sorted(
        income_annual,
        key=lambda x: int(x["year"]),
        reverse=True
    )

    # Use the latest income year when available.
    # Otherwise, use the latest balance sheet year.
    latest_year = (
        str(income_sorted[0]["year"])
        if income_sorted
        else str(balance_sorted[0]["year"])
    )

    balance_by_year = {
        str(balance["year"]): balance
        for balance in balance_sorted
    }

    current_balance = balance_by_year.get(latest_year)

    if current_balance is None:
        return result

    previous_balance = balance_by_year.get(
        str(int(latest_year) - 1)
    )

    # Retrieve debt figures independently of interest expense.
    current_debt = to_float(
        current_balance.get("total_debt")
    )

    previous_debt = (
        to_float(previous_balance.get("total_debt"))
        if previous_balance
        else None
    )

    result["current_debt"] = current_debt
    result["previous_debt"] = previous_debt

    if current_debt is None:
        return result

    # Use average debt when both years are available.
    # Otherwise, use current debt as a fallback.
    average_debt = (
        (current_debt + previous_debt) / 2
        if previous_debt is not None
        else current_debt
    )

    result["average_debt"] = average_debt

    if average_debt <= 0:
        return result

    # Interest expense is only available if the income statement
    # contains the corresponding year.
    latest_income = next(
        (
            income for income in income_sorted
            if str(income["year"]) == latest_year
        ),
        None
    )

    if latest_income is None:
        return result

    interest_expense = to_float(
        latest_income.get("interest_expense")
    )

    if interest_expense is None:
        return result

    interest_expense = abs(interest_expense)

    result["interest_expense"] = interest_expense
    result["cost_of_debt"] = interest_expense / average_debt

    return result


def calculate_wacc(
    cost_of_equity,
    cost_of_debt,
    market_cap,
    total_debt,
    tax_rate
):
    cost_of_equity = to_float(cost_of_equity)
    cost_of_debt = to_float(cost_of_debt)
    market_cap = to_float(market_cap)
    total_debt = to_float(total_debt)
    tax_rate = to_float(tax_rate)

    if any(value is None for value in [
        cost_of_equity,
        market_cap,
        total_debt
    ]):
        return None

    if market_cap <= 0 or total_debt < 0:
        return None

    total_capital = market_cap + total_debt

    if total_capital <= 0:
        return None

    equity_weight = market_cap / total_capital
    debt_weight = total_debt / total_capital

    # If the company has no debt, WACC equals cost of equity.
    if total_debt == 0:
        return cost_of_equity

    if cost_of_debt is None or tax_rate is None:
        return None

    after_tax_cost_of_debt = cost_of_debt * (1 - tax_rate)

    wacc = (
        equity_weight * cost_of_equity
        + debt_weight * after_tax_cost_of_debt
    )

    return wacc
