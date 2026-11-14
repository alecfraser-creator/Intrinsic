
import sqlite3
from pathlib import Path
import psycopg
from ..config import DATABASE_URL


db_path_local = Path(__file__).resolve().parent.parent.parent / "data" / "intrinsic.db"
db_path_local.parent.mkdir(parents=True, exist_ok=True)


def connect(user_id):
    if DATABASE_URL:
        connection = psycopg.connect(DATABASE_URL)
        connection.execute(
            "SET LOCAL ROLE authenticated"
        )

        connection.execute(
            """
            SELECT set_config(
            'request.jwt.claim.sub',
            %s,
            true)
            """,
            (user_id,)
        );

        return connection
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
