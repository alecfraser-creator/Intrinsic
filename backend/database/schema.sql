CREATE TABLE IF NOT EXISTS companies (
    Ticker TEXT PRIMARY KEY,
    Quant_analysis TEXT NOT NULL,
    Last_saved_at TEXT NOT NULL,
    Last_financials_refresh TEXT,
    Qual_analysis TEXT
);