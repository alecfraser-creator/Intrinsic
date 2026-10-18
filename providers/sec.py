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
        balance_quarter_raw = company.balance_sheet(periods=8, annual=False, as_dataframe=True)
        cashflow_annual_raw = company.cash_flow_statement(periods=5, as_dataframe=True)
        cashflow_quarter_raw = company.cash_flow_statement(periods=8, annual=False, as_dataframe=True)

        commercial_paper_by_period = extract_commercial_paper(company)

        income_annual = extract_income_data(income_annual_raw)
        income_quarter = extract_income_data(income_quarter_raw)
        balance_quarter = extract_balance_quarter(
            balance_quarter_raw,
            commercial_paper_by_period
        )

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


# ---------------------------------------------------------------------------
# CEO. Proxy updates yearly so CEO needs to be retrieved from form_4
# ---------------------------------------------------------------------------

FORM4_NAMES_ARE_LAST_FIRST = True
FORM4_LOOKBACK = 25

_CEO_TITLE = re.compile(r"chief executive officer|ceo")
_CEO_COTITLE_WORDS = re.compile(
    r"\b(and|director|chairman|chair|president|founder|co|executive|of|the|"
    r"board|interim|principal)\b"
)


def is_ceo_position(position):
    if not isinstance(position, str):
        return False

    text = position.lower()

    if "former" in text or "retired" in text:
        return False

    if not _CEO_TITLE.search(text):
        return False

    rest = _CEO_TITLE.sub("", text)
    rest = _CEO_COTITLE_WORDS.sub("", rest)
    rest = re.sub(r"[\s,;/&\-()]+", "", rest)

    return rest == ""


def format_insider_name(name):
    name = " ".join(str(name).split())

    if FORM4_NAMES_ARE_LAST_FIRST and "," not in name:
        parts = name.split(" ")
        if len(parts) >= 2:
            return " ".join(parts[1:] + parts[:1])

    return name


def extract_ceo_from_proxy(company):
    try:
        filing = company.get_filings(form="DEF 14A").latest()
        proxy = filing.obj()

        name = getattr(proxy, "peo_name", None)
        if isinstance(name, str) and name.strip():
            return name.strip(), filing.filing_date

    except Exception as error:
        print(f"CEO proxy extraction failed: {error}")

    return None, None


def extract_ceo_from_form4(company):
    try:
        filings = list(company.get_filings(form="4").head(FORM4_LOOKBACK))
        filings.sort(key=lambda filing: filing.filing_date, reverse=True)

        for filing in filings:
            try:
                summary = filing.obj().get_ownership_summary()
                df = summary.to_dataframe()
            except Exception:
                continue

            if df is None or "Insider" not in df.columns or "Position" not in df.columns:
                continue

            for _, row in df.iterrows():
                if is_ceo_position(row["Position"]):
                    return format_insider_name(row["Insider"]), filing.filing_date

    except Exception as error:
        print(f"CEO Form 4 extraction failed: {error}")

    return None, None


def extract_ceo_with_source(company):
    proxy_name, proxy_date = extract_ceo_from_proxy(company)
    form4_name, form4_date = extract_ceo_from_form4(company)

    if form4_name and (proxy_date is None or str(form4_date) >= str(proxy_date)):
        return {"name": form4_name, "source": f"Form 4 ({form4_date})"}

    if proxy_name:
        return {"name": proxy_name, "source": f"DEF 14A ({proxy_date})"}

    if form4_name:
        return {"name": form4_name, "source": f"Form 4 ({form4_date})"}

    return {"name": None, "source": None}


def extract_ceo(company):
    return extract_ceo_with_source(company)["name"]


