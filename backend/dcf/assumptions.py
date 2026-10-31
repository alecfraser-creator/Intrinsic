from ..utils import to_float


def calculate_forecast_assumptions(
    profitability,
    history,
    income_annual,
    cashflow_annual,
    balance_annual
):
    weights = {
        "6y_average": 0.3,
        "3y_average": 0.3,
        "latest": 0.4
    }

    def calculate_weighted_forecast(values):
        values = [v for v in values if v is not None]

        if not values:
            return None

        latest = values[0]
        three_year = values[:3]
        six_year = values[:6]

        avg_3y = sum(three_year) / len(three_year)
        avg_6y = sum(six_year) / len(six_year)

        forecast = (
            avg_6y * weights["6y_average"]
            + avg_3y * weights["3y_average"]
            + latest * weights["latest"]
        )

        return {
            "forecast": forecast,
            "6y_average": avg_6y,
            "3y_average": avg_3y,
            "latest": latest,
            "weights": weights
        }

    # =========================
    # REVENUE GROWTH
    # =========================

    revenue_5y = profitability["Revenue 5Y CAGR"]
    revenue_3y = profitability["Revenue 3Y CAGR"]

    if revenue_5y is not None and revenue_3y is not None:
        revenue_5y /= 100
        revenue_3y /= 100

        revenue_growth = {
            "forecast": (revenue_5y + revenue_3y) / 2,
            "5y_cagr": revenue_5y,
            "3y_cagr": revenue_3y
        }
    else:
        revenue_growth = {
            "forecast": None,
            "5y_cagr": revenue_5y / 100 if revenue_5y is not None else None,
            "3y_cagr": revenue_3y / 100 if revenue_3y is not None else None
        }

    # =========================
    # OPERATING MARGIN
    # =========================

    # History is oldest-first, but the weighted calculation
    # expects newest-first.
    operating_margin = calculate_weighted_forecast(
        list(reversed(history["operating_margin"]))
    )

    if operating_margin is not None:
        for key in ["forecast", "6y_average", "3y_average", "latest"]:
            operating_margin[key] /= 100

    # =========================
    # MATCH FINANCIAL STATEMENTS BY YEAR
    # =========================

    cashflow_by_year = {
        str(item["year"]): item
        for item in cashflow_annual
    }

    balance_by_year = {
        str(item["year"]): item
        for item in balance_annual
    }

    # Sort income statements newest first
    income_sorted = sorted(
        income_annual,
        key=lambda x: int(x["year"]),
        reverse=True
    )[:6]

    # =========================
    # TAX RATE
    # =========================

    tax_rate = calculate_weighted_forecast([
        to_float(item.get("tax_rate"))
        for item in income_sorted
    ])

    # =========================
    # D&A / CAPEX / NWC RATES
    # =========================

    da_rates = []
    capex_rates = []
    nwc_rates = []

    for income in income_sorted:
        year = str(income["year"])
        revenue = to_float(income.get("revenue"))

        if revenue is None or revenue == 0:
            continue

        cashflow = cashflow_by_year.get(year)
        balance = balance_by_year.get(year)

        if cashflow:
            da = to_float(cashflow.get("depreciation_amortization"))
            capex = to_float(cashflow.get("capital_expenditure"))

            if da is not None:
                da_rates.append(da / revenue)

            if capex is not None:
                capex_rates.append(capex / revenue)

        if balance:
            assets = to_float(balance.get("operating_current_assets"))
            liabilities = to_float(balance.get("operating_current_liabilities"))

            if assets is not None and liabilities is not None:
                nwc_rates.append((assets - liabilities) / revenue)

    da_rate = calculate_weighted_forecast(da_rates)
    capex_rate = calculate_weighted_forecast(capex_rates)
    nwc_rate = calculate_weighted_forecast(nwc_rates)

    return {
        "revenue_growth": revenue_growth,
        "operating_margin": operating_margin,
        "tax_rate": tax_rate,
        "da_rate": da_rate,
        "capex_rate": capex_rate,
        "nwc_rate": nwc_rate
    }
