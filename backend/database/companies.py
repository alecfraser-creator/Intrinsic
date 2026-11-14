
import json
from datetime import datetime, timezone

from .connection import connect
from ..config import DATABASE_URL

from psycopg.types.json import Jsonb


# --------------------------------------------------
# Database compatibility
# --------------------------------------------------

PLACEHOLDER = "%s" if DATABASE_URL else "?"


def _prepare_json(value):
    """Prepare JSON data for the selected database."""
    return Jsonb(value) if DATABASE_URL else json.dumps(value)


def _load_json(value):
    """Load JSON data regardless of database."""
    if value is None:
        return None

    return value if DATABASE_URL else json.loads(value)


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


# --------------------------------------------------
# Companies
# --------------------------------------------------

def insert_company(user_id, ticker, quant_analysis, last_financials_refresh, qual_analysis, historical_data):

    connection = connect(user_id)

    try:
        date = datetime.now(timezone.utc)

        connection.execute(
            f"""
            INSERT INTO companies (
                user_id, ticker, quant_analysis, updated_at,
                last_financials_refresh, qual_analysis, historical_price
            )
            VALUES (
                {PLACEHOLDER}, {PLACEHOLDER}, {PLACEHOLDER},
                {PLACEHOLDER}, {PLACEHOLDER}, {PLACEHOLDER}, {PLACEHOLDER}
            )
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
                _prepare_json(quant_analysis),
                _prepare_timestamp(date),
                _prepare_timestamp(last_financials_refresh),
                _prepare_json(qual_analysis),
                _prepare_json(historical_data)
            )
        )

        connection.commit()

        return date.isoformat()

    finally:
        connection.close()


def get_saved_company(user_id, ticker):

    connection = connect(user_id)

    try:
        cursor = connection.execute(
            f"""
            SELECT User_id, Ticker, Quant_analysis, Updated_at,
                   Last_financials_refresh, Qual_analysis, Historical_price
            FROM companies
            WHERE User_id = {PLACEHOLDER} AND Ticker = {PLACEHOLDER}
            """,
            (user_id, ticker)
        )

        company = cursor.fetchone()

        if company is None:
            return None

        return {
            "user_id": company[0],
            "ticker": company[1],
            "quant_analysis": _load_json(company[2]),
            "updated_at": _format_timestamp(company[3]),
            "last_financials_refresh": _format_timestamp(company[4]),
            "qual_analysis": _load_json(company[5]),
            "historical_price": _load_json(company[6])
        }

    finally:
        connection.close()


def delete_company(user_id, ticker):

    connection = connect(user_id)

    try:
        connection.execute(
            f"""
            DELETE FROM companies
            WHERE User_id = {PLACEHOLDER} AND Ticker = {PLACEHOLDER}
            """,
            (user_id, ticker)
        )

        connection.commit()

    finally:
        connection.close()


def delete_all_user_data(user_id):

    connection = connect(user_id)

    try:
        connection.execute(
            f"""
            DELETE FROM companies
            WHERE user_id = {PLACEHOLDER}
            """,
            (user_id,)
        )

        connection.commit()

    finally:
        connection.close()


# --------------------------------------------------
# Historical analyses
# --------------------------------------------------

def get_old_analysis(user_id, analysis_id):

    connection = connect(user_id)

    try:
        cursor = connection.execute(
            f"""
            SELECT User_id, Analysis_id, Ticker, Quant_analysis,
                   Last_saved_at, Last_financials_refresh,
                   Qual_analysis, Historical_price
            FROM analysis_history
            WHERE User_id = {PLACEHOLDER} AND Analysis_id = {PLACEHOLDER}
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
            "quant_analysis": _load_json(analysis[3]),
            "updated_at": _format_timestamp(analysis[4]),
            "last_financials_refresh": _format_timestamp(analysis[5]),
            "qual_analysis": _load_json(analysis[6]),
            "historical_price": _load_json(analysis[7])
        }

    finally:
        connection.close()


def delete_past_analysis(user_id, analysis_id):

    connection = connect(user_id)

    try:
        connection.execute(
            f"""
            DELETE FROM analysis_history
            WHERE User_id = {PLACEHOLDER} AND Analysis_id = {PLACEHOLDER}
            """,
            (user_id, analysis_id)
        )

        connection.commit()

    finally:
        connection.close()


def insert_historical_analysis(user_id, ticker, quant_analysis, last_financials_refresh, qual_analysis, historical_data, last_saved_at):

    connection = connect(user_id)

    try:
        connection.execute(
            f"""
            INSERT INTO analysis_history (
                User_id, Ticker, Quant_analysis, Last_financials_refresh,
                Qual_analysis, Historical_price, Last_saved_at
            )
            VALUES (
                {PLACEHOLDER}, {PLACEHOLDER}, {PLACEHOLDER},
                {PLACEHOLDER}, {PLACEHOLDER}, {PLACEHOLDER}, {PLACEHOLDER}
            )
            """,
            (
                user_id,
                ticker,
                _prepare_json(quant_analysis),
                _prepare_timestamp(last_financials_refresh),
                _prepare_json(qual_analysis),
                _prepare_json(historical_data),
                _prepare_timestamp(last_saved_at)
            )
        )

        connection.commit()

    finally:
        connection.close()


def get_all_historical_analyses(user_id):

    connection = connect(user_id)

    try:
        cursor = connection.execute(
            f"""
            SELECT Ticker, Quant_analysis, Last_saved_at, Analysis_id
            FROM analysis_history
            WHERE User_id = {PLACEHOLDER}
            ORDER BY Last_saved_at DESC
            """,
            (user_id,)
        )

        historical_analysis = cursor.fetchall()

        companies = {}

        for company in historical_analysis:
            quant_analysis = _load_json(company[1])
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


# --------------------------------------------------
# Watchlist
# --------------------------------------------------

def get_watchlist_companies(user_id):

    connection = connect(user_id)

    try:
        cursor = connection.execute(
            f"""
            SELECT Ticker, Quant_analysis, Updated_at
            FROM companies
            WHERE User_id = {PLACEHOLDER}
            """,
            (user_id,)
        )

        companies = cursor.fetchall()

        results = []

        for company in companies:
            quant_analysis = _load_json(company[1])

            results.append({
                "ticker": company[0],
                "name": quant_analysis["profile"]["name"],
                "updated_at": _format_timestamp(company[2])
            })

        return results

    finally:
        connection.close()
