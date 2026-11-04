
import json
from .connection import connect
from datetime import datetime, timezone


def insert_company(ticker, quant_analysis, last_financials_refresh, qual_analysis, historical_data):
    connection = connect()
    date = datetime.now(timezone.utc).isoformat()

    connection.execute(
        """
        INSERT INTO Companies (
            Ticker, Quant_analysis, Updated_at, Last_financials_refresh,
            Qual_analysis, Historical_price
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(Ticker) DO UPDATE SET
            Quant_analysis = excluded.Quant_analysis,
            Updated_at = excluded.Updated_at,
            Last_financials_refresh = excluded.Last_financials_refresh,
            Qual_analysis = excluded.Qual_analysis,
            Historical_price = excluded.Historical_price
        """,
        (ticker, json.dumps(quant_analysis), date, last_financials_refresh, json.dumps(qual_analysis), json.dumps(historical_data))
    )

    connection.commit()
    connection.close()
    return date


def refresh_latest_financial(ticker, last_financials_refresh):
    connection = connect()

    connection.execute(
        "UPDATE Companies SET Last_financials_refresh = ? WHERE Ticker = ?",
        (last_financials_refresh, ticker)
    )

    connection.commit()
    connection.close()


def get_saved_company(ticker):
    connection = connect()

    cursor = connection.execute(
        """
        SELECT Ticker, Quant_analysis, Updated_at, Last_financials_refresh, Qual_analysis, Historical_price
        FROM Companies
        WHERE Ticker = ?
        """,
        (ticker,),
    )

    company = cursor.fetchone()
    connection.close()

    if company is None:
        return None

    return {
        "ticker": company[0],
        "quant_analysis": json.loads(company[1]),
        "updated_at": company[2],
        "last_financials_refresh": company[3],
        "qual_analysis": json.loads(company[4]) if company[4] else None,
        "historical_price": json.loads(company[5]) if company[5] else None
    }


def delete_company(ticker):
    connection = connect()
    connection.execute(
        "DELETE FROM Companies WHERE Ticker = ?",
        (ticker,)
    )
    connection.commit()
    connection.close()


def get_all_companies():
    connection = connect()

    cursor = connection.execute(
        "SELECT * FROM Companies"
    )

    companies = cursor.fetchall()
    connection.close()

    results = []

    for company in companies:
        quant_analysis = json.loads(company[1])
        results.append({
            "ticker": company[0],
            "name": quant_analysis["profile"]["name"],
        })

    return results
