CREATE TABLE IF NOT EXISTS companies (
    Ticker TEXT PRIMARY KEY,
    Analysis TEXT NOT NULL,
    Last_saved_at TEXT NOT NULL,
    Last_financials_refresh TEXT
);