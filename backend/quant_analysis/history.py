from ..utils import to_float, percent, fiscal_year_key


HISTORY_YEARS = 6


def calculate_historical_pe(income_annual, prices_historical):
    ratios_annual = []

    for row in income_annual:
        price = prices_historical.get(row["year"])
        eps = to_float(row.get("eps"))

        if price is not None and eps is not None and eps > 0:
            ratios_annual.append({
                "year": row["year"],
                "pe": price / eps
            })

    return ratios_annual


def calculate_history(
    income_annual,
    cashflow_annual,
    ratios_annual,
    balance_annual,
    historical_prices,
    shares_by_year
):
    """Build historical chart series, oldest year first."""

    shares_by_year = {
        fiscal_year_key(year): to_float(shares)
        for year, shares in shares_by_year.items()
    }

    income_rows = income_annual[:HISTORY_YEARS]

    cashflow_by_year = {
        fiscal_year_key(row.get("year")): row
        for row in cashflow_annual
    }

    balance_by_year = {
        fiscal_year_key(row.get("year")): row
        for row in balance_annual
        if row.get("year") is not None
    }

    ratios_have_years = bool(ratios_annual) and all(
        row.get("year") is not None for row in ratios_annual
    )

    pe_by_year = (
        {
            fiscal_year_key(row["year"]): to_float(row.get("pe"))
            for row in ratios_annual
        }
        if ratios_have_years
        else {}
    )

    history = {
        "years": [],
        "revenue": [],
        "fcf": [],
        "eps": [],
        "gross_margin": [],
        "operating_margin": [],
        "fcf_margin": [],
        "pe": [],
        "p_fcf": [],
        "ev_ebitda": [],
        "p_b": []
    }

    for index, row in enumerate(income_rows):
        year = fiscal_year_key(row.get("year"))

        revenue = to_float(row.get("revenue"))
        gross_profit = to_float(row.get("gross_profit"))
        ebit = to_float(row.get("ebit"))
        eps = to_float(row.get("eps"))

        cashflow_row = cashflow_by_year.get(year, {})
        balance_row = balance_by_year.get(year, {})

        fcf = to_float(cashflow_row.get("free_cash_flow"))
        depreciation = to_float(
            cashflow_row.get("depreciation_amortization")
        )

        price = to_float(historical_prices.get(year))
        shares = shares_by_year.get(year)

        market_cap = (
            price * shares
            if price is not None and shares is not None
            else None
        )

        cash = to_float(balance_row.get("cash"))
        debt = to_float(balance_row.get("total_debt"))
        equity = to_float(balance_row.get("equity"))

        if ratios_have_years:
            pe = pe_by_year.get(year)
        elif index < len(ratios_annual):
            pe = to_float(ratios_annual[index].get("pe"))
        else:
            pe = None

        p_fcf = (
            market_cap / fcf
            if market_cap is not None and fcf is not None and fcf > 0
            else None
        )

        ebitda = (
            ebit + depreciation
            if ebit is not None and depreciation is not None
            else None
        )

        ev_ebitda = (
            (market_cap + debt - cash) / ebitda
            if (
                market_cap is not None
                and debt is not None
                and cash is not None
                and ebitda is not None
                and ebitda > 0
            )
            else None
        )

        p_b = (
            market_cap / equity
            if market_cap is not None and equity is not None and equity > 0
            else None
        )

        history["years"].append(year)
        history["revenue"].append(revenue)
        history["fcf"].append(fcf)
        history["eps"].append(eps)
        history["gross_margin"].append(percent(gross_profit, revenue))
        history["operating_margin"].append(percent(ebit, revenue))
        history["fcf_margin"].append(percent(fcf, revenue))
        history["pe"].append(pe)
        history["p_fcf"].append(p_fcf)
        history["ev_ebitda"].append(ev_ebitda)
        history["p_b"].append(p_b)

    for series in history.values():
        series.reverse()

    return history
