
from ..utils import to_float


def calculate_forecast_assumptions(
    profitability,
    history,
    income_annual,
    cashflow_annual,
    balance_annual,
    existing_assumptions=None
):
    existing_assumptions = existing_assumptions or {}

    default_weights = {
        "6y_average": 0.3,
        "3y_average": 0.3,
        "latest": 0.4
    }

    def build_editable_value(calculated, existing=None):
        existing = existing or {}

        return {
            "calculated": calculated,
            "custom": existing.get("custom")
        }

    def get_effective_value(value):
        if value["custom"] is not None:
            return value["custom"]

        return value["calculated"]

    def calculate_weighted_forecast(
        values,
        existing=None,
        divisor=1
    ):
        existing = existing or {}

        # Convert values before calculating averages.
        values = [
            v / divisor
            for v in values
            if v is not None
        ]

        if not values:
            return None

        latest = values[0]
        three_year = values[:3]
        six_year = values[:6]

        avg_3y = sum(three_year) / len(three_year)
        avg_6y = sum(six_year) / len(six_year)

        existing_inputs = existing.get("inputs", {})

        inputs = {
            "6y_average": build_editable_value(
                avg_6y,
                existing_inputs.get("6y_average")
            ),
            "3y_average": build_editable_value(
                avg_3y,
                existing_inputs.get("3y_average")
            ),
            "latest": build_editable_value(
                latest,
                existing_inputs.get("latest")
            ),
            "weights": {}
        }

        existing_weights = existing_inputs.get("weights", {})

        for key, weight in default_weights.items():
            inputs["weights"][key] = build_editable_value(
                weight,
                existing_weights.get(key)
            )

        forecast = (
            get_effective_value(inputs["6y_average"])
            * get_effective_value(inputs["weights"]["6y_average"])
            +
            get_effective_value(inputs["3y_average"])
            * get_effective_value(inputs["weights"]["3y_average"])
            +
            get_effective_value(inputs["latest"])
            * get_effective_value(inputs["weights"]["latest"])
        )

        return {
            "calculated": forecast,
            "custom": existing.get("custom"),
            "inputs": inputs
        }

    # =========================
    # REVENUE GROWTH
    # =========================

    revenue_5y = profitability["Revenue 5Y CAGR"]
    revenue_3y = profitability["Revenue 3Y CAGR"]
    revenue_yoy = profitability["Revenue YoY Growth"]

    revenue_values = {
        "5y_cagr": revenue_5y / 100 if revenue_5y is not None else None,
        "3y_cagr": revenue_3y / 100 if revenue_3y is not None else None,
        "yoy_growth": revenue_yoy / 100 if revenue_yoy is not None else None
    }

    existing_revenue = existing_assumptions.get("revenue_growth", {})
    existing_revenue_inputs = existing_revenue.get("inputs", {})

    revenue_inputs = {}

    for key, value in revenue_values.items():
        revenue_inputs[key] = build_editable_value(
            value,
            existing_revenue_inputs.get(key)
        )

    effective_revenue_values = [
        get_effective_value(value)
        for value in revenue_inputs.values()
        if get_effective_value(value) is not None
    ]

    revenue_growth = {
        "calculated": (
            sum(effective_revenue_values) / len(effective_revenue_values)
            if effective_revenue_values
            else None
        ),
        "custom": existing_revenue.get("custom"),
        "inputs": revenue_inputs
    }

    # =========================
    # OPERATING MARGIN
    # =========================

    # History is oldest-first, but the weighted calculation
    # expects newest-first.
    operating_margin = calculate_weighted_forecast(
        list(reversed(history["operating_margin"])),
        existing_assumptions.get("operating_margin"),
        divisor=100
    )

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

    # Sort income statements newest first.
    income_sorted = sorted(
        income_annual,
        key=lambda x: int(x["year"]),
        reverse=True
    )[:6]

    # =========================
    # TAX RATE
    # =========================

    tax_rate = calculate_weighted_forecast(
        [
            to_float(item.get("tax_rate"))
            for item in income_sorted
        ],
        existing_assumptions.get("tax_rate")
    )

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

    da_rate = calculate_weighted_forecast(
        da_rates,
        existing_assumptions.get("da_rate")
    )

    capex_rate = calculate_weighted_forecast(
        capex_rates,
        existing_assumptions.get("capex_rate")
    )

    nwc_rate = calculate_weighted_forecast(
        nwc_rates,
        existing_assumptions.get("nwc_rate")
    )

    return {
        "revenue_growth": revenue_growth,
        "operating_margin": operating_margin,
        "tax_rate": tax_rate,
        "da_rate": da_rate,
        "capex_rate": capex_rate,
        "nwc_rate": nwc_rate
    }
