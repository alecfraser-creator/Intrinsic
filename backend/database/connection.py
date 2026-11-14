
import sqlite3
from pathlib import Path
from ..config import DATABASE_URL

from psycopg_pool import ConnectionPool


db_path_local = Path(__file__).resolve().parent.parent.parent / "data" / "intrinsic.db"
db_path_local.parent.mkdir(parents=True, exist_ok=True)

pool = (
    ConnectionPool(
        conninfo=DATABASE_URL,
        min_size=1,
        max_size=5,
        open=False,
        close_returns=True
    )
    if DATABASE_URL else None
)


def connect(user_id):
    if DATABASE_URL:
        connection = pool.getconn()

        try:
            connection.execute("SET LOCAL ROLE authenticated")

            connection.execute(
                """
                SELECT set_config(
                    'request.jwt.claim.sub',
                    %s,
                    true
                )
                """,
                (user_id,)
            )

        except Exception:
            connection.close()
            raise

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
