import statistics

from ..utils import to_float


def calculate_valuation(
    profile,
    income_ttm,
    income_annual,
    cashflow_ttm,
    cashflow_annual,
    balance_quarter,
    ratios_annual
):

    valuation = {
        "P/E": None,
        "P/FCF": None,
        "EV/EBITDA": None,
        "P/B": None,
        "Normalized Earnings Valuation": None,
        "Discounted Cash Flow (DCF) Valuation": None
    }

    # =========================
    # CURRENT VALUATION
    # =========================

    # -------------------------
    # P/E
    # -------------------------

    if profile and income_ttm:
        price = to_float(profile.get("price"))
        eps = to_float(income_ttm[0].get("eps_diluted"))

        if price is not None and eps is not None and eps > 0:
            valuation["P/E"] = price / eps

    # -------------------------
    # P/FCF
    # -------------------------

    if profile and cashflow_ttm:
        market_cap = to_float(profile.get("market_cap"))
        fcf = to_float(cashflow_ttm[0].get("free_cash_flow"))

        if market_cap is not None and fcf is not None and fcf > 0:
            valuation["P/FCF"] = market_cap / fcf

    # -------------------------
    # EV/EBITDA
    # -------------------------

    if profile and balance_quarter and income_ttm:
        market_cap = to_float(profile.get("market_cap"))
        total_debt = to_float(balance_quarter[0].get("total_debt"))
        cash = to_float(balance_quarter[0].get("cash"))
        ebit = to_float(income_ttm[0].get("ebit"))

        depreciation = (
            to_float(cashflow_ttm[0].get("depreciation_amortization"))
            if cashflow_ttm else None
        )

        if depreciation is None and cashflow_annual:
            depreciation = to_float(
                cashflow_annual[0].get("depreciation_amortization")
            )

        if total_debt is None and cash is not None:
            total_debt = 0.0

        if all(v is not None for v in [
            market_cap, total_debt, cash, ebit, depreciation
        ]):
            ebitda = ebit + depreciation

            if ebitda > 0:
                valuation["EV/EBITDA"] = (
                    market_cap + total_debt - cash
                ) / ebitda

    # -------------------------
    # P/B
    # -------------------------

    if profile and balance_quarter:
        market_cap = to_float(profile.get("market_cap"))
        equity = to_float(balance_quarter[0].get("equity"))

        if market_cap is not None and equity is not None and equity > 0:
            valuation["P/B"] = market_cap / equity

    # =========================
    # NORMALIZED EARNINGS
    # =========================

    if income_annual and ratios_annual:

        eps = [
            to_float(year.get("eps"))
            for year in income_annual[:5]
            if year.get("eps") is not None
            and to_float(year.get("eps")) > 0
        ]

        pe_historical = [
            to_float(year.get("pe"))
            for year in ratios_annual[:5]
            if year.get("pe") is not None
            and to_float(year.get("pe")) > 0
        ]

        if eps and pe_historical:
            normalized_eps = statistics.median(eps)
            fair_pe = statistics.median(pe_historical)

            valuation["Normalized Earnings Valuation"] = (
                normalized_eps * fair_pe
            )

    return valuation
