import sqlite3
from pathlib import Path


db_path = Path(__file__).resolve().parent.parent.parent / "data" / "intrinsic.db"
db_path.parent.mkdir(parents=True, exist_ok=True)


def connect():
    return sqlite3.connect(db_path)


schema_path = Path(__file__).resolve().parent / "schema.sql"

schemas = schema_path.read_text()

connection = connect()
connection.executescript(schemas)
connection.close()