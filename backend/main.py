#next: make the qualitative analysis saving logic
#next: make the interface with the watchlist actions buttons nicer
#next: display a warning when the user is about to change company or close the tool without saving his chamges

import statistics
from . import config

from providers.fmp import get_fmp_data, get_data
from providers.sec import get_sec_data
from providers.finazon import get_latest_price, get_fiscal_year_end_prices


def main():
    ticker = input("Ticker: ").strip().upper()
    results = analyze_company(ticker)


    if results is None:
        print("Unable to retrieve company data.")
        return

    print_profile(results["profile"])
    print_financial_strength(results["financial_strength"])
    print_profitability(results["profitability"])
    print_valuation(results["valuation"])

def analyze_company(ticker):
    ticker = ticker.strip().upper()

   
    sec_data = get_sec_data(ticker)

    if sec_data is None:
        return None

    profile = sec_data["profile"]
    income_annual = sec_data["income"]
    income_ttm = sec_data["income_ttm"]
    balance_quarter = sec_data["balance_quarter"]
    balance_annual = sec_data["balance_annual"]
    cashflow_annual = sec_data["cashflow"]
    cashflow_ttm = sec_data["cashflow_ttm"]
    historical_prices = {}
    shares_by_year = {}
    print("Historical shares:", shares_by_year)
    print("Historical prices:", historical_prices)
   

    if config.DATA_PROVIDER == "free":

        # FMP provides the current price and historical ratios.
        fmp_data = get_fmp_data(ticker)

        if fmp_data is None:
            return None

        fmp_profile = fmp_data["profile"]
        price_latest = to_float(fmp_profile.get("price"))

        ratios_annual = fmp_data["ratios_annual"]

    elif config.DATA_PROVIDER == "sec_finazon":

        # Finazon provides the current price.
        price_latest = get_latest_price(ticker)

        if price_latest is None:
            return None

        historical_prices = get_fiscal_year_end_prices(
            ticker,
            sec_data["fiscal_year_ends"]
        )
        
        shares_by_year = sec_data.get("shares_outstanding_annual", {})

        ratios_annual = calculate_historical_pe(
            income_annual,
            historical_prices
        )

    else:
        raise ValueError(
            f"Unknown data provider: {config.DATA_PROVIDER}"
        )


    profile["ticker"] = ticker
    profile["price"] = price_latest

    shares = to_float(profile.get("shares_outstanding"))

    profile["market_cap"] = (
        price_latest * shares
        if price_latest is not None and shares is not None
        else None
    )


    financial_strength = calculate_financial_strength(
        balance_quarter, income_ttm
    )

    profitability = calculate_profitability(
        income_annual,
        income_ttm,
        balance_quarter,
        cashflow_ttm
    )

    valuation = calculate_valuation(
        profile,
        income_ttm,
        income_annual,
        cashflow_ttm,
        cashflow_annual,
        balance_quarter,
        ratios_annual
    )
    
    return {
        "ticker": ticker,
        "profile": profile,
        "financial_strength": financial_strength,
        "profitability": profitability,
        "valuation": valuation,
        "history": calculate_history(
            income_annual,
            cashflow_annual,
            ratios_annual,
            balance_annual,
            historical_prices,
            shares_by_year
        )
    }
    


def get_company_data(urls):
    profile_data, profile_error = get_data(urls["profile"])

    if profile_error == "api_error":
        print("Unable to retrieve company data.")
        return None

    if not profile_data:
        return None

    income_data, _ = get_data(urls["income_historical"])
    cashflow_data, _ = get_data(urls["cashflow_historical"])
    income_data_ttm, _ = get_data(urls["income_ttm"])
    balance_quarter, _ = get_data(urls["balance_quarter"])
    cashflow_data_ttm, _ = get_data(urls["cashflow_ttm"])
    ratios_data, _ = get_data(urls["ratios_historical"])

    return {
        "profile": profile_data,
        "balance_quarter": balance_quarter,
        "income": income_data,
        "cashflow": cashflow_data,
        "income_ttm": income_data_ttm,
        "cashflow_ttm": cashflow_data_ttm,
        "ratios_historical": ratios_data
    }



def to_float(value):
    if value is None:
        return None

    return float(value)


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


