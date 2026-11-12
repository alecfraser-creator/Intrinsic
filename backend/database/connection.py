
import sqlite3
from pathlib import Path
import psycopg
from ..config import DATABASE_URL


db_path_local = Path(__file__).resolve().parent.parent.parent / "data" / "intrinsic.db"
db_path_local.parent.mkdir(parents=True, exist_ok=True)


def connect():
    if DATABASE_URL:
        return psycopg.connect(DATABASE_URL)
    else:
        return sqlite3.connect(db_path_local)


def execute_script():
    schema_path = Path(__file__).resolve().parent / "schema.sql"
    schemas = schema_path.read_text()

    connection = sqlite3.connect(db_path_local)

    try:
        connection.executescript(schemas)
    finally:
        connection.close()


if not DATABASE_URL:
    execute_script()
