from ..utils import to_float


def calculate_financial_strength(balance_quarter, income_ttm):

    balance = balance_quarter[0] if balance_quarter else {}
    income = income_ttm[0] if income_ttm else {}

    cash = to_float(balance.get("cash"))
    total_debt = to_float(balance.get("total_debt"))
    equity = to_float(balance.get("equity"))
    current_assets = to_float(balance.get("current_assets"))
    current_liabilities = to_float(balance.get("current_liabilities"))

    ebit = to_float(income.get("ebit"))
    interest_expense = to_float(income.get("interest_expense"))

    net_debt = (
        total_debt - cash
        if total_debt is not None and cash is not None
        else None
    )

    debt_equity = (
        total_debt / equity
        if total_debt is not None
        and equity is not None
        and equity > 0
        else None
    )

    current_ratio = (
        current_assets / current_liabilities
        if current_assets is not None
        and current_liabilities not in (None, 0)
        else None
    )

    interest_coverage = (
        ebit / abs(interest_expense)
        if ebit is not None
        and interest_expense not in (None, 0)
        else None
    )

    return {
        "cash": cash,
        "total_debt": total_debt,
        "net_debt": net_debt,
        "debt_to_equity": debt_equity,
        "current_ratio": current_ratio,
        "interest_coverage": interest_coverage
    }
