from dotenv import load_dotenv
load_dotenv()

import os

#If you choose free data provider, you will only be able to analyse top american companies
DATA_PROVIDER = "free"



API_KEY_FMP = os.getenv("API_KEY_FMP")

API_KEY_QUANT = os.getenv("API_KEY_BUSINESSQUANT")
