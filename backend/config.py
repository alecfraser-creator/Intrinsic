from dotenv import load_dotenv
load_dotenv()

import os

#If you choose "free"" data provider, you will only be able to analyse top american companies (other option :"sec_finazon")
DATA_PROVIDER = "free"


EDGAR_IDENTITY=os.getenv("EDGAR_IDENTITY")

API_KEY_FMP = os.getenv("API_KEY_FMP")


API_KEY_FINAZON = os.getenv("API_KEY_FINAZON")
