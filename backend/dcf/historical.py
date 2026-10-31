
def calculate_nwc_change(balance_annual):
    nwc_yearly = {}

    for year_data in balance_annual:
        year = year_data.get("year")

        assets = year_data.get("operating_current_assets")
        liabilities = year_data.get("operating_current_liabilities")

        if year is None or assets is None or liabilities is None:
            continue

        nwc = float(assets) - float(liabilities)
        nwc_yearly[year] = nwc

    years = sorted(nwc_yearly)

    nwc_change = {}

    for i in range(len(years) - 1):
        current_year = years[i]
        next_year = years[i + 1]

        nwc_change[next_year] = (
            nwc_yearly[next_year] - nwc_yearly[current_year]
        )

    return nwc_change


def calculate_historical_fcff(income_annual, cashflow_annual, nwc_change):
    historical_fcff = {}

    for income_data in income_annual:
        year = income_data["year"]

        ebit = income_data["ebit"]
        tax_rate = income_data["tax_rate"]

        if ebit is None or tax_rate is None:
            continue

        ebit = float(ebit)
        tax_rate = float(tax_rate)

        nopat = ebit * (1 - tax_rate)

        cashflow_data = next(
            (item for item in cashflow_annual if item["year"] == year),
            None
        )

        if cashflow_data is None or year not in nwc_change:
            continue

        da = cashflow_data["depreciation_amortization"]
        capex = cashflow_data["capital_expenditure"]
        delta_nwc = nwc_change[year]

        if da is None or capex is None:
            continue

        da = float(da)
        capex = float(capex)

        fcff = nopat + da - capex - delta_nwc

        historical_fcff[year] = fcff

    return historical_fcff


def calculate_fcff_growth(historical_fcff):
    years = sorted(historical_fcff)

    yearly_growth = {}

    for i in range(1, len(years)):
        previous_year = years[i - 1]
        current_year = years[i]

        previous_fcff = historical_fcff[previous_year]
        current_fcff = historical_fcff[current_year]

        if previous_fcff > 0:
            yearly_growth[current_year] = (
                current_fcff / previous_fcff
            ) - 1
        else:
            yearly_growth[current_year] = None

    cagr = None

    if len(years) > 1:
        first_fcff = historical_fcff[years[0]]
        last_fcff = historical_fcff[years[-1]]

        if first_fcff > 0 and last_fcff > 0:
            intervals = len(years) - 1
            cagr = (last_fcff / first_fcff) ** (1 / intervals) - 1

    return {
        "yearly_growth": yearly_growth,
        "cagr": cagr
    }
