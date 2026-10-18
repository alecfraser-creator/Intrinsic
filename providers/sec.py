import config
import re
import pandas as pd
from edgar import Company, set_identity


set_identity(config.EDGAR_IDENTITY)


def get_sec_data(ticker):
    ticker = ticker.strip().upper()

    try:
        company = Company(ticker)

        filings = company.get_filings(form="10-K")
        fiscal_year_ends = {}
        for filing in filings:
            period_end = filing.period_of_report
            if period_end:
                year = str(period_end)[:4]
                fiscal_year_ends[year] = str(period_end)

       
        profile = extract_profile_data(company)

        income_annual_raw = company.income_statement(periods=5, as_dataframe=True)
        income_quarter_raw = company.income_statement(periods=8, annual=False, as_dataframe=True)
        balance_quarter_raw = company.balance_sheet(periods=8,annual=False, as_dataframe=True)
        cashflow_annual_raw = company.cash_flow_statement(periods=5, as_dataframe=True)
        cashflow_quarter_raw = company.cash_flow_statement(periods=8, annual=False, as_dataframe=True)


        income_annual = extract_income_data(income_annual_raw)
        income_quarter = extract_income_data(income_quarter_raw)
        balance_quarter = extract_balance_quarter(balance_quarter_raw)
        cashflow_annual = extract_cashflow_data(cashflow_annual_raw)
        cashflow_quarter = extract_cashflow_data(cashflow_quarter_raw)

        income_ttm = extract_income_ttm(income_quarter)
        cashflow_ttm = extract_cashflow_ttm(
            income_quarter,
            cashflow_quarter
        )

        return {
            "profile": profile,
            "income": income_annual,
            "income_ttm": income_ttm,
            "cashflow": cashflow_annual,
            "cashflow_ttm": cashflow_ttm,
            "balance_quarter": balance_quarter,
            "ratios_annual": [],
            "fiscal_year_ends": fiscal_year_ends
        }

    except Exception as error:
        print(f"SEC data retrieval failed for {ticker}: {error}")
        return None

    

def extract_ceo(company):
    try:
        filing = company.get_filings(form="DEF 14A").latest()
        proxy = filing.obj()

        name = getattr(proxy, "peo_name", None)
        if isinstance(name, str) and name.strip():
            return name.strip()

        return None

    except Exception as error:
        print(f"CEO extraction failed: {error}")
        return None

def extract_profile_data(company):
    try:
        shares_outstanding = company.shares_outstanding
    except Exception:
        shares_outstanding = None

    try:
        public_float = company.public_float
    except Exception:
        public_float = None

    return {
        "name": getattr(company, "name", None),
        "price": None,
        "market_cap": None,
        "description": None,
        "ceo": extract_ceo(company),
        "ticker": getattr(company, "ticker", None),
        "industry": getattr(company, "industry", None),
        "shares_outstanding": shares_outstanding,
        "public_float": public_float
    }


def get_value(data, label, period):
    if data is None or period not in data.columns:
        return None

    try:
        if "label" in data.columns:
            rows = data.loc[
                data["label"].astype(str).str.strip() == label,
                period
            ]

        else:
            rows = data.loc[[label], period]

        if rows.empty:
            return None

        value = rows.iloc[0]

        if pd.isna(value):
            return None

        if hasattr(value, "item"):
            value = value.item()

        if isinstance(value, float) and value.is_integer():
            return int(value)

        return value

    except (KeyError, IndexError, TypeError, ValueError):
        return None


def get_first_value(data, labels, period):
    for label in labels:
        value = get_value(data, label, period)

        if value is not None:
            return value

    return None


def get_periods(data, prefix):
    if data is None:
        return []

    return [
        period
        for period in data.columns
        if isinstance(period, str) and period.startswith(prefix)
    ]


def get_commercial_paper_from_filing(filing, date):
    try:
        bs = filing.obj().balance_sheet.to_dataframe()

        rows = bs[
            (bs["concept"] == "us-gaap_CommercialPaper")
            & (~bs["dimension"].fillna(False).astype(bool))
            & (~bs["abstract"].fillna(False).astype(bool))
        ]


        if rows.empty or date not in bs.columns:
            return None

        value = rows.iloc[0][date]

        if pd.isna(value):
            return None

        return value

    except Exception as error:
        print(f"Commercial paper extraction failed: {error}")
        return None



