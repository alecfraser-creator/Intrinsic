CREATE TABLE IF NOT EXISTS companies (
    User_id TEXT NOT NULL,
    Ticker TEXT NOT NULL,
    Quant_analysis TEXT NOT NULL,
    Updated_at TEXT NOT NULL,
    Last_financials_refresh TEXT,
    Qual_analysis TEXT, 
    Historical_price TEXT,
    PRIMARY KEY (User_id, ticker)
);



CREATE TABLE IF NOT EXISTS analysis_history (
    Analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
    User_id TEXT NOT NULL,
    Ticker TEXT NOT NULL,
    Quant_analysis TEXT NOT NULL,
    Qual_analysis TEXT,
    Historical_price TEXT,
    Last_saved_at TEXT NOT NULL,
    FOREIGN KEY (User_id, Ticker) REFERENCES companies(User_id, Ticker)
);