from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .main import analyze_company
from .database.companies import (
    get_saved_company,
    insert_company,
    delete_company,
    get_all_companies,
    refresh_latest_financial,
)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Intrinsic API is running"}



@app.get("/company/{ticker}")
def get_company(ticker: str):
    isdata = get_saved_company(ticker)

    if isdata is not None:
        return {
            "quant_analysis": isdata["quant_analysis"],
            "qual_analysis": isdata["qual_analysis"],
            "in_watchlist": True,
            "updated_at": isdata["updated_at"],
            "last_financials_refresh": isdata["last_financials_refresh"],
        }

    results = analyze_company(ticker)

    if results is None:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve company data",
        )

    last_financials_refresh = datetime.now(timezone.utc).isoformat()

    return {
        "quant_analysis": results,
        "qual_analysis": None,
        "in_watchlist": False,
        "last_financials_refresh": last_financials_refresh,
        "updated_at": None,
    }



@app.put("/watchlist/{ticker}")
def fresh_analysis(ticker: str):
    results = analyze_company(ticker)

    if results is None:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve company data",
        )

    last_financials_refresh = datetime.now(timezone.utc).isoformat()

    return {
        "quant_analysis": results,
        "qual_analysis": None,
        "in_watchlist": True,
        "last_financials_refresh": last_financials_refresh,
    }


@app.post("/watchlist/{ticker}")
def update_database(ticker: str, data: dict):
    quant_analysis = data["quant_analysis"]
    qual_analysis = data["qual_analysis"]
    last_financials_refresh = data["last_financials_refresh"]


    updated_at = insert_company(
        ticker,
        quant_analysis,
        last_financials_refresh,
        qual_analysis
    )

    return {
        "message": "Company added to watchlist",
        "updated_at": updated_at,
        "last_financials_refresh": last_financials_refresh,
    }


@app.delete("/watchlist/{ticker}")
def delete_in_database(ticker: str):
    delete_company(ticker)


@app.get("/watchlist")
def get_watchlist():
    return get_all_companies()
