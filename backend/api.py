from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .main import analyze_company, recalculate_company_dcf
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
            "historical_data": isdata["historical_price"],
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
        "historical_data": results["historical_data"],
    }


@app.put("/watchlist/{ticker}")
def fresh_analysis(ticker: str):
    saved_company = get_saved_company(ticker)

    existing_assumptions = None
    existing_scenarios = None
    existing_terminal_growth_input = None
    qual_analysis = None

    if saved_company is not None:
        saved_quant_analysis = saved_company["quant_analysis"]
        qual_analysis = saved_company["qual_analysis"]

        saved_dcf = saved_quant_analysis.get("dcf", {})
        existing_scenarios = saved_dcf.get("scenarios")
        existing_terminal_growth_input = saved_dcf.get(
            "terminal_growth_input"
        )

        existing_assumptions = (
            existing_scenarios
            .get("base", {})
            .get("assumptions", {})
            .get("forecast_assumptions")
            if existing_scenarios
            else None
        )

    results = analyze_company(
        ticker,
        existing_assumptions=existing_assumptions,
        existing_scenarios=existing_scenarios,
        existing_terminal_growth_input=existing_terminal_growth_input
    )

    if results is None:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve company data",
        )

    last_financials_refresh = datetime.now(timezone.utc).isoformat()

    return {
        "quant_analysis": results,
        "qual_analysis": qual_analysis,
        "in_watchlist": saved_company is not None,
        "last_financials_refresh": last_financials_refresh,
        "historical_data": results["historical_data"],
    }


@app.post("/watchlist/{ticker}")
def update_database(ticker: str, data: dict):
    quant_analysis = data["quant_analysis"]
    qual_analysis = data["qual_analysis"]
    last_financials_refresh = data["last_financials_refresh"]
    historical_data = data["historical_data"]

    updated_at = insert_company(
        ticker,
        quant_analysis,
        last_financials_refresh,
        qual_analysis,
        historical_data
    )

    return {
        "message": "Company added to watchlist",
        "updated_at": updated_at,
        "last_financials_refresh": last_financials_refresh,
    }



@app.post("/company/{ticker}/recalculate-dcf")
def recalculate_dcf(ticker: str, data: dict = None):

    saved_company = get_saved_company(ticker)

    # Prefer DCF data supplied by the frontend.
    # Otherwise, use the saved DCF if available.
    current_dcf = (data or {}).get("dcf")

    if current_dcf is None and saved_company is not None:
        current_dcf = saved_company["quant_analysis"].get("dcf", {})

    current_dcf = current_dcf or {}

    existing_scenarios = current_dcf.get("scenarios")
    existing_terminal_growth_input = current_dcf.get(
        "terminal_growth_input"
    )

    existing_assumptions = (
        existing_scenarios
        .get("base", {})
        .get("assumptions", {})
        .get("forecast_assumptions")
        if existing_scenarios
        else None
    )

    # Recalculate DCF
    new_dcf = recalculate_company_dcf(
        ticker,
        existing_assumptions=existing_assumptions,
        existing_scenarios=existing_scenarios,
        existing_terminal_growth_input=existing_terminal_growth_input
    )

    if new_dcf is None:
        raise HTTPException(
            status_code=502,
            detail="Unable to recalculate DCF"
        )

    # If company is saved, merge the new DCF into its analysis.
    if saved_company is not None:

        quant_analysis = saved_company["quant_analysis"]

        quant_analysis["dcf"] = new_dcf

        quant_analysis["valuation"][
            "Discounted Cash Flow (DCF) Valuation"
        ] = new_dcf["intrinsic_value_per_share"]

        return {
            "quant_analysis": quant_analysis,
            "qual_analysis": saved_company["qual_analysis"],
            "in_watchlist": True,
            "updated_at": saved_company["updated_at"],
            "last_financials_refresh": saved_company["last_financials_refresh"],
            "historical_data": saved_company["historical_data"]
        }

    # Otherwise, return just the newly calculated DCF.
    return {
        "dcf": new_dcf,
        "in_watchlist": False
    }





@app.delete("/watchlist/{ticker}")
def delete_in_database(ticker: str):
    delete_company(ticker)


@app.get("/watchlist")
def get_watchlist():
    return get_all_companies()
