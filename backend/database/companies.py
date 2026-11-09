
import json
from .connection import connect
from datetime import datetime, timezone


def insert_company(ticker, quant_analysis, last_financials_refresh, qual_analysis, historical_data):

    connection = connect()

    try: 
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

        return date

    finally:
        connection.close()
        



def get_saved_company(ticker):
    connection = connect()
    try: 
        cursor = connection.execute(
            """
            SELECT Ticker, Quant_analysis, Updated_at, Last_financials_refresh, Qual_analysis, Historical_price
            FROM Companies
            WHERE Ticker = ?
            """,
            (ticker,),
        )

        company = cursor.fetchone()
        

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
    finally:
        connection.close()



def get_old_analysis(id):
    connection = connect()
    try:
        cursor = connection.execute(
            """
            SELECT Ticker, Quant_analysis, Last_saved_at, Last_financials_refresh, Qual_analysis, Historical_price
            FROM analysis_history
            WHERE id = ?
            """,
            (id,),
        )
        
        analysis = cursor.fetchone()
        if analysis is None:
            return None
        return {
                    "ticker": analysis[0],
                    "quant_analysis": json.loads(analysis[1]),
                    "updated_at": analysis[2],
                    "last_financials_refresh": analysis[3],
                    "qual_analysis": json.loads(analysis[4]) if analysis[4] else None,
                    "historical_price": json.loads(analysis[5]) if analysis[5] else None
                }
    finally:
        connection.close()


def delete_company(ticker):
    connection = connect()

    try:
        connection.execute(
            "DELETE FROM Companies WHERE Ticker = ?",
            (ticker,)
        )
        connection.execute(
            "DELETE FROM analysis_history WHERE Ticker = ?",
            (ticker,)
        )
        connection.commit()
    finally:
        connection.close()


def delete_past_analysis(id):
    connection = connect()

    try:
        connection.execute(
            "DELETE FROM analysis_history WHERE ID = ?",
            (id,)
        )
        connection.commit()
    finally:
        connection.close()


def get_watchlist_companies():
    connection = connect()

    try:
        cursor = connection.execute(
            "SELECT Ticker, Quant_analysis, Updated_at FROM Companies"
        )

        companies = cursor.fetchall()
        
        results = []

        for company in companies:
            quant_analysis = json.loads(company[1])
            results.append({
                "ticker": company[0],
                "name": quant_analysis["profile"]["name"],
                "updated_at": company[2]                
            })

        return results
    
    finally:
        connection.close()



def insert_historical_analysis(ticker, quant_analysis, last_financials_refresh, qual_analysis, historical_data, last_saved_at):
    connection = connect()

    try:
        connection.execute(
            """
            INSERT INTO analysis_history (
                Ticker, Quant_analysis, Last_financials_refresh,
                Qual_analysis, Historical_price, Last_saved_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (ticker, json.dumps(quant_analysis), last_financials_refresh, json.dumps(qual_analysis), json.dumps(historical_data), last_saved_at)
        )

        connection.commit()

    finally:
        connection.close()


def get_all_historical_analyses():
    connection = connect()

    try:
        cursor = connection.execute(
            "SELECT Ticker, Quant_analysis, Last_saved_at, ID FROM analysis_history " \
            "ORDER BY Last_saved_at DESC"
        )

        historical_analysis = cursor.fetchall()
        
        companies = {}

        for company in historical_analysis:
            quant_analysis = json.loads(company[1])
            ticker = company[0]

            companies.setdefault(ticker, []).append({
                "ticker": ticker,
                "name": quant_analysis["profile"]["name"],
                "updated_at": company[2],
                "id": company[3]
            })

        return companies
    
    finally:
        connection.close()