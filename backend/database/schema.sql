CREATE TABLE IF NOT EXISTS companies (
    Ticker TEXT PRIMARY KEY,
    Quant_analysis TEXT NOT NULL,
    Last_saved_at TEXT NOT NULL,
    Last_financials_refresh TEXT,
    Qual_analysis TEXT, 
    Historical_price TEXT
);



CREATE TABLE IF NOT EXISTS analysis_history (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    Ticker TEXT NOT NULL,
    Quant_analysis TEXT NOT NULL,
    Qual_analysis TEXT,
    Historical_price TEXT,
    Last_saved_at TEXT NOT NULL,
    FOREIGN KEY (Ticker) REFERENCES companies(Ticker)
);