
import json
from .connection import connect
from datetime import datetime, timezone
from ..config import DATABASE_URL

from psycopg.types.json import Jsonb


def _prepare_timestamp(value):
    """Prepare a timestamp for the selected database."""
    if value is None:
        return None

    if DATABASE_URL:
        return value

    return value.isoformat() if isinstance(value, datetime) else value


def _format_timestamp(value):
    """Return timestamps in ISO format regardless of database."""
    if isinstance(value, datetime):
        return value.isoformat()

    return value


def insert_company(user_id, ticker, quant_analysis, last_financials_refresh, qual_analysis, historical_data):

    connection = connect()

    try:
        date = datetime.now(timezone.utc)

        if DATABASE_URL:
            connection.execute(
                """
                INSERT INTO companies (
                    user_id, ticker, quant_analysis, updated_at,
                    last_financials_refresh, qual_analysis, historical_price
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id, ticker) DO UPDATE SET
                    quant_analysis = excluded.quant_analysis,
                    updated_at = excluded.updated_at,
                    last_financials_refresh = excluded.last_financials_refresh,
                    qual_analysis = excluded.qual_analysis,
                    historical_price = excluded.historical_price
                """,
                (
                    user_id,
                    ticker,
                    Jsonb(quant_analysis),
                    date,
                    last_financials_refresh,
                    Jsonb(qual_analysis),
                    Jsonb(historical_data)
                )
            )

        else:
            connection.execute(
                """
                INSERT INTO companies (
                    user_id, ticker, quant_analysis, updated_at, last_financials_refresh,
                    qual_analysis, historical_price
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, ticker) DO UPDATE SET
                    quant_analysis = excluded.quant_analysis,
                    updated_at = excluded.updated_at,
                    last_financials_refresh = excluded.last_financials_refresh,
                    qual_analysis = excluded.qual_analysis,
                    historical_price = excluded.historical_price
                """,
                (
                    user_id,
                    ticker,
                    json.dumps(quant_analysis),
                    date.isoformat(),
                    _prepare_timestamp(last_financials_refresh),
                    json.dumps(qual_analysis),
                    json.dumps(historical_data)
                )
            )

        connection.commit()

        return date.isoformat()

    finally:
        connection.close()


def get_saved_company(user_id, ticker):

    connection = connect()
    try:
        if DATABASE_URL:
            cursor = connection.execute(
                """
                SELECT User_id, Ticker, Quant_analysis, Updated_at, Last_financials_refresh, Qual_analysis, Historical_price
                FROM COMPANIES
                WHERE User_id = %s AND Ticker = %s
                """,
                (user_id, ticker)
            )

        else:
            cursor = connection.execute(
                """
                SELECT User_id, Ticker, Quant_analysis, Updated_at, Last_financials_refresh, Qual_analysis, Historical_price
                FROM Companies
                WHERE User_id = ? AND Ticker = ?
                """,
                (user_id, ticker)
            )

        company = cursor.fetchone()

        if company is None:
            return None

        return {
            "user_id": company[0],
            "ticker": company[1],
            "quant_analysis": company[2] if DATABASE_URL else json.loads(company[2]),
            "updated_at": _format_timestamp(company[3]),
            "last_financials_refresh": _format_timestamp(company[4]),
            "qual_analysis": (company[5] if DATABASE_URL else json.loads(company[5])) if company[5] else None,
            "historical_price": (company[6] if DATABASE_URL else json.loads(company[6])) if company[6] else None
        }

    finally:
        connection.close()


def get_old_analysis(user_id, analysis_id):

    connection = connect()
    try:
        if DATABASE_URL:
            cursor = connection.execute(
                """
                SELECT User_id, Analysis_id, Ticker, Quant_analysis, Last_saved_at, Last_financials_refresh, Qual_analysis, Historical_price
                FROM analysis_history
                WHERE User_id = %s AND Analysis_id = %s
                """,
                (user_id, analysis_id)
            )

        else:
            cursor = connection.execute(
                """
                SELECT User_id, Analysis_id, Ticker, Quant_analysis, Last_saved_at, Last_financials_refresh, Qual_analysis, Historical_price
                FROM analysis_history
                WHERE User_id = ? AND Analysis_id = ?
                """,
                (user_id, analysis_id)
            )

        analysis = cursor.fetchone()

        if analysis is None:
            return None

        return {
            "user_id": analysis[0],
            "analysis_id": analysis[1],
            "ticker": analysis[2],
            "quant_analysis": analysis[3] if DATABASE_URL else json.loads(analysis[3]),
            "updated_at": _format_timestamp(analysis[4]),
            "last_financials_refresh": _format_timestamp(analysis[5]),
            "qual_analysis": (analysis[6] if DATABASE_URL else json.loads(analysis[6])) if analysis[6] else None,
            "historical_price": (analysis[7] if DATABASE_URL else json.loads(analysis[7])) if analysis[7] else None
        }

    finally:
        connection.close()


