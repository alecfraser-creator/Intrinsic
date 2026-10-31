
from ..utils import to_float


def annual_cagr(income_annual, field, years):
    """Calculate CAGR between the latest fiscal year and the year N years earlier."""

    if len(income_annual) <= years:
        return None

    latest_row = income_annual[0]
    old_row = income_annual[years]

    try:
        if int(latest_row["year"]) - int(old_row["year"]) != years:
            return None
    except (KeyError, TypeError, ValueError):
        pass

    latest = to_float(latest_row.get(field))
    old = to_float(old_row.get(field))

    if latest is None or old is None or latest <= 0 or old <= 0:
        return None

    return ((latest / old) ** (1 / years) - 1) * 100


def calculate_profitability(
    income_annual,
    income_ttm,
    balance_quarter,
    cashflow_ttm
):

    # =========================
    # REVENUE GROWTH
    # =========================

    revenue_5y_cagr = annual_cagr(income_annual, "revenue", 5)
    revenue_3y_cagr = annual_cagr(income_annual, "revenue", 3)
    revenue_yoy_growth = None

    if len(income_ttm) >= 5:
        latest = to_float(income_ttm[0].get("revenue"))
        old = to_float(income_ttm[4].get("revenue"))

        if latest is not None and old not in (None, 0):
            revenue_yoy_growth = ((latest / old) - 1) * 100

    # =========================
    # EPS GROWTH
    # =========================

    eps_5y_cagr = annual_cagr(income_annual, "eps", 5)
    eps_3y_cagr = annual_cagr(income_annual, "eps", 3)
    eps_yoy_growth = None

    if len(income_ttm) >= 5:
        latest = to_float(income_ttm[0].get("eps_diluted"))
        old = to_float(income_ttm[4].get("eps_diluted"))

        if (
            latest is not None
            and old is not None
            and latest > 0
            and old > 0
        ):
            eps_yoy_growth = ((latest / old) - 1) * 100

    # =========================
    # MARGINS
    # =========================

    gross_margin = None
    operating_margin = None
    fcf_margin = None
    fcf_growth_yoy = None
    fcf = None

    if income_ttm:
        revenue = to_float(income_ttm[0].get("revenue"))
        gross_profit = to_float(income_ttm[0].get("gross_profit"))
        ebit = to_float(income_ttm[0].get("ebit"))

        if revenue not in (None, 0):

            if gross_profit is not None:
                gross_margin = (gross_profit / revenue) * 100

            if ebit is not None:
                operating_margin = (ebit / revenue) * 100

    if cashflow_ttm:
        fcf = to_float(cashflow_ttm[0].get("free_cash_flow"))

        if fcf is not None and income_ttm:
            revenue = to_float(income_ttm[0].get("revenue"))

            if revenue not in (None, 0):
                fcf_margin = (fcf / revenue) * 100

    if len(cashflow_ttm) >= 5:
        latest = to_float(cashflow_ttm[0].get("free_cash_flow"))
        old = to_float(cashflow_ttm[4].get("free_cash_flow"))

        if (
            latest is not None
            and old is not None
            and latest > 0
            and old > 0
        ):
            fcf_growth_yoy = ((latest / old) - 1) * 100

    # =========================
    # ROE
    # =========================

    roe = None

    if income_ttm and len(balance_quarter) >= 5:

        net_income = to_float(
            income_ttm[0].get("net_income")
        )

        ending_equity = to_float(
            balance_quarter[0].get("equity")
        )

        beginning_equity = to_float(
            balance_quarter[4].get("equity")
        )

        if (
            net_income is not None
            and ending_equity is not None
            and beginning_equity is not None
        ):
            average_equity = (
                beginning_equity + ending_equity
            ) / 2

            if average_equity > 0:
                roe = (net_income / average_equity) * 100

    # =========================
    # ROIC
    # =========================

    roic = None

    if income_ttm and len(balance_quarter) >= 5:

        ebit = to_float(
            income_ttm[0].get("ebit")
        )

        tax_rate = to_float(
            income_ttm[0].get("tax_rate")
        )

        ending_equity = to_float(
            balance_quarter[0].get("equity")
        )

        beginning_equity = to_float(
            balance_quarter[4].get("equity")
        )

        ending_debt = to_float(
            balance_quarter[0].get("total_debt")
        )

        beginning_debt = to_float(
            balance_quarter[4].get("total_debt")
        )

        if (
            ebit is not None
            and tax_rate is not None
            and ending_equity is not None
            and beginning_equity is not None
            and ending_debt is not None
            and beginning_debt is not None
        ):
            nopat = ebit * (1 - tax_rate)

            average_equity = (
                beginning_equity + ending_equity
            ) / 2

            average_debt = (
                beginning_debt + ending_debt
            ) / 2

            average_invested_capital = (
                average_equity + average_debt
            )

            if average_invested_capital > 0:
                roic = (
                    nopat / average_invested_capital
                ) * 100

    return {
        "Revenue 5Y CAGR": revenue_5y_cagr,
        "Revenue 3Y CAGR": revenue_3y_cagr,
        "Revenue YoY Growth": revenue_yoy_growth,

        "EPS 5Y CAGR": eps_5y_cagr,
        "EPS 3Y CAGR": eps_3y_cagr,
        "EPS YoY Growth": eps_yoy_growth,

        "Gross Margin": gross_margin,
        "Operating Margin": operating_margin,
        "Free Cashflow": fcf,
        "FCF Margin": fcf_margin,
        "FCF YoY Growth": fcf_growth_yoy,

        "ROE": roe,
        "ROIC": roic
    }