def extract_profile_data(company):
    try:
        shares_outstanding = company.shares_outstanding
    except Exception:
        shares_outstanding = None

    try:
        public_float = company.public_float
    except Exception:
        public_float = None

    ceo = extract_ceo_with_source(company)

    return {
        "name": getattr(company, "name", None),
        "price": None,
        "market_cap": None,
        "description": None,
        "ceo": ceo["name"],
        "ceo_source": ceo["source"],
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


# ---------------------------------------------------------------------------
# Commercial paper (not in edgar tools' balance sheet, so needs to be fetched through facts.query)
# ---------------------------------------------------------------------------

def get_instant_usd_facts(facts, concept):
    if facts is None:
        return []

    try:
        found = facts.query().by_concept(concept, exact=True).execute()
    except Exception as error:
        print(f"Facts query failed for {concept}: {error}")
        return []

    return [
        fact for fact in found
        if getattr(fact, "period_type", None) == "instant"
        and getattr(fact, "unit", "USD") == "USD"
        and fact.numeric_value is not None
    ]


def build_period_end_map(
    facts,
    anchors=("us-gaap:Assets", "us-gaap:LiabilitiesAndStockholdersEquity")
):
    """{"Q3 2026": date(2026, 6, 27), "FY 2025": date(2025, 9, 27), ...}

    La vraie date de bilan d'un dépôt est la plus récente de ses faits Assets
    (les autres sont des comparatifs plus anciens).
    """
    for anchor in anchors:
        own_end = {}

        for fact in get_instant_usd_facts(facts, anchor):
            label = f"{fact.fiscal_period} {fact.fiscal_year}"

            if label not in own_end or fact.period_end > own_end[label]:
                own_end[label] = fact.period_end

        if own_end:
            # Le bilan de fin d'exercice peut être étiqueté "Q4 YYYY" côté colonnes.
            for label, end in list(own_end.items()):
                if label.startswith("FY "):
                    own_end.setdefault("Q4 " + label[3:], end)

            return own_end

    return {}


def get_balance_series(facts, concept, period_end_map):
    """{"Q3 2026": valeur, ...} pour un concept de bilan, rattaché à la vraie date."""
    latest_by_end = {}

    for fact in get_instant_usd_facts(facts, concept):
        previous = latest_by_end.get(fact.period_end)

        # En cas de restatement, le dépôt le plus récent gagne.
        if previous is None or fact.filing_date > previous.filing_date:
            latest_by_end[fact.period_end] = fact

    return {
        label: latest_by_end[end].numeric_value
        for label, end in period_end_map.items()
        if end in latest_by_end
    }


def extract_commercial_paper(company):
    try:
        facts = company.get_facts()
        period_end_map = build_period_end_map(facts)

        return get_balance_series(
            facts,
            "us-gaap:CommercialPaper",
            period_end_map
        )

    except Exception as error:
        print(f"Commercial paper extraction failed: {error}")
        return {}


def combine_debt(current_maturities, short_term_borrowings, commercial_paper, long_term_debt):
    """Somme de la dette sans double comptage.

    Certaines sociétés présentent "Short-term borrowings" au bilan et détaillent
    le CP en note : le CP est alors déjà inclus. Heuristique : si
    CP <= ShortTermBorrowings, on le considère inclus. Apple n'a pas de ligne
    ShortTermBorrowings, donc le CP est ajouté.
    """
    cp = commercial_paper

    if (
        cp is not None
        and short_term_borrowings is not None
        and cp <= short_term_borrowings
    ):
        cp = None

    components = [
        current_maturities,
        short_term_borrowings,
        cp,
        long_term_debt
    ]

    if all(value is None for value in components):
        return None

    return sum(value for value in components if value is not None)


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


def extract_balance_quarter(data, commercial_paper_by_period=None):
    if data is None:
        return []

    commercial_paper_by_period = commercial_paper_by_period or {}
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

        commercial_paper = commercial_paper_by_period.get(period)

        total_debt = combine_debt(
            current_maturities,
            short_term_borrowings,
            commercial_paper,
            long_term_debt
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
            "commercial_paper": commercial_paper,
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
    data = get_sec_data("AAPL")

    if data:
        for row in data["balance_quarter"][:4]:
            print(row)