

CREATE TABLE IF NOT EXISTS companies (
    User_id UUID NOT NULL,
    Ticker TEXT NOT NULL,
    Quant_analysis JSONB NOT NULL,
    Updated_at TIMESTAMPTZ,
    Last_financials_refresh TIMESTAMPTZ,
    Qual_analysis JSONB, 
    Historical_price JSONB,
    PRIMARY KEY (User_id, Ticker)
);


CREATE TABLE IF NOT EXISTS analysis_history (
    Analysis_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    User_id UUID NOT NULL,
    Ticker TEXT NOT NULL,
    Quant_analysis JSONB NOT NULL,
    Qual_analysis JSONB,
    Historical_price JSONB,
    Last_saved_at TIMESTAMPTZ NOT NULL,

    FOREIGN KEY (User_id, Ticker)
        REFERENCES companies(User_id, Ticker)
        ON DELETE CASCADE
);

