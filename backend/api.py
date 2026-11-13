from fastapi.staticfiles import StaticFiles
from pathlib import Path

from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .main import analyze_company, recalculate_company_dcf
from .config import LOCAL_USER_ID

from .database.companies import (
    get_saved_company,
    insert_company,
    delete_company,
    get_watchlist_companies,
    insert_historical_analysis,
    get_all_historical_analyses,
    get_old_analysis,
    delete_past_analysis
)


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        "https://intrinsic-production.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




@app.get("/company/{ticker}")
def get_company(ticker: str):
    user_id = LOCAL_USER_ID

    isdata = get_saved_company(user_id, ticker)

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

    last_financials_refresh = datetime.now(timezone.utc)

    return {
        "quant_analysis": results,
        "qual_analysis": None,
        "in_watchlist": False,
        "last_financials_refresh": last_financials_refresh,
        "updated_at": None,
        "historical_data": results["historical_data"],
    }


@app.get("/watchlist/{ticker}")
def get_saved_analysis(ticker: str):
    user_id = LOCAL_USER_ID

    isdata = get_saved_company(user_id, ticker)

    if isdata is None:
        raise HTTPException(
            status_code=404,
            detail="Saved analysis not found",
        )

    return {
        "quant_analysis": isdata["quant_analysis"],
        "qual_analysis": isdata["qual_analysis"],
        "in_watchlist": True,
        "updated_at": isdata["updated_at"],
        "last_financials_refresh": isdata["last_financials_refresh"],
        "historical_data": isdata["historical_price"],
    }


@app.get("/company/history/{analysis_id}")
def get_analysis_history(analysis_id):
    user_id = LOCAL_USER_ID

    isdata = get_old_analysis(user_id, analysis_id)

    if isdata is not None:
        return {
            "user_id": user_id,
            "ticker": isdata["ticker"],
            "quant_analysis": isdata["quant_analysis"],
            "qual_analysis": isdata["qual_analysis"],
            "in_watchlist": True,
            "updated_at": isdata["updated_at"],
            "last_financials_refresh": isdata["last_financials_refresh"],
            "historical_data": isdata["historical_price"],
        }

    else:
        raise HTTPException(
            status_code=404,
            detail="Historical analysis not found",
        )




@app.put("/watchlist/{ticker}")
def fresh_analysis(ticker: str):
    user_id = LOCAL_USER_ID
    
    saved_company = get_saved_company(user_id, ticker)

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

    last_financials_refresh = datetime.now(timezone.utc)

    return {
        "quant_analysis": results,
        "qual_analysis": qual_analysis,
        "in_watchlist": saved_company is not None,
        "last_financials_refresh": last_financials_refresh,
        "historical_data": results["historical_data"],
    }



@app.post("/watchlist/{ticker}")
def update_database(ticker: str, data: dict):
    user_id = LOCAL_USER_ID

    save_mode = data["save_mode"]

    if save_mode == "update":
        quant_analysis = data["quant_analysis"]
        qual_analysis = data["qual_analysis"]
        last_financials_refresh = data["last_financials_refresh"]
        historical_data = data["historical_data"]

        updated_at_old = insert_company(
            user_id,
            ticker,
            quant_analysis,
            last_financials_refresh,
            qual_analysis,
            historical_data
        )

        return {
            "message": "Company added to watchlist",
            "updated_at": updated_at_old,
            "last_financials_refresh": last_financials_refresh,
        }
    
    elif save_mode == "new_version":
    
        # write old analysis in the analysis_history table
        analysis_old = get_saved_company(user_id, ticker)

        if analysis_old is None:
            raise HTTPException(status_code=404, detail="Company not found")
        
        quant_analysis_old = analysis_old["quant_analysis"]
        qual_analysis_old = analysis_old["qual_analysis"]
        last_financials_refresh_old = analysis_old["last_financials_refresh"]
        historical_data_old = analysis_old["historical_price"]
        last_saved_at_old = analysis_old["updated_at"]

        
        insert_historical_analysis(
            user_id,
            ticker, 
            quant_analysis_old, 
            last_financials_refresh_old, 
            qual_analysis_old, 
            historical_data_old, 
            last_saved_at_old
        )

        #add the new version to companies
        quant_analysis_new = data["quant_analysis"]
        qual_analysis_new = data["qual_analysis"]
        last_financials_refresh_new = data["last_financials_refresh"]
        historical_data_new = data["historical_data"]

        updated_at_new = insert_company(
            user_id,
            ticker,
            quant_analysis_new,
            last_financials_refresh_new,
            qual_analysis_new,
            historical_data_new
        )

        return {
            "message": "Company added to watchlist",
            "updated_at": updated_at_new,
            "last_financials_refresh": last_financials_refresh_new,
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid save mode")



@app.post("/company/{ticker}/recalculate-dcf")
def recalculate_dcf(ticker: str, data: dict = None):

    user_id = LOCAL_USER_ID

    saved_company = get_saved_company(user_id, ticker)

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
            "historical_data": saved_company["historical_price"]
        }

    # Otherwise, return just the newly calculated DCF.
    return {
        "dcf": new_dcf,
        "in_watchlist": False
    }



@app.delete("/watchlist/{ticker}")
def delete_in_database(ticker: str):
    user_id = LOCAL_USER_ID
    delete_company(user_id, ticker)


@app.delete("/watchlist/historical/{analysis_id}")
def delete_from_history(analysis_id):
    user_id = LOCAL_USER_ID

    delete_past_analysis(user_id, analysis_id)


@app.get("/watchlist")
def get_watchlist():
    user_id = LOCAL_USER_ID

    companies = get_watchlist_companies(user_id)
    history = get_all_historical_analyses(user_id)

    return {
        "companies": companies,
        "history": history
    }


FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app.mount(
    "/",
    StaticFiles(directory=FRONTEND_DIR, html=True),
    name="frontend"
)