def calculate_tax_rate(taxes, income_before_taxes):
    if taxes is None or income_before_taxes in (None, 0):
        return None

    return taxes / income_before_taxes * 100


def calculate_free_cash_flow(operating_cash_flow, capital_expenditure):
    if operating_cash_flow is None or capital_expenditure is None:
        return None

    return operating_cash_flow - capital_expenditure


def extract_income_period(data, period, period_key):
    income = {
        period_key: (
            period.replace("FY ", "")
            if period.startswith("FY ")
            else period
        ),
        "revenue": get_first_value(
            data,
            ["Total Revenue", "Revenue", "Sales Revenue Net"],
            period
        ),
        "cost_of_revenue": get_first_value(
            data,
            ["Cost of Revenue", "Cost of Goods and Services Sold"],
            period
        ),
        "operating_income": get_first_value(
            data,
            ["Operating Income (Loss)", "Operating Income"],
            period
        ),
        "interest_expense": get_first_value(
            data,
            [
                "Interest Expense",
                "Interest Expense, Debt",
                "Interest and Debt Expense",
                "Interest Expense (non-operating)"
            ],
            period
        ),
        "net_income": get_first_value(
            data,
            ["Net Income (Loss) Attributable to Parent",
             "Net Income (Loss) Available to Common Stockholders Basic",
             "Net Income (Loss)"],
            period
        ),
        "eps": get_first_value(
            data,
            ["Earnings Per Share, Diluted", "Diluted Earnings Per Share"],
            period
        ),
        "taxes": get_first_value(
            data,
            ["Income Tax Expense (Benefit)", "Income Tax Expense"],
            period
        ),
        "income_before_taxes": get_first_value(
            data,
            ["Income (Loss) from Continuing Operations before Income Taxes, Noncontrolling Interest",
             "Income (Loss) from Continuing Operations before Income Taxes",
             "Income Before Tax"],
            period
        )
    }

    revenue = income["revenue"]
    cost_of_revenue = income["cost_of_revenue"]

    income["gross_profit"] = (
        revenue - cost_of_revenue
        if revenue is not None and cost_of_revenue is not None
        else None
    )

    income["ebit"] = income["operating_income"]
    income["eps_diluted"] = income["eps"]
    income["tax_rate"] = calculate_tax_rate(
        income["taxes"],
        income["income_before_taxes"]
    )
    

    return income


def extract_income_data(data):
    if data is None:
        return []

    income = []

    for period in data.columns:
        if period.startswith("FY "):
            income.append(
                extract_income_period(data, period, "year")
            )

        elif period.startswith("Q"):
            income.append(
                extract_income_period(data, period, "period")
            )

    return income


def extract_balance_quarter(data):
    if data is None:
        return []

    balance = []

    for period in get_periods(data, "Q"):
        cash = get_first_value(
            data,
            [
                "Cash and Cash Equivalents, at Carrying Value",
                "Cash and Cash Equivalents",
                "Cash Cash Equivalents Restricted Cash and Restricted Cash Equivalents"
            ],
            period
        )

        current_maturities = get_first_value(
            data,
            [
                "Long-term Debt, Current Maturities",
                "Long-term Debt and Finance Lease Obligations, Current",
                "Debt, Current"
            ],
            period
        )

        short_term_borrowings = get_first_value(
            data,
            [
                "Short-term Borrowings",
                "Short-term Debt"
            ],
            period
        )

        long_term_debt = get_first_value(
            data,
            [
                "Long-term Debt, Excluding Current Maturities",
                "Long-term Debt and Finance Lease Obligations, Noncurrent",
                "Long-term Debt",
                "Long Term Debt"
            ],
            period
        )

        debt_components = [
            current_maturities,
            short_term_borrowings,
            long_term_debt
        ]

        total_debt = (
            sum(value for value in debt_components if value is not None)
            if any(value is not None for value in debt_components)
            else None
        )

        equity = get_first_value(
            data,
            [
                "Stockholders' Equity Attributable to Parent",
                "Stockholders' Equity",
                "Stockholders' Equity Including Portion Attributable to Noncontrolling Interest"
            ],
            period
        )

        balance.append({
            "date": period,
            "cash": cash,
            "total_debt": total_debt,
            "net_debt": (
                total_debt - cash
                if total_debt is not None and cash is not None
                else None
            ),
            "equity": equity,
            "current_assets": get_first_value(
                data, ["Assets, Current", "Current Assets"], period
            ),
            "current_liabilities": get_first_value(
                data, ["Liabilities, Current", "Current Liabilities"], period
            )
        })

    return balance


