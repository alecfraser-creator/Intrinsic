import json
from .connection import connect
from datetime import datetime, timezone

def insert_company(ticker, analysis):
    connection = connect()

    date = datetime.now(timezone.utc)
    date = date.isoformat()

    connection.execute(
        "INSERT INTO Companies (Ticker, Analysis, Updated_at) VALUES (?, ?, ?) " \
        "ON CONFLICT(Ticker) DO UPDATE SET Analysis = excluded.Analysis, Updated_at = excluded.Updated_at",
        (ticker, json.dumps(analysis), date)
    )

    connection.commit()
    connection.close()



def get_saved_company(ticker):
    connection = connect()

    cursor = connection.execute(
        "SELECT Ticker, Analysis, Updated_at FROM Companies WHERE Ticker = (?)",
        (ticker,),
    )

    company = cursor.fetchone()
    connection.close()

    if company is None:
        return None

    return {
        "ticker": company[0],
        "analysis": json.loads(company[1]),
        "updated_at": company[2]
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
    
    