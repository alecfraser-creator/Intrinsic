from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from .main import analyze_company
from fastapi.middleware.cors import CORSMiddleware
from .database.companies import get_saved_company, insert_company, delete_company, get_all_companies, refresh_latest_financial



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise toutes les origines (parfait pour le dev local)
    allow_credentials=True,
    allow_methods=["*"],  # Autorise toutes les méthodes (GET, POST, etc.)
    allow_headers=["*"],  # Autorise tous les headers
)

@app.get("/")
def home():
    return {"message": "Intrinsic API is running"}


@app.get("/company/{ticker}")
def get_company(ticker: str):

    isdata = get_saved_company(ticker)

    if isdata is not None:
        return {
            "analysis": isdata["analysis"],
            "in_watchlist": True,
            "updated_at": isdata["updated_at"],
            "last_financials_refresh": isdata["last_financials_refresh"]
        }
    else:
        results = analyze_company(ticker)
    
        if results is None :
            raise HTTPException(
                status_code=502,
                detail="Unable to retrieve company data"
            )

        last_financials_refresh = datetime.now(timezone.utc).isoformat()

        return {
            "analysis": results,
            "in_watchlist": False, 
            "last_financials_refresh": last_financials_refresh
            }


@app.put("/watchlist/{ticker}")
def fresh_analysis(ticker: str):
    results = analyze_company(ticker)

    if results is None:
        raise HTTPException(status_code=502, detail="Unable to retrieve company data")

    last_financials_refresh = datetime.now(timezone.utc).isoformat()

    refresh_latest_financial(ticker, last_financials_refresh)

    return {
        "analysis": results,
        "in_watchlist": True,
        "last_financials_refresh": last_financials_refresh
    }

    



@app.post("/watchlist/{ticker}")
def update_database(ticker: str, data: dict):
    analysis = data["analysis"]
    last_financials_refresh = data["last_financials_refresh"]

    insert_company(ticker, analysis, last_financials_refresh)

    return {"message": "Company added to watchlist"}

@app.delete("/watchlist/{ticker}")
def delete_in_database(ticker:str):
    delete_company(ticker)



@app.get("/watchlist")
def get_watchlist():
    return get_all_companies()