from fastapi import FastAPI, HTTPException
from main import analyze_company
from fastapi.middleware.cors import CORSMiddleware
from database.companies import get_saved_company, insert_company



app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Intrinsic API is running"}


@app.get("/company/{ticker}")
def get_company(ticker: str):

    isdata = get_saved_company(ticker)

    if isdata is not None:
        return isdata["analysis"]
    else:
        results = analyze_company(ticker)
        if results is None :
            raise HTTPException(
                status_code=502,
                detail="Unable to retrieve company data"
            )
        return results
 


@app.post("/watchlist/{ticker}")
def update_database(ticker: str, analysis: dict):
    insert_company(ticker, analysis)
    return {"message": "Company added to watchlist"}