def delete_company(user_id, ticker):

    connection = connect()

    try:
        if DATABASE_URL:
            connection.execute(
                "DELETE FROM Companies WHERE User_id = %s AND Ticker = %s",
                (user_id, ticker)
            )
        else:
            connection.execute(
                "DELETE FROM Companies WHERE User_id = ? AND Ticker = ?",
                (user_id, ticker)
            )

        connection.commit()

    finally:
        connection.close()


def delete_past_analysis(user_id, analysis_id):

    connection = connect()

    try:
        if DATABASE_URL:
            connection.execute(
                "DELETE FROM analysis_history WHERE User_id = %s AND Analysis_id = %s",
                (user_id, analysis_id)
            )
        else:
            connection.execute(
                "DELETE FROM analysis_history WHERE User_id = ? AND Analysis_id = ?",
                (user_id, analysis_id)
            )

        connection.commit()

    finally:
        connection.close()


def get_watchlist_companies(user_id):

    connection = connect()

    try:
        if DATABASE_URL:
            cursor = connection.execute(
                """
                SELECT Ticker, Quant_analysis, Updated_at FROM Companies
                WHERE User_id = %s
                """,
                (user_id,)
            )
        else:
            cursor = connection.execute(
                """
                SELECT Ticker, Quant_analysis, Updated_at FROM Companies
                WHERE User_id = ?
                """,
                (user_id,)
            )

        companies = cursor.fetchall()

        results = []

        for company in companies:
            quant_analysis = company[1] if DATABASE_URL else json.loads(company[1])

            results.append({
                "ticker": company[0],
                "name": quant_analysis["profile"]["name"],
                "updated_at": _format_timestamp(company[2])
            })

        return results

    finally:
        connection.close()


def insert_historical_analysis(user_id, ticker, quant_analysis, last_financials_refresh, qual_analysis, historical_data, last_saved_at):

    connection = connect()

    try:
        if DATABASE_URL:
            connection.execute(
                """
                INSERT INTO analysis_history (
                    User_id, Ticker, Quant_analysis, Last_financials_refresh,
                    Qual_analysis, Historical_price, Last_saved_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    ticker,
                    Jsonb(quant_analysis),
                    last_financials_refresh,
                    Jsonb(qual_analysis),
                    Jsonb(historical_data),
                    last_saved_at
                )
            )

        else:
            connection.execute(
                """
                INSERT INTO analysis_history (
                    User_id, Ticker, Quant_analysis, Last_financials_refresh,
                    Qual_analysis, Historical_price, Last_saved_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    ticker,
                    json.dumps(quant_analysis),
                    _prepare_timestamp(last_financials_refresh),
                    json.dumps(qual_analysis),
                    json.dumps(historical_data),
                    _prepare_timestamp(last_saved_at)
                )
            )

        connection.commit()

    finally:
        connection.close()


def get_all_historical_analyses(user_id):

    connection = connect()

    try:
        if DATABASE_URL:
            cursor = connection.execute(
                """
                SELECT Ticker, Quant_analysis, Last_saved_at, Analysis_id FROM analysis_history
                WHERE User_id = %s
                ORDER BY Last_saved_at DESC
                """,
                (user_id,)
            )
        else:
            cursor = connection.execute(
                """
                SELECT Ticker, Quant_analysis, Last_saved_at, Analysis_id FROM analysis_history
                WHERE User_id = ?
                ORDER BY Last_saved_at DESC
                """,
                (user_id,)
            )

        historical_analysis = cursor.fetchall()

        companies = {}

        for company in historical_analysis:
            quant_analysis = company[1] if DATABASE_URL else json.loads(company[1])
            ticker = company[0]

            companies.setdefault(ticker, []).append({
                "ticker": ticker,
                "name": quant_analysis["profile"]["name"],
                "updated_at": _format_timestamp(company[2]),
                "analysis_id": company[3]
            })

        return companies

    finally:
        connection.close()
