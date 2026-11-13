from dotenv import load_dotenv
load_dotenv()

import os


EDGAR_IDENTITY=os.getenv("EDGAR_IDENTITY")

API_KEY_FMP = os.getenv("API_KEY_FMP")


API_KEY_FINAZON = os.getenv("API_KEY_FINAZON")


FRED_API_KEY = os.getenv("API_KEY_FRED")

DATABASE_URL = os.getenv("DATABASE_URL")

SUPABASE_URL = "https://xspgxwmuodmqvjbtnjns.supabase.co"

LOCAL_USER_ID = "00000000-0000-0000-0000-000000000001"