def annual_cagr(income_annual, field, years):
    """CAGR (en %) entre l'exercice le plus récent et celui d'il y a `years` ans.

    income_annual est trié du plus récent au plus ancien. Il faut years + 1 exercices
    (6 pour un CAGR sur 5 ans). Renvoie None si une valeur manque, n'est pas > 0,
    ou si un exercice manque dans la liste (l'écart d'années ne vaut plus `years`).
    """
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
                roe = (
                    net_income / average_equity
                ) * 100


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
            nopat = ebit * (1 - tax_rate / 100)

            average_equity = (
                beginning_equity + ending_equity
            ) / 2

            average_debt = (
                beginning_debt + ending_debt
            ) / 2

            # Capital investi = fonds propres + dette totale (la trésorerie n'est PAS
            # déduite). Avec fonds propres + dette nette, le dénominateur devient une
            # petite différence de grands nombres chez les sociétés très riches en
            # trésorerie, et le ROIC explose ou devient instable.
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

        if (
            market_cap is not None
            and fcf is not None
            and fcf > 0
        ):
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
            depreciation = to_float(cashflow_annual[0].get("depreciation_amortization"))

        if total_debt is None and cash is not None:
            total_debt = 0.0           # no debt line found = no debt

        if all(v is not None for v in [market_cap, total_debt, cash, ebit, depreciation]):
            ebitda = ebit + depreciation
            if ebitda > 0:
                valuation["EV/EBITDA"] = (market_cap + total_debt - cash) / ebitda

    # -------------------------
    # P/B
    # -------------------------

    if profile and balance_quarter:

        market_cap = to_float(
            profile.get("market_cap")
        )

        equity = to_float(
            balance_quarter[0].get("equity")
        )

        if (
            market_cap is not None
            and equity is not None
            and equity > 0
        ):
            valuation["P/B"] = (
                market_cap / equity
            )



    # =========================
    # NORMALIZED EARNINGS
    # =========================

    # Uses historical annual EPS and
    # historical annual P/E ratios.

    
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

    # =========================
    # DCF
    # =========================

    if (
        profile
        and cashflow_ttm
        and cashflow_annual
        and balance_quarter
    ):

        fcf = cashflow_ttm[0].get(
            "free_cash_flow"
        )

        historical_fcf = [
            year.get("free_cash_flow")
            for year in cashflow_annual[:5]
            if year.get("free_cash_flow") is not None
        ]

        if (
            fcf is not None
            and len(historical_fcf) >= 2
            and all(
                float(value) > 0
                for value in historical_fcf
            )
        ):

            fcf = float(fcf)

            fcf_growth = (
                float(historical_fcf[0])
                / float(historical_fcf[-1])
            ) ** (
                1 / (len(historical_fcf) - 1)
            ) - 1

            fcf_forecast = []

            for _ in range(5):

                fcf *= 1 + fcf_growth

                fcf_forecast.append(fcf)


            discount_rate = 0.10
            terminal_growth = 0.03

            fcf_present_values = []

            for year, forecast in enumerate(
                fcf_forecast,
                start=1
            ):

                present_value = (
                    forecast
                    / (1 + discount_rate) ** year
                )

                fcf_present_values.append(
                    present_value
                )


            pv_of_fcf = sum(
                fcf_present_values
            )

            terminal_value = (
                fcf_forecast[-1]
                * (1 + terminal_growth)
                / (discount_rate - terminal_growth)
            )

            terminal_value_pv = (
                terminal_value
                / (1 + discount_rate) ** 5
            )

            enterprise_value = (
                pv_of_fcf
                + terminal_value_pv
            )


            total_debt = balance_quarter[0].get(
                "total_debt"
            )

            cash = balance_quarter[0].get(
                "cash"
            )

            market_cap = profile.get(
                "market_cap"
            )

            price = profile.get(
                "price"
            )

            if all(value is not None for value in [
                total_debt,
                cash,
                market_cap,
                price
            ]) and price != 0:

                shares_outstanding = (
                    float(market_cap)
                    / float(price)
                )

                equity_value = (
                    enterprise_value
                    - float(total_debt)
                    + float(cash)
                )

                valuation[
                    "Discounted Cash Flow (DCF) Valuation"
                ] = (
                    equity_value
                    / shares_outstanding
                )


    return valuation


#calculation of historical pe for the fair earnings valuation
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