def extract_cashflow_period(data, period, period_key):
    capital_expenditure = get_first_value(
        data,
        ["Payments to Acquire Property, Plant, and Equipment",
         "Payments to Acquire Property Plant and Equipment",
         "Payments to Acquire Productive Assets"],
        period
    )

    if capital_expenditure is not None:
        capital_expenditure = abs(capital_expenditure)

    operating_cash_flow = get_first_value(
        data,
        ["Net Cash Provided by (Used in) Operating Activities",
         "Net Cash Provided by Operating Activities"],
        period
    )

    return {
        period_key: (
            period.replace("FY ", "")
            if period.startswith("FY ")
            else period
        ),
        "operating_cash_flow": operating_cash_flow,
        "capital_expenditure": capital_expenditure,
        "free_cash_flow": calculate_free_cash_flow(
            operating_cash_flow,
            capital_expenditure
        ),
        "depreciation_amortization": get_first_value(
            data,
            ["Depreciation, Depletion and Amortization",
             "Depreciation, Depletion, and Amortization",
             "Depreciation and Amortization"],
            period
        ),
        "acquisitions": get_first_value(
            data,
            ["Payments to Acquire Businesses, Net of Cash Acquired",
             "Payments to Acquire Businesses"],
            period
        ),
        "buybacks": get_first_value(
            data,
            ["Payments for Repurchase of Common Stock",
             "Payments for Repurchase of Equity"],
            period
        ),
        "dividends": get_first_value(
            data,
            ["Dividends paid", "Payments of Dividends",
             "Payments of Dividends Common Stock"],
            period
        )
    }


def extract_cashflow_data(data):
    if data is None:
        return []

    cashflow = []

    for period in data.columns:
        if period.startswith("FY "):
            cashflow.append(
                extract_cashflow_period(data, period, "year")
            )

        elif period.startswith("Q"):
            cashflow.append(
                extract_cashflow_period(data, period, "period")
            )

    return cashflow


def build_ttm(records, fields):
    ttm_records = []

    for start in range(len(records) - 3):
        latest_four = records[start:start + 4]

        ttm = {
            "date": latest_four[0]["period"]
        }

        for field in fields:
            values = [record.get(field) for record in latest_four]

            ttm[field] = (
                sum(values)
                if all(value is not None for value in values)
                else None
            )

        ttm_records.append(ttm)

    return ttm_records


def extract_income_ttm(income_quarter):
    income_ttm = build_ttm(
        income_quarter,
        [
            "revenue",
            "gross_profit",
            "operating_income",
            "net_income",
            "eps_diluted",
            "interest_expense",
            "taxes",
            "income_before_taxes"
        ]
    )

    for record in income_ttm:
        record["ebit"] = record.pop("operating_income")

        record["tax_rate"] = calculate_tax_rate(
            record.pop("taxes"),
            record.pop("income_before_taxes")
        )

    return income_ttm


def extract_cashflow_ttm(income_quarter, cashflow_quarter):
    cashflow_ttm = build_ttm(
        cashflow_quarter,
        [
            "operating_cash_flow",
            "capital_expenditure",
            "depreciation_amortization",
            "acquisitions",
            "buybacks",
            "dividends"
        ]
    )

    for index, record in enumerate(cashflow_ttm):
        record["free_cash_flow"] = calculate_free_cash_flow(
            record["operating_cash_flow"],
            record["capital_expenditure"]
        )

        # Keep aliases used by the existing main.py calculations.
        record["cash_from_operations"] = record["operating_cash_flow"]
        record["capex"] = record["capital_expenditure"]

        # Net income is useful for cross-checking the statements.
        if index < len(income_quarter) - 3:
            quarters = income_quarter[index:index + 4]
            values = [quarter.get("net_income") for quarter in quarters]

            record["net_income"] = (
                sum(values)
                if all(value is not None for value in values)
                else None
            )
        else:
            record["net_income"] = None

        record["change_in_cash"] = None

    return cashflow_ttm


if __name__ == "__main__":
    data = get_sec_data("GOOG")
    

    