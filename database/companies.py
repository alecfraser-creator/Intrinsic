import json
from database.connection import connect
from datetime import datetime, timezone

def insert_company(ticker, analysis):
    connection = connect()
    print(connection.execute("PRAGMA table_info(Companies)").fetchall())

    date = datetime.now(timezone.utc)
    date = date.isoformat()

    connection.execute(
        "INSERT INTO Companies (Ticker, Analysis, Updated_at) VALUES (?, ?, ?) " \
        "ON CONFLICT(Ticker) DO UPDATE SET Analysis = excluded.Analysis, Updated_at = excluded.Updated_at",
        (ticker, json.dumps(analysis), date)
    )

    connection.commit()
    connection.close()