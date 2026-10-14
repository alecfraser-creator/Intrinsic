from fastapi import FastAPI, HTTPException
from main import analyze_company
from fastapi.middleware.cors import CORSMiddleware


api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5500"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

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