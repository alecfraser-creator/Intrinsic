import statistics
import config

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
    cashflow_annual = sec_data["cashflow"]
    cashflow_ttm = sec_data["cashflow_ttm"]

   

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

        # Calculate historical P/E from historical prices and SEC EPS.
        fiscal_year_ends = {
            row["year"]: sec_data["fiscal_year_ends"][row["year"]]
            for row in income_annual
            if row["year"] in sec_data["fiscal_year_ends"]
        }

        prices_historical = get_fiscal_year_end_prices(
            ticker, fiscal_year_ends
        )

        ratios_annual = []

        for row in income_annual:
            price = prices_historical.get(row["year"])
            eps = to_float(row.get("eps"))

            if price is not None and eps is not None and eps > 0:
                ratios_annual.append({
                    "year": row["year"],
                    "pe": price / eps
                })

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
        "valuation": valuation
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


def calculate_profitability(
    income_annual,
    income_ttm,
    balance_quarter,
    cashflow_ttm
):

    # =========================
    # REVENUE GROWTH
    # =========================

    revenue_4y_cagr = None
    revenue_2y_cagr = None
    revenue_yoy_growth = None

    if len(income_annual) >= 5:
        latest = to_float(income_annual[0].get("revenue"))
        old = to_float(income_annual[4].get("revenue"))

        if latest is not None and old not in (None, 0):
            revenue_4y_cagr = ((latest / old) ** (1 / 4) - 1) * 100

    if len(income_annual) >= 3:
        latest = to_float(income_annual[0].get("revenue"))
        old = to_float(income_annual[2].get("revenue"))

        if latest is not None and old not in (None, 0):
            revenue_2y_cagr = ((latest / old) ** (1 / 2) - 1) * 100

    if len(income_ttm) >= 5:
        latest = to_float(income_ttm[0].get("revenue"))
        old = to_float(income_ttm[4].get("revenue"))

        if latest is not None and old not in (None, 0):
            revenue_yoy_growth = ((latest / old) - 1) * 100


    # =========================
    # EPS GROWTH
    # =========================

    eps_4y_cagr = None
    eps_2y_cagr = None
    eps_yoy_growth = None

    if len(income_annual) >= 5:
        latest = to_float(income_annual[0].get("eps"))
        old = to_float(income_annual[4].get("eps"))

        if (
            latest is not None
            and old is not None
            and latest > 0
            and old > 0
        ):
            eps_4y_cagr = ((latest / old) ** (1 / 4) - 1) * 100

    if len(income_annual) >= 3:
        latest = to_float(income_annual[0].get("eps"))
        old = to_float(income_annual[2].get("eps"))

        if (
            latest is not None
            and old is not None
            and latest > 0
            and old > 0
        ):
            eps_2y_cagr = ((latest / old) ** (1 / 2) - 1) * 100

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

        ending_net_debt = to_float(
            balance_quarter[0].get("net_debt")
        )

        beginning_net_debt = to_float(
            balance_quarter[4].get("net_debt")
        )

        if (
            ebit is not None
            and tax_rate is not None
            and ending_equity is not None
            and beginning_equity is not None
            and ending_net_debt is not None
            and beginning_net_debt is not None
        ):
            nopat = ebit * (1 - tax_rate / 100)

            average_equity = (
                beginning_equity + ending_equity
            ) / 2

            average_net_debt = (
                beginning_net_debt + ending_net_debt
            ) / 2

            average_invested_capital = (
                average_equity + average_net_debt
            )

            if average_invested_capital > 0:
                roic = (
                    nopat / average_invested_capital
                ) * 100



    return {
        "Revenue 4Y CAGR": revenue_4y_cagr,
        "Revenue 2Y CAGR": revenue_2y_cagr,
        "Revenue YoY Growth": revenue_yoy_growth,

        "EPS 4Y CAGR": eps_4y_cagr,
        "EPS 2Y CAGR": eps_2y_cagr,
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

    if profile and balance_quarter and income_ttm and cashflow_ttm:
        market_cap = to_float(profile.get("market_cap"))
        total_debt = to_float(balance_quarter[0].get("total_debt"))
        cash = to_float(balance_quarter[0].get("cash"))
        ebit = to_float(income_ttm[0].get("ebit"))
        depreciation = to_float(
            cashflow_ttm[0].get("depreciation_amortization")
        )

        if all(value is not None for value in [
            market_cap,
            total_debt,
            cash,
            ebit,
            depreciation
        ]):
            ev = market_cap + total_debt - cash
            ebitda = ebit + depreciation

            if ebitda > 0:
                valuation["EV/EBITDA"] = ev / ebitda


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

    print(f"Revenue 4Y CAGR:    {format_value(profitability.get('Revenue 4Y CAGR'), suffix='%')}")
    print(f"Revenue 2Y CAGR:    {format_value(profitability.get('Revenue 2Y CAGR'), suffix='%')}")
    print(f"Revenue YoY Growth: {format_value(profitability.get('Revenue YoY Growth'), suffix='%')}")

    print(f"\nEPS 4Y CAGR:        {format_value(profitability.get('EPS 4Y CAGR'), suffix='%')}")
    print(f"EPS 2Y CAGR:        {format_value(profitability.get('EPS 2Y CAGR'), suffix='%')}")
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