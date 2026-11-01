
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
    if not balance_annual or not income_annual:
        return None

    income_sorted = sorted(income_annual, key=lambda x: int(x["year"]), reverse=True)
    latest_income = income_sorted[0]

    interest_expense = to_float(latest_income.get("interest_expense"))
    if interest_expense is None:
        return None

    balance_by_year = {str(b["year"]): b for b in balance_annual}
    latest_year = str(latest_income["year"])

    current_balance = balance_by_year.get(latest_year)
    if not current_balance:
        return None

    previous_balance = balance_by_year.get(str(int(latest_year) - 1))

    current_debt = to_float(current_balance.get("total_debt"))
    if current_debt is None:
        return None

    previous_debt = to_float(previous_balance.get("total_debt")) if previous_balance else None
    average_debt = (current_debt + previous_debt) / 2 if previous_debt is not None else current_debt

    if average_debt <= 0:
        return None

    return {
        "cost_of_debt": abs(interest_expense) / average_debt,
        "interest_expense": abs(interest_expense),
        "average_debt": average_debt,
        "current_debt": current_debt,
        "previous_debt": previous_debt,
    }

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
