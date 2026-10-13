from fastapi import FastAPI, HTTPException
from main import analyze_company

api = FastAPI()


@api.get("/")
def home():
    return {"message": "Intrinsic API is running"}


@api.get("/company/{ticker}")
def get_company(ticker: str):
    results = analyze_company(ticker)
    if results is None :
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve company data"
        )
    return results