import json
from .connection import connect
from datetime import datetime, timezone

def insert_company(ticker, analysis, last_financials_refresh):
    connection = connect()
    date = datetime.now(timezone.utc).isoformat()

    connection.execute(
        """
        INSERT INTO Companies (Ticker, Analysis, Updated_at, Last_financials_refresh)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(Ticker) DO UPDATE SET
            Analysis = excluded.Analysis,
            Updated_at = excluded.Updated_at,
            Last_financials_refresh = excluded.Last_financials_refresh
        """,
        (ticker, json.dumps(analysis), date, last_financials_refresh)
    )

    connection.commit()
    connection.close()



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
        "SELECT Ticker, Analysis, Updated_at, Last_financials_refresh FROM Companies WHERE Ticker = (?)",
        (ticker,),
    )

    company = cursor.fetchone()
    connection.close()

    if company is None:
        return None

    return {
        "ticker": company[0],
        "analysis": json.loads(company[1]),
        "updated_at": company[2],
        "last_financials_refresh": company[3]
    }


def delete_company(ticker):
    connection = connect()
    connection.execute(
        "DELETE FROM Companies WHERE Ticker = ?",
        (ticker,)
    )
    connection.commit()
    connection.close()


def get_all_companies ():
    connection = connect()
    
    cursor = connection.execute(
        "SELECT * FROM Companies"
    )

    companies = cursor.fetchall()
    connection.close()
    
    results = []

    for company in companies: 
        analysis = json.loads(company[1])
        results.append({
            "ticker": company[0],
            "name": analysis["profile"]["name"],
            })

    return results
    
    