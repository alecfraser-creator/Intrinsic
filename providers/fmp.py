
import requests
from backend import config


def get_data(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json(), None

    except (requests.exceptions.RequestException, ValueError):
        return None, "api_error"


def construct_urls(ticker):
    return {
        "profile": (
            f"https://financialmodelingprep.com/stable/profile"
            f"?symbol={ticker}&apikey={config.API_KEY_FMP}"
        ),
        "ratios_historical": (
            f"https://financialmodelingprep.com/stable/ratios"
            f"?symbol={ticker}&apikey={config.API_KEY_FMP}"
        ),
    }


def get_fmp_data(ticker):
    urls = construct_urls(ticker)

    # Current price and company profile
    profile_data, error = get_data(urls["profile"])

    if error or not profile_data:
        return None

    # Historical valuation ratios
    ratios_data, error = get_data(urls["ratios_historical"])

    if error or not ratios_data:
        return None

    return {
        "profile": extract_profile_data(profile_data[0]),
        "ratios_annual": extract_ratios_data(ratios_data),
    }


def extract_profile_data(data):
    if data is None:
        return {}

    return {
        "name": data.get("companyName"),
        "price": data.get("price"),
        "market_cap": data.get("marketCap"),
        "description": data.get("description"),
        "ceo": data.get("ceo"),
    }


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
