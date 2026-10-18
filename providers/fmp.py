import requests
import config

def get_data(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json(), None

    except requests.exceptions.RequestException:
        return None, "api_error"

    except ValueError:
        return None, "api_error"
    

def construct_urls(ticker):
    return {
        "profile": f"https://financialmodelingprep.com/stable/profile?symbol={ticker}&apikey={config.API_KEY_FMP}",
        "income_historical": f"https://financialmodelingprep.com/stable/income-statement?symbol={ticker}&apikey={config.API_KEY_FMP}",
        "cashflow_historical": f"https://financialmodelingprep.com/stable/cash-flow-statement?symbol={ticker}&apikey={config.API_KEY_FMP}",
        "balance_quarter": f"https://financialmodelingprep.com/stable/balance-sheet-statement?symbol={ticker}&period=quarter&apikey={config.API_KEY_FMP}",
        "ratios_historical": f"https://financialmodelingprep.com/stable/ratios?symbol={ticker}&apikey={config.API_KEY_FMP}"
    }


def get_fmp_data(ticker):
    urls = construct_urls(ticker)

    profile, error = get_data(urls["profile"])
    if error or not profile:
        return None

    income, _ = get_data(urls["income_historical"])
    cashflow, _ = get_data(urls["cashflow_historical"])
    balance, _ = get_data(urls["balance_quarter"])
    ratios, _ = get_data(urls["ratios_historical"])

    return {
        "profile": extract_profile_data(profile[0]),
        "income": extract_income_data(income),
        "cashflow": extract_cashflow_data(cashflow),
        "balance_quarter": extract_balance_quarter(balance),
        "ratios_annual": extract_ratios_data(ratios)
    }


def extract_profile_data(data):
    if data is None:
        return {}

    return {
        "name": data.get("companyName"),
        "price": data.get("price"),
        "market_cap": data.get("marketCap"),
        "description": data.get("description"),
        "ceo": data.get("ceo")
    }


def extract_income_data(data):
    if data is None:
        return []

    income = []

    for year in data:
        income.append({
            "year": year.get("fiscalYear"),
            "revenue": year.get("revenue"),
            "cost_of_revenue": year.get("costOfRevenue"),
            "operating_income": year.get("operatingIncome"),
            "ebit": year.get("ebit"),
            "ebitda": year.get("ebitda"),
            "interest_expense": year.get("interestExpense"),
            "net_income": year.get("netIncome"),
            "eps": year.get("epsDiluted"),
            "taxes": year.get("incomeTaxExpense"),
        })

    return income


def extract_balance_quarter(data):
    if data is None:
        return []

    balance = []

    for year in data:
        balance.append({
            "date": year.get("date"),
            "cash": year.get("cashAndCashEquivalents"),
            "total_debt": year.get("totalDebt"),
            "net_debt": year.get("netDebt"),
            "equity": year.get("totalEquity"),
            "current_assets": year.get("totalCurrentAssets"),
            "current_liabilities": year.get("totalCurrentLiabilities")
        })

    return balance


def extract_cashflow_data(data):
    if data is None:
        return []

    cashflow = []

    for year in data:
        capex = year.get("capitalExpenditure")

        cashflow.append({
            "year": year.get("fiscalYear"),
            "operating_cash_flow": year.get("operatingCashFlow"),
            "capital_expenditure": abs(capex) if capex is not None else None,
            "free_cash_flow": year.get("freeCashFlow"),
            "acquisitions": year.get("acquisitionsNet"),
            "buybacks": year.get("commonStockRepurchased"),
            "dividends": year.get("commonDividendsPaid"),
            "net_debt_issuance": year.get("netDebtIssuance"),
        })

    return cashflow


def extract_ratios_data(data):
    if data is None:
        return []

    ratios = []

    for year in data:
        ratios.append({
            "year": year.get("fiscalYear"),
            "pe": year.get("priceToEarningsDilutedRatio"),
            "p_fcf": year.get("priceToFreeCashFlowRatio"),
            "ev_ebitda": year.get("enterpriseValueMultiple"),
            "pb": year.get("priceToBookRatio"),
        })

    return ratios