# =========================
# HISTORY (per-year series for the dashboard charts)
# =========================

HISTORY_YEARS = 6


def percent(numerator, denominator):
    if numerator is None or denominator in (None, 0):
        return None

    return numerator / denominator * 100


def fiscal_year_key(value):
    """'2025', 2025 or '2025-09-27' -> '2025'."""
    return str(value)[:4]


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


def format_value(value, decimals=2, prefix="", suffix=""):
    if value is None:
        return "N/A"

    return f"{prefix}{value:,.{decimals}f}{suffix}"


def print_profile(profile):
    print("\n" + "=" * 60)
    print("COMPANY PROFILE")
    print("=" * 60)

    print(f"Company:      {profile.get('name', 'N/A')}")
    print(f"Price:        {format_value(profile.get('price'), prefix='$')}")
    print(f"Market Cap:   {format_value(profile.get('market_cap'), decimals=0, prefix='$')}")
    print(f"CEO:          {profile.get('ceo', 'N/A')}")

    print("=" * 60)


def print_financial_strength(financial_strength):
    print("\n" + "=" * 60)
    print("FINANCIAL STRENGTH")
    print("=" * 60)

    print(f"Cash:              {format_value(financial_strength.get('cash'), decimals=0, prefix='$')}")
    print(f"Total Debt:        {format_value(financial_strength.get('total_debt'), decimals=0, prefix='$')}")
    print(f"Net Debt:          {format_value(financial_strength.get('net_debt'), decimals=0, prefix='$')}")
    print(f"Debt / Equity:     {format_value(financial_strength.get('debt_to_equity'))}")
    print(f"Current Ratio:     {format_value(financial_strength.get('current_ratio'))}")
    print(f"Interest Coverage: {format_value(financial_strength.get('interest_coverage'), suffix='x')}")


def print_profitability(profitability):
    print("\n" + "=" * 60)
    print("PROFITABILITY & GROWTH")
    print("=" * 60)

    print(f"Revenue 5Y CAGR:    {format_value(profitability.get('Revenue 5Y CAGR'), suffix='%')}")
    print(f"Revenue 3Y CAGR:    {format_value(profitability.get('Revenue 3Y CAGR'), suffix='%')}")
    print(f"Revenue YoY Growth: {format_value(profitability.get('Revenue YoY Growth'), suffix='%')}")

    print(f"\nEPS 5Y CAGR:        {format_value(profitability.get('EPS 5Y CAGR'), suffix='%')}")
    print(f"EPS 3Y CAGR:        {format_value(profitability.get('EPS 3Y CAGR'), suffix='%')}")
    print(f"EPS YoY Growth:     {format_value(profitability.get('EPS YoY Growth'), suffix='%')}")

    print(f"\nGross Margin:       {format_value(profitability.get('Gross Margin'), suffix='%')}")
    print(f"Operating Margin:   {format_value(profitability.get('Operating Margin'), suffix='%')}")
    print(f"Free Cash Flow:     {format_value(profitability.get('Free Cashflow'), decimals=0, prefix='$')}")
    print(f"FCF Margin:         {format_value(profitability.get('FCF Margin'), suffix='%')}")
    print(f"FCF YoY Growth:     {format_value(profitability.get('FCF YoY Growth'), suffix='%')}")

    print(f"\nROE:                {format_value(profitability.get('ROE'), suffix='%')}")
    print(f"ROIC:               {format_value(profitability.get('ROIC'), suffix='%')}")


def print_valuation(valuation):
    print("\n" + "=" * 60)
    print("VALUATION")
    print("=" * 60)

    print(f"P/E:                         {format_value(valuation.get('P/E'), suffix='x')}")
    print(f"P/FCF:                       {format_value(valuation.get('P/FCF'), suffix='x')}")
    print(f"EV/EBITDA:                   {format_value(valuation.get('EV/EBITDA'), suffix='x')}")
    print(f"P/B:                         {format_value(valuation.get('P/B'), suffix='x')}")

    print(
        f"Normalized Earnings Value:  "
        f"{format_value(valuation.get('Normalized Earnings Valuation'), prefix='$')}"
    )

    print(
        f"DCF Value:                  "
        f"{format_value(valuation.get('Discounted Cash Flow (DCF) Valuation'), prefix='$')}"
    )


if __name__ == "__main__":
    main()