from datetime import datetime, timezone
import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend import config
import requests

def get_fiscal_year_end_prices(ticker, fiscal_year_ends):

    historical_data = get_historical_price(ticker, fiscal_year_ends)

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


def get_historical_price(ticker, fiscal_year_ends):
    if not fiscal_year_ends:
        return []

    dates = list(fiscal_year_ends.values())

    start_at = int(
        datetime.strptime(min(dates), "%Y-%m-%d")
        .replace(tzinfo=timezone.utc)
        .timestamp()
    ) - 7 * 86400

    end_at = int(
        datetime.strptime(max(dates), "%Y-%m-%d")
        .replace(tzinfo=timezone.utc)
        .timestamp()
    ) + 86400

    page_size = 1000
    all_rows = []

    for page in range(10):  # safety cap
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
    url = (f"https://api.finazon.io/latest/finazon/us_stocks_essential/price?ticker={ticker}&apikey={config.API_KEY_FINAZON}")

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


if __name__ == "__main__":
    from providers.sec import get_sec_data
    
    data = get_sec_data("AAPL")
    

    fiscal_year_ends = {
        record["year"]: data["fiscal_year_ends"][record["year"]]
        for record in data["income"]
        if record["year"] in data["fiscal_year_ends"]
    }

    prices = get_fiscal_year_end_prices("AAPL", fiscal_year_ends)
    print(prices)

    
    
