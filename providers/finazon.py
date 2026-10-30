
from datetime import datetime, timezone
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
    latest_date = datetime.now(timezone.utc)

    start_at = int(
        latest_date.replace(year=latest_date.year - 10).timestamp()
    ) - 7 * 86400

    end_at = int(latest_date.timestamp()) + 86400

    page_size = 1000
    all_rows = []

    for page in range(10):
        url = (
            "https://api.finazon.io/latest/finazon/us_stocks_essential/time_series"
            f"?ticker={ticker}"
            "&interval=1d"
            f"&start_at={start_at}"
            f"&end_at={end_at}"
            f"&page={page}"
            f"&page_size={page_size}"
            "&order=desc"
            "&adjust=splits"
            f"&apikey={config.API_KEY_FINAZON}"
        )

        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
        except (requests.RequestException, ValueError) as e:
            print(f"Finazon historical prices request failed: {e}")
            break

        if not isinstance(data, dict) or not isinstance(data.get("data"), list):
            break

        rows = data["data"]
        all_rows.extend(rows)

        if len(rows) < page_size:
            break

    return all_rows


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



