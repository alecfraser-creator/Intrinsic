# next: make terminal growth behave like other rows when modifying input
# next: fix tax rate displaying in wacc input

#next: display a warning when the user is about to change company or close the tool without saving his chamges


import json
from pathlib import Path

from . import config

from .providers.market_data import calculate_beta, get_risk_free_rate
from .providers.fmp import get_fmp_data
from .providers.sec import get_sec_data
from .providers.finazon import (
    get_latest_price,
    get_fiscal_year_end_prices,
    get_historical_price
)

from .utils import to_float

from .quant_analysis.financial_strength import calculate_financial_strength
from .quant_analysis.profitability import calculate_profitability
from .quant_analysis.valuation import calculate_valuation
from .quant_analysis.history import calculate_historical_pe, calculate_history

from .dcf.analysis import run_dcf_analysis


# =========================
# CONFIGURATION
# =========================

BASE_DIR = Path(__file__).resolve().parent.parent

with open(BASE_DIR / "data" / "market_assumptions.json", "r") as file:
    MARKET_ASSUMPTIONS = json.load(file)


# =========================
# COMPANY ANALYSIS
# =========================


def analyze_company(
    ticker,
    existing_assumptions=None,
    existing_scenarios=None,
    existing_terminal_growth_input=None
):
    ticker = ticker.strip().upper()

    # -------------------------
    # Retrieve SEC data
    # -------------------------

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

    historical_data = None
    historical_prices = {}
    shares_by_year = {}

    # -------------------------
    # Retrieve market data
    # -------------------------

    if config.DATA_PROVIDER == "free":

        fmp_data = get_fmp_data(ticker)

        if fmp_data is None:
            return None

        fmp_profile = fmp_data["profile"]

        price_latest = to_float(fmp_profile.get("price"))
        ratios_annual = fmp_data["ratios_annual"]

    elif config.DATA_PROVIDER == "sec_finazon":

        price_latest = get_latest_price(ticker)

        if price_latest is None:
            return None

        historical_data = get_historical_price(ticker)

        historical_prices = get_fiscal_year_end_prices(
            historical_data,
            sec_data["fiscal_year_ends"]
        )

        shares_by_year = sec_data.get(
            "shares_outstanding_annual", {}
        )

        ratios_annual = calculate_historical_pe(
            income_annual,
            historical_prices
        )

    else:
        raise ValueError(
            f"Unknown data provider: {config.DATA_PROVIDER}"
        )

    # -------------------------
    # Complete company profile
    # -------------------------

    profile["ticker"] = ticker
    profile["price"] = price_latest

    shares = to_float(profile.get("shares_outstanding"))

    profile["market_cap"] = (
        price_latest * shares
        if price_latest is not None and shares is not None
        else None
    )

    # =========================
    # FINANCIAL ANALYSIS
    # =========================

    financial_strength = calculate_financial_strength(
        balance_quarter,
        income_ttm
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

    history = calculate_history(
        income_annual,
        cashflow_annual,
        ratios_annual,
        balance_annual,
        historical_prices,
        shares_by_year
    )

    # =========================
    # DCF ANALYSIS
    # =========================

    beta = (
        calculate_beta(historical_data)
        if historical_data is not None
        else None
    )

    risk_free_rate = get_risk_free_rate()

    equity_risk_premium = (
        MARKET_ASSUMPTIONS["US"]["equity_risk_premium"]
    )

    latest_balance = (
        balance_quarter[0]
        if balance_quarter
        else {}
    )

    latest_income = (
        income_ttm[0]
        if income_ttm
        else {}
    )

    total_debt = to_float(latest_balance.get("total_debt"))
    cash = to_float(latest_balance.get("cash"))
    tax_rate = to_float(latest_income.get("tax_rate"))

    shares_outstanding = to_float(
        profile.get("shares_outstanding")
    )

    dcf = run_dcf_analysis(
        profitability=profitability,
        history=history,
        income_annual=income_annual,
        cashflow_annual=cashflow_annual,
        balance_annual=balance_annual,
        risk_free_rate=risk_free_rate,
        beta=beta,
        equity_risk_premium=equity_risk_premium,
        market_cap=profile["market_cap"],
        cash=cash,
        total_debt=total_debt,
        tax_rate=tax_rate,
        shares_outstanding=shares_outstanding,
        existing_assumptions=existing_assumptions,
        existing_scenarios=existing_scenarios,
        existing_terminal_growth_input=existing_terminal_growth_input
    )

    # Keep the existing valuation structure used by the frontend.
    if dcf is not None:
        valuation["Discounted Cash Flow (DCF) Valuation"] = (
            dcf["intrinsic_value_per_share"]
        )

    # =========================
    # FINAL RESULT
    # =========================

    return {
        "ticker": ticker,
        "profile": profile,
        "financial_strength": financial_strength,
        "profitability": profitability,
        "valuation": valuation,
        "history": history,
        "dcf": dcf
    }


def recalculate_company_dcf(
    ticker,
    existing_assumptions=None,
    existing_scenarios=None,
    existing_terminal_growth_input=None
):
    ticker = ticker.strip().upper()

    # -------------------------
    # Retrieve SEC data
    # -------------------------

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

    # -------------------------
    # Calculate DCF dependencies
    # -------------------------

    profitability = calculate_profitability(
        income_annual,
        income_ttm,
        balance_quarter,
        cashflow_ttm
    )

    # Historical prices and shares are not needed for the
    # operating margin series used by the DCF assumptions.
    history = calculate_history(
        income_annual,
        cashflow_annual,
        [],
        balance_annual,
        {},
        {}
    )

    # -------------------------
    # Retrieve market data
    # -------------------------

    historical_data = None

    if config.DATA_PROVIDER == "free":

        fmp_data = get_fmp_data(ticker)

        if fmp_data is None:
            return None

        price_latest = to_float(
            fmp_data["profile"].get("price")
        )

    elif config.DATA_PROVIDER == "sec_finazon":

        price_latest = get_latest_price(ticker)

        if price_latest is None:
            return None

        historical_data = get_historical_price(ticker)

    else:
        raise ValueError(
            f"Unknown data provider: {config.DATA_PROVIDER}"
        )

    # -------------------------
    # Prepare DCF inputs
    # -------------------------

    shares = to_float(profile.get("shares_outstanding"))

    market_cap = (
        price_latest * shares
        if price_latest is not None and shares is not None
        else None
    )

    beta = (
        calculate_beta(historical_data)
        if historical_data is not None
        else None
    )

    risk_free_rate = get_risk_free_rate()

    equity_risk_premium = (
        MARKET_ASSUMPTIONS["US"]["equity_risk_premium"]
    )

    latest_balance = (
        balance_quarter[0]
        if balance_quarter
        else {}
    )

    latest_income = (
        income_ttm[0]
        if income_ttm
        else {}
    )

    total_debt = to_float(
        latest_balance.get("total_debt")
    )

    cash = to_float(
        latest_balance.get("cash")
    )

    tax_rate = to_float(
        latest_income.get("tax_rate")
    )

    shares_outstanding = shares

    # -------------------------
    # Run DCF analysis
    # -------------------------

    dcf = run_dcf_analysis(
        profitability=profitability,
        history=history,
        income_annual=income_annual,
        cashflow_annual=cashflow_annual,
        balance_annual=balance_annual,
        risk_free_rate=risk_free_rate,
        beta=beta,
        equity_risk_premium=equity_risk_premium,
        market_cap=market_cap,
        cash=cash,
        total_debt=total_debt,
        tax_rate=tax_rate,
        shares_outstanding=shares_outstanding,
        existing_assumptions=existing_assumptions,
        existing_scenarios=existing_scenarios,
        existing_terminal_growth_input=existing_terminal_growth_input
    )

    return dcf


# =========================
# CLI ENTRY POINT
# =========================

def main():
    ticker = input("Ticker: ").strip().upper()

    results = analyze_company(ticker)

    if results is None:
        print("Unable to retrieve company data.")
        return

    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
