
from ..utils import to_float, fiscal_year_key


def forecast_fcff(
    income_annual,
    balance_annual,
    forecast_assumptions,
    forecast_years=5
):
    # Extract forecast assumptions
    revenue_growth = forecast_assumptions["revenue_growth"]["forecast"]
    operating_margin = forecast_assumptions["operating_margin"]["forecast"]
    tax_rate = forecast_assumptions["tax_rate"]["forecast"]
    da_rate = forecast_assumptions["da_rate"]["forecast"]
    capex_rate = forecast_assumptions["capex_rate"]["forecast"]
    nwc_rate = forecast_assumptions["nwc_rate"]["forecast"]

    latest_income = income_annual[0]

    latest_revenue = to_float(latest_income.get("revenue"))
    latest_year = int(fiscal_year_key(latest_income.get("year")))

    latest_balance = next(
        (
            row for row in balance_annual
            if fiscal_year_key(row.get("year")) == str(latest_year)
        ),
        None
    )

    if latest_balance is None or latest_revenue is None:
        return None

    operating_assets = to_float(
        latest_balance.get("operating_current_assets")
    )
    operating_liabilities = to_float(
        latest_balance.get("operating_current_liabilities")
    )

    if operating_assets is None or operating_liabilities is None:
        return None

    latest_nwc = operating_assets - operating_liabilities

    assumptions = [
        revenue_growth,
        operating_margin,
        tax_rate,
        da_rate,
        capex_rate,
        nwc_rate
    ]

    if any(value is None for value in assumptions):
        return None

    forecast = []

    revenue = latest_revenue
    previous_nwc = latest_nwc
    previous_revenue = latest_revenue

    for year in range(1, forecast_years + 1):

        forecast_year = latest_year + year

        # Revenue
        revenue *= (1 + revenue_growth)
        revenue_growth_actual = revenue / previous_revenue - 1

        # EBIT and NOPAT
        ebit = revenue * operating_margin
        nopat = ebit * (1 - tax_rate)

        # D&A and CapEx
        da = revenue * da_rate
        capex = revenue * capex_rate

        # Net Working Capital
        nwc = revenue * nwc_rate
        delta_nwc = nwc - previous_nwc

        # FCFF
        fcff = nopat + da - capex - delta_nwc

        forecast.append({
            "year": forecast_year,
            "revenue": revenue,
            "revenue_growth": revenue_growth_actual,
            "ebit": ebit,
            "operating_margin": operating_margin,
            "tax_rate": tax_rate,
            "nopat": nopat,
            "da": da,
            "da_rate": da_rate,
            "capex": capex,
            "capex_rate": capex_rate,
            "nwc": nwc,
            "nwc_rate": nwc_rate,
            "change_nwc": delta_nwc,
            "fcff": fcff,
            "fcff_margin": fcff / revenue if revenue else None
        })

        previous_nwc = nwc
        previous_revenue = revenue

    return forecast
