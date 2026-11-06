from pathlib import Path

import numpy as np
import pandas as pd
import requests

from .. import config


BASE_DIR = Path(__file__).resolve().parents[2]


def calculate_beta(historical_data):

    stock = pd.DataFrame(historical_data)

    stock["date"] = pd.to_datetime(stock["t"], unit="s", utc=True)
    stock = stock[stock["c"].notna() & (stock["c"] > 0)]

    stock = (
        stock.set_index("date")["c"]
        .sort_index()
        .resample("ME")
        .last()
    )

    stock_returns = stock.pct_change()


    sp500 = pd.read_csv(
        BASE_DIR / "data" / "sp500.csv",
        parse_dates=["observation_date"]
    )

    sp500 = sp500.set_index("observation_date")
    sp500_monthly = sp500.resample("ME").last()
    sp500_returns = sp500_monthly["SP500"].pct_change()

    sp500_returns.index = sp500_returns.index.tz_localize("UTC")

    returns = pd.concat(
        [stock_returns, sp500_returns],
        axis=1,
        sort=False
    ).dropna()

    returns = returns.replace([np.inf, -np.inf], np.nan).dropna()
    returns = returns.tail(60)

    if len(returns) < 60:
        return None

    market_variance = returns["SP500"].var()

    if market_variance == 0 or not np.isfinite(market_variance):
        return None

    beta = returns.iloc[:, 0].cov(returns["SP500"]) / market_variance

    if beta < -2 or beta > 3:
        return None

    return beta



def get_risk_free_rate():
    url = "https://api.stlouisfed.org/fred/series/observations"

    params = {
        "series_id": "DGS10",
        "api_key": config.FRED_API_KEY,
        "file_type": "json",
        "sort_order": "desc",
        "limit": 10
    }

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()

    observations = response.json()["observations"]

    for observation in observations:
        value = observation["value"]

        if value != ".":
            return float(value) / 100

    raise ValueError("No valid Treasury yield observation found.")
