from datetime import datetime, timezone, timedelta
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import config


def get_fiscal_year_end_prices(historical_data, fiscal_year_ends):

    if not historical_data:
        return {}

    prices = {}

    for year, fiscal_year_end in fiscal_year_ends.items():
        target_date = datetime.strptime(
            fiscal_year_end, "%Y-%m-%d"
        ).replace(tzinfo=timezone.utc).timestamp()

        eligible_prices = [
            record
            for record in historical_data
            if record.get("t") is not None
            and record.get("c") is not None
            and record["c"] > 0
            and record["t"] < target_date + 86400
        ]

        if not eligible_prices:
            continue

        latest_record = max(
            eligible_prices,
            key=lambda record: record["t"]
        )

        prices[year] = latest_record["c"]

    return prices


def get_historical_price(ticker):
    now = datetime.now(timezone.utc)
    start_at = int((now - timedelta(days=7 * 365 + 7)).timestamp())
    end_at = int(now.timestamp()) + 86400
    page_size = 1000

    rows_by_t = {}

    for _ in range(10):  # safety limit
        params = {
            "ticker": ticker,
            "interval": "1d",
            "start_at": start_at,
            "end_at": end_at,
            "page": 0,
            "page_size": page_size,
            "order": "desc",
            "adjust": "all",
            "apikey": config.API_KEY_FINAZON,
        }

        try:
            response = requests.get(
                "https://api.finazon.io/latest/finazon/us_stocks_essential/time_series",
                params=params,
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError) as e:
            print(f"Finazon historical prices request failed: {e}")
            break

        rows = data.get("data") if isinstance(data, dict) else None
        if not isinstance(rows, list) or not rows:
            break

        new_rows = 0
        for row in rows:
            if row["t"] not in rows_by_t:
                rows_by_t[row["t"]] = row
                new_rows += 1

        # Stop on the last page, or if the API returned nothing new.
        if len(rows) < page_size or new_rows == 0:
            break
        
    

        if len(rows) < page_size or new_rows == 0:
            break

        end_at = min(row["t"] for row in rows) - 1


    return sorted(rows_by_t.values(), key=lambda r: r["t"], reverse=True)

def get_latest_price(ticker):
    url = (
        "https://api.finazon.io/latest/finazon/us_stocks_essential/price"
        f"?ticker={ticker}&apikey={config.API_KEY_FINAZON}"
    )

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

    except (requests.RequestException, ValueError) as e:
        print(f"Finazon latest price request failed: {e}")
        return None

    if not isinstance(data, dict) or data.get("p") is None:
        return None

    return data["p"]