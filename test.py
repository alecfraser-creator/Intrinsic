import os

import pandas as pd
from edgar import Company, set_identity


set_identity(
    os.getenv("EDGAR_IDENTITY", "Alec alecfraser@outlook.fr")
)
company = Company("AAPL")

# Retrieve one annual filing and one quarterly filing
annual_filing = company.get_filings(form="10-K").latest()
quarterly_filing = company.get_filings(form="10-Q").latest()

for filing in [annual_filing, quarterly_filing]:
    print(f"\n{'=' * 60}")
    print(f"Filing: {filing.form}")
    print(f"Period: {filing.period_of_report}")

    # Parse the filing's XBRL data once
    xbrl = filing.xbrl()

    if xbrl is None:
        print("No XBRL data available")
        continue

    # Extract all three statements from that same filing
    statements = xbrl.statements

    income = statements.income_statement()
    balance = statements.balance_sheet()
    cashflow = statements.cash_flow_statement()

    print("\n--- INCOME STATEMENT ---")
    print(income.to_dataframe().to_string())

    print("\n--- BALANCE SHEET ---")
    print(balance.to_dataframe().to_string())

    print("\n--- CASH FLOW STATEMENT ---")
    print(cashflow.to_dataframe().to_